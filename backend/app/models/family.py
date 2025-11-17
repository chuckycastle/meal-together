"""
Family and FamilyMember models for group management
"""
import enum
from app import db
from app.models.base import BaseModel


class FamilyRole(enum.Enum):
    """Roles within a family group"""
    OWNER = 'owner'
    ADMIN = 'admin'
    MEMBER = 'member'


class Family(BaseModel):
    """Family/group model for organizing meal planning"""
    __tablename__ = 'families'

    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)

    # Relationships
    members = db.relationship('FamilyMember', back_populates='family', cascade='all, delete-orphan')
    recipes = db.relationship('Recipe', back_populates='family', cascade='all, delete-orphan')
    shopping_lists = db.relationship('ShoppingList', back_populates='family', cascade='all, delete-orphan')
    cooking_sessions = db.relationship('CookingSession', back_populates='family', cascade='all, delete-orphan')

    def get_member(self, user_id):
        """Get family member by user ID"""
        return FamilyMember.query.filter_by(family_id=self.id, user_id=user_id).first()

    def is_member(self, user_id):
        """Check if user is a member"""
        return self.get_member(user_id) is not None

    def is_owner(self, user_id):
        """Check if user is owner"""
        member = self.get_member(user_id)
        return member and member.role == FamilyRole.OWNER

    def is_admin_or_owner(self, user_id):
        """Check if user is admin or owner"""
        member = self.get_member(user_id)
        return member and member.role in [FamilyRole.OWNER, FamilyRole.ADMIN]

    def to_dict(self, include_members=False):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'name': self.name,
            'description': self.description,
            'member_count': len(self.members),
        })
        if include_members:
            data['members'] = [member.to_dict() for member in self.members]
        return data

    def __repr__(self):
        return f'<Family {self.name}>'


class FamilyMember(BaseModel):
    """Association model for user-family relationships with roles"""
    __tablename__ = 'family_members'

    family_id = db.Column(db.Integer, db.ForeignKey('families.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.Enum(FamilyRole), default=FamilyRole.MEMBER, nullable=False)

    # Relationships
    family = db.relationship('Family', back_populates='members')
    user = db.relationship('User', back_populates='family_memberships')

    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('family_id', 'user_id', name='unique_family_user'),
    )

    def to_dict(self):
        """Convert to dictionary"""
        data = super().to_dict()
        data.update({
            'family_id': self.family_id,
            'user_id': self.user_id,
            'role': self.role.value,
            'user': self.user.to_dict() if self.user else None,
        })
        return data

    def __repr__(self):
        return f'<FamilyMember family={self.family_id} user={self.user_id} role={self.role.value}>'
