"""
Recipe models including ingredients, steps, and timers
"""
from app import db
from app.models.base import BaseModel


class Recipe(BaseModel):
    """Recipe model for meal planning"""
    __tablename__ = 'recipes'

    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    prep_time = db.Column(db.Integer, nullable=False)  # minutes
    cook_time = db.Column(db.Integer, nullable=False)  # minutes
    servings = db.Column(db.Integer, default=4)
    image_url = db.Column(db.String(500))
    source_url = db.Column(db.String(500))

    # Foreign keys
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=True)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    family = db.relationship('Family', back_populates='recipes')
    assigned_to = db.relationship('User')
    ingredients = db.relationship('Ingredient', back_populates='recipe', cascade='all, delete-orphan', order_by='Ingredient.order')
    steps = db.relationship('CookingStep', back_populates='recipe', cascade='all, delete-orphan', order_by='CookingStep.order')
    timers = db.relationship('RecipeTimer', back_populates='recipe', cascade='all, delete-orphan')
    cooking_sessions = db.relationship('CookingSession', back_populates='recipe')

    @property
    def total_time(self):
        """Calculate total time in minutes"""
        return self.prep_time + self.cook_time

    def to_dict(self, include_details=False):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'name': self.name,
            'description': self.description,
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'total_time': self.total_time,
            'servings': self.servings,
            'image_url': self.image_url,
            'source_url': self.source_url,
            'family_id': self.family_id,
            'assigned_to_id': self.assigned_to_id,
            'assigned_to': self.assigned_to.to_dict() if self.assigned_to else None,
        })
        if include_details:
            data['ingredients'] = [ing.to_dict() for ing in self.ingredients]
            data['steps'] = [step.to_dict() for step in self.steps]
            data['timers'] = [timer.to_dict() for timer in self.timers]
        return data

    def __repr__(self):
        return f'<Recipe {self.name}>'


class Ingredient(BaseModel):
    """Ingredient for a recipe"""
    __tablename__ = 'ingredients'

    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.String(50))  # e.g., "2 cups", "1 lb"
    order = db.Column(db.Integer, default=0)

    # Relationships
    recipe = db.relationship('Recipe', back_populates='ingredients')

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'recipe_id': self.recipe_id,
            'name': self.name,
            'quantity': self.quantity,
            'order': self.order,
        })
        return data

    def __repr__(self):
        return f'<Ingredient {self.quantity} {self.name}>'


class CookingStep(BaseModel):
    """Step-by-step cooking instructions"""
    __tablename__ = 'cooking_steps'

    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    instruction = db.Column(db.Text, nullable=False)
    order = db.Column(db.Integer, default=0)
    estimated_time = db.Column(db.Integer)  # minutes (optional)

    # Relationships
    recipe = db.relationship('Recipe', back_populates='steps')

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'recipe_id': self.recipe_id,
            'instruction': self.instruction,
            'order': self.order,
            'estimated_time': self.estimated_time,
        })
        return data

    def __repr__(self):
        return f'<CookingStep {self.order}: {self.instruction[:30]}...>'


class RecipeTimer(BaseModel):
    """Predefined timers for a recipe"""
    __tablename__ = 'recipe_timers'

    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # seconds
    step_order = db.Column(db.Integer)  # Which step this timer belongs to (optional)

    # Relationships
    recipe = db.relationship('Recipe', back_populates='timers')

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'recipe_id': self.recipe_id,
            'name': self.name,
            'duration': self.duration,
            'step_order': self.step_order,
        })
        return data

    def __repr__(self):
        return f'<RecipeTimer {self.name} ({self.duration}s)>'
