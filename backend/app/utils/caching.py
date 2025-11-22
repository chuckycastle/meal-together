"""
Caching utilities for frequently accessed data
Reduces database load by caching stable data in Redis
"""
from app import cache
from app.models.user import User
from app.models.family import Family, FamilyMember
from app.models.recipe import Recipe
from app.models.shopping_list import ShoppingList


@cache.memoize(timeout=1800)  # 30 minutes - user data is stable
def get_user_by_id_cached(user_id):
    """
    Get user by ID with caching
    Used frequently in JWT auth validation
    """
    return User.get_by_id(user_id)


@cache.memoize(timeout=3600)  # 1 hour - family members rarely change
def get_family_members_cached(family_id):
    """
    Get all family members with user details
    Rarely changes so can cache for longer
    """
    members = FamilyMember.query.filter_by(family_id=family_id).all()
    return [member.to_dict() for member in members]


@cache.memoize(timeout=3600)  # 1 hour - family data is stable
def get_family_by_id_cached(family_id):
    """
    Get family by ID with caching
    Family metadata rarely changes
    """
    return Family.get_by_id(family_id)


@cache.memoize(timeout=600)  # 10 minutes - moderate update frequency
def get_family_recipe_count(family_id):
    """
    Get total recipe count for a family
    Used in dashboard and statistics
    """
    return Recipe.query.filter_by(family_id=family_id).count()


@cache.memoize(timeout=300)  # 5 minutes - shopping lists change frequently
def get_active_shopping_lists_cached(family_id):
    """
    Get active shopping lists for a family
    Shopping list metadata (not items)
    """
    lists = ShoppingList.query.filter_by(
        family_id=family_id,
        is_active=True
    ).all()
    return [sl.to_dict(include_items=False) for sl in lists]


def invalidate_user_cache(user_id):
    """Invalidate cached user data when user is updated"""
    cache.delete_memoized(get_user_by_id_cached, user_id)


def invalidate_family_cache(family_id):
    """Invalidate all family-related caches"""
    cache.delete_memoized(get_family_members_cached, family_id)
    cache.delete_memoized(get_family_by_id_cached, family_id)
    cache.delete_memoized(get_family_recipe_count, family_id)
    cache.delete_memoized(get_active_shopping_lists_cached, family_id)


def invalidate_family_members_cache(family_id):
    """Invalidate family members cache when membership changes"""
    cache.delete_memoized(get_family_members_cached, family_id)


def invalidate_recipe_cache(family_id):
    """Invalidate recipe-related caches"""
    cache.delete_memoized(get_family_recipe_count, family_id)


def invalidate_shopping_list_cache(family_id):
    """Invalidate shopping list caches"""
    cache.delete_memoized(get_active_shopping_lists_cached, family_id)
