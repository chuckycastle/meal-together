"""
Load the family holiday recipes and the Thanksgiving 2026 schedule into a family.

Adds only what is missing: recipes are matched by name within the family, and
the meal is matched by name. Existing rows are left unchanged.

Usage:
    python seed_family_recipes.py --email you@example.com --timezone America/Los_Angeles
    python seed_family_recipes.py --family-id 3 --timezone America/Chicago
    python seed_family_recipes.py --demo            # local development only
"""
import argparse
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User
from app.models.family import Family, FamilyMember, FamilyRole
from app.models.recipe import Recipe, Ingredient, CookingStep, RecipeTimer
from app.models.meal import Meal, MealItem
from family_recipes import RECIPES, THANKSGIVING

# Same demo account as seed_database.py
DEMO_EMAIL = 'demo@mealtogether.com'
DEMO_PASSWORD = 'Demo123!'
DEMO_MEMBERS = [
    ('john@example.com', 'John', 'Doe', 'Password123!'),
    ('jane@example.com', 'Jane', 'Smith', 'Password123!'),
]
DEMO_ASSIGNMENTS = {
    'Cranberry sauce': 'jane@example.com',
    'Apple pie': 'jane@example.com',
    'Ham': 'john@example.com',
    'Turkey': DEMO_EMAIL,
    'Stuffing': DEMO_EMAIL,
}


def get_or_create_user(email, first_name, last_name, password):
    user = User.query.filter_by(email=email).first()
    if user:
        return user
    user = User(email=email, first_name=first_name, last_name=last_name)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    return user


def demo_family():
    """Create a local demo family with three members"""
    if os.getenv('FLASK_ENV') == 'production':
        sys.exit('--demo is for local development only')

    owner = get_or_create_user(DEMO_EMAIL, 'Demo', 'User', DEMO_PASSWORD)
    membership = FamilyMember.query.filter_by(user_id=owner.id).first()
    if membership:
        family = membership.family
    else:
        family = Family(name='Our family', description='Holiday cooking')
        db.session.add(family)
        db.session.flush()
        db.session.add(FamilyMember(user_id=owner.id, family_id=family.id, role=FamilyRole.OWNER))

    for email, first_name, last_name, password in DEMO_MEMBERS:
        user = get_or_create_user(email, first_name, last_name, password)
        if not family.is_member(user.id):
            db.session.add(FamilyMember(user_id=user.id, family_id=family.id, role=FamilyRole.MEMBER))

    db.session.flush()
    return family


def find_family(email, family_id):
    if family_id:
        family = Family.get_by_id(family_id)
        if not family:
            sys.exit(f'No family with id {family_id}')
        return family

    user = User.query.filter_by(email=email).first()
    if not user:
        sys.exit(f'No user with email {email}')
    memberships = FamilyMember.query.filter_by(user_id=user.id).all()
    if not memberships:
        sys.exit(f'{email} does not belong to a family')
    if len(memberships) > 1:
        names = ', '.join(f'{m.family.name} (id {m.family_id})' for m in memberships)
        sys.exit(f'{email} belongs to several families: {names}. Pass --family-id.')
    return memberships[0].family


def add_recipes(family, owner_id):
    """Add missing recipes; return every seeded recipe by name"""
    by_name = {}
    added = 0
    for data in RECIPES:
        recipe = Recipe.query.filter_by(family_id=family.id, name=data['name']).first()
        if not recipe:
            recipe = Recipe(
                name=data['name'],
                description=data['description'],
                prep_time=data['prep_time'],
                cook_time=data['cook_time'],
                servings=data['servings'],
                source_url=data['source_url'],
                family_id=family.id,
                assigned_to_id=owner_id,
            )
            db.session.add(recipe)
            db.session.flush()
            for order, (quantity, name) in enumerate(data['ingredients']):
                if quantity and len(quantity) > 50:
                    sys.exit(f'Quantity too long for {name} in {data["name"]}')
                db.session.add(Ingredient(recipe_id=recipe.id, name=name, quantity=quantity, order=order))
            for order, (instruction, minutes) in enumerate(data['steps']):
                db.session.add(CookingStep(
                    recipe_id=recipe.id, instruction=instruction, order=order, estimated_time=minutes
                ))
            for name, minutes, step_number in data['timers']:
                db.session.add(RecipeTimer(
                    recipe_id=recipe.id, name=name, duration=minutes * 60, step_order=step_number
                ))
            added += 1
        by_name[data['name']] = recipe
    return by_name, added


def add_thanksgiving(family, recipes, tz, assignments):
    """Add the Thanksgiving meal with the family's start times"""
    if Meal.query.filter_by(family_id=family.id, name=THANKSGIVING['name']).first():
        return False

    year, month, day = THANKSGIVING['date']

    def to_utc(hour, minute):
        local = datetime(year, month, day, hour, minute, tzinfo=tz)
        return local.astimezone(timezone.utc).replace(tzinfo=None)

    meal = Meal(family_id=family.id, name=THANKSGIVING['name'], serve_at=to_utc(*THANKSGIVING['serve_at']))
    db.session.add(meal)
    for (hour, minute), title, kind, color, recipe_name in THANKSGIVING['items']:
        assignee = assignments.get(title)
        db.session.add(MealItem(
            meal=meal,
            kind=kind,
            title=title,
            color=color,
            recipe=recipes.get(recipe_name) if recipe_name else None,
            start_at=to_utc(hour, minute),
            assigned_to_id=assignee.id if assignee else None,
        ))
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument('--email', help='Email of a user whose family receives the recipes')
    target.add_argument('--family-id', type=int, help='Family id that receives the recipes')
    target.add_argument('--demo', action='store_true', help='Create a local demo family and seed it')
    parser.add_argument('--timezone', help='IANA timezone of the kitchen, such as America/Los_Angeles')
    args = parser.parse_args()

    if args.timezone:
        tz = ZoneInfo(args.timezone)
    elif args.demo:
        tz = datetime.now().astimezone().tzinfo
    else:
        sys.exit('--timezone is required so the schedule lands on the right local times')

    app = create_app()
    with app.app_context():
        db.create_all()
        family = demo_family() if args.demo else find_family(args.email, args.family_id)

        owner = next((m for m in family.members if m.role == FamilyRole.OWNER), family.members[0])
        recipes, added = add_recipes(family, owner.user_id)

        assignments = {}
        if args.demo:
            for title, email in DEMO_ASSIGNMENTS.items():
                assignments[title] = User.query.filter_by(email=email).first()
        meal_added = add_thanksgiving(family, recipes, tz, assignments)

        db.session.commit()
        print(f'Family: {family.name} (id {family.id})')
        print(f'Recipes added: {added} of {len(RECIPES)}')
        print(f'{THANKSGIVING["name"]}: {"added" if meal_added else "already present"}')


if __name__ == '__main__':
    main()
