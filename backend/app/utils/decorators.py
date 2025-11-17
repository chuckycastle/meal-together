"""
Authentication and authorization decorators
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.models.user import User
from app.models.family import Family, FamilyRole


def login_required(fn):
    """Require valid JWT token"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    """Get current authenticated user"""
    user_id = int(get_jwt_identity())
    return User.get_by_id(user_id)


def family_member_required(fn):
    """Require user to be a member of the family"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        family_id = kwargs.get('family_id')

        if not family_id:
            return jsonify({'error': 'Family ID required'}), 400

        family = Family.get_by_id(family_id)
        if not family:
            return jsonify({'error': 'Family not found'}), 404

        if not family.is_member(user_id):
            return jsonify({'error': 'Not a member of this family'}), 403

        return fn(*args, **kwargs)
    return wrapper


def family_admin_required(fn):
    """Require user to be an admin or owner of the family"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        family_id = kwargs.get('family_id')

        if not family_id:
            return jsonify({'error': 'Family ID required'}), 400

        family = Family.get_by_id(family_id)
        if not family:
            return jsonify({'error': 'Family not found'}), 404

        if not family.is_admin_or_owner(user_id):
            return jsonify({'error': 'Admin privileges required'}), 403

        return fn(*args, **kwargs)
    return wrapper


def family_owner_required(fn):
    """Require user to be the owner of the family"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        family_id = kwargs.get('family_id')

        if not family_id:
            return jsonify({'error': 'Family ID required'}), 400

        family = Family.get_by_id(family_id)
        if not family:
            return jsonify({'error': 'Family not found'}), 404

        if not family.is_owner(user_id):
            return jsonify({'error': 'Owner privileges required'}), 403

        return fn(*args, **kwargs)
    return wrapper
