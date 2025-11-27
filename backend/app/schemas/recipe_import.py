"""
Pydantic schemas for recipe import validation.
Schema aligned with database models and frontend types.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List


class ImportedIngredient(BaseModel):
    """Ingredient schema - matches database Ingredient model"""
    name: str = Field(..., min_length=1, max_length=200)
    quantity: str = Field(default="", max_length=100)


class ImportedStep(BaseModel):
    """Cooking step schema - matches database CookingStep model"""
    order: int = Field(..., ge=1, le=50)
    instruction: str = Field(..., min_length=1, max_length=500)
    estimated_time: Optional[int] = Field(None, ge=0, le=28800)  # minutes


class ImportedTimer(BaseModel):
    """Recipe timer schema - matches database RecipeTimer model"""
    name: str = Field(..., min_length=1, max_length=200)
    duration: int = Field(..., ge=1, le=28800)  # seconds
    step_order: Optional[int] = Field(None, ge=1, le=50)


class LLMTimer(BaseModel):
    """Timer schema from LLM output (duration in minutes, not seconds)"""
    description: str = Field(..., min_length=1, max_length=200)
    duration_minutes: int = Field(..., ge=1, le=28800)


class LLMNormalizedRecipe(BaseModel):
    """Schema for LLM output - simpler than ImportedRecipe, matches LLM prompt schema"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    prep_time_minutes: int = Field(default=0, ge=0, le=1440)
    cook_time_minutes: int = Field(default=0, ge=0, le=1440)
    servings: int = Field(default=4, ge=1, le=100)
    image_url: str = Field(default="", max_length=500)
    ingredients: List[ImportedIngredient] = Field(..., min_items=1, max_items=50)
    timers: List[LLMTimer] = Field(default_factory=list, max_items=20)

    @validator('ingredients')
    def truncate_ingredients(cls, v):
        """Hard limit to max 50 ingredients"""
        return v[:50]

    @validator('timers')
    def validate_and_truncate_timers(cls, v):
        """Validate timer format and truncate to max 20"""
        return v[:20]


class ImportedRecipe(BaseModel):
    """Complete recipe schema - matches database Recipe model fields"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    prep_time: int = Field(default=0, ge=0, le=1440)  # minutes (matches DB)
    cook_time: int = Field(default=0, ge=0, le=1440)  # minutes (matches DB)
    servings: int = Field(default=4, ge=1, le=100)
    image_url: str = Field(default="", max_length=500, description="Recipe image URL or empty string if not available")
    source_url: str
    ingredients: List[ImportedIngredient] = Field(..., min_items=1, max_items=50)
    steps: List[ImportedStep] = Field(..., min_items=1, max_items=30)
    timers: List[ImportedTimer] = Field(default_factory=list, max_items=20)

    @validator('ingredients')
    def truncate_ingredients(cls, v):
        """Hard limit to max 50 ingredients"""
        return v[:50]

    @validator('steps')
    def truncate_steps(cls, v):
        """Hard limit to max 30 steps"""
        return v[:30]

    @validator('timers')
    def truncate_timers(cls, v):
        """Hard limit to max 20 timers"""
        return v[:20]


class ImportResponse(BaseModel):
    """API response for recipe import endpoint"""
    recipe: ImportedRecipe
    confidence: str = Field(..., pattern='^(high|medium|low)$')
    extraction_method: str = Field(..., pattern='^(json-ld|heuristic|ai|cached)$')
