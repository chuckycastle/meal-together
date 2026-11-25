"""
Family timer board: countdowns and stopwatches shared by a family
"""
from datetime import datetime, timedelta
from app import db
from app.models.base import BaseModel
from app.models.meal import ITEM_COLORS, iso_utc

TIMER_KINDS = ('countdown', 'stopwatch')
TIMER_STATUSES = ('idle', 'running', 'paused')
MAX_DURATION_SECONDS = 48 * 60 * 60
MAX_TIMERS_PER_FAMILY = 60

__all__ = ['KitchenTimer', 'TIMER_KINDS', 'TIMER_STATUSES', 'ITEM_COLORS', 'MAX_DURATION_SECONDS',
           'MAX_TIMERS_PER_FAMILY']


class KitchenTimer(BaseModel):
    """
    A timer on the family's board.

    State is stored as timestamps so no background job is needed:
    - countdown, running: anchor_at is the moment it reaches zero
    - stopwatch, running: anchor_at is the moment it started counting
    - idle or paused: held_seconds is the time left (countdown) or elapsed (stopwatch)

    A running countdown whose anchor_at has passed is finished; the time since
    then is its overtime.
    """
    __tablename__ = 'family_timers'

    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    kind = db.Column(db.String(20), nullable=False, default='countdown')
    duration = db.Column(db.Integer, nullable=False, default=0)  # seconds; 0 for a stopwatch
    color = db.Column(db.String(20), nullable=False, default='ink')
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id', ondelete='SET NULL'), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='idle')
    anchor_at = db.Column(db.DateTime, nullable=True)  # naive UTC
    held_seconds = db.Column(db.Integer, nullable=False, default=0)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Relationships
    family = db.relationship('Family', back_populates='timers')
    recipe = db.relationship('Recipe')

    def start(self, now=None):
        """Start or resume"""
        if self.status == 'running':
            return
        now = now or datetime.utcnow()
        if self.kind == 'countdown':
            self.anchor_at = now + timedelta(seconds=self.held_seconds)
        else:
            self.anchor_at = now - timedelta(seconds=self.held_seconds)
        self.status = 'running'

    def pause(self, now=None):
        """Pause a running timer, keeping its place"""
        if self.status != 'running':
            return
        now = now or datetime.utcnow()
        if self.kind == 'countdown':
            self.held_seconds = max(0, int(round((self.anchor_at - now).total_seconds())))
        else:
            self.held_seconds = max(0, int(round((now - self.anchor_at).total_seconds())))
        self.anchor_at = None
        self.status = 'paused'

    def reset(self):
        """Return to the starting position, ready to run again"""
        self.status = 'idle'
        self.anchor_at = None
        self.held_seconds = self.duration if self.kind == 'countdown' else 0

    def add_time(self, seconds, now=None):
        """Add time to a countdown. A finished countdown restarts with the added time."""
        if self.kind != 'countdown':
            return
        now = now or datetime.utcnow()
        if self.status == 'running':
            base = max(self.anchor_at, now)
            self.anchor_at = base + timedelta(seconds=seconds)
        else:
            self.held_seconds = min(MAX_DURATION_SECONDS, self.held_seconds + seconds)

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'family_id': self.family_id,
            'name': self.name,
            'kind': self.kind,
            'duration': self.duration,
            'color': self.color,
            'recipe_id': self.recipe_id,
            'recipe_name': self.recipe.name if self.recipe else None,
            'status': self.status,
            'anchor_at': iso_utc(self.anchor_at),
            'held_seconds': self.held_seconds,
            'created_by_id': self.created_by_id,
        })
        return data

    def __repr__(self):
        return f'<KitchenTimer {self.name} {self.status}>'
