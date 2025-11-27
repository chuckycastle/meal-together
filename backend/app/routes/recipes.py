"""
Recipe management routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload, selectinload
from app import db
from app.models.recipe import Recipe, Ingredient, CookingStep, RecipeTimer
from app.models.cooking_session import CookingSession
from app.utils.decorators import family_member_required
from app.utils.pagination import get_pagination_params, paginate_query, create_paginated_response
from app.services.recipe_parser import parse_recipe
from app.schemas.recipe_import import ImportResponse

bp = Blueprint('recipes', __name__, url_prefix='/api/families/<int:family_id>/recipes')


@bp.route('', methods=['POST'])
@family_member_required
def create_recipe(family_id):
    """Create a new recipe"""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    required_fields = ['name', 'prep_time', 'cook_time']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Create recipe
    recipe = Recipe(
        name=data['name'],
        description=data.get('description'),
        prep_time=data['prep_time'],
        cook_time=data['cook_time'],
        servings=data.get('servings', 4),
        image_url=data.get('image_url'),
        source_url=data.get('source_url'),
        family_id=family_id,
        assigned_to_id=data.get('assigned_to_id', user_id)
    )

    try:
        recipe.save()

        # Add ingredients
        for idx, ing_data in enumerate(data.get('ingredients', [])):
            ingredient = Ingredient(
                recipe_id=recipe.id,
                name=ing_data['name'],
                quantity=ing_data.get('quantity'),
                order=idx
            )
            ingredient.save()

        # Add cooking steps
        for idx, step_data in enumerate(data.get('steps', [])):
            step = CookingStep(
                recipe_id=recipe.id,
                instruction=step_data['instruction'],
                order=idx,
                estimated_time=step_data.get('estimated_time')
            )
            step.save()

        # Add timers
        for timer_data in data.get('timers', []):
            timer = RecipeTimer(
                recipe_id=recipe.id,
                name=timer_data['name'],
                duration=timer_data['duration'],
                step_order=timer_data.get('step_order')
            )
            timer.save()

        return jsonify({
            'message': 'Recipe created successfully',
            'recipe': recipe.to_dict(include_details=True)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['GET'])
@family_member_required
def get_recipes(family_id):
    """Get all recipes for a family with pagination"""
    # Get pagination parameters
    params = get_pagination_params()

    # Build query with eager loading
    query = Recipe.query.options(
        joinedload(Recipe.assigned_to)
    ).filter_by(family_id=family_id).order_by(Recipe.created_at.desc())

    # Paginate results
    result = paginate_query(query, params['page'], params['per_page'])

    # Serialize items
    recipes = [r.to_dict() for r in result['items']]

    return create_paginated_response(recipes, result['pagination'], 'recipes')


@bp.route('/<int:recipe_id>', methods=['GET'])
@family_member_required
def get_recipe(family_id, recipe_id):
    """Get recipe details"""
    recipe = Recipe.query.options(
        joinedload(Recipe.assigned_to),
        selectinload(Recipe.ingredients),
        selectinload(Recipe.steps),
        selectinload(Recipe.timers)
    ).filter_by(id=recipe_id).first()

    if not recipe or recipe.family_id != family_id:
        return jsonify({'error': 'Recipe not found'}), 404

    return jsonify({'recipe': recipe.to_dict(include_details=True)}), 200


@bp.route('/<int:recipe_id>', methods=['PUT'])
@family_member_required
def update_recipe(family_id, recipe_id):
    """Update recipe"""
    recipe = Recipe.get_by_id(recipe_id)

    if not recipe or recipe.family_id != family_id:
        return jsonify({'error': 'Recipe not found'}), 404

    data = request.get_json()

    # Update basic fields
    if 'name' in data:
        recipe.name = data['name']
    if 'description' in data:
        recipe.description = data['description']
    if 'prep_time' in data:
        recipe.prep_time = data['prep_time']
    if 'cook_time' in data:
        recipe.cook_time = data['cook_time']
    if 'servings' in data:
        recipe.servings = data['servings']
    if 'image_url' in data:
        recipe.image_url = data['image_url']
    if 'source_url' in data:
        recipe.source_url = data['source_url']
    if 'assigned_to_id' in data:
        recipe.assigned_to_id = data['assigned_to_id']

    try:
        recipe.save()

        # Update ingredients if provided
        if 'ingredients' in data:
            # Delete existing ingredients
            for ing in recipe.ingredients:
                ing.delete()

            # Add new ingredients
            for idx, ing_data in enumerate(data['ingredients']):
                ingredient = Ingredient(
                    recipe_id=recipe.id,
                    name=ing_data['name'],
                    quantity=ing_data.get('quantity'),
                    order=idx
                )
                ingredient.save()

        # Update steps if provided
        if 'steps' in data:
            # Delete existing steps
            for step in recipe.steps:
                step.delete()

            # Add new steps
            for idx, step_data in enumerate(data['steps']):
                step = CookingStep(
                    recipe_id=recipe.id,
                    instruction=step_data['instruction'],
                    order=idx,
                    estimated_time=step_data.get('estimated_time')
                )
                step.save()

        # Update timers if provided
        if 'timers' in data:
            # Delete existing timers
            for timer in recipe.timers:
                timer.delete()

            # Add new timers
            for timer_data in data['timers']:
                timer = RecipeTimer(
                    recipe_id=recipe.id,
                    name=timer_data['name'],
                    duration=timer_data['duration'],
                    step_order=timer_data.get('step_order')
                )
                timer.save()

        return jsonify({
            'message': 'Recipe updated successfully',
            'recipe': recipe.to_dict(include_details=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:recipe_id>', methods=['DELETE'])
@family_member_required
def delete_recipe(family_id, recipe_id):
    """Delete recipe"""
    recipe = Recipe.get_by_id(recipe_id)

    if not recipe or recipe.family_id != family_id:
        return jsonify({'error': 'Recipe not found'}), 404

    # Check if user has permission to delete
    user_id = int(get_jwt_identity())

    # Get user's family membership to check role
    from app.models.family import FamilyMember
    member = FamilyMember.query.filter_by(
        family_id=family_id,
        user_id=user_id
    ).first()

    # Allow: assigned user, family owners, or family admins
    can_delete = (
        recipe.assigned_to_id == user_id or
        (member and member.role.value in ['owner', 'admin'])
    )

    if not can_delete:
        return jsonify({'error': 'Permission denied. Only the assigned user or family admins can delete recipes.'}), 403

    # Check for active cooking sessions
    active_sessions = CookingSession.query.filter_by(
        recipe_id=recipe_id,
        is_active=True
    ).count()

    if active_sessions > 0:
        return jsonify({
            'error': 'Cannot delete recipe with active cooking sessions. Please end the cooking session first.'
        }), 400

    try:
        recipe.delete()
        return jsonify({'message': 'Recipe deleted successfully'}), 200
    except Exception as e:
        print(f"[ERROR] Recipe deletion failed for recipe {recipe_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Deletion failed: {str(e)}'}), 500


@bp.route('/<int:recipe_id>/assign', methods=['POST'])
@family_member_required
def assign_recipe(family_id, recipe_id):
    """Assign recipe to a family member"""
    recipe = Recipe.get_by_id(recipe_id)

    if not recipe or recipe.family_id != family_id:
        return jsonify({'error': 'Recipe not found'}), 404

    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'User ID required'}), 400

    recipe.assigned_to_id = user_id

    try:
        recipe.save()
        return jsonify({
            'message': 'Recipe assigned successfully',
            'recipe': recipe.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/import', methods=['POST'])
@family_member_required
def import_recipe_endpoint(family_id):
    """
    Import recipe from URL using AI parsing.
    Fetches URL, extracts recipe data, normalizes with LLM, and returns structured recipe.

    Rate limiting handled by circuit breaker pattern in parse_recipe().

    Request body:
    {
        "url": "https://example.com/recipe"
    }

    Response:
    {
        "recipe": {...},
        "confidence": "high" | "medium" | "low",
        "extraction_method": "json-ld" | "heuristic" | "ai" | "cached"
    }
    """

    # Get request data
    data = request.get_json()
    url = data.get('url')

    if not url:
        return jsonify({"error": "URL required"}), 400

    # Get user ID (validated by @family_member_required decorator)
    user_id = get_jwt_identity()

    try:
        # Parse recipe (with SSRF protection, LLM normalization, timer derivation)
        recipe, extraction_method = parse_recipe(url, str(family_id), str(user_id))

        # Set confidence based on extraction method and timer presence
        if extraction_method == "ai" and recipe.timers:
            confidence = "high"
        elif extraction_method in ("ai", "json-ld"):
            confidence = "medium"
        else:
            confidence = "low"

        # Build response
        response = ImportResponse(
            recipe=recipe,
            confidence=confidence,
            extraction_method=extraction_method
        )

        return jsonify(response.dict()), 200

    except ValueError as e:
        # URL validation, fetch, or size errors (400 Bad Request)
        error_msg = str(e)
        return jsonify({"error": error_msg}), 400

    except Exception as e:
        # Parse, validation, or unexpected errors (422 Unprocessable Entity)
        print(f"Recipe import failed: {e}")
        return jsonify({"error": "Could not parse recipe from URL"}), 422
