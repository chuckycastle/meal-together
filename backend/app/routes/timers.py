"""
Family timer board routes
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.orm import joinedload
from app import db
from app.models.kitchen_timer import (
    KitchenTimer, TIMER_KINDS, ITEM_COLORS, MAX_DURATION_SECONDS, MAX_TIMERS_PER_FAMILY
)
from app.models.meal import iso_utc
from app.models.recipe import Recipe
from app.utils.decorators import family_member_required

bp = Blueprint('timers', __name__, url_prefix='/api/families/<int:family_id>/timers')

MAX_NAME_LENGTH = 255


def get_timer(family_id, timer_id):
    return KitchenTimer.query.options(joinedload(KitchenTimer.recipe)).filter_by(
        id=timer_id, family_id=family_id
    ).first()


def timer_response(timer, status=200):
    """A timer with the server clock, so clients can correct for clock drift"""
    return jsonify({'timer': timer.to_dict(), 'server_time': iso_utc(datetime.utcnow())}), status


def parse_seconds(value, field, minimum=1):
    """Validate a whole number of seconds; raises ValueError"""
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f'{field} must be a whole number of seconds')
    if value < minimum or value > MAX_DURATION_SECONDS:
        raise ValueError(f'{field} must be between {minimum} and {MAX_DURATION_SECONDS} seconds')
    return value


@bp.route('', methods=['GET'])
@family_member_required
def list_timers(family_id):
    """List every timer on the family's board"""
    timers = KitchenTimer.query.options(joinedload(KitchenTimer.recipe)).filter_by(
        family_id=family_id
    ).order_by(KitchenTimer.created_at.asc()).all()

    return jsonify({
        'timers': [timer.to_dict() for timer in timers],
        'server_time': iso_utc(datetime.utcnow()),
    }), 200


@bp.route('', methods=['POST'])
@family_member_required
def create_timer(family_id):
    """Add a timer to the board, started unless start is false"""
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    try:
        name = data.get('name')
        if not isinstance(name, str) or not name.strip():
            raise ValueError('name is required')
        name = name.strip()
        if len(name) > MAX_NAME_LENGTH:
            raise ValueError(f'name must be {MAX_NAME_LENGTH} characters or fewer')

        kind = data.get('kind', 'countdown')
        if kind not in TIMER_KINDS:
            raise ValueError(f'kind must be one of: {", ".join(TIMER_KINDS)}')

        color = data.get('color', 'ink')
        if color not in ITEM_COLORS:
            raise ValueError(f'color must be one of: {", ".join(ITEM_COLORS)}')

        duration = parse_seconds(data.get('duration'), 'duration') if kind == 'countdown' else 0
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    recipe_id = data.get('recipe_id')
    if recipe_id is not None:
        if not Recipe.query.filter_by(id=recipe_id, family_id=family_id).first():
            return jsonify({'error': 'Recipe not found'}), 404

    if KitchenTimer.query.filter_by(family_id=family_id).count() >= MAX_TIMERS_PER_FAMILY:
        return jsonify({'error': f'The board holds up to {MAX_TIMERS_PER_FAMILY} timers. Remove one first.'}), 400

    timer = KitchenTimer(
        family_id=family_id,
        name=name,
        kind=kind,
        duration=duration,
        color=color,
        recipe_id=recipe_id,
        status='idle',
        held_seconds=duration,
        created_by_id=user_id,
    )
    if data.get('start', True):
        timer.start()

    try:
        db.session.add(timer)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Timer could not be saved'}), 500

    return timer_response(timer, 201)


@bp.route('/<int:timer_id>/<any(start, pause, reset):action>', methods=['POST'])
@family_member_required
def change_timer(family_id, timer_id, action):
    """Start, pause, or reset a timer"""
    timer = get_timer(family_id, timer_id)
    if not timer:
        return jsonify({'error': 'Timer not found'}), 404

    getattr(timer, action)()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Timer could not be saved'}), 500

    return timer_response(timer)


@bp.route('/<int:timer_id>/add', methods=['POST'])
@family_member_required
def add_time(family_id, timer_id):
    """Add time to a countdown"""
    timer = get_timer(family_id, timer_id)
    if not timer:
        return jsonify({'error': 'Timer not found'}), 404
    if timer.kind != 'countdown':
        return jsonify({'error': 'Time can only be added to a countdown'}), 400

    data = request.get_json(silent=True) or {}
    try:
        seconds = parse_seconds(data.get('seconds'), 'seconds')
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    timer.add_time(seconds)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Timer could not be saved'}), 500

    return timer_response(timer)


@bp.route('/<int:timer_id>', methods=['DELETE'])
@family_member_required
def delete_timer(family_id, timer_id):
    """Remove a timer from the board"""
    timer = get_timer(family_id, timer_id)
    if not timer:
        return jsonify({'error': 'Timer not found'}), 404

    try:
        db.session.delete(timer)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({'error': 'Timer could not be deleted'}), 500

    return jsonify({'message': 'Timer removed'}), 200
