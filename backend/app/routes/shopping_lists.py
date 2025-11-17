"""
Shopping list management routes
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models.shopping_list import ShoppingList, ShoppingListItem
from app.utils.decorators import family_member_required

bp = Blueprint('shopping_lists', __name__, url_prefix='/api/families/<int:family_id>/shopping-lists')


@bp.route('', methods=['POST'])
@family_member_required
def create_shopping_list(family_id):
    """Create a new shopping list"""
    data = request.get_json()

    shopping_list = ShoppingList(
        name=data.get('name', 'Shopping List'),
        family_id=family_id
    )

    try:
        shopping_list.save()

        # Broadcast to family room
        socketio.emit(
            'shopping_list_created',
            shopping_list.to_dict(),
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Shopping list created successfully',
            'shopping_list': shopping_list.to_dict(include_items=True)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['GET'])
@family_member_required
def get_shopping_lists(family_id):
    """Get all shopping lists for a family"""
    # Get active lists by default, or all if specified
    query = ShoppingList.query.filter_by(family_id=family_id)

    if request.args.get('active_only', 'true').lower() == 'true':
        query = query.filter_by(is_active=True)

    shopping_lists = query.all()

    return jsonify({
        'shopping_lists': [sl.to_dict(include_items=True) for sl in shopping_lists]
    }), 200


@bp.route('/<int:list_id>', methods=['GET'])
@family_member_required
def get_shopping_list(family_id, list_id):
    """Get shopping list details"""
    shopping_list = ShoppingList.get_by_id(list_id)

    if not shopping_list or shopping_list.family_id != family_id:
        return jsonify({'error': 'Shopping list not found'}), 404

    return jsonify({'shopping_list': shopping_list.to_dict(include_items=True)}), 200


@bp.route('/<int:list_id>', methods=['PUT'])
@family_member_required
def update_shopping_list(family_id, list_id):
    """Update shopping list"""
    shopping_list = ShoppingList.get_by_id(list_id)

    if not shopping_list or shopping_list.family_id != family_id:
        return jsonify({'error': 'Shopping list not found'}), 404

    data = request.get_json()

    if 'name' in data:
        shopping_list.name = data['name']
    if 'is_active' in data:
        shopping_list.is_active = data['is_active']

    try:
        shopping_list.save()

        # Broadcast update
        socketio.emit(
            'shopping_list_updated',
            shopping_list.to_dict(include_items=True),
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Shopping list updated successfully',
            'shopping_list': shopping_list.to_dict(include_items=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:list_id>', methods=['DELETE'])
@family_member_required
def delete_shopping_list(family_id, list_id):
    """Delete shopping list"""
    shopping_list = ShoppingList.get_by_id(list_id)

    if not shopping_list or shopping_list.family_id != family_id:
        return jsonify({'error': 'Shopping list not found'}), 404

    try:
        shopping_list.delete()

        # Broadcast deletion
        socketio.emit(
            'shopping_list_deleted',
            {'list_id': list_id},
            room=f"family_{family_id}"
        )

        return jsonify({'message': 'Shopping list deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:list_id>/items', methods=['POST'])
@family_member_required
def add_item(family_id, list_id):
    """Add item to shopping list"""
    user_id = int(get_jwt_identity())
    shopping_list = ShoppingList.get_by_id(list_id)

    if not shopping_list or shopping_list.family_id != family_id:
        return jsonify({'error': 'Shopping list not found'}), 404

    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Item name required'}), 400

    item = ShoppingListItem(
        shopping_list_id=list_id,
        name=data['name'],
        quantity=data.get('quantity'),
        category=data.get('category'),
        notes=data.get('notes'),
        added_by_id=user_id
    )

    try:
        item.save()

        # Broadcast new item
        socketio.emit(
            'shopping_item_added',
            item.to_dict(),
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Item added successfully',
            'item': item.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:list_id>/items/<int:item_id>', methods=['PUT'])
@family_member_required
def update_item(family_id, list_id, item_id):
    """Update shopping list item"""
    user_id = int(get_jwt_identity())
    item = ShoppingListItem.get_by_id(item_id)

    if not item or item.shopping_list.family_id != family_id:
        return jsonify({'error': 'Item not found'}), 404

    data = request.get_json()

    if 'name' in data:
        item.name = data['name']
    if 'quantity' in data:
        item.quantity = data['quantity']
    if 'category' in data:
        item.category = data['category']
    if 'notes' in data:
        item.notes = data['notes']
    if 'checked' in data:
        item.checked = data['checked']
        if item.checked:
            item.checked_by_id = user_id
            item.checked_at = datetime.utcnow()
        else:
            item.checked_by_id = None
            item.checked_at = None

    try:
        item.save()

        # Broadcast update
        socketio.emit(
            'shopping_item_updated',
            item.to_dict(),
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Item updated successfully',
            'item': item.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:list_id>/items/<int:item_id>', methods=['DELETE'])
@family_member_required
def delete_item(family_id, list_id, item_id):
    """Delete shopping list item"""
    item = ShoppingListItem.get_by_id(item_id)

    if not item or item.shopping_list.family_id != family_id:
        return jsonify({'error': 'Item not found'}), 404

    try:
        item.delete()

        # Broadcast deletion
        socketio.emit(
            'shopping_item_deleted',
            {'item_id': item_id, 'list_id': list_id},
            room=f"family_{family_id}"
        )

        return jsonify({'message': 'Item deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:list_id>/items/bulk', methods=['POST'])
@family_member_required
def bulk_add_items(family_id, list_id):
    """Bulk add items (useful for adding from recipes)"""
    user_id = int(get_jwt_identity())
    shopping_list = ShoppingList.get_by_id(list_id)

    if not shopping_list or shopping_list.family_id != family_id:
        return jsonify({'error': 'Shopping list not found'}), 404

    data = request.get_json()
    items_data = data.get('items', [])

    if not items_data:
        return jsonify({'error': 'No items provided'}), 400

    try:
        added_items = []
        for item_data in items_data:
            item = ShoppingListItem(
                shopping_list_id=list_id,
                name=item_data['name'],
                quantity=item_data.get('quantity'),
                category=item_data.get('category'),
                notes=item_data.get('notes'),
                added_by_id=user_id
            )
            item.save()
            added_items.append(item.to_dict())

        # Broadcast bulk add
        socketio.emit(
            'shopping_items_bulk_added',
            {'items': added_items, 'list_id': list_id},
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': f'{len(added_items)} items added successfully',
            'items': added_items
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
