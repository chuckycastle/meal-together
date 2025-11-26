"""
Tests for recipe import functionality
"""

import pytest
from unittest.mock import patch, MagicMock
from app.services.recipe_parser import (
    parse_duration_to_seconds,
    derive_timers_from_steps,
    enforce_input_limits,
    truncate_text,
)
from app.utils.url_validator import validate_url_safe, is_private_ip
from app.services.llm_service import extract_json_from_response


class TestDurationParsing:
    """Test duration parsing from text"""

    def test_parse_hours(self):
        assert parse_duration_to_seconds("2 hours") == 7200
        assert parse_duration_to_seconds("1 hour") == 3600
        assert parse_duration_to_seconds("1.5 hours") == 5400

    def test_parse_minutes(self):
        assert parse_duration_to_seconds("20 minutes") == 1200
        assert parse_duration_to_seconds("30 mins") == 1800
        assert parse_duration_to_seconds("5 min") == 300

    def test_parse_seconds(self):
        assert parse_duration_to_seconds("30 seconds") == 30
        assert parse_duration_to_seconds("45 secs") == 45

    def test_parse_none(self):
        assert parse_duration_to_seconds("") is None
        assert parse_duration_to_seconds("no time") is None
        assert parse_duration_to_seconds(None) is None


class TestTimerDerivation:
    """Test timer derivation from cooking steps"""

    def test_derive_timers_from_steps(self):
        steps = [
            {"order": 1, "instruction": "Preheat oven to 350°F.", "estimated_time": 10},
            {"order": 2, "instruction": "Bake for 20 minutes", "estimated_time": 20},
            {"order": 3, "instruction": "Let cool", "estimated_time": None},
        ]

        timers = derive_timers_from_steps(steps)

        assert len(timers) == 2
        assert timers[0]['name'] == "Preheat oven to 350°F"
        assert timers[0]['duration'] == 600  # 10 minutes in seconds
        assert timers[0]['step_order'] == 1

        assert timers[1]['name'] == "Bake for 20 minutes"
        assert timers[1]['duration'] == 1200  # 20 minutes in seconds
        assert timers[1]['step_order'] == 2

    def test_no_timers_when_no_estimated_time(self):
        steps = [
            {"order": 1, "instruction": "Mix ingredients", "estimated_time": None},
        ]

        timers = derive_timers_from_steps(steps)
        assert len(timers) == 0


class TestInputLimits:
    """Test input truncation and limits"""

    def test_truncate_text(self):
        assert truncate_text("Hello World", 5) == "Hello"
        assert truncate_text("Short", 100) == "Short"
        assert truncate_text("", 10) == ""
        assert truncate_text(None, 10) == ""

    def test_enforce_ingredient_limits(self):
        data = {
            "ingredients": [
                {"name": "a" * 200, "quantity": "b" * 200}
                for _ in range(100)  # Exceed max
            ]
        }

        result = enforce_input_limits(data)

        # Should be truncated to MAX_INGREDIENTS (50)
        assert len(result['ingredients']) == 50

        # Ingredient fields should be truncated
        assert len(result['ingredients'][0]['name']) == 100  # MAX_INGREDIENT_CHARS
        assert len(result['ingredients'][0]['quantity']) == 100

    def test_enforce_step_limits(self):
        data = {
            "steps": [
                {"order": i, "instruction": "x" * 1000, "estimated_time": 10}
                for i in range(50)  # Exceed max
            ]
        }

        result = enforce_input_limits(data)

        # Should be truncated to MAX_STEPS (30)
        assert len(result['steps']) == 30

        # Instruction should be truncated
        assert len(result['steps'][0]['instruction']) == 500  # MAX_STEP_CHARS


class TestURLValidation:
    """Test SSRF protection and URL validation"""

    def test_valid_public_urls(self):
        valid_urls = [
            "https://example.com/recipe",
            "https://www.allrecipes.com/recipe/123",
            "http://foodnetwork.com/recipe",
        ]

        for url in valid_urls:
            is_safe, _ = validate_url_safe(url)
            assert is_safe, f"Expected {url} to be valid"

    def test_invalid_schemes(self):
        invalid_urls = [
            "ftp://example.com",
            "file:///etc/passwd",
            "javascript:alert(1)",
        ]

        for url in invalid_urls:
            is_safe, _ = validate_url_safe(url)
            assert not is_safe, f"Expected {url} to be invalid"

    def test_private_ips(self):
        # IPv4 private ranges
        assert is_private_ip("192.168.1.1")
        assert is_private_ip("10.0.0.1")
        assert is_private_ip("172.16.0.1")
        assert is_private_ip("127.0.0.1")

        # IPv6 private ranges
        assert is_private_ip("::1")  # localhost
        assert is_private_ip("fc00::1")  # unique local
        assert is_private_ip("fe80::1")  # link-local

        # Public IPs
        assert not is_private_ip("8.8.8.8")
        assert not is_private_ip("1.1.1.1")

    def test_localhost_blocked(self):
        localhost_urls = [
            "http://localhost/recipe",
            "http://127.0.0.1/recipe",
            "http://[::1]/recipe",
        ]

        for url in localhost_urls:
            is_safe, _ = validate_url_safe(url)
            assert not is_safe, f"Expected {url} to be blocked"

    def test_metadata_service_blocked(self):
        metadata_urls = [
            "http://169.254.169.254/latest/meta-data",
            "http://[fd00:ec2::254]/latest/meta-data",
        ]

        for url in metadata_urls:
            is_safe, _ = validate_url_safe(url)
            assert not is_safe, f"Expected {url} to be blocked"


class TestJSONExtraction:
    """Test JSON extraction from LLM responses"""

    def test_extract_plain_json(self):
        response = '{"name": "Test Recipe", "prep_time": 10}'
        result = extract_json_from_response(response)
        assert result['name'] == "Test Recipe"
        assert result['prep_time'] == 10

    def test_extract_json_with_markdown_fences(self):
        response = '''```json
{
  "name": "Test Recipe",
  "prep_time": 10
}
```'''
        result = extract_json_from_response(response)
        assert result['name'] == "Test Recipe"

    def test_extract_json_with_extra_text(self):
        response = 'Here is the recipe: {"name": "Test", "prep_time": 5} and that\'s it'
        result = extract_json_from_response(response)
        assert result['name'] == "Test"

    def test_invalid_json_raises_error(self):
        with pytest.raises(Exception):
            extract_json_from_response("This is not JSON at all")


class TestCircuitBreaker:
    """Test circuit breaker functionality"""

    @patch('app.services.circuit_breaker.db.session')
    def test_record_success_resets_failures(self, mock_session):
        from app.services.circuit_breaker import record_llm_success

        record_llm_success()

        # Should update to reset failures and close circuit
        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

    @patch('app.services.circuit_breaker.db.session')
    def test_record_failure_increments(self, mock_session):
        from app.services.circuit_breaker import record_llm_failure

        mock_session.execute.return_value.fetchone.return_value = (False,)

        is_open = record_llm_failure()

        assert not is_open
        mock_session.execute.assert_called_once()
        mock_session.commit.assert_called_once()

    @patch('app.services.circuit_breaker.db.session')
    def test_circuit_opens_after_threshold(self, mock_session):
        from app.services.circuit_breaker import record_llm_failure

        # Simulate reaching threshold
        mock_session.execute.return_value.fetchone.return_value = (True,)

        is_open = record_llm_failure()

        assert is_open
