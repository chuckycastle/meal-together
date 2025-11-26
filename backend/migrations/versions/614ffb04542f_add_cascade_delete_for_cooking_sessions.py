"""Add cascade delete for cooking sessions

Revision ID: 614ffb04542f
Revises: c229d51e9f38
Create Date: 2025-11-26 20:39:11.750070

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '614ffb04542f'
down_revision = 'c229d51e9f38'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the existing foreign key constraint
    op.drop_constraint('cooking_sessions_recipe_id_fkey', 'cooking_sessions', type_='foreignkey')

    # Recreate the foreign key with CASCADE delete
    op.create_foreign_key(
        'cooking_sessions_recipe_id_fkey',
        'cooking_sessions',
        'recipes',
        ['recipe_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Drop the CASCADE foreign key
    op.drop_constraint('cooking_sessions_recipe_id_fkey', 'cooking_sessions', type_='foreignkey')

    # Recreate the original foreign key without CASCADE
    op.create_foreign_key(
        'cooking_sessions_recipe_id_fkey',
        'cooking_sessions',
        'recipes',
        ['recipe_id'],
        ['id']
    )
