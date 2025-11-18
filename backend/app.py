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
    debug = os.getenv('FLASK_ENV') != 'production'
    # Only allow unsafe Werkzeug in development
    allow_unsafe = debug and os.getenv('FLASK_ENV') == 'development'
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=allow_unsafe
    )
