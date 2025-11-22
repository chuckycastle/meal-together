"""
MealTogether - Collaborative Meal Planning Application
Flask application factory and initialization
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO(cors_allowed_origins="*")


def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://localhost/meal_together_dev')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 2592000))

    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(app, async_mode='threading', cors_allowed_origins="*")

    # CORS configuration
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    CORS(app, resources={
        r"/api/*": {
            "origins": [frontend_url],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Authorization", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
            "supports_credentials": True
        }
    })

    # Register blueprints
    from app.routes import auth, families, recipes, shopping_lists, cooking_sessions, health
    app.register_blueprint(auth.bp)
    app.register_blueprint(families.bp)
    app.register_blueprint(recipes.bp)
    app.register_blueprint(shopping_lists.bp)
    app.register_blueprint(cooking_sessions.bp)
    app.register_blueprint(health.bp)

    # Register WebSocket events
    from app.websockets import events
    events.register_events(socketio)

    # Setup logging
    from app.utils.logger import setup_logger
    logger = setup_logger(app)

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy'}, 200

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        logger.warning(f'404 Not Found: {error}')
        return {'error': 'Not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f'500 Internal Server Error: {error}', exc_info=True)
        db.session.rollback()
        return {'error': 'Internal server error'}, 500

    return app
