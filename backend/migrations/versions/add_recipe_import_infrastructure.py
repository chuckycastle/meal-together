"""Add recipe import infrastructure

Revision ID: add_recipe_import_infra
Revises:
Create Date: 2025-11-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_recipe_import_infra'
down_revision = None  # Will be set to latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Create recipe import cache table
    op.create_table(
        'recipe_import_cache',
        sa.Column('url_hash', sa.Text(), nullable=False),
        sa.Column('recipe_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('cached_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('url_hash')
    )
    op.create_index('idx_recipe_cache_cleanup', 'recipe_import_cache', ['cached_at'])

    # Create circuit breaker state table
    op.create_table(
        'recipe_import_circuit_state',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('consecutive_failures', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_failure_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('is_open', sa.Boolean(), nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('id = 1', name='single_row')
    )

    # Insert initial row
    op.execute("INSERT INTO recipe_import_circuit_state (id) VALUES (1)")


def downgrade():
    op.drop_table('recipe_import_circuit_state')
    op.drop_index('idx_recipe_cache_cleanup', table_name='recipe_import_cache')
    op.drop_table('recipe_import_cache')
