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
    Handles ranges by taking the midpoint.

    Examples:
        "20 minutes" → 1200
        "1 hour" → 3600
        "8 to 10 minutes" → 540 (9 minutes midpoint)
        "30-45 minutes" → 2250 (37.5 minutes → 38 minutes)
        "about 20 minutes" → 1200

    Args:
        text: Text potentially containing duration

    Returns:
        Duration in seconds or None if not found
    """
    if not text:
        return None

    text_lower = text.lower()

    # First, try to detect ranges: "8 to 10 minutes", "30-45 min", etc.
    range_patterns = [
        # "8 to 10 minutes", "1 to 2 hours"
        (r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(hour|hr|hours|hrs)', 3600),
        (r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(minute|min|minutes|mins)', 60),
        (r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(second|sec|seconds|secs)', 1),
    ]

    for pattern, multiplier in range_patterns:
        match = re.search(pattern, text_lower)
        if match:
            low = float(match.group(1))
            high = float(match.group(2))
            midpoint = (low + high) / 2
            return int(midpoint * multiplier)

    # Single value patterns
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


def parse_iso8601_duration(duration_str: str) -> int | None:
    """
    Parse ISO 8601 duration to minutes.
    Examples: "PT30M" → 30, "PT1H" → 60, "PT1H30M" → 90, "P1DT2H" → 1560

    Args:
        duration_str: ISO 8601 duration string

    Returns:
        Duration in minutes or None if parsing fails
    """
    if not duration_str or not isinstance(duration_str, str):
        return None

    # ISO 8601 format: P[n]Y[n]M[n]DT[n]H[n]M[n]S
    # We only care about hours and minutes for recipes
    try:
        total_minutes = 0

        # Match days (convert to hours)
        days_match = re.search(r'P.*?(\d+)D', duration_str)
        if days_match:
            total_minutes += int(days_match.group(1)) * 24 * 60

        # Match hours
        hours_match = re.search(r'T.*?(\d+)H', duration_str)
        if hours_match:
            total_minutes += int(hours_match.group(1)) * 60

        # Match minutes
        minutes_match = re.search(r'T.*?(\d+)M', duration_str)
        if minutes_match:
            total_minutes += int(minutes_match.group(1))

        return total_minutes if total_minutes > 0 else None

    except Exception:
        return None


def parse_duration_flexible(duration_value: str | int | None) -> int | None:
    """
    Parse duration from multiple formats to minutes.
    Tries ISO 8601 first, then human-readable text.

    Args:
        duration_value: Duration as ISO 8601, text, or number

    Returns:
        Duration in minutes or None if parsing fails
    """
    if not duration_value:
        return None

    # If already a number, assume it's minutes
    if isinstance(duration_value, (int, float)):
        return int(duration_value)

    # Try ISO 8601 first (PT30M, PT1H, etc.)
    iso_result = parse_iso8601_duration(duration_value)
    if iso_result is not None:
        return iso_result

    # Fallback to human text ("30 minutes", "1 hour 15 minutes")
    text_result_secs = parse_duration_to_seconds(duration_value)
    if text_result_secs is not None:
        return text_result_secs // 60  # Convert seconds to minutes

    return None


def parse_servings(recipe_yield) -> int | None:
    """
    Parse servings from recipeYield field.

    Strategy:
    - Range ("4-6", "Serves 4-6"): Take FIRST value (4)
    - Array (["4", "6"]): Take FIRST parseable value
    - Object ({"value": "4"}): Extract value field
    - Number (4): Use directly
    - Text ("4 servings"): Extract first number
    - Unparseable: Return None (will default to 4)

    Args:
        recipe_yield: recipeYield value from JSON-LD (various formats)

    Returns:
        Number of servings or None if unparseable
    """
    if not recipe_yield:
        return None

    # Handle number directly
    if isinstance(recipe_yield, (int, float)):
        return int(recipe_yield)

    # Handle array - take first parseable value
    if isinstance(recipe_yield, list):
        for item in recipe_yield:
            result = parse_servings(item)  # Recursive
            if result:
                return result
        return None

    # Handle object (e.g., {"value": "4"} or {"@value": "4"})
    if isinstance(recipe_yield, dict):
        value = recipe_yield.get('value') or recipe_yield.get('@value')
        if value:
            return parse_servings(value)  # Recursive
        return None

    # Handle string
    if isinstance(recipe_yield, str):
        # Extract all numbers from string
        numbers = re.findall(r'\d+', recipe_yield)
        if numbers:
            # Take first number (handles ranges like "4-6")
            return int(numbers[0])

    return None


def extract_image_url(json_ld: dict) -> str:
    """
    Extract image URL from JSON-LD Recipe schema.
    Handles string, object, and array formats.

    Args:
        json_ld: Parsed JSON-LD Recipe object

    Returns:
        Image URL or empty string if not found
    """
    image = json_ld.get('image', '')

    if not image:
        return ''

    # Handle string format
    if isinstance(image, str):
        return image

    # Handle object format: {"url": "...", "@type": "ImageObject"}
    if isinstance(image, dict):
        return image.get('url', '') or image.get('@id', '')

    # Handle array format: [{"url": "..."}, ...] or ["https://...", ...]
    if isinstance(image, list) and len(image) > 0:
        first_image = image[0]
        if isinstance(first_image, dict):
            return first_image.get('url', '') or first_image.get('@id', '')
        elif isinstance(first_image, str):
            return first_image

    return ''


def parse_ingredient_string(ingredient_text: str) -> tuple[str, str]:
    """
    Parse ingredient string to extract quantity and name.

    Examples:
        "12 ounces cranberries" → ("12 ounces", "cranberries")
        "1 cup white sugar" → ("1 cup", "white sugar")
        "2 tablespoons butter" → ("2 tablespoons", "butter")
        "1/2 teaspoon salt" → ("1/2 teaspoon", "salt")
        "cranberries" → ("", "cranberries")

    Args:
        ingredient_text: Full ingredient string

    Returns:
        Tuple of (quantity, name)
    """
    if not ingredient_text:
        return ("", "")

    ingredient_text = ingredient_text.strip()

    # Common units to detect
    units = [
        # Volume
        r'cup', r'cups', r'c\b',
        r'tablespoon', r'tablespoons', r'tbsp', r'tbs', r'T\b',
        r'teaspoon', r'teaspoons', r'tsp', r't\b',
        r'fluid ounce', r'fluid ounces', r'fl oz',
        r'pint', r'pints', r'pt',
        r'quart', r'quarts', r'qt',
        r'gallon', r'gallons', r'gal',
        r'milliliter', r'milliliters', r'ml',
        r'liter', r'liters', r'l\b',
        # Weight
        r'pound', r'pounds', r'lb', r'lbs',
        r'ounce', r'ounces', r'oz',
        r'gram', r'grams', r'g\b',
        r'kilogram', r'kilograms', r'kg',
        # Other
        r'can', r'cans',
        r'package', r'packages', r'pkg',
        r'jar', r'jars',
        r'box', r'boxes',
        r'bag', r'bags',
        r'bunch', r'bunches',
        r'clove', r'cloves',
        r'slice', r'slices',
        r'pinch', r'pinches',
        r'dash', r'dashes',
        r'whole',
        r'large', r'medium', r'small',
    ]

    # First, handle parenthetical quantities: "1 (10 pound) fully-cooked ham"
    # Pattern: number + space + parenthetical expression + rest
    paren_pattern = r'^(\d+\s*\([^)]+\))\s+(.+)$'
    paren_match = re.match(paren_pattern, ingredient_text)
    if paren_match:
        quantity = paren_match.group(1).strip()
        name = paren_match.group(2).strip()
        return (quantity, name)

    # Pattern: number(s) + optional fraction + optional unit(s) + rest is name
    # Examples: "2 cups", "1 1/2 tablespoons", "3 large", "12 ounces"
    pattern = r'^([\d\s/.-]+(?:' + '|'.join(units) + r')[s]?(?:\s+(?:' + '|'.join(units) + r')[s]?)*)\s+(.+)$'

    match = re.match(pattern, ingredient_text, re.IGNORECASE)
    if match:
        quantity = match.group(1).strip()
        name = match.group(2).strip()
        # Convert decimals to fractions (0.333 → 1/3)
        quantity = convert_decimal_to_fraction(quantity)
        return (quantity, name)

    # Fallback: if starts with number but no unit match, split at first letter
    number_pattern = r'^([\d\s/.-]+)\s+([a-zA-Z].+)$'
    number_match = re.match(number_pattern, ingredient_text)
    if number_match:
        # Could be "12 cranberries" where "12" is quantity
        quantity = number_match.group(1).strip()
        name = number_match.group(2).strip()
        # Convert decimals to fractions (0.333 → 1/3)
        quantity = convert_decimal_to_fraction(quantity)
        return (quantity, name)

    # No quantity found - entire string is ingredient name
    return ("", ingredient_text)


def convert_decimal_to_fraction(quantity_str: str) -> str:
    """
    Convert common decimal quantities to fractions.
    Examples: "0.333 cup" → "1/3 cup", "0.25 teaspoon" → "1/4 teaspoon"
    """
    if not quantity_str:
        return quantity_str

    # Map of (low, high) ranges to fraction strings
    decimal_map = {
        (0.32, 0.34): "1/3",
        (0.66, 0.68): "2/3",
        (0.24, 0.26): "1/4",
        (0.74, 0.76): "3/4",
        (0.49, 0.51): "1/2",
        (0.12, 0.13): "1/8",
        (0.37, 0.38): "3/8",
        (0.62, 0.63): "5/8",
        (0.87, 0.88): "7/8",
    }

    # Extract decimal from string (e.g., "0.333 cup")
    match = re.search(r'(\d*\.\d+)', quantity_str)
    if match:
        decimal_val = float(match.group(1))
        for (low, high), fraction in decimal_map.items():
            if low <= decimal_val <= high:
                return quantity_str.replace(match.group(1), fraction)

    return quantity_str


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


def map_llm_to_imported_recipe(llm_data: dict, source_url: str) -> dict:
    """
    Map LLM output (LLMNormalizedRecipe) to ImportedRecipe schema.

    Converts:
    - prep_time_minutes → prep_time
    - cook_time_minutes → cook_time
    - timers (with duration_minutes) → timers (with duration in seconds)
    - Adds source_url
    - Generates placeholder step (ImportedRecipe requires min 1 step)

    Args:
        llm_data: LLM output dict matching LLMNormalizedRecipe schema
        source_url: Original recipe URL

    Returns:
        Dict matching ImportedRecipe schema
    """
    # Convert timer durations from minutes to seconds (database expects seconds)
    timers = [
        {
            "name": timer["description"],
            "duration": timer["duration_minutes"] * 60,  # Convert to seconds
            "step_order": None  # LLM doesn't know step order
        }
        for timer in llm_data.get("timers", [])
    ]

    # Generate placeholder step (ImportedRecipe requires min_items=1)
    # In future, we could extract from original instructions if needed
    steps = [
        {
            "order": 1,
            "instruction": "Follow recipe instructions from source",
            "estimated_time": None
        }
    ]

    return {
        "name": llm_data["name"],
        "description": llm_data.get("description", ""),
        "prep_time": llm_data["prep_time_minutes"],  # Map field name
        "cook_time": llm_data["cook_time_minutes"],  # Map field name
        "servings": llm_data["servings"],
        "image_url": llm_data.get("image_url", ""),
        "source_url": source_url,
        "ingredients": [
            {
                "name": ing["name"],
                "quantity": ing["quantity"]
            }
            for ing in llm_data["ingredients"]
        ],
        "steps": steps,
        "timers": timers
    }


def fallback_regex_parse(structured_data: dict, source_url: str) -> dict:
    """
    Emergency fallback if LLM fails completely.
    Uses regex-based parsing logic (old approach).

    Args:
        structured_data: JSON-LD or heuristic data
        source_url: Original URL

    Returns:
        Dict matching ImportedRecipe schema
    """
    # Parse ingredients with regex (old logic)
    ingredients = [
        {
            "quantity": truncate_text(qty, MAX_INGREDIENT_CHARS),
            "name": truncate_text(name, MAX_INGREDIENT_CHARS)
        }
        for ing in structured_data.get('recipeIngredient', [])[:MAX_INGREDIENTS]
        for qty, name in [parse_ingredient_string(str(ing))]
    ]

    # Parse steps with duration extraction (old logic)
    steps = [
        {
            "order": i + 1,
            "instruction": truncate_text(
                step_text := (step.get('text', step) if isinstance(step, dict) else str(step)),
                MAX_STEP_CHARS
            ),
            "estimated_time": (parse_duration_to_seconds(step_text) // 60) if parse_duration_to_seconds(step_text) else None
        }
        for i, step in enumerate(structured_data.get('recipeInstructions', [])[:MAX_STEPS])
    ]

    # Ensure at least one step (required by schema)
    if not steps:
        steps = [{
            "order": 1,
            "instruction": "Follow recipe instructions from source",
            "estimated_time": None
        }]

    # Derive timers from steps (old logic)
    timers = derive_timers_from_steps(steps)

    return {
        "name": structured_data.get("name", "Recipe"),
        "description": structured_data.get("description", ""),
        "prep_time": structured_data.get("prep_time", 0),
        "cook_time": structured_data.get("cook_time", 0),
        "servings": structured_data.get("servings", 4),
        "image_url": structured_data.get("image_url", ""),
        "source_url": source_url,
        "ingredients": ingredients,
        "steps": steps,
        "timers": timers
    }


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

    # Extract image (Open Graph, schema.org, or first large image)
    image_url = ''

    # Try Open Graph image
    og_image = soup.find('meta', property='og:image')
    if og_image:
        image_url = og_image.get('content', '')

    # Fallback to schema.org image
    if not image_url:
        schema_image = soup.find('img', itemprop='image')
        if schema_image:
            image_url = schema_image.get('src', '')

    # Fallback to first large image (width > 300px or no width specified)
    if not image_url:
        for img in soup.find_all('img'):
            width = img.get('width')
            if not width or (width.isdigit() and int(width) > 300):
                src = img.get('src', '')
                if src and ('http' in src or src.startswith('//')):
                    image_url = src
                    break

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
                        qty, name = parse_ingredient_string(text)
                        ingredients.append({
                            "name": truncate_text(name, MAX_INGREDIENT_CHARS),
                            "quantity": truncate_text(qty, MAX_INGREDIENT_CHARS)
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
        "image_url": truncate_text(image_url, 500),
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
            cached_data = cached[0]
            # Handle legacy cache entries without image_url field
            if 'image_url' not in cached_data:
                cached_data['image_url'] = ""
            return ImportedRecipe(**cached_data), "cached"

    except Exception as e:
        print(f"Cache check failed: {e}")
        # Continue with fresh fetch

    # Fetch HTML (SSRF-protected)
    html = fetch_html(url)

    # Try JSON-LD extraction first
    json_ld = extract_json_ld(html)
    extraction_method = "heuristic"
    structured_data = None

    if json_ld:
        # Parse times with flexible parser (ISO 8601 + text) - DETERMINISTIC, KEEP THIS
        prep_time = parse_duration_flexible(json_ld.get('prepTime'))
        cook_time = parse_duration_flexible(json_ld.get('cookTime'))
        total_time = parse_duration_flexible(json_ld.get('totalTime'))

        # Fallback: if totalTime exists but prep/cook missing, use total as cook_time
        if total_time and not (prep_time and cook_time):
            cook_time = cook_time or total_time
            prep_time = prep_time or 0

        # Parse servings - DETERMINISTIC, KEEP THIS
        servings = parse_servings(json_ld.get('recipeYield')) or 4

        # Extract image URL - DETERMINISTIC, KEEP THIS
        image_url = extract_image_url(json_ld)

        # Build structured data with RAW ingredients/instructions for LLM
        # LLM will split ingredients and extract timers from instructions
        structured_data = {
            "name": truncate_text(json_ld.get('name', 'Recipe'), 200),
            "description": truncate_text(json_ld.get('description', ''), 1000),
            "prep_time": prep_time if prep_time is not None else 0,
            "cook_time": cook_time if cook_time is not None else 0,
            "total_time": total_time if total_time is not None else 0,
            "servings": servings,
            "image_url": truncate_text(image_url, 500),
            # RAW ingredients - LLM will split quantity/name
            "recipeIngredient": [
                truncate_text(str(ing), MAX_INGREDIENT_CHARS)
                for ing in json_ld.get('recipeIngredient', [])[:MAX_INGREDIENTS]
            ],
            # RAW instructions - LLM will extract timers
            "recipeInstructions": [
                truncate_text(
                    step.get('text', step) if isinstance(step, dict) else str(step),
                    MAX_STEP_CHARS
                )
                for step in json_ld.get('recipeInstructions', [])[:MAX_STEPS]
            ]
        }
        extraction_method = "json-ld"
    else:
        # Fallback to heuristic extraction
        heuristic_data = extract_heuristic(html)

        # Convert heuristic data to structured_data format
        structured_data = {
            "name": heuristic_data.get('name', 'Recipe'),
            "description": heuristic_data.get('description', ''),
            "prep_time": heuristic_data.get('prep_time', 0),
            "cook_time": heuristic_data.get('cook_time', 0),
            "total_time": 0,
            "servings": heuristic_data.get('servings', 4),
            "image_url": heuristic_data.get('image_url', ''),
            # Convert parsed ingredients back to raw strings
            "recipeIngredient": [
                f"{ing['quantity']} {ing['name']}".strip()
                for ing in heuristic_data.get('ingredients', [])
            ],
            # Convert parsed steps to raw instruction strings
            "recipeInstructions": [
                step['instruction']
                for step in heuristic_data.get('steps', [])
            ]
        }

    print(f"[DEBUG] Pre-LLM: prep={structured_data.get('prep_time')}min, cook={structured_data.get('cook_time')}min, servings={structured_data.get('servings')}")

    # Try LLM normalization (Claude → GPT fallback)
    llm_result = normalize_recipe_with_llm(structured_data)

    if llm_result:
        # LLM succeeded - map to ImportedRecipe schema
        raw_data = map_llm_to_imported_recipe(llm_result, url)
        extraction_method = "ai"
        print(f"[DEBUG] LLM Success: prep={llm_result.get('prep_time_minutes')}min, cook={llm_result.get('cook_time_minutes')}min, timers={len(llm_result.get('timers', []))}")
    else:
        # Both Claude and GPT failed - use regex fallback
        print("[DEBUG] LLM failed, using regex fallback")
        raw_data = fallback_regex_parse(structured_data, url)
        extraction_method = "heuristic"
        print(f"[DEBUG] Fallback: prep={raw_data.get('prep_time')}min, cook={raw_data.get('cook_time')}min, timers={len(raw_data.get('timers', []))}")

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
