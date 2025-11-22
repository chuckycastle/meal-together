"""
Pagination utilities for API endpoints
"""
from flask import request, jsonify
from typing import Any, Dict, List
from sqlalchemy.orm import Query


def get_pagination_params() -> Dict[str, int]:
    """
    Extract pagination parameters from request query string

    Returns:
        dict: Dictionary with 'page' and 'per_page' values
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    # Enforce limits
    page = max(1, page)  # Page must be >= 1
    per_page = min(max(1, per_page), 100)  # Between 1 and 100

    return {'page': page, 'per_page': per_page}


def paginate_query(query: Query, page: int, per_page: int) -> Dict[str, Any]:
    """
    Paginate a SQLAlchemy query

    Args:
        query: SQLAlchemy query object
        page: Page number (1-indexed)
        per_page: Items per page

    Returns:
        dict: Pagination metadata and items
    """
    # Get total count
    total = query.count()

    # Calculate pagination
    offset = (page - 1) * per_page
    items = query.limit(per_page).offset(offset).all()

    # Calculate total pages
    total_pages = (total + per_page - 1) // per_page  # Ceiling division

    return {
        'items': items,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }
    }


def create_paginated_response(
    items: List[Any],
    pagination: Dict[str, Any],
    item_key: str = 'items'
) -> tuple:
    """
    Create a standardized paginated JSON response

    Args:
        items: List of items (already serialized)
        pagination: Pagination metadata
        item_key: Key name for items in response

    Returns:
        tuple: (response_dict, status_code)
    """
    return jsonify({
        item_key: items,
        'pagination': pagination
    }), 200
