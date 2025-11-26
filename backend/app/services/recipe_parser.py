"""
Recipe Parser Service
Extracts recipes from URLs using JSON-LD, heuristics, and LLM normalization.
Derives timers from steps with durations.
"""

import os
import re
import hashlib
from bs4 import BeautifulSoup
import extruct
from sqlalchemy import text
from app import db
from ..schemas.recipe_import import ImportedRecipe, ImportedIngredient, ImportedStep, ImportedTimer
from ..utils.http_fetcher import fetch_html
from .llm_service import normalize_recipe_with_llm


# Configuration from environment
MAX_INGREDIENTS = int(os.getenv('RECIPE_IMPORT_MAX_INGREDIENTS', 50))
MAX_STEPS = int(os.getenv('RECIPE_IMPORT_MAX_STEPS', 30))
MAX_STEP_CHARS = int(os.getenv('RECIPE_IMPORT_MAX_STEP_CHARS', 500))
MAX_INGREDIENT_CHARS = int(os.getenv('RECIPE_IMPORT_MAX_INGREDIENT_CHARS', 100))


def get_url_hash(url: str) -> str:
    """Generate SHA256 hash of URL for caching."""
    return hashlib.sha256(url.encode()).hexdigest()


def truncate_text(text: str, max_length: int) -> str:
    """Truncate text to maximum length."""
    if not text:
        return ""
    return text[:max_length] if len(text) > max_length else text


def parse_duration_to_seconds(text: str) -> int | None:
    """
    Parse duration from text to seconds.
    Examples: "20 minutes" → 1200, "1 hour" → 3600, "30 secs" → 30

    Args:
        text: Text potentially containing duration

    Returns:
        Duration in seconds or None if not found
    """
    if not text:
        return None

    text_lower = text.lower()

    # Patterns: (regex, multiplier in seconds)
    patterns = [
        (r'(\d+(?:\.\d+)?)\s*(?:hour|hr|hours|hrs)', 3600),
        (r'(\d+(?:\.\d+)?)\s*(?:minute|min|minutes|mins)', 60),
        (r'(\d+(?:\.\d+)?)\s*(?:second|sec|seconds|secs)', 1),
    ]

    for pattern, multiplier in patterns:
        match = re.search(pattern, text_lower)
        if match:
            value = float(match.group(1))
            return int(value * multiplier)

    return None


def derive_timers_from_steps(steps: list) -> list:
    """
    Derive recipe timers from steps with estimated_time.
    Creates one timer per step that has a duration.

    Args:
        steps: List of step dicts with 'estimated_time' (minutes) and 'instruction'

    Returns:
        List of timer dicts with 'name', 'duration' (seconds), 'step_order'
    """
    timers = []

    for step in steps:
        estimated_time = step.get('estimated_time')

        if estimated_time and estimated_time > 0:
            # Convert minutes to seconds for timer
            duration_seconds = estimated_time * 60

            # Extract first part of instruction for timer name (up to first period or 50 chars)
            instruction = step.get('instruction', '')
            if '.' in instruction:
                timer_name = instruction.split('.')[0]
            else:
                timer_name = instruction[:50]

            timer_name = truncate_text(timer_name.strip(), 200)

            timers.append({
                'name': timer_name or f"Step {step.get('order', 1)}",
                'duration': duration_seconds,
                'step_order': step.get('order')
            })

    return timers


def extract_json_ld(html: str) -> dict | None:
    """
    Extract JSON-LD Recipe schema from HTML.
    Handles @type as both string and array.

    Args:
        html: HTML content

    Returns:
        Parsed Recipe object or None if not found
    """
    try:
        data = extruct.extract(html)
        json_ld_items = data.get('json-ld', [])

        for item in json_ld_items:
            type_val = item.get('@type')

            # Handle @type as string
            if isinstance(type_val, str) and type_val == 'Recipe':
                return item

            # Handle @type as array (e.g., ["Recipe", "Thing"])
            if isinstance(type_val, list) and 'Recipe' in type_val:
                return item

    except Exception as e:
        print(f"JSON-LD extraction failed: {e}")

    return None


def extract_heuristic(html: str) -> dict:
    """
    Fallback heuristic extraction when no JSON-LD available.
    Uses BeautifulSoup to parse common recipe HTML patterns.

    Args:
        html: HTML content

    Returns:
        Dict with extracted recipe data
    """
    soup = BeautifulSoup(html, 'html.parser')

    # Extract title
    name = soup.find('h1')
    if not name:
        og_title = soup.find('meta', property='og:title')
        name = og_title.get('content') if og_title else 'Imported Recipe'
    else:
        name = name.get_text().strip()

    # Extract ingredients
    ingredients = []
    for tag in soup.find_all(['ul', 'ol']):
        # Check parent element for "ingredient" keyword
        parent = tag.find_parent(['div', 'section', 'article'])
        if parent:
            parent_text = parent.get_text().lower()
            if 'ingredient' in parent_text:
                for li in tag.find_all('li'):
                    text = li.get_text().strip()
                    if text and len(text) > 2:  # Avoid empty or single-char items
                        ingredients.append({
                            "name": truncate_text(text, MAX_INGREDIENT_CHARS),
                            "quantity": ""
                        })

    # Extract steps with duration detection
    steps = []
    order = 1

    for tag in soup.find_all(['ol', 'ul']):
        parent = tag.find_parent(['div', 'section', 'article'])
        if parent:
            parent_text = parent.get_text().lower()
            # Look for instruction/direction/step keywords
            if any(keyword in parent_text for keyword in ['instruction', 'direction', 'step', 'method', 'preparation']):
                for li in tag.find_all('li'):
                    text = li.get_text().strip()
                    if text and len(text) > 5:  # Avoid very short non-instructions
                        text = truncate_text(text, MAX_STEP_CHARS)

                        # Try to parse duration from step text
                        duration_secs = parse_duration_to_seconds(text)
                        estimated_time_mins = (duration_secs // 60) if duration_secs else None

                        steps.append({
                            "order": order,
                            "instruction": text,
                            "estimated_time": estimated_time_mins
                        })
                        order += 1

    # Fallback if no ingredients/steps found
    if not ingredients:
        ingredients = [{"name": "See source recipe", "quantity": ""}]

    if not steps:
        steps = [{
            "order": 1,
            "instruction": "See source recipe for instructions",
            "estimated_time": None
        }]

    return {
        "name": truncate_text(name, 200),
        "description": "",
        "prep_time": 0,
        "cook_time": 0,
        "servings": 4,
        "ingredients": ingredients[:MAX_INGREDIENTS],
        "steps": steps[:MAX_STEPS]
    }


def enforce_input_limits(data: dict) -> dict:
    """
    Enforce input limits before sending to LLM.
    Truncates arrays and strings to configured maximums.

    Args:
        data: Raw recipe data

    Returns:
        Truncated recipe data
    """
    # Truncate and limit ingredients
    if 'ingredients' in data:
        data['ingredients'] = [
            {
                'name': truncate_text(ing.get('name', ''), MAX_INGREDIENT_CHARS),
                'quantity': truncate_text(ing.get('quantity', ''), MAX_INGREDIENT_CHARS)
            }
            for ing in data['ingredients'][:MAX_INGREDIENTS]
        ]

    # Truncate and limit steps
    if 'steps' in data:
        data['steps'] = [
            {
                'order': step.get('order', i + 1),
                'instruction': truncate_text(step.get('instruction', ''), MAX_STEP_CHARS),
                'estimated_time': step.get('estimated_time')
            }
            for i, step in enumerate(data['steps'][:MAX_STEPS])
        ]

    # Truncate text fields
    if 'name' in data:
        data['name'] = truncate_text(data['name'], 200)
    if 'description' in data:
        data['description'] = truncate_text(data['description'], 1000)

    return data


def parse_recipe(url: str, family_id: str, user_id: str) -> tuple[ImportedRecipe, str]:
    """
    Main recipe parsing pipeline.
    1. Check cache
    2. Fetch HTML (with SSRF protection)
    3. Try JSON-LD extraction
    4. Fallback to heuristics
    5. Normalize with LLM (Claude → GPT)
    6. Derive timers from steps
    7. Validate with Pydantic
    8. Cache result

    Args:
        url: Recipe URL to parse
        family_id: Family ID (for future use)
        user_id: User ID (for future use)

    Returns:
        Tuple of (ImportedRecipe, extraction_method)
        extraction_method: "cached" | "json-ld" | "heuristic" | "ai"

    Raises:
        ValueError: If URL is unsafe or unreachable
        Exception: If parsing/validation fails
    """
    url_hash = get_url_hash(url)

    # Check cache (24 hour TTL)
    try:
        cached = db.session.execute(text("""
            SELECT recipe_data
            FROM recipe_import_cache
            WHERE url_hash = :hash
              AND cached_at > now() - interval '24 hours'
        """), {"hash": url_hash}).fetchone()

        if cached:
            return ImportedRecipe(**cached[0]), "cached"

    except Exception as e:
        print(f"Cache check failed: {e}")
        # Continue with fresh fetch

    # Fetch HTML (SSRF-protected)
    html = fetch_html(url)

    # Try JSON-LD extraction first
    json_ld = extract_json_ld(html)
    extraction_method = "heuristic"
    raw_data = None

    if json_ld:
        # Parse JSON-LD data
        raw_data = {
            "name": truncate_text(json_ld.get('name', 'Recipe'), 200),
            "description": truncate_text(json_ld.get('description', ''), 1000),
            "prep_time": 0,  # Will be extracted/normalized by LLM
            "cook_time": 0,
            "servings": 4,
            "ingredients": [
                {
                    "name": truncate_text(str(ing), MAX_INGREDIENT_CHARS),
                    "quantity": ""
                }
                for ing in json_ld.get('recipeIngredient', [])[:MAX_INGREDIENTS]
            ],
            "steps": [
                {
                    "order": i + 1,
                    "instruction": truncate_text(
                        step.get('text', step) if isinstance(step, dict) else str(step),
                        MAX_STEP_CHARS
                    ),
                    "estimated_time": None
                }
                for i, step in enumerate(json_ld.get('recipeInstructions', [])[:MAX_STEPS])
            ]
        }
        extraction_method = "json-ld"
    else:
        # Fallback to heuristic extraction
        raw_data = extract_heuristic(html)

    # Enforce input limits before LLM call
    raw_data = enforce_input_limits(raw_data)

    # Try LLM normalization (Claude → GPT)
    llm_result = normalize_recipe_with_llm(raw_data)
    if llm_result:
        raw_data = llm_result
        extraction_method = "ai"

    # Add source URL
    raw_data['source_url'] = url

    # DERIVE TIMERS from steps with estimated_time
    raw_data['timers'] = derive_timers_from_steps(raw_data.get('steps', []))

    # Validate with Pydantic (enforces final schema)
    recipe = ImportedRecipe(**raw_data)

    # Cache result
    try:
        db.session.execute(text("""
            INSERT INTO recipe_import_cache (url_hash, recipe_data, cached_at)
            VALUES (:hash, :data, now())
            ON CONFLICT (url_hash)
            DO UPDATE SET recipe_data = :data, cached_at = now()
        """), {"hash": url_hash, "data": recipe.dict()})
        db.session.commit()
    except Exception as e:
        print(f"Failed to cache recipe: {e}")
        db.session.rollback()
        # Continue anyway - caching is optional

    return recipe, extraction_method
