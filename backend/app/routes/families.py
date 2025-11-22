"""
Family management routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload, selectinload
from app import db
from app.models.family import Family, FamilyMember, FamilyRole
from app.models.user import User
from app.utils.decorators import family_member_required, family_admin_required, family_owner_required

bp = Blueprint('families', __name__, url_prefix='/api/families')


@bp.route('', methods=['POST'])
@jwt_required()
def create_family():
    """Create a new family"""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Family name required'}), 400

    # Create family
    family = Family(
        name=data['name'],
        description=data.get('description')
    )

    try:
        family.save()

        # Add creator as owner
        member = FamilyMember(
            family_id=family.id,
            user_id=user_id,
            role=FamilyRole.OWNER
        )
        member.save()

        return jsonify({
            'message': 'Family created successfully',
            'family': family.to_dict(include_members=True)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['GET'])
@jwt_required()
def get_families():
    """Get all families for current user"""
    user_id = get_jwt_identity()

    # Get all family memberships with eager loading
    memberships = FamilyMember.query.options(
        joinedload(FamilyMember.family).selectinload(Family.members).joinedload(FamilyMember.user)
    ).filter_by(user_id=user_id).all()
    families = [m.family.to_dict(include_members=True) for m in memberships]

    return jsonify({'families': families}), 200


@bp.route('/<int:family_id>', methods=['GET'])
@family_member_required
def get_family(family_id):
    """Get family details"""
    family = Family.get_by_id(family_id)
    return jsonify({'family': family.to_dict(include_members=True)}), 200


@bp.route('/<int:family_id>', methods=['PUT'])
@family_admin_required
def update_family(family_id):
    """Update family details"""
    family = Family.get_by_id(family_id)
    data = request.get_json()

    if 'name' in data:
        family.name = data['name']
    if 'description' in data:
        family.description = data['description']

    try:
        family.save()
        return jsonify({
            'message': 'Family updated successfully',
            'family': family.to_dict(include_members=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:family_id>', methods=['DELETE'])
@family_owner_required
def delete_family(family_id):
    """Delete a family (owner only)"""
    family = Family.get_by_id(family_id)

    try:
        family.delete()
        return jsonify({'message': 'Family deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:family_id>/members', methods=['POST'])
@family_admin_required
def add_member(family_id):
    """Add a member to the family"""
    data = request.get_json()

    if not data.get('email'):
        return jsonify({'error': 'User email required'}), 400

    # Find user by email
    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Check if already a member
    family = Family.get_by_id(family_id)
    if family.is_member(user.id):
        return jsonify({'error': 'User is already a member'}), 409

    # Add member
    member = FamilyMember(
        family_id=family_id,
        user_id=user.id,
        role=FamilyRole(data.get('role', 'member'))
    )

    try:
        member.save()
        return jsonify({
            'message': 'Member added successfully',
            'member': member.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:family_id>/members/<int:member_id>', methods=['PUT'])
@family_admin_required
def update_member_role(family_id, member_id):
    """Update a member's role"""
    member = FamilyMember.get_by_id(member_id)

    if not member or member.family_id != family_id:
        return jsonify({'error': 'Member not found'}), 404

    data = request.get_json()
    if 'role' in data:
        # Only owner can assign owner role
        if data['role'] == 'owner':
            user_id = int(get_jwt_identity())
            family = Family.get_by_id(family_id)
            if not family.is_owner(user_id):
                return jsonify({'error': 'Only owner can assign owner role'}), 403

        member.role = FamilyRole(data['role'])

    try:
        member.save()
        return jsonify({
            'message': 'Member role updated successfully',
            'member': member.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:family_id>/members/<int:member_id>', methods=['DELETE'])
@family_admin_required
def remove_member(family_id, member_id):
    """Remove a member from the family"""
    member = FamilyMember.get_by_id(member_id)

    if not member or member.family_id != family_id:
        return jsonify({'error': 'Member not found'}), 404

    # Cannot remove owner
    if member.role == FamilyRole.OWNER:
        return jsonify({'error': 'Cannot remove family owner'}), 403

    try:
        member.delete()
        return jsonify({'message': 'Member removed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:family_id>/leave', methods=['POST'])
@family_member_required
def leave_family(family_id):
    """Leave a family"""
    user_id = int(get_jwt_identity())
    family = Family.get_by_id(family_id)
    member = family.get_member(user_id)

    # Cannot leave if you're the owner
    if member.role == FamilyRole.OWNER:
        return jsonify({'error': 'Owner cannot leave family. Transfer ownership or delete family.'}), 403

    try:
        member.delete()
        return jsonify({'message': 'Left family successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
