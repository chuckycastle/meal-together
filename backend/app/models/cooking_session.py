"""
Cooking session and active timer models
"""
from datetime import datetime
from app import db
from app.models.base import BaseModel


class CookingSession(BaseModel):
    """Active cooking session for a recipe"""
    __tablename__ = 'cooking_sessions'

    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False)
    started_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_time = db.Column(db.DateTime)  # Target completion time for timeline scheduling
    actual_start_time = db.Column(db.DateTime)  # When actually started cooking
    completed_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    recipe = db.relationship('Recipe', back_populates='cooking_sessions')
    family = db.relationship('Family', back_populates='cooking_sessions')
    started_by = db.relationship('User')
    active_timers = db.relationship('ActiveTimer', back_populates='cooking_session', cascade='all, delete-orphan')

    @property
    def is_completed(self):
        """Check if session is completed"""
        return self.completed_at is not None

    @property
    def duration(self):
        """Get session duration in minutes"""
        if not self.actual_start_time:
            return 0
        end_time = self.completed_at or datetime.utcnow()
        return int((end_time - self.actual_start_time).total_seconds() / 60)

    def to_dict(self, include_timers=False):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'recipe_id': self.recipe_id,
            'recipe': self.recipe.to_dict() if self.recipe else None,
            'family_id': self.family_id,
            'started_by_id': self.started_by_id,
            'started_by': self.started_by.to_dict() if self.started_by else None,
            'target_time': self.target_time.isoformat() if self.target_time else None,
            'actual_start_time': self.actual_start_time.isoformat() if self.actual_start_time else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'is_active': self.is_active,
            'is_completed': self.is_completed,
            'duration': self.duration,
        })
        if include_timers:
            data['active_timers'] = [timer.to_dict() for timer in self.active_timers]
        return data

    def __repr__(self):
        status = 'completed' if self.is_completed else 'active'
        return f'<CookingSession recipe={self.recipe_id} {status}>'


class ActiveTimer(BaseModel):
    """Active timer during a cooking session"""
    __tablename__ = 'active_timers'

    cooking_session_id = db.Column(db.Integer, db.ForeignKey('cooking_sessions.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # Total duration in seconds
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    paused_at = db.Column(db.DateTime, nullable=True)
    remaining_time = db.Column(db.Integer)  # Seconds remaining when paused
    completed_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    cooking_session = db.relationship('CookingSession', back_populates='active_timers')

    @property
    def is_paused(self):
        """Check if timer is paused"""
        return self.paused_at is not None and not self.completed_at

    @property
    def is_completed(self):
        """Check if timer is completed"""
        return self.completed_at is not None

    @property
    def is_running(self):
        """Check if timer is currently running"""
        return self.is_active and not self.is_paused and not self.is_completed

    def get_remaining_time(self):
        """Calculate remaining time in seconds"""
        if self.is_completed:
            return 0
        if self.is_paused:
            return self.remaining_time or 0

        # Calculate based on elapsed time
        elapsed = (datetime.utcnow() - self.started_at).total_seconds()
        remaining = self.duration - int(elapsed)
        return max(0, remaining)

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'cooking_session_id': self.cooking_session_id,
            'name': self.name,
            'duration': self.duration,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'paused_at': self.paused_at.isoformat() if self.paused_at else None,
            'remaining_time': self.get_remaining_time(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'is_active': self.is_active,
            'is_paused': self.is_paused,
            'is_running': self.is_running,
            'is_completed': self.is_completed,
        })
        return data

    def __repr__(self):
        status = 'completed' if self.is_completed else ('paused' if self.is_paused else 'running')
        return f'<ActiveTimer {self.name} {status}>'
