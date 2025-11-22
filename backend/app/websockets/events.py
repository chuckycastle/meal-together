"""
WebSocket events for real-time collaboration
Based on dirtview's successful WebSocket implementation
"""
from datetime import datetime
from flask import request, session
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token
from app.models.user import User
from app.models.family import Family
from app.services.timer_service import get_all_active_timers


def register_events(socketio):
    """Register all WebSocket event handlers"""

    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        print(f"Client connected: {request.sid}")
        emit('connected', {'status': 'connected', 'sid': request.sid})

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        print(f"Client disconnected: {request.sid}")

    @socketio.on('authenticate')
    def handle_authenticate(data):
        """Authenticate WebSocket connection with JWT token"""
        try:
            token = data.get('token')
            if not token:
                emit('error', {'message': 'Token required'})
                disconnect()
                return

            # Decode JWT token
            decoded = decode_token(token)
            user_id = decoded['sub']

            # Verify user exists
            user = User.get_by_id(user_id)
            if not user:
                emit('error', {'message': 'User not found'})
                disconnect()
                return

            # Store user_id in Flask session
            session['user_id'] = user_id

            emit('authenticated', {
                'user_id': user.id,
                'user_name': user.name,
                'user_email': user.email,
                'message': 'Successfully authenticated'
            })

        except Exception as e:
            print(f"Authentication error: {str(e)}")
            emit('error', {'message': 'Authentication failed'})
            disconnect()

    @socketio.on('join_family')
    def handle_join_family(data):
        """Join a family room for real-time updates"""
        try:
            family_id = data.get('family_id')
            if not family_id:
                emit('error', {'message': 'Family ID required'})
                return

            # Get user from session (set during authentication)
            user_id = session.get('user_id')
            if not user_id:
                emit('error', {'message': 'Not authenticated'})
                return

            # Verify family membership
            family = Family.get_by_id(family_id)
            if not family or not family.is_member(user_id):
                emit('error', {'message': 'Not a member of this family'})
                return

            # Join the room
            room = f"family_{family_id}"
            join_room(room)

            # Send current state (minimal payload - frontend already has family data)
            active_timers = get_all_active_timers(family_id)

            emit('joined_family', {
                'family_id': family_id,
                'family_name': family.name,
                'active_timers': active_timers,
                'message': f'Joined family: {family.name}'
            })

            # Notify other family members
            emit('user_joined', {
                'user_id': user_id,
                'family_id': family_id
            }, room=room, skip_sid=request.sid)

        except Exception as e:
            print(f"Join family error: {str(e)}")
            emit('error', {'message': 'Failed to join family'})

    @socketio.on('leave_family')
    def handle_leave_family(data):
        """Leave a family room"""
        try:
            family_id = data.get('family_id')
            if not family_id:
                emit('error', {'message': 'Family ID required'})
                return

            room = f"family_{family_id}"
            leave_room(room)

            user_id = session.get('user_id')

            emit('left_family', {
                'family_id': family_id,
                'message': 'Left family room'
            })

            # Notify other family members
            if user_id:
                emit('user_left', {
                    'user_id': user_id,
                    'family_id': family_id
                }, room=room)

        except Exception as e:
            print(f"Leave family error: {str(e)}")
            emit('error', {'message': 'Failed to leave family'})

    @socketio.on('ping')
    def handle_ping():
        """Health check ping/pong"""
        emit('pong', {'timestamp': str(request.timestamp) if hasattr(request, 'timestamp') else None})

    @socketio.on('typing')
    def handle_typing(data):
        """Handle typing indicators (e.g., in shopping list)"""
        try:
            family_id = data.get('family_id')
            user_id = session.get('user_id')

            if not family_id or not user_id:
                return

            user = User.get_by_id(user_id)

            # Broadcast to family (excluding sender) - minimal payload
            emit('user_typing', {
                'user_id': user_id,
                'user_name': user.name,
                'location': data.get('location'),  # e.g., 'shopping_list', 'recipe'
                'item_id': data.get('item_id')
            }, room=f"family_{family_id}", skip_sid=request.sid)

        except Exception as e:
            print(f"Typing indicator error: {str(e)}")

    @socketio.on('request_sync')
    def handle_request_sync(data):
        """Request full state synchronization"""
        try:
            family_id = data.get('family_id')
            if not family_id:
                emit('error', {'message': 'Family ID required'})
                return

            # Send all active timers
            active_timers = get_all_active_timers(family_id)

            emit('sync_response', {
                'family_id': family_id,
                'active_timers': active_timers,
                'timestamp': datetime.utcnow().isoformat()
            })

        except Exception as e:
            print(f"Sync request error: {str(e)}")
            emit('error', {'message': 'Sync failed'})

    @socketio.on_error_default
    def default_error_handler(e):
        """Handle errors"""
        print(f"WebSocket error: {str(e)}")
        emit('error', {'message': 'An error occurred'})
