"""
MealTogether - Entry point for the Flask application
"""
import os
from app import create_app, socketio, db

app = create_app()

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()

    # Run with SocketIO
    port = int(os.getenv('PORT', 5000))
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=True,
        allow_unsafe_werkzeug=True  # Only for development
    )
