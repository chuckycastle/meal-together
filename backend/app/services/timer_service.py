"""
Timer service for managing cooking timers with Celery
"""
from datetime import datetime
from celery_app import celery
from app.models.cooking_session import ActiveTimer


@celery.task(name='app.services.timer_service.complete_timer')
def complete_timer(timer_id, family_id):
    """
    Celery task to mark timer as completed and broadcast event
    This runs after the countdown delay
    """
    from app import db, socketio

    # Get timer and check if still active
    timer = ActiveTimer.get_by_id(timer_id)
    if timer and timer.is_active and not timer.is_paused:
        # Mark as completed
        timer.completed_at = datetime.utcnow()
        timer.is_active = False
        timer.save()

        # Broadcast completion via WebSocket
        socketio.emit(
            'timer_completed',
            {
                'timer': timer.to_dict(),
                'session_id': timer.cooking_session_id,
                'family_id': family_id
            },
            room=f"family_{family_id}"
        )


def schedule_timer_completion(timer_id, duration, family_id):
    """
    Schedule a timer completion event using Celery

    Args:
        timer_id: ID of the timer to complete
        duration: Seconds until timer completes
        family_id: Family ID for WebSocket room broadcasting
    """
    # Schedule the task to run after 'duration' seconds
    complete_timer.apply_async(
        args=[timer_id, family_id],
        countdown=duration
    )


def cancel_timer(timer_id):
    """
    Cancel a scheduled timer
    Note: Celery doesn't easily support canceling individual tasks,
    so we rely on the timer's is_active flag in the database
    """
    timer = ActiveTimer.get_by_id(timer_id)
    if timer:
        timer.is_active = False
        timer.save()


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
    from app import socketio

    timer = ActiveTimer.get_by_id(timer_id)
    if timer:
        family_id = timer.cooking_session.family_id
        socketio.emit(
            'timer_sync',
            timer.to_dict(),
            room=f"family_{family_id}"
        )
