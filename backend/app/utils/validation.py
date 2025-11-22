"""
Input validation utilities for API endpoints
"""
from functools import wraps
from flask import request, jsonify
from typing import Dict, List, Any, Callable


class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


def validate_required_fields(required_fields: List[str]):
    """
    Decorator to validate required fields in request JSON

    Args:
        required_fields: List of required field names

    Returns:
        Decorator function
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()

            if not data:
                return jsonify({'error': 'Request body is required'}), 400

            missing_fields = [field for field in required_fields if field not in data]

            if missing_fields:
                return jsonify({
                    'error': 'Missing required fields',
                    'missing_fields': missing_fields
                }), 400

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_field_types(field_types: Dict[str, type]):
    """
    Decorator to validate field types in request JSON

    Args:
        field_types: Dictionary mapping field names to expected types

    Returns:
        Decorator function
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()

            if not data:
                return f(*args, **kwargs)

            invalid_fields = {}

            for field, expected_type in field_types.items():
                if field in data and not isinstance(data[field], expected_type):
                    invalid_fields[field] = f'Expected {expected_type.__name__}, got {type(data[field]).__name__}'

            if invalid_fields:
                return jsonify({
                    'error': 'Invalid field types',
                    'invalid_fields': invalid_fields
                }), 400

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_email(email: str) -> bool:
    """
    Validate email format

    Args:
        email: Email address to validate

    Returns:
        True if valid, False otherwise
    """
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 8:
        return False, 'Password must be at least 8 characters long'

    if not any(c.isupper() for c in password):
        return False, 'Password must contain at least one uppercase letter'

    if not any(c.islower() for c in password):
        return False, 'Password must contain at least one lowercase letter'

    if not any(c.isdigit() for c in password):
        return False, 'Password must contain at least one digit'

    return True, ''


def validate_string_length(value: str, min_length: int = None, max_length: int = None) -> tuple[bool, str]:
    """
    Validate string length

    Args:
        value: String to validate
        min_length: Minimum length (optional)
        max_length: Maximum length (optional)

    Returns:
        Tuple of (is_valid, error_message)
    """
    if min_length and len(value) < min_length:
        return False, f'Must be at least {min_length} characters long'

    if max_length and len(value) > max_length:
        return False, f'Must be at most {max_length} characters long'

    return True, ''


def validate_positive_number(value: int | float) -> tuple[bool, str]:
    """
    Validate that a number is positive

    Args:
        value: Number to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if value <= 0:
        return False, 'Must be a positive number'

    return True, ''


def sanitize_string(value: str) -> str:
    """
    Sanitize string input by removing dangerous characters

    Args:
        value: String to sanitize

    Returns:
        Sanitized string
    """
    # Remove null bytes and control characters
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')

    # Trim whitespace
    sanitized = sanitized.strip()

    return sanitized


def validate_json_schema(schema: Dict[str, Any]):
    """
    Decorator to validate request JSON against a schema

    Args:
        schema: Dictionary defining the expected schema
            Example: {
                'name': {'type': str, 'required': True, 'min_length': 1},
                'age': {'type': int, 'required': False, 'min': 0}
            }

    Returns:
        Decorator function
    """
    def decorator(f: Callable):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()

            if not data:
                required_fields = [k for k, v in schema.items() if v.get('required', False)]
                if required_fields:
                    return jsonify({'error': 'Request body is required'}), 400
                return f(*args, **kwargs)

            errors = {}

            # Check required fields
            for field, rules in schema.items():
                if rules.get('required', False) and field not in data:
                    errors[field] = 'This field is required'

            # Validate field types and constraints
            for field, value in data.items():
                if field not in schema:
                    continue

                rules = schema[field]
                expected_type = rules.get('type')

                # Type validation
                if expected_type and not isinstance(value, expected_type):
                    errors[field] = f'Expected {expected_type.__name__}'
                    continue

                # String validations
                if expected_type == str:
                    if 'min_length' in rules and len(value) < rules['min_length']:
                        errors[field] = f'Must be at least {rules["min_length"]} characters'
                    elif 'max_length' in rules and len(value) > rules['max_length']:
                        errors[field] = f'Must be at most {rules["max_length"]} characters'

                # Number validations
                if expected_type in (int, float):
                    if 'min' in rules and value < rules['min']:
                        errors[field] = f'Must be at least {rules["min"]}'
                    elif 'max' in rules and value > rules['max']:
                        errors[field] = f'Must be at most {rules["max"]}'

            if errors:
                return jsonify({
                    'error': 'Validation failed',
                    'validation_errors': errors
                }), 400

            return f(*args, **kwargs)
        return decorated_function
    return decorator
