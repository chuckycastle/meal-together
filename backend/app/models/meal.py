"""
Meal plan models: a meal with a serve time and the items scheduled before it
"""
from datetime import timedelta
from app import db
from app.models.base import BaseModel

ITEM_KINDS = ('dish', 'event')
ITEM_COLORS = ('red', 'orange', 'brown', 'green', 'tan', 'ink')


def iso_utc(value):
    """Serialize a naive UTC datetime with an explicit UTC marker"""
    return f'{value.isoformat()}Z' if value else None


class Meal(BaseModel):
    """A planned meal, such as a holiday dinner, with a target serve time"""
    __tablename__ = 'meals'

    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    serve_at = db.Column(db.DateTime, nullable=False)  # naive UTC
    notes = db.Column(db.Text)

    # Relationships
    family = db.relationship('Family', back_populates='meals')
    items = db.relationship(
        'MealItem',
        back_populates='meal',
        cascade='all, delete-orphan',
        order_by='MealItem.start_at, MealItem.id'
    )

    def to_dict(self, include_items=True):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'family_id': self.family_id,
            'name': self.name,
            'serve_at': iso_utc(self.serve_at),
            'notes': self.notes,
        })
        if include_items:
            data['items'] = [item.to_dict() for item in self.items]
        return data

    def __repr__(self):
        return f'<Meal {self.name}>'


class MealItem(BaseModel):
    """A dish or an event on the day of a meal"""
    __tablename__ = 'meal_items'

    meal_id = db.Column(db.Integer, db.ForeignKey('meals.id', ondelete='CASCADE'), nullable=False, index=True)
    kind = db.Column(db.String(20), nullable=False, default='dish')
    title = db.Column(db.String(255), nullable=False)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id', ondelete='SET NULL'), nullable=True)
    start_at = db.Column(db.DateTime, nullable=True)  # naive UTC
    color = db.Column(db.String(20), nullable=False, default='ink')
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    done_at = db.Column(db.DateTime, nullable=True)
    done_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    meal = db.relationship('Meal', back_populates='items')
    recipe = db.relationship('Recipe')
    assigned_to = db.relationship('User', foreign_keys=[assigned_to_id])
    done_by = db.relationship('User', foreign_keys=[done_by_id])

    def suggested_start(self):
        """Start time that finishes the recipe at the meal's serve time"""
        if not self.recipe or not self.meal:
            return None
        total = (self.recipe.prep_time or 0) + (self.recipe.cook_time or 0)
        return self.meal.serve_at - timedelta(minutes=total)

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        recipe = self.recipe
        data.update({
            'meal_id': self.meal_id,
            'kind': self.kind,
            'title': self.title,
            'recipe_id': self.recipe_id,
            'recipe': {
                'id': recipe.id,
                'name': recipe.name,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'total_time': recipe.total_time,
                'servings': recipe.servings,
                'timers': [
                    {'id': t.id, 'name': t.name, 'duration': t.duration, 'step_order': t.step_order}
                    for t in recipe.timers
                ],
            } if recipe else None,
            'start_at': iso_utc(self.start_at),
            'color': self.color,
            'assigned_to_id': self.assigned_to_id,
            'assigned_to': self.assigned_to.to_dict() if self.assigned_to else None,
            'done': self.done_at is not None,
            'done_at': iso_utc(self.done_at),
            'done_by_id': self.done_by_id,
        })
        return data

    def __repr__(self):
        return f'<MealItem {self.title}>'
