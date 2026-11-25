"""
Tests for meal plan helpers and the family timer state machine
"""

from datetime import datetime, timedelta

import pytest

from app.models.kitchen_timer import KitchenTimer
from app.routes.meals import clean_text, guess_category, parse_datetime
from app.routes.timers import parse_seconds

NOW = datetime(2026, 11, 26, 20, 0, 0)


def countdown(seconds=600):
    return KitchenTimer(name='Rolls', kind='countdown', duration=seconds, held_seconds=seconds, status='idle')


def stopwatch():
    return KitchenTimer(name='Resting', kind='stopwatch', duration=0, held_seconds=0, status='idle')


class TestCountdown:
    def test_start_sets_the_finish_time(self):
        timer = countdown(600)
        timer.start(NOW)
        assert timer.status == 'running'
        assert timer.anchor_at == NOW + timedelta(seconds=600)

    def test_pause_keeps_the_time_left(self):
        timer = countdown(600)
        timer.start(NOW)
        timer.pause(NOW + timedelta(seconds=150))
        assert timer.status == 'paused'
        assert timer.held_seconds == 450
        assert timer.anchor_at is None

    def test_resume_continues_from_the_time_left(self):
        timer = countdown(600)
        timer.start(NOW)
        timer.pause(NOW + timedelta(seconds=150))
        later = NOW + timedelta(hours=1)
        timer.start(later)
        assert timer.anchor_at == later + timedelta(seconds=450)

    def test_pause_after_finish_holds_zero(self):
        timer = countdown(60)
        timer.start(NOW)
        timer.pause(NOW + timedelta(seconds=300))
        assert timer.held_seconds == 0

    def test_add_time_extends_a_running_timer(self):
        timer = countdown(600)
        timer.start(NOW)
        timer.add_time(60, NOW + timedelta(seconds=10))
        assert timer.anchor_at == NOW + timedelta(seconds=660)

    def test_add_time_restarts_a_finished_timer_from_now(self):
        timer = countdown(60)
        timer.start(NOW)
        after = NOW + timedelta(seconds=200)
        timer.add_time(300, after)
        assert timer.status == 'running'
        assert timer.anchor_at == after + timedelta(seconds=300)

    def test_add_time_to_a_paused_timer(self):
        timer = countdown(600)
        timer.start(NOW)
        timer.pause(NOW + timedelta(seconds=100))
        timer.add_time(60)
        assert timer.held_seconds == 560

    def test_reset_returns_to_the_full_duration(self):
        timer = countdown(600)
        timer.start(NOW)
        timer.add_time(120, NOW)
        timer.reset()
        assert timer.status == 'idle'
        assert timer.held_seconds == 600
        assert timer.anchor_at is None

    def test_start_twice_does_not_move_the_finish_time(self):
        timer = countdown(600)
        timer.start(NOW)
        timer.start(NOW + timedelta(seconds=30))
        assert timer.anchor_at == NOW + timedelta(seconds=600)


class TestStopwatch:
    def test_counts_up_across_a_pause(self):
        timer = stopwatch()
        timer.start(NOW)
        timer.pause(NOW + timedelta(seconds=90))
        assert timer.held_seconds == 90
        later = NOW + timedelta(minutes=10)
        timer.start(later)
        assert timer.anchor_at == later - timedelta(seconds=90)

    def test_add_time_is_ignored(self):
        timer = stopwatch()
        timer.start(NOW)
        timer.add_time(60, NOW)
        assert timer.anchor_at == NOW

    def test_reset_returns_to_zero(self):
        timer = stopwatch()
        timer.start(NOW)
        timer.pause(NOW + timedelta(seconds=90))
        timer.reset()
        assert timer.held_seconds == 0
        assert timer.status == 'idle'


class TestRequestParsing:
    def test_parse_datetime_converts_to_naive_utc(self):
        assert parse_datetime('2026-11-27T02:00:00Z') == datetime(2026, 11, 27, 2, 0)
        assert parse_datetime('2026-11-26T18:00:00-08:00') == datetime(2026, 11, 27, 2, 0)

    @pytest.mark.parametrize('value', [None, '', 'tomorrow', 42])
    def test_parse_datetime_rejects_bad_input(self, value):
        with pytest.raises(ValueError):
            parse_datetime(value)

    def test_clean_text_trims_and_limits(self):
        assert clean_text('  Thanksgiving  ', 'name', 255) == 'Thanksgiving'
        assert clean_text('   ', 'notes', 255) is None
        with pytest.raises(ValueError):
            clean_text('', 'name', 255, required=True)
        with pytest.raises(ValueError):
            clean_text('x' * 300, 'name', 255)

    @pytest.mark.parametrize('value', ['60', 0, -5, 1.5, True, None, 10 ** 9])
    def test_parse_seconds_rejects_bad_input(self, value):
        with pytest.raises(ValueError):
            parse_seconds(value, 'duration')

    def test_parse_seconds_accepts_whole_seconds(self):
        assert parse_seconds(600, 'duration') == 600


class TestShoppingCategories:
    @pytest.mark.parametrize('name, category', [
        ('Unsalted butter', 'Dairy & eggs'),
        ('Kosher salt', 'Spices'),
        ('Orange juice', 'Pantry'),
        ('Orange', 'Produce'),
        ('Chicken broth', 'Pantry'),
        ('Young turkey', 'Meat'),
        ('Fresh sage', 'Produce'),
        ('Ground cloves', 'Spices'),
        ('Garlic', 'Produce'),
        ('Dark brown sugar', 'Baking'),
        ('Traditional stuffing mix', 'Bakery'),
        ('Dijon mustard', 'Pantry'),
        ('Dragon fruit', 'Other'),
    ])
    def test_guess_category(self, name, category):
        assert guess_category(name) == category
