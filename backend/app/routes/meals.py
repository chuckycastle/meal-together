"""
Meal plan routes: meals, their scheduled items, and shopping list generation
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.orm import selectinload
from app import db
from app.models.family import FamilyMember
from app.models.meal import Meal, MealItem, ITEM_KINDS, ITEM_COLORS
from app.models.recipe import Recipe
from app.models.shopping_list import ShoppingList, ShoppingListItem
from app.utils.caching import invalidate_shopping_list_cache
from app.utils.decorators import family_member_required

bp = Blueprint('meals', __name__, url_prefix='/api/families/<int:family_id>/meals')

MAX_TITLE_LENGTH = 255
MAX_NOTES_LENGTH = 2000

# First matching keyword wins, so more specific groups come first
CATEGORY_KEYWORDS = (
    ('Pantry', ('broth', 'stock', 'juice')),
    ('Meat', ('turkey', 'ham', 'chorizo', 'sausage', 'bacon', 'beef', 'pork')),
    ('Dairy & eggs', ('butter', 'milk', 'cream', 'half-and-half', 'egg', 'cheese', 'yogurt')),
    ('Produce', ('potato', 'onion', 'garlic', 'celery', 'apple', 'orange', 'lemon', 'cranberr', 'green bean',
                 'mushroom', 'chive', 'sprout', 'carrot', 'fresh')),
    ('Spices', ('cinnamon', 'clove', 'ginger', 'nutmeg', 'allspice', 'pepper', 'salt', 'sage', 'rosemary',
                'thyme')),
    ('Baking', ('flour', 'sugar', 'pie shell', 'pie crust', 'panko', 'bread crumb', 'vanilla', 'honey',
                'pumpkin')),
    ('Bakery', ('roll', 'bread', 'stuffing')),
    ('Pantry', ('mustard', 'oil', 'spray', 'vinegar')),
)


def guess_category(name):
    """Assign a store section from keywords in an ingredient name"""
    lowered = name.lower()
    for category, keywords in CATEGORY_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return category
    return 'Other'


def parse_datetime(value):
    """Parse an ISO 8601 string into a naive UTC datetime; raises ValueError"""
    if not isinstance(value, str) or not value:
        raise ValueError('Expected an ISO 8601 date and time')
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def clean_text(value, field, max_length, required=False):
    """Trim a text field and enforce its length; raises ValueError"""
    if value is None:
        if required:
            raise ValueError(f'{field} is required')
        return None
    if not isinstance(value, str):
        raise ValueError(f'{field} must be text')
    value = value.strip()
    if required and not value:
        raise ValueError(f'{field} is required')
    if len(value) > max_length:
        raise ValueError(f'{field} must be {max_length} characters or fewer')
    return value or None


def get_meal(family_id, meal_id):
    """Load a meal that belongs to the family, with its items"""
    meal = Meal.query.options(
        selectinload(Meal.items).joinedload(MealItem.recipe).selectinload(Recipe.timers),
        selectinload(Meal.items).joinedload(MealItem.assigned_to),
    ).filter_by(id=meal_id, family_id=family_id).first()
    return meal


def apply_item_fields(item, data, family_id, user_id):
    """Validate and copy request fields onto a meal item; raises ValueError"""
    if 'kind' in data:
        if data['kind'] not in ITEM_KINDS:
            raise ValueError(f'kind must be one of: {", ".join(ITEM_KINDS)}')
        item.kind = data['kind']

    if 'color' in data:
        if data['color'] not in ITEM_COLORS:
            raise ValueError(f'color must be one of: {", ".join(ITEM_COLORS)}')
        item.color = data['color']

    if 'recipe_id' in data:
        recipe_id = data['recipe_id']
        if recipe_id is None:
            item.recipe = None
        else:
            recipe = Recipe.query.filter_by(id=recipe_id, family_id=family_id).first()
            if not recipe:
                raise LookupError('Recipe not found')
            item.recipe = recipe

    if 'title' in data:
        item.title = clean_text(data['title'], 'title', MAX_TITLE_LENGTH)
    if not item.title:
        if not item.recipe:
            raise ValueError('title is required')
        item.title = item.recipe.name

    if 'assigned_to_id' in data:
        assigned_to_id = data['assigned_to_id']
        if assigned_to_id is not None:
            member = FamilyMember.query.filter_by(family_id=family_id, user_id=assigned_to_id).first()
            if not member:
                raise LookupError('Assigned user is not a member of this family')
        item.assigned_to_id = assigned_to_id

    if 'start_at' in data:
        item.start_at = parse_datetime(data['start_at']) if data['start_at'] else None

    if 'done' in data:
        if data['done']:
            if item.done_at is None:
                item.done_at = datetime.utcnow()
                item.done_by_id = user_id
        else:
            item.done_at = None
            item.done_by_id = None


@bp.route('', methods=['GET'])
@family_member_required
def list_meals(family_id):
    """List the family's meals, soonest serve time first"""
    meals = Meal.query.options(
        selectinload(Meal.items).joinedload(MealItem.recipe).selectinload(Recipe.timers),
        selectinload(Meal.items).joinedload(MealItem.assigned_to),
    ).filter_by(family_id=family_id).order_by(Meal.serve_at.asc()).all()

    return jsonify({'meals': [meal.to_dict() for meal in meals]}), 200


@bp.route('', methods=['POST'])
@family_member_required
def create_meal(family_id):
    """Create a meal, optionally with its first items"""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    try:
        meal = Meal(
            family_id=family_id,
            name=clean_text(data.get('name'), 'name', MAX_TITLE_LENGTH, required=True),
            serve_at=parse_datetime(data.get('serve_at')),
            notes=clean_text(data.get('notes'), 'notes', MAX_NOTES_LENGTH),
        )
        db.session.add(meal)

        for item_data in data.get('items') or []:
            item = MealItem(meal=meal, kind='dish', color='ink')
            apply_item_fields(item, item_data, family_id, user_id)
            if item.start_at is None and item.kind == 'dish':
                item.start_at = item.suggested_start()

        db.session.commit()
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except LookupError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 404
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Meal could not be saved'}), 500

    return jsonify({'meal': get_meal(family_id, meal.id).to_dict()}), 201


@bp.route('/<int:meal_id>', methods=['GET'])
@family_member_required
def get_meal_detail(family_id, meal_id):
    """Get one meal with its items"""
    meal = get_meal(family_id, meal_id)
    if not meal:
        return jsonify({'error': 'Meal not found'}), 404

    return jsonify({'meal': meal.to_dict()}), 200


@bp.route('/<int:meal_id>', methods=['PUT'])
@family_member_required
def update_meal(family_id, meal_id):
    """Update a meal's name, serve time, or notes"""
    meal = get_meal(family_id, meal_id)
    if not meal:
        return jsonify({'error': 'Meal not found'}), 404

    data = request.get_json(silent=True) or {}

    try:
        if 'name' in data:
            meal.name = clean_text(data['name'], 'name', MAX_TITLE_LENGTH, required=True)
        if 'notes' in data:
            meal.notes = clean_text(data['notes'], 'notes', MAX_NOTES_LENGTH)
        if 'serve_at' in data:
            new_serve_at = parse_datetime(data['serve_at'])
            # Keep every item's offset from the serve time when the meal moves
            if data.get('shift_items', True):
                delta = new_serve_at - meal.serve_at
                for item in meal.items:
                    if item.start_at is not None:
                        item.start_at = item.start_at + delta
            meal.serve_at = new_serve_at
        db.session.commit()
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Meal could not be saved'}), 500

    return jsonify({'meal': get_meal(family_id, meal_id).to_dict()}), 200


@bp.route('/<int:meal_id>', methods=['DELETE'])
@family_member_required
def delete_meal(family_id, meal_id):
    """Delete a meal and its items"""
    meal = get_meal(family_id, meal_id)
    if not meal:
        return jsonify({'error': 'Meal not found'}), 404

    try:
        db.session.delete(meal)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Meal could not be deleted'}), 500

    return jsonify({'message': 'Meal deleted'}), 200


@bp.route('/<int:meal_id>/items', methods=['POST'])
@family_member_required
def add_meal_item(family_id, meal_id):
    """Add a dish or event to a meal"""
    user_id = int(get_jwt_identity())
    meal = get_meal(family_id, meal_id)
    if not meal:
        return jsonify({'error': 'Meal not found'}), 404

    data = request.get_json(silent=True) or {}

    try:
        item = MealItem(meal=meal, kind='dish', color='ink')
        apply_item_fields(item, data, family_id, user_id)
        if item.start_at is None and item.kind == 'dish':
            item.start_at = item.suggested_start()
        db.session.commit()
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except LookupError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 404
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Item could not be saved'}), 500

    return jsonify({'item': item.to_dict(), 'meal': get_meal(family_id, meal_id).to_dict()}), 201


@bp.route('/<int:meal_id>/items/<int:item_id>', methods=['PUT'])
@family_member_required
def update_meal_item(family_id, meal_id, item_id):
    """Update a meal item, including its done state"""
    user_id = int(get_jwt_identity())
    meal = get_meal(family_id, meal_id)
    if not meal:
        return jsonify({'error': 'Meal not found'}), 404

    item = next((i for i in meal.items if i.id == item_id), None)
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    data = request.get_json(silent=True) or {}

    try:
        apply_item_fields(item, data, family_id, user_id)
        db.session.commit()
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    except LookupError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 404
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Item could not be saved'}), 500

    return jsonify({'item': item.to_dict(), 'meal': get_meal(family_id, meal_id).to_dict()}), 200


@bp.route('/<int:meal_id>/items/<int:item_id>', methods=['DELETE'])
@family_member_required
def delete_meal_item(family_id, meal_id, item_id):
    """Remove an item from a meal"""
    meal = get_meal(family_id, meal_id)
    if not meal:
        return jsonify({'error': 'Meal not found'}), 404

    item = next((i for i in meal.items if i.id == item_id), None)
    if not item:
        return jsonify({'error': 'Item not found'}), 404

    try:
        db.session.delete(item)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Item could not be deleted'}), 500

    return jsonify({'meal': get_meal(family_id, meal_id).to_dict()}), 200


@bp.route('/<int:meal_id>/shopping-list', methods=['POST'])
@family_member_required
def add_meal_to_shopping_list(family_id, meal_id):
    """Add the ingredients of every recipe on the meal to the active shopping list"""
    user_id = int(get_jwt_identity())
    meal = get_meal(family_id, meal_id)
    if not meal:
        return jsonify({'error': 'Meal not found'}), 404

    # Merge the same ingredient across dishes, keeping first-seen order
    merged = {}
    for item in meal.items:
        if not item.recipe:
            continue
        for ingredient in item.recipe.ingredients:
            key = ingredient.name.strip().lower()
            if not key:
                continue
            entry = merged.setdefault(key, {'name': ingredient.name.strip(), 'uses': []})
            entry['uses'].append((item.title, ingredient.quantity))

    try:
        shopping_list = ShoppingList.query.filter_by(
            family_id=family_id, is_active=True
        ).order_by(ShoppingList.created_at.desc()).first()
        if not shopping_list:
            shopping_list = ShoppingList(name=f'{meal.name} shopping', family_id=family_id)
            db.session.add(shopping_list)
            db.session.flush()

        existing = {i.name.strip().lower() for i in shopping_list.items}
        added = 0
        skipped = 0
        for key, entry in merged.items():
            if key in existing:
                skipped += 1
                continue
            uses = entry['uses']
            if len(uses) == 1:
                quantity = (uses[0][1] or '')[:50] or None
                notes = f'For {uses[0][0]}'
            else:
                quantity = None
                notes = '; '.join(
                    f'{title}: {qty}' if qty else title for title, qty in uses
                )
            db.session.add(ShoppingListItem(
                shopping_list_id=shopping_list.id,
                name=entry['name'][:255],
                quantity=quantity,
                category=guess_category(entry['name']),
                notes=notes,
                added_by_id=user_id,
            ))
            added += 1

        db.session.commit()
        invalidate_shopping_list_cache(family_id)
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Shopping list could not be updated'}), 500

    return jsonify({
        'shopping_list_id': shopping_list.id,
        'added': added,
        'skipped': skipped,
    }), 200
