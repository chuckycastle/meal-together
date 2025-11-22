"""
Shopping list models for collaborative grocery shopping
"""
from app import db
from app.models.base import BaseModel


class ShoppingList(BaseModel):
    """Shopping list for a family"""
    __tablename__ = 'shopping_lists'

    name = db.Column(db.String(255), nullable=False, default='Shopping List')
    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    # Relationships
    family = db.relationship('Family', back_populates='shopping_lists')
    items = db.relationship('ShoppingListItem', back_populates='shopping_list', cascade='all, delete-orphan')

    @property
    def total_items(self):
        """Get total number of items"""
        return len(self.items)

    @property
    def checked_items(self):
        """Get number of checked items"""
        return len([item for item in self.items if item.checked])

    @property
    def completion_percentage(self):
        """Get completion percentage"""
        if self.total_items == 0:
            return 0
        return int((self.checked_items / self.total_items) * 100)

    def to_dict(self, include_items=False):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'name': self.name,
            'family_id': self.family_id,
            'is_active': self.is_active,
            'total_items': self.total_items,
            'checked_items': self.checked_items,
            'completion_percentage': self.completion_percentage,
        })
        if include_items:
            data['items'] = [item.to_dict() for item in self.items]
        return data

    def __repr__(self):
        return f'<ShoppingList {self.name} ({self.checked_items}/{self.total_items})>'


class ShoppingListItem(BaseModel):
    """Individual item in a shopping list"""
    __tablename__ = 'shopping_list_items'

    shopping_list_id = db.Column(db.Integer, db.ForeignKey('shopping_lists.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.String(50))
    category = db.Column(db.String(100))  # e.g., "Produce", "Dairy", "Meat"
    notes = db.Column(db.Text)
    checked = db.Column(db.Boolean, default=False)

    # Optimistic locking to prevent race conditions
    version = db.Column(db.Integer, default=1, nullable=False)

    # Track who added and checked the item
    added_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    checked_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    checked_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    shopping_list = db.relationship('ShoppingList', back_populates='items')
    added_by = db.relationship('User', foreign_keys=[added_by_id], back_populates='shopping_items_added')
    checked_by = db.relationship('User', foreign_keys=[checked_by_id], back_populates='shopping_items_checked')

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'shopping_list_id': self.shopping_list_id,
            'name': self.name,
            'quantity': self.quantity,
            'category': self.category,
            'notes': self.notes,
            'checked': self.checked,
            'version': self.version,  # Include version for optimistic locking
            'added_by_id': self.added_by_id,
            'added_by': self.added_by.to_dict() if self.added_by else None,
            'checked_by_id': self.checked_by_id,
            'checked_by': self.checked_by.to_dict() if self.checked_by else None,
            'checked_at': self.checked_at.isoformat() if self.checked_at else None,
        })
        return data

    def __repr__(self):
        status = '✓' if self.checked else '☐'
        return f'<ShoppingListItem {status} {self.quantity} {self.name}>'
