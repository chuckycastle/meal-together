"""
Shopping list management routes
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload, selectinload
from app import db, socketio
from app.models.shopping_list import ShoppingList, ShoppingListItem
from app.utils.decorators import family_member_required
from app.utils.pagination import get_pagination_params, paginate_query, create_paginated_response

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

        # Broadcast to family room (minimal payload)
        socketio.emit(
            'shopping_list_created',
            {
                'id': shopping_list.id,
                'name': shopping_list.name,
                'family_id': shopping_list.family_id,
                'is_active': shopping_list.is_active,
                'created_at': shopping_list.created_at.isoformat() if shopping_list.created_at else None
            },
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
    """Get all shopping lists for a family with pagination"""
    # Get pagination parameters
    params = get_pagination_params()

    # Get active lists by default, or all if specified
    query = ShoppingList.query.options(
        selectinload(ShoppingList.items).joinedload(ShoppingListItem.added_by),
        selectinload(ShoppingList.items).joinedload(ShoppingListItem.checked_by)
    ).filter_by(family_id=family_id).order_by(ShoppingList.created_at.desc())

    if request.args.get('active_only', 'true').lower() == 'true':
        query = query.filter_by(is_active=True)

    # Paginate results
    result = paginate_query(query, params['page'], params['per_page'])

    # Serialize items
    shopping_lists = [sl.to_dict(include_items=True) for sl in result['items']]

    return create_paginated_response(shopping_lists, result['pagination'], 'shopping_lists')


@bp.route('/<int:list_id>', methods=['GET'])
@family_member_required
def get_shopping_list(family_id, list_id):
    """Get shopping list details"""
    shopping_list = ShoppingList.query.options(
        selectinload(ShoppingList.items).joinedload(ShoppingListItem.added_by),
        selectinload(ShoppingList.items).joinedload(ShoppingListItem.checked_by)
    ).filter_by(id=list_id).first()

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

        # Broadcast update (minimal payload - don't include full items array)
        socketio.emit(
            'shopping_list_updated',
            {
                'id': shopping_list.id,
                'name': shopping_list.name,
                'is_active': shopping_list.is_active,
                'updated_at': shopping_list.updated_at.isoformat() if shopping_list.updated_at else None
            },
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

        # Broadcast new item (minimal payload - send only essential data)
        socketio.emit(
            'shopping_item_added',
            {
                'id': item.id,
                'shopping_list_id': item.shopping_list_id,
                'name': item.name,
                'quantity': item.quantity,
                'category': item.category,
                'notes': item.notes,
                'checked': item.checked,
                'added_by_id': item.added_by_id,
                'checked_by_id': item.checked_by_id,
                'created_at': item.created_at.isoformat() if item.created_at else None,
                'updated_at': item.updated_at.isoformat() if item.updated_at else None
            },
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

        # Broadcast update (minimal payload - send only changed fields)
        socketio.emit(
            'shopping_item_updated',
            {
                'id': item.id,
                'shopping_list_id': item.shopping_list_id,
                'name': item.name,
                'quantity': item.quantity,
                'category': item.category,
                'notes': item.notes,
                'checked': item.checked,
                'checked_by_id': item.checked_by_id,
                'checked_at': item.checked_at.isoformat() if item.checked_at else None,
                'updated_at': item.updated_at.isoformat() if item.updated_at else None
            },
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
