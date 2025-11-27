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


# LLM Prompt - EXACTLY aligned with Pydantic ImportedRecipe schema
LLM_PROMPT = """You are a recipe normalizer. Return ONLY valid JSON matching this EXACT schema:

{
  "name": "string (1-200 chars)",
  "description": "string (0-1000 chars)",
  "prep_time": number,  // minutes (integer, 0-1440)
  "cook_time": number,  // minutes (integer, 0-1440)
  "servings": number,  // integer (1-100)
  "image_url": "string (0-500 chars) - Recipe image URL if found in source data. MUST be empty string if not found. DO NOT fabricate or invent URLs.",
  "ingredients": [
    {
      "name": "string (1-200 chars)",
      "quantity": "string (0-100 chars)"
    }
  ],
  "steps": [
    {
      "order": number,  // integer (1-50)
      "instruction": "string (1-500 chars)",
      "estimated_time": number | null  // minutes (integer, 0-28800) or null
    }
  ]
}

Rules:
- Keep steps concise and imperative (e.g., "Preheat oven to 350°F")
- CRITICAL: If input has prep_time > 0, use that EXACT value (do not modify)
- CRITICAL: If input has cook_time > 0, use that EXACT value (do not modify)
- CRITICAL: If input has servings != 4, use that EXACT value (do not modify)
- CRITICAL: If step has estimated_time > 0 in input, use that EXACT value (do not modify)
- Extract times from text ONLY if input value is 0/null
- NEVER return 0 for prep_time/cook_time if input has non-zero values
- For time ranges, use MIDPOINT (e.g., "8 to 10 minutes" → estimated_time: 9, "30-45 minutes" → estimated_time: 38)
- If step mentions "1 hour", convert to 60 minutes
- Set null only if no duration mentioned and none in input
- For ingredients: if quantity and name are already split in input, keep them split - do not merge
- For image_url: Leave as empty string if no image URL found in source. NEVER invent or generate placeholder image URLs.
- Preserve source URLs exactly as provided - do not modify them
- Don't invent data - use null or empty string if uncertain
- Preserve chronological order
- Remove marketing language ("delicious", "perfect", etc.)

Return ONLY the JSON object. No markdown, no explanation.

Input recipe to normalize:
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


def normalize_recipe_with_llm(raw_data: dict) -> dict | None:
    """
    Normalize recipe using LLM.
    Tries Claude first, falls back to GPT on failure.

    Args:
        raw_data: Raw recipe data (from JSON-LD or heuristic extraction)

    Returns:
        Normalized recipe dict or None if both LLMs fail
    """
    # Try Claude first (primary)
    result = call_claude(raw_data)
    if result:
        return result

    # Fallback to GPT
    print("Claude failed, trying GPT-4o...")
    result = call_gpt(raw_data)
    if result:
        return result

    # Both failed
    print("Both Claude and GPT failed to normalize recipe")
    return None
