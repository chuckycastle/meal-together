#!/usr/bin/env python3
"""
Live test script for recipe import functionality
Tests URL validation, fetching, and parsing (without LLM to save costs)
"""

import os
import sys
from app import create_app, db
from app.utils.url_validator import validate_url_safe
from app.utils.http_fetcher import fetch_html
from app.services.recipe_parser import (
    extract_json_ld,
    extract_heuristic,
    derive_timers_from_steps,
)

# Test URLs (well-known recipe sites with JSON-LD)
TEST_URLS = [
    "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/",
    "https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies",
]


def test_url_validation():
    """Test SSRF protection"""
    print("\n🔒 Testing URL Validation (SSRF Protection)")
    print("=" * 50)

    # Valid URLs
    valid_urls = [
        "https://www.allrecipes.com/recipe/123",
        "https://www.bonappetit.com/recipe/test",
    ]

    for url in valid_urls:
        is_safe, reason = validate_url_safe(url)
        status = "✅" if is_safe else "❌"
        print(f"{status} {url}")
        if not is_safe:
            print(f"   Reason: {reason}")

    # Invalid URLs (should be blocked)
    invalid_urls = [
        "http://localhost/recipe",
        "http://192.168.1.1/recipe",
        "http://169.254.169.254/latest/meta-data",
    ]

    print("\n🚫 Testing blocked URLs:")
    for url in invalid_urls:
        is_safe, reason = validate_url_safe(url)
        status = "✅ BLOCKED" if not is_safe else "❌ NOT BLOCKED"
        print(f"{status} {url}")
        print(f"   Reason: {reason}")


def test_html_fetching():
    """Test HTTP fetching with a real URL"""
    print("\n🌐 Testing HTML Fetching")
    print("=" * 50)

    test_url = "https://www.allrecipes.com/"

    try:
        html = fetch_html(test_url)
        print(f"✅ Successfully fetched {len(html)} bytes from {test_url}")
        print(f"   Contains 'recipe': {'recipe' in html.lower()}")
    except Exception as e:
        print(f"❌ Failed to fetch: {e}")


def test_json_ld_extraction():
    """Test JSON-LD extraction from HTML"""
    print("\n📊 Testing JSON-LD Extraction")
    print("=" * 50)

    # Sample HTML with JSON-LD recipe
    sample_html = """
    <html>
    <head>
        <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "Recipe",
            "name": "Test Recipe",
            "recipeIngredient": ["2 cups flour", "1 cup sugar"],
            "recipeInstructions": [
                {"@type": "HowToStep", "text": "Mix ingredients"},
                {"@type": "HowToStep", "text": "Bake for 20 minutes"}
            ]
        }
        </script>
    </head>
    <body>Test</body>
    </html>
    """

    try:
        recipe = extract_json_ld(sample_html)
        if recipe:
            print(f"✅ Successfully extracted JSON-LD recipe")
            print(f"   Name: {recipe.get('name')}")
            print(f"   Ingredients: {len(recipe.get('recipeIngredient', []))}")
            print(f"   Instructions: {len(recipe.get('recipeInstructions', []))}")
        else:
            print("❌ No JSON-LD recipe found")
    except Exception as e:
        print(f"❌ Extraction failed: {e}")


def test_heuristic_extraction():
    """Test heuristic HTML parsing"""
    print("\n🔍 Testing Heuristic Extraction")
    print("=" * 50)

    # Sample HTML without JSON-LD
    sample_html = """
    <html>
    <body>
        <h1>Chocolate Chip Cookies</h1>
        <div class="ingredients">
            <h2>Ingredients</h2>
            <ul>
                <li>2 cups flour</li>
                <li>1 cup sugar</li>
                <li>1/2 cup butter</li>
            </ul>
        </div>
        <div class="instructions">
            <h2>Instructions</h2>
            <ol>
                <li>Mix dry ingredients</li>
                <li>Bake for 20 minutes at 350°F</li>
                <li>Let cool for 5 minutes</li>
            </ol>
        </div>
    </body>
    </html>
    """

    try:
        recipe = extract_heuristic(sample_html)
        print(f"✅ Heuristic extraction completed")
        print(f"   Name: {recipe.get('name')}")
        print(f"   Ingredients: {len(recipe.get('ingredients', []))}")
        print(f"   Steps: {len(recipe.get('steps', []))}")
    except Exception as e:
        print(f"❌ Extraction failed: {e}")


def test_timer_derivation():
    """Test timer derivation from steps"""
    print("\n⏱️  Testing Timer Derivation")
    print("=" * 50)

    steps = [
        {"order": 1, "instruction": "Mix ingredients", "estimated_time": None},
        {"order": 2, "instruction": "Bake for 20 minutes", "estimated_time": 20},
        {"order": 3, "instruction": "Let cool for 5 minutes", "estimated_time": 5},
    ]

    timers = derive_timers_from_steps(steps)

    print(f"✅ Derived {len(timers)} timers from {len(steps)} steps")
    for timer in timers:
        print(f"   - {timer['name']}: {timer['duration']}s (step {timer['step_order']})")


def test_circuit_breaker():
    """Test circuit breaker state"""
    print("\n🔌 Testing Circuit Breaker")
    print("=" * 50)

    try:
        from app.services.circuit_breaker import get_circuit_status, can_attempt_llm

        status = get_circuit_status()
        can_call = can_attempt_llm()

        print(f"✅ Circuit breaker status retrieved")
        print(f"   Is open: {status['is_open']}")
        print(f"   Consecutive failures: {status['consecutive_failures']}")
        print(f"   Can attempt LLM: {can_call}")
    except Exception as e:
        print(f"❌ Failed to check circuit breaker: {e}")


def main():
    """Run all tests"""
    print("\n" + "=" * 50)
    print("AI Recipe Import - Live Functionality Test")
    print("=" * 50)

    # Create app context
    app = create_app()
    with app.app_context():
        test_url_validation()
        test_html_fetching()
        test_json_ld_extraction()
        test_heuristic_extraction()
        test_timer_derivation()
        test_circuit_breaker()

    print("\n" + "=" * 50)
    print("✅ All tests completed!")
    print("=" * 50)
    print("\nNote: LLM functionality not tested to avoid API costs.")
    print("To test full import, use the frontend UI or run:")
    print("  curl -X POST http://localhost:5001/api/families/1/recipes/import \\")
    print("       -H 'Content-Type: application/json' \\")
    print("       -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\")
    print("       -d '{\"url\": \"https://www.allrecipes.com/recipe/123\"}'")
    print()


if __name__ == "__main__":
    main()
