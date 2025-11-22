"""
Cooking session routes with timeline scheduling
"""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, socketio
from app.models.cooking_session import CookingSession, ActiveTimer
from app.models.recipe import Recipe
from app.utils.decorators import family_member_required

bp = Blueprint('cooking_sessions', __name__, url_prefix='/api/families/<int:family_id>/cooking-sessions')


def calculate_start_time(recipes, target_time):
    """
    Calculate when each recipe should start to finish by target time
    Returns dict of recipe_id: start_time
    """
    schedule = {}
    target_dt = datetime.fromisoformat(target_time.replace('Z', '+00:00'))

    for recipe in recipes:
        # Calculate when to start this recipe
        total_time = recipe.prep_time + recipe.cook_time
        start_time = target_dt - timedelta(minutes=total_time)
        schedule[recipe.id] = start_time.isoformat()

    return schedule


@bp.route('/timeline', methods=['POST'])
@family_member_required
def create_timeline(family_id):
    """Create a cooking timeline for multiple recipes"""
    data = request.get_json()

    if not data.get('recipe_ids') or not data.get('target_time'):
        return jsonify({'error': 'Recipe IDs and target time required'}), 400

    # Get all recipes
    recipes = Recipe.query.filter(
        Recipe.id.in_(data['recipe_ids']),
        Recipe.family_id == family_id
    ).all()

    if len(recipes) != len(data['recipe_ids']):
        return jsonify({'error': 'One or more recipes not found'}), 404

    # Calculate timeline
    schedule = calculate_start_time(recipes, data['target_time'])

    # Sort by start time
    sorted_schedule = sorted(
        [{'recipe': r.to_dict(), 'start_time': schedule[r.id]} for r in recipes],
        key=lambda x: x['start_time']
    )

    return jsonify({
        'target_time': data['target_time'],
        'timeline': sorted_schedule
    }), 200


@bp.route('', methods=['POST'])
@family_member_required
def start_cooking_session(family_id):
    """Start a cooking session"""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data.get('recipe_id'):
        return jsonify({'error': 'Recipe ID required'}), 400

    # Verify recipe belongs to family
    recipe = Recipe.get_by_id(data['recipe_id'])
    if not recipe or recipe.family_id != family_id:
        return jsonify({'error': 'Recipe not found'}), 404

    session = CookingSession(
        recipe_id=data['recipe_id'],
        family_id=family_id,
        started_by_id=user_id,
        target_time=datetime.fromisoformat(data['target_time']) if data.get('target_time') else None,
        actual_start_time=datetime.utcnow()
    )

    try:
        session.save()

        # Broadcast session started (minimal payload - no nested recipe/user objects)
        socketio.emit(
            'cooking_session_started',
            {
                'id': session.id,
                'recipe_id': session.recipe_id,
                'recipe_name': session.recipe.name if session.recipe else None,
                'family_id': session.family_id,
                'started_by_id': session.started_by_id,
                'target_time': session.target_time.isoformat() if session.target_time else None,
                'actual_start_time': session.actual_start_time.isoformat() if session.actual_start_time else None,
                'is_active': session.is_active,
                'created_at': session.created_at.isoformat() if session.created_at else None
            },
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Cooking session started',
            'session': session.to_dict(include_timers=True)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['GET'])
@family_member_required
def get_active_sessions(family_id):
    """Get all active cooking sessions for a family"""
    sessions = CookingSession.query.filter_by(
        family_id=family_id,
        is_active=True
    ).all()

    return jsonify({
        'sessions': [s.to_dict(include_timers=True) for s in sessions]
    }), 200


@bp.route('/<int:session_id>', methods=['GET'])
@family_member_required
def get_session(family_id, session_id):
    """Get cooking session details"""
    session = CookingSession.get_by_id(session_id)

    if not session or session.family_id != family_id:
        return jsonify({'error': 'Session not found'}), 404

    return jsonify({'session': session.to_dict(include_timers=True)}), 200


@bp.route('/<int:session_id>/complete', methods=['POST'])
@family_member_required
def complete_session(family_id, session_id):
    """Mark cooking session as complete"""
    session = CookingSession.get_by_id(session_id)

    if not session or session.family_id != family_id:
        return jsonify({'error': 'Session not found'}), 404

    session.completed_at = datetime.utcnow()
    session.is_active = False

    try:
        session.save()

        # Stop all active timers
        for timer in session.active_timers:
            if timer.is_active:
                timer.completed_at = datetime.utcnow()
                timer.is_active = False
                timer.save()

        # Broadcast completion (minimal payload - no nested objects)
        socketio.emit(
            'cooking_session_completed',
            {
                'id': session.id,
                'recipe_id': session.recipe_id,
                'family_id': session.family_id,
                'completed_at': session.completed_at.isoformat() if session.completed_at else None,
                'is_active': session.is_active,
                'duration': session.duration
            },
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Cooking session completed',
            'session': session.to_dict(include_timers=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:session_id>/timers', methods=['POST'])
@family_member_required
def start_timer(family_id, session_id):
    """Start a new timer in a cooking session"""
    session = CookingSession.get_by_id(session_id)

    if not session or session.family_id != family_id:
        return jsonify({'error': 'Session not found'}), 404

    data = request.get_json()

    if not data.get('name') or not data.get('duration'):
        return jsonify({'error': 'Timer name and duration required'}), 400

    timer = ActiveTimer(
        cooking_session_id=session_id,
        name=data['name'],
        duration=data['duration'],  # in seconds
        started_at=datetime.utcnow()
    )

    try:
        timer.save()

        # Broadcast timer started
        socketio.emit(
            'timer_started',
            {
                'timer': timer.to_dict(),
                'session_id': session_id,
                'family_id': family_id
            },
            room=f"family_{family_id}"
        )

        # Schedule timer completion (handled by timer service)
        from app.services.timer_service import schedule_timer_completion
        schedule_timer_completion(timer.id, data['duration'], family_id)

        return jsonify({
            'message': 'Timer started',
            'timer': timer.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:session_id>/timers/<int:timer_id>/pause', methods=['POST'])
@family_member_required
def pause_timer(family_id, session_id, timer_id):
    """Pause an active timer"""
    timer = ActiveTimer.get_by_id(timer_id)

    if not timer or timer.cooking_session.family_id != family_id:
        return jsonify({'error': 'Timer not found'}), 404

    if timer.is_paused or timer.is_completed:
        return jsonify({'error': 'Timer is not running'}), 400

    timer.paused_at = datetime.utcnow()
    timer.remaining_time = timer.get_remaining_time()

    try:
        timer.save()

        # Broadcast timer paused
        socketio.emit(
            'timer_paused',
            {
                'timer': timer.to_dict(),
                'session_id': session_id,
                'family_id': family_id
            },
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Timer paused',
            'timer': timer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:session_id>/timers/<int:timer_id>/resume', methods=['POST'])
@family_member_required
def resume_timer(family_id, session_id, timer_id):
    """Resume a paused timer"""
    timer = ActiveTimer.get_by_id(timer_id)

    if not timer or timer.cooking_session.family_id != family_id:
        return jsonify({'error': 'Timer not found'}), 404

    if not timer.is_paused:
        return jsonify({'error': 'Timer is not paused'}), 400

    # Reset timer with remaining time
    timer.started_at = datetime.utcnow()
    timer.paused_at = None
    timer.duration = timer.remaining_time

    try:
        timer.save()

        # Broadcast timer resumed
        socketio.emit(
            'timer_resumed',
            {
                'timer': timer.to_dict(),
                'session_id': session_id,
                'family_id': family_id
            },
            room=f"family_{family_id}"
        )

        # Reschedule completion
        from app.services.timer_service import schedule_timer_completion
        schedule_timer_completion(timer.id, timer.duration, family_id)

        return jsonify({
            'message': 'Timer resumed',
            'timer': timer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:session_id>/timers/<int:timer_id>/cancel', methods=['POST'])
@family_member_required
def cancel_timer(family_id, session_id, timer_id):
    """Cancel an active timer"""
    timer = ActiveTimer.get_by_id(timer_id)

    if not timer or timer.cooking_session.family_id != family_id:
        return jsonify({'error': 'Timer not found'}), 404

    timer.completed_at = datetime.utcnow()
    timer.is_active = False

    try:
        timer.save()

        # Broadcast timer cancelled
        socketio.emit(
            'timer_cancelled',
            {
                'timer_id': timer_id,
                'session_id': session_id,
                'family_id': family_id
            },
            room=f"family_{family_id}"
        )

        return jsonify({
            'message': 'Timer cancelled',
            'timer': timer.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
