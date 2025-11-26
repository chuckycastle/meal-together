"""
Thread-Safe Circuit Breaker for LLM Calls
Uses database-backed state to work across multiple workers/processes.
"""

import os
from datetime import datetime, timedelta
from sqlalchemy import text
from app import db


# Configuration from environment
FAILURE_THRESHOLD = int(os.getenv('RECIPE_IMPORT_CIRCUIT_FAILURE_THRESHOLD', 5))
COOLDOWN_MINUTES = int(os.getenv('RECIPE_IMPORT_CIRCUIT_COOLDOWN_MINUTES', 15))


def record_llm_success():
    """
    Record a successful LLM call.
    Resets the circuit breaker to closed state.
    """
    try:
        db.session.execute(text("""
            UPDATE recipe_import_circuit_state
            SET consecutive_failures = 0,
                is_open = false
            WHERE id = 1
        """))
        db.session.commit()
    except Exception as e:
        print(f"Failed to record LLM success: {e}")
        db.session.rollback()


def record_llm_failure():
    """
    Record a failed LLM call.
    Opens circuit if failure threshold is reached.

    Returns:
        bool: True if circuit is now open, False otherwise
    """
    try:
        result = db.session.execute(text("""
            UPDATE recipe_import_circuit_state
            SET consecutive_failures = consecutive_failures + 1,
                last_failure_at = now(),
                is_open = (consecutive_failures + 1 >= :threshold)
            WHERE id = 1
            RETURNING is_open
        """), {"threshold": FAILURE_THRESHOLD}).fetchone()

        db.session.commit()

        return result[0] if result else False

    except Exception as e:
        print(f"Failed to record LLM failure: {e}")
        db.session.rollback()
        return False


def can_attempt_llm() -> bool:
    """
    Check if we can attempt an LLM call.
    Returns False if circuit is open and cooldown hasn't expired.

    Returns:
        bool: True if LLM call can be attempted, False if circuit is open
    """
    try:
        result = db.session.execute(text("""
            SELECT is_open, last_failure_at, consecutive_failures
            FROM recipe_import_circuit_state
            WHERE id = 1
        """)).fetchone()

        if not result:
            # Circuit state not initialized - allow attempt
            return True

        is_open, last_failure, consecutive_failures = result

        # Circuit is closed - allow attempt
        if not is_open:
            return True

        # Circuit is open - check if cooldown period has passed
        if last_failure:
            cooldown_end = last_failure + timedelta(minutes=COOLDOWN_MINUTES)

            if datetime.now() >= cooldown_end:
                # Cooldown expired - reset circuit and allow attempt
                db.session.execute(text("""
                    UPDATE recipe_import_circuit_state
                    SET is_open = false,
                        consecutive_failures = 0
                    WHERE id = 1
                """))
                db.session.commit()
                return True

        # Circuit is open and cooldown not expired
        return False

    except Exception as e:
        print(f"Failed to check circuit breaker state: {e}")
        db.session.rollback()
        # Fail-safe: allow attempt if we can't check state
        return True


def get_circuit_status() -> dict:
    """
    Get current circuit breaker status for monitoring/debugging.

    Returns:
        dict: Circuit state with keys:
            - is_open: bool
            - consecutive_failures: int
            - last_failure_at: datetime | None
    """
    try:
        result = db.session.execute(text("""
            SELECT is_open, consecutive_failures, last_failure_at
            FROM recipe_import_circuit_state
            WHERE id = 1
        """)).fetchone()

        if not result:
            return {
                "is_open": False,
                "consecutive_failures": 0,
                "last_failure_at": None
            }

        return {
            "is_open": result[0],
            "consecutive_failures": result[1],
            "last_failure_at": result[2]
        }

    except Exception as e:
        print(f"Failed to get circuit status: {e}")
        return {
            "is_open": False,
            "consecutive_failures": 0,
            "last_failure_at": None
        }
