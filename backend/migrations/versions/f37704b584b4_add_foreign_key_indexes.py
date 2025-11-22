"""add_foreign_key_indexes

Revision ID: f37704b584b4
Revises: fc71cad84295
Create Date: 2025-11-22 00:25:13.473973

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f37704b584b4'
down_revision = 'fc71cad84295'
branch_labels = None
depends_on = None


def upgrade():
    # FamilyMember indexes
    op.create_index('ix_family_members_family_id', 'family_members', ['family_id'])
    op.create_index('ix_family_members_user_id', 'family_members', ['user_id'])

    # Recipe indexes
    op.create_index('ix_recipes_family_id', 'recipes', ['family_id'])
    op.create_index('ix_recipes_assigned_to_id', 'recipes', ['assigned_to_id'])

    # Ingredient indexes
    op.create_index('ix_ingredients_recipe_id', 'ingredients', ['recipe_id'])

    # CookingStep indexes
    op.create_index('ix_cooking_steps_recipe_id', 'cooking_steps', ['recipe_id'])

    # RecipeTimer indexes
    op.create_index('ix_recipe_timers_recipe_id', 'recipe_timers', ['recipe_id'])

    # ShoppingList indexes
    op.create_index('ix_shopping_lists_family_id', 'shopping_lists', ['family_id'])
    op.create_index('ix_shopping_lists_is_active', 'shopping_lists', ['is_active'])

    # ShoppingListItem indexes
    op.create_index('ix_shopping_list_items_shopping_list_id', 'shopping_list_items', ['shopping_list_id'])
    op.create_index('ix_shopping_list_items_added_by_id', 'shopping_list_items', ['added_by_id'])
    op.create_index('ix_shopping_list_items_checked_by_id', 'shopping_list_items', ['checked_by_id'])
    op.create_index('ix_shopping_list_items_checked', 'shopping_list_items', ['checked'])
    op.create_index('ix_shopping_list_items_category', 'shopping_list_items', ['category'])

    # CookingSession indexes
    op.create_index('ix_cooking_sessions_recipe_id', 'cooking_sessions', ['recipe_id'])
    op.create_index('ix_cooking_sessions_family_id', 'cooking_sessions', ['family_id'])
    op.create_index('ix_cooking_sessions_started_by_id', 'cooking_sessions', ['started_by_id'])
    op.create_index('ix_cooking_sessions_is_active', 'cooking_sessions', ['is_active'])

    # ActiveTimer indexes
    op.create_index('ix_active_timers_cooking_session_id', 'active_timers', ['cooking_session_id'])
    op.create_index('ix_active_timers_is_active', 'active_timers', ['is_active'])

    # Composite indexes for common query patterns
    op.create_index('ix_shopping_lists_family_active', 'shopping_lists', ['family_id', 'is_active'])
    op.create_index('ix_cooking_sessions_family_active', 'cooking_sessions', ['family_id', 'is_active'])


def downgrade():
    # Drop composite indexes
    op.drop_index('ix_cooking_sessions_family_active')
    op.drop_index('ix_shopping_lists_family_active')

    # Drop ActiveTimer indexes
    op.drop_index('ix_active_timers_is_active')
    op.drop_index('ix_active_timers_cooking_session_id')

    # Drop CookingSession indexes
    op.drop_index('ix_cooking_sessions_is_active')
    op.drop_index('ix_cooking_sessions_started_by_id')
    op.drop_index('ix_cooking_sessions_family_id')
    op.drop_index('ix_cooking_sessions_recipe_id')

    # Drop ShoppingListItem indexes
    op.drop_index('ix_shopping_list_items_category')
    op.drop_index('ix_shopping_list_items_checked')
    op.drop_index('ix_shopping_list_items_checked_by_id')
    op.drop_index('ix_shopping_list_items_added_by_id')
    op.drop_index('ix_shopping_list_items_shopping_list_id')

    # Drop ShoppingList indexes
    op.drop_index('ix_shopping_lists_is_active')
    op.drop_index('ix_shopping_lists_family_id')

    # Drop RecipeTimer indexes
    op.drop_index('ix_recipe_timers_recipe_id')

    # Drop CookingStep indexes
    op.drop_index('ix_cooking_steps_recipe_id')

    # Drop Ingredient indexes
    op.drop_index('ix_ingredients_recipe_id')

    # Drop Recipe indexes
    op.drop_index('ix_recipes_assigned_to_id')
    op.drop_index('ix_recipes_family_id')

    # Drop FamilyMember indexes
    op.drop_index('ix_family_members_user_id')
    op.drop_index('ix_family_members_family_id')
