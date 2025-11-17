"""
User model for authentication and authorization
"""
import bcrypt
from app import db
from app.models.base import BaseModel


class User(BaseModel):
    """User model for authentication"""
    __tablename__ = 'users'

    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    family_memberships = db.relationship('FamilyMember', back_populates='user', cascade='all, delete-orphan')
    shopping_items_added = db.relationship('ShoppingListItem', foreign_keys='ShoppingListItem.added_by_id', back_populates='added_by')
    shopping_items_checked = db.relationship('ShoppingListItem', foreign_keys='ShoppingListItem.checked_by_id', back_populates='checked_by')

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        """Verify password"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    @property
    def full_name(self):
        """Get full name"""
        return f"{self.first_name} {self.last_name}"

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'is_active': self.is_active,
        })
        return data

    def __repr__(self):
        return f'<User {self.email}>'
