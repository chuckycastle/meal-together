"""
Health check and monitoring endpoints
"""
from flask import Blueprint, jsonify
from datetime import datetime
from app import db
from sqlalchemy import text
import os

bp = Blueprint('health', __name__, url_prefix='/api')


@bp.route('/health', methods=['GET'])
def health_check():
    """
    Basic health check endpoint

    Returns:
        200: Service is healthy
        503: Service is unhealthy
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@bp.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """
    Detailed health check including database connectivity

    Returns:
        200: All systems healthy
        503: One or more systems unhealthy
    """
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'checks': {}
    }

    # Check database connectivity
    try:
        db.session.execute(text('SELECT 1'))
        health_status['checks']['database'] = {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['checks']['database'] = {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }

    # Check application environment
    health_status['checks']['environment'] = {
        'status': 'healthy',
        'environment': os.getenv('FLASK_ENV', 'production'),
        'debug': os.getenv('FLASK_DEBUG', 'False')
    }

    # Overall status code
    status_code = 200 if health_status['status'] == 'healthy' else 503

    return jsonify(health_status), status_code


@bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """
    Readiness check for Kubernetes/Docker

    Returns:
        200: Service is ready to accept traffic
        503: Service is not ready
    """
    try:
        # Check if database is accessible
        db.session.execute(text('SELECT 1'))

        return jsonify({
            'status': 'ready',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


@bp.route('/health/live', methods=['GET'])
def liveness_check():
    """
    Liveness check for Kubernetes/Docker

    Returns:
        200: Service is alive
    """
    return jsonify({
        'status': 'alive',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@bp.route('/metrics', methods=['GET'])
def metrics():
    """
    Basic application metrics

    Returns:
        200: Metrics data
    """
    try:
        # Get database stats
        from app.models.user import User
        from app.models.family import Family
        from app.models.recipe import Recipe
        from app.models.shopping_list import ShoppingList

        metrics_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'database': {
                'users': User.query.count(),
                'families': Family.query.count(),
                'recipes': Recipe.query.count(),
                'shopping_lists': ShoppingList.query.count()
            },
            'system': {
                'environment': os.getenv('FLASK_ENV', 'production')
            }
        }

        return jsonify(metrics_data), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to collect metrics',
            'message': str(e)
        }), 500
