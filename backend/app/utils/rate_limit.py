"""
Rate limiting utilities for API endpoints
"""
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta
from typing import Dict, Callable
import time


# In-memory storage for rate limiting (use Redis in production)
_rate_limit_storage: Dict[str, Dict[str, any]] = {}


def get_client_identifier():
    """
    Get unique identifier for the client

    Returns:
        str: Client identifier (IP address or user token)
    """
    # Try to get from JWT first
    from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return f'user:{user_id}'
    except:
        pass

    # Fall back to IP address
    return f'ip:{request.remote_addr}'


def rate_limit(max_requests: int = 100, window_seconds: int = 60, key_prefix: str = ''):
    """
    Decorator to implement rate limiting

    Args:
        max_requests: Maximum number of requests allowed in the time window
        window_seconds: Time window in seconds
        key_prefix: Optional prefix for the rate limit key

    Returns:
        Decorator function
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client identifier
            client_id = get_client_identifier()
            rate_limit_key = f'{key_prefix}:{client_id}' if key_prefix else client_id

            current_time = time.time()

            # Initialize storage for this key if not exists
            if rate_limit_key not in _rate_limit_storage:
                _rate_limit_storage[rate_limit_key] = {
                    'requests': [],
                    'reset_time': current_time + window_seconds
                }

            storage = _rate_limit_storage[rate_limit_key]

            # Clean up old requests outside the window
            storage['requests'] = [
                req_time for req_time in storage['requests']
                if current_time - req_time < window_seconds
            ]

            # Check if rate limit exceeded
            if len(storage['requests']) >= max_requests:
                retry_after = int(storage['reset_time'] - current_time)
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Please try again in {retry_after} seconds.',
                    'retry_after': retry_after
                }), 429

            # Add current request
            storage['requests'].append(current_time)

            # Update reset time if needed
            if current_time >= storage['reset_time']:
                storage['reset_time'] = current_time + window_seconds

            # Add rate limit headers
            response = f(*args, **kwargs)

            if isinstance(response, tuple):
                data, status_code = response
            else:
                data = response
                status_code = 200

            # Add headers if response is a tuple (jsonify returns Response object)
            try:
                if hasattr(data, 'headers'):
                    data.headers['X-RateLimit-Limit'] = str(max_requests)
                    data.headers['X-RateLimit-Remaining'] = str(max_requests - len(storage['requests']))
                    data.headers['X-RateLimit-Reset'] = str(int(storage['reset_time']))
            except:
                pass

            return data, status_code if isinstance(response, tuple) else data

        return decorated_function
    return decorator


def cleanup_rate_limit_storage():
    """
    Clean up expired rate limit storage entries
    Should be called periodically by a background task
    """
    current_time = time.time()
    expired_keys = []

    for key, storage in _rate_limit_storage.items():
        # Remove if no requests in the last 2x window
        if storage['requests'] and current_time - storage['requests'][-1] > 120:
            expired_keys.append(key)

    for key in expired_keys:
        del _rate_limit_storage[key]


# Predefined rate limiters for different endpoint types
def api_rate_limit(f: Callable):
    """Standard API rate limit: 100 requests per minute"""
    return rate_limit(max_requests=100, window_seconds=60, key_prefix='api')(f)


def auth_rate_limit(f: Callable):
    """Auth endpoint rate limit: 5 requests per minute"""
    return rate_limit(max_requests=5, window_seconds=60, key_prefix='auth')(f)


def strict_rate_limit(f: Callable):
    """Strict rate limit: 10 requests per minute"""
    return rate_limit(max_requests=10, window_seconds=60, key_prefix='strict')(f)
