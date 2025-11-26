"""Merge recipe import migration with main

Revision ID: c229d51e9f38
Revises: add_recipe_import_infra, a1b2c3d4e5f6
Create Date: 2025-11-26 09:53:01.974096

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c229d51e9f38'
down_revision = ('add_recipe_import_infra', 'a1b2c3d4e5f6')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
