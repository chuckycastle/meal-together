"""
LLM Service for Recipe Normalization
Uses Claude 3.5 Sonnet as primary, GPT-4o as fallback.
Schema aligned with Pydantic models and database structure.
"""

import os
import json
from anthropic import Anthropic
from openai import OpenAI
from .circuit_breaker import can_attempt_llm, record_llm_success, record_llm_failure


# LLM Prompt - Simplified schema for recipe normalization
LLM_PROMPT = """You are a recipe normalizer. You receive structured recipe data and return a cleaned, normalized JSON object.

Return ONLY valid JSON matching this EXACT schema:

{
  "name": "string (1-200 chars)",
  "description": "string (0-1000 chars) - Optional summary. Empty string if not available.",
  "prep_time_minutes": number,  // integer minutes (0-1440). Use input value or 0 if unknown.
  "cook_time_minutes": number,  // integer minutes (0-1440). Use input value or 0 if unknown.
  "servings": number,  // integer (1-100). Use input value or default to 4.
  "image_url": "string (0-500 chars) - Image URL from input. Empty string if not found. NEVER invent URLs.",
  "ingredients": [
    {
      "name": "string (1-200 chars) - Ingredient name WITHOUT quantity",
      "quantity": "string (0-100 chars) - Amount with unit (e.g., '2 cups', '1 tsp', '3 large'). KEEP FRACTIONS AS FRACTIONS (e.g., '1/2', '1 1/4', '¾')."
    }
  ],
  "timers": [
    {
      "description": "string (1-200 chars) - What this timer is for (e.g., 'Bake cookies', 'Simmer sauce')",
      "duration_minutes": number  // integer minutes (1-28800). Extract from instructions.
    }
  ]
}

Rules:
1. **Times**: Use prep_time, cook_time, or total_time values from input if present. If missing or 0, set to 0.
2. **Servings**: Use input servings value if present. Default to 4 only if completely missing.
3. **Ingredients**:
   - If input has separate quantity/name, keep them separate
   - If input has combined string (e.g., "2 cups flour"), split into quantity="2 cups", name="flour"
   - KEEP FRACTIONS AS FRACTIONS: "1/2 cup", "1 1/4 tsp", "¾ pound" (do NOT convert to decimals like 0.5 or 1.25)
   - Normalize units: "tbsp" → "tablespoon", "oz" → "ounce", but keep common abbreviations
4. **Timers**:
   - Extract ALL mentioned durations from instructions (e.g., "bake for 20 minutes", "simmer 1 hour")
   - Create one timer entry for each duration found
   - Description should describe what happens (e.g., "Bake uncovered", "Simmer glaze", "Rest ham")
   - For ranges (e.g., "8-10 minutes", "30 to 45 minutes"), use midpoint (9 minutes, 38 minutes)
   - Convert hours to minutes (e.g., "1 hour" → 60, "2 hours" → 120)
5. **Image URL**: Use exact URL from input. Empty string if missing. NEVER generate placeholder URLs.
6. **Missing data**: Use empty string for text fields, 0 for times, empty arrays if uncertain.
7. **Remove marketing language**: Remove words like "delicious", "perfect", "amazing" from descriptions.

Return ONLY the JSON object. No markdown, no explanation, no code fences.

Input recipe data:
"""


def extract_json_from_response(text: str) -> dict:
    """
    Extract JSON from LLM response.
    Handles markdown code fences and extraneous text.

    Args:
        text: LLM response text

    Returns:
        Parsed JSON dict

    Raises:
        json.JSONDecodeError: If no valid JSON found
    """
    text = text.strip()

    # Remove markdown code fences
    if text.startswith('```'):
        lines = text.split('\n')
        # Remove first line (```json or ```)
        lines = lines[1:]
        # Remove last line if it's ```
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        text = '\n'.join(lines).strip()

    # Try to parse as-is first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in text
    start = text.find('{')
    end = text.rfind('}')

    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end+1])
        except json.JSONDecodeError:
            pass

    # If all else fails, raise error
    raise json.JSONDecodeError("No valid JSON found in response", text, 0)


def call_claude(payload: dict, timeout: int = 12) -> dict | None:
    """
    Call Claude 3.5 Sonnet for recipe normalization.

    Args:
        payload: Raw recipe data to normalize
        timeout: Request timeout in seconds

    Returns:
        Normalized recipe dict or None if failed
    """
    # Check circuit breaker
    if not can_attempt_llm():
        print("Circuit breaker open - skipping Claude")
        return None

    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("ANTHROPIC_API_KEY not set")
        record_llm_failure()
        return None

    try:
        client = Anthropic(api_key=api_key)

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            temperature=0,  # Deterministic output
            messages=[{
                "role": "user",
                "content": LLM_PROMPT + json.dumps(payload, indent=2)
            }],
            timeout=timeout
        )

        content = response.content[0].text
        result = extract_json_from_response(content)

        record_llm_success()
        return result

    except json.JSONDecodeError as e:
        print(f"Claude returned invalid JSON: {e}")
        record_llm_failure()
        return None

    except Exception as e:
        print(f"Claude API error: {e}")
        record_llm_failure()
        return None


def call_gpt(payload: dict, timeout: int = 12) -> dict | None:
    """
    Fallback to GPT-4o for recipe normalization.

    Args:
        payload: Raw recipe data to normalize
        timeout: Request timeout in seconds

    Returns:
        Normalized recipe dict or None if failed
    """
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("OPENAI_API_KEY not set")
        record_llm_failure()
        return None

    try:
        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a recipe normalizer. Return only valid JSON matching the exact schema provided."
                },
                {
                    "role": "user",
                    "content": LLM_PROMPT + json.dumps(payload, indent=2)
                }
            ],
            temperature=0,
            max_tokens=4096,
            timeout=timeout
        )

        content = response.choices[0].message.content
        result = extract_json_from_response(content)

        record_llm_success()
        return result

    except json.JSONDecodeError as e:
        print(f"GPT returned invalid JSON: {e}")
        record_llm_failure()
        return None

    except Exception as e:
        print(f"OpenAI API error: {e}")
        record_llm_failure()
        return None


def build_llm_input(structured_data: dict) -> dict:
    """
    Build LLM input payload from structured JSON-LD/heuristic data.

    Converts from extraction format to LLM-friendly format with ALL source data.

    Args:
        structured_data: Dict with keys like 'name', 'prep_time' (minutes),
                        'recipeIngredient' (list of strings),
                        'recipeInstructions' (list of strings/dicts)

    Returns:
        Dict formatted for LLM consumption
    """
    return {
        "name": structured_data.get('name', ''),
        "description": structured_data.get('description', ''),
        "prep_time": structured_data.get('prep_time', 0),  # Already parsed to minutes
        "cook_time": structured_data.get('cook_time', 0),  # Already parsed to minutes
        "total_time": structured_data.get('total_time', 0),  # Fallback if prep/cook missing
        "servings": structured_data.get('servings', 4),
        "image_url": structured_data.get('image_url', ''),
        "ingredients": structured_data.get('recipeIngredient', []),  # Raw strings like "2 cups flour"
        "instructions": structured_data.get('recipeInstructions', [])  # List of step strings/dicts
    }


def normalize_recipe_with_llm(structured_data: dict) -> dict | None:
    """
    Normalize recipe using LLM.
    Tries Claude first, falls back to GPT on failure.

    Args:
        structured_data: Structured recipe data (from JSON-LD or heuristic extraction)
                        Expected fields: name, description, prep_time, cook_time,
                                       servings, image_url, recipeIngredient (list),
                                       recipeInstructions (list)

    Returns:
        Normalized recipe dict matching LLMNormalizedRecipe schema or None if both LLMs fail
    """
    # Build LLM input payload from structured data
    llm_input = build_llm_input(structured_data)

    # Try Claude first (primary)
    result = call_claude(llm_input)
    if result:
        return result

    # Fallback to GPT
    print("Claude failed, trying GPT-4o...")
    result = call_gpt(llm_input)
    if result:
        return result

    # Both failed
    print("Both Claude and GPT failed to normalize recipe")
    return None
