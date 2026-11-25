"""Add meals, meal items, and family timers

Revision ID: a7d3c9e41b52
Revises: 614ffb04542f
Create Date: 2026-11-24 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7d3c9e41b52'
down_revision = '614ffb04542f'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'meals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('serve_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['family_id'], ['families.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_meals_family_id', 'meals', ['family_id'])

    op.create_table(
        'meal_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('meal_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=True),
        sa.Column('start_at', sa.DateTime(), nullable=True),
        sa.Column('color', sa.String(length=20), nullable=False),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('done_at', sa.DateTime(), nullable=True),
        sa.Column('done_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['meal_id'], ['meals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id']),
        sa.ForeignKeyConstraint(['done_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_meal_items_meal_id', 'meal_items', ['meal_id'])

    op.create_table(
        'family_timers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('family_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('anchor_at', sa.DateTime(), nullable=True),
        sa.Column('held_seconds', sa.Integer(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['family_id'], ['families.id']),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_family_timers_family_id', 'family_timers', ['family_id'])


def downgrade():
    op.drop_index('ix_family_timers_family_id', table_name='family_timers')
    op.drop_table('family_timers')
    op.drop_index('ix_meal_items_meal_id', table_name='meal_items')
    op.drop_table('meal_items')
    op.drop_index('ix_meals_family_id', table_name='meals')
    op.drop_table('meals')
