"""
Logging configuration for MealTogether application
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime


def setup_logger(app):
    """
    Configure application logging with file and console handlers

    Args:
        app: Flask application instance
    """
    # Get log level from environment
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_dir = os.getenv('LOG_DIR', 'logs')

    # Create logs directory if it doesn't exist
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Configure log format
    log_format = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # File handler for all logs
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setLevel(getattr(logging, log_level))
    file_handler.setFormatter(log_format)

    # File handler for errors only
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'error.log'),
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(log_format)

    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level))
    console_handler.setFormatter(log_format)

    # Configure app logger
    app.logger.setLevel(getattr(logging, log_level))
    app.logger.addHandler(file_handler)
    app.logger.addHandler(error_handler)
    app.logger.addHandler(console_handler)

    # Log startup
    app.logger.info(f'MealTogether application started - Log level: {log_level}')

    return app.logger


def log_request(logger):
    """
    Decorator to log API requests

    Args:
        logger: Logger instance
    """
    def decorator(f):
        from functools import wraps
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask import request
            logger.info(f'{request.method} {request.path} - User: {request.remote_addr}')
            try:
                result = f(*args, **kwargs)
                return result
            except Exception as e:
                logger.error(f'Error in {f.__name__}: {str(e)}', exc_info=True)
                raise
        return decorated_function
    return decorator


def log_db_operation(logger, operation):
    """
    Log database operations

    Args:
        logger: Logger instance
        operation: Description of the operation
    """
    logger.debug(f'DB Operation: {operation}')


def log_websocket_event(logger, event_name, data=None):
    """
    Log WebSocket events

    Args:
        logger: Logger instance
        event_name: Name of the event
        data: Optional event data
    """
    if data:
        logger.debug(f'WebSocket Event: {event_name} - Data: {data}')
    else:
        logger.debug(f'WebSocket Event: {event_name}')
