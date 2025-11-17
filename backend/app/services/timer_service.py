"""
Timer service for managing cooking timers
"""
import time
from datetime import datetime
from app import db, socketio
from app.models.cooking_session import ActiveTimer


def schedule_timer_completion(timer_id, duration, family_id):
    """
    Schedule a timer completion event
    Uses SocketIO background task to countdown
    """
    def countdown():
        # Sleep for the duration
        time.sleep(duration)

        # Get timer and check if still active
        timer = ActiveTimer.get_by_id(timer_id)
        if timer and timer.is_active and not timer.is_paused:
            # Mark as completed
            timer.completed_at = datetime.utcnow()
            timer.is_active = False
            timer.save()

            # Broadcast completion
            socketio.emit(
                'timer_completed',
                {
                    'timer': timer.to_dict(),
                    'session_id': timer.cooking_session_id,
                    'family_id': family_id
                },
                room=f"family_{family_id}"
            )

    # Start background task
    socketio.start_background_task(countdown)


def get_all_active_timers(family_id):
    """Get all active timers for a family"""
    from app.models.cooking_session import CookingSession

    sessions = CookingSession.query.filter_by(
        family_id=family_id,
        is_active=True
    ).all()

    timers = []
    for session in sessions:
        for timer in session.active_timers:
            if timer.is_active and not timer.is_completed:
                timers.append({
                    'timer': timer.to_dict(),
                    'session': session.to_dict(),
                    'recipe': session.recipe.to_dict()
                })

    return timers


def sync_timer_state(timer_id):
    """
    Sync timer state across all connected clients
    Useful for when a new client connects
    """
    timer = ActiveTimer.get_by_id(timer_id)
    if timer:
        family_id = timer.cooking_session.family_id
        socketio.emit(
            'timer_sync',
            timer.to_dict(),
            room=f"family_{family_id}"
        )
