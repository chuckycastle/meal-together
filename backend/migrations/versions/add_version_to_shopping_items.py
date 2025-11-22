"""Add version column to shopping_list_items for optimistic locking

Revision ID: a1b2c3d4e5f6
Revises: f37704b584b4
Create Date: 2025-11-22

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic
revision = 'a1b2c3d4e5f6'
down_revision = 'f37704b584b4'
branch_labels = None
depends_on = None


def upgrade():
    # Add version column with default value of 1
    op.add_column('shopping_list_items',
        sa.Column('version', sa.Integer(), nullable=False, server_default='1')
    )


def downgrade():
    # Remove version column
    op.drop_column('shopping_list_items', 'version')
