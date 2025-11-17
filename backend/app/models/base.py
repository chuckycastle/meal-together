"""
Base model class with common functionality
"""
from datetime import datetime
from app import db


class BaseModel(db.Model):
    """Abstract base model with common fields and methods"""
    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def save(self):
        """Save model to database"""
        db.session.add(self)
        db.session.commit()
        return self

    def delete(self):
        """Delete model from database"""
        db.session.delete(self)
        db.session.commit()

    @classmethod
    def get_by_id(cls, id):
        """Get model by ID"""
        return cls.query.get(id)
