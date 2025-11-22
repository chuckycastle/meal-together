"""
Database seeding script for MealTogether
Creates sample data for testing and development
"""
import sys
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User
from app.models.family import Family, FamilyMember
from app.models.recipe import Recipe, Ingredient, CookingStep, RecipeTimer
from app.models.shopping_list import ShoppingList, ShoppingListItem


def seed_database(app):
    """Seed the database with sample data"""
    with app.app_context():
        print("Seeding database...")

        # Clear existing data
        print("Clearing existing data...")
        db.drop_all()
        db.create_all()

        # Create sample users
        print("Creating users...")
        users = [
            User(
                email='demo@mealtogether.com',
                first_name='Demo',
                last_name='User',
                password_hash=generate_password_hash('Demo123!')
            ),
            User(
                email='john@example.com',
                first_name='John',
                last_name='Doe',
                password_hash=generate_password_hash('Password123!')
            ),
            User(
                email='jane@example.com',
                first_name='Jane',
                last_name='Smith',
                password_hash=generate_password_hash('Password123!')
            ),
            User(
                email='bob@example.com',
                first_name='Bob',
                last_name='Johnson',
                password_hash=generate_password_hash('Password123!')
            )
        ]

        for user in users:
            user.save()

        # Create sample families
        print("Creating families...")
        demo_family = Family(
            name='Demo Family',
            description='A sample family for testing'
        )
        demo_family.save()

        doe_family = Family(
            name='Doe Household',
            description='John and Jane\'s family'
        )
        doe_family.save()

        # Add family members
        print("Adding family members...")
        members = [
            FamilyMember(user_id=users[0].id, family_id=demo_family.id, role='owner'),
            FamilyMember(user_id=users[1].id, family_id=demo_family.id, role='admin'),
            FamilyMember(user_id=users[1].id, family_id=doe_family.id, role='owner'),
            FamilyMember(user_id=users[2].id, family_id=doe_family.id, role='admin'),
            FamilyMember(user_id=users[3].id, family_id=doe_family.id, role='member'),
        ]

        for member in members:
            member.save()

        # Create sample recipes
        print("Creating recipes...")

        # Recipe 1: Spaghetti Carbonara
        recipe1 = Recipe(
            name='Spaghetti Carbonara',
            description='Classic Italian pasta dish with eggs, cheese, and pancetta',
            prep_time=10,
            cook_time=20,
            servings=4,
            family_id=demo_family.id,
            assigned_to_id=users[0].id
        )
        recipe1.save()

        ingredients1 = [
            Ingredient(recipe_id=recipe1.id, name='Spaghetti', quantity='400g', order=0),
            Ingredient(recipe_id=recipe1.id, name='Pancetta', quantity='200g', order=1),
            Ingredient(recipe_id=recipe1.id, name='Eggs', quantity='4 large', order=2),
            Ingredient(recipe_id=recipe1.id, name='Parmesan cheese', quantity='100g, grated', order=3),
            Ingredient(recipe_id=recipe1.id, name='Black pepper', quantity='to taste', order=4),
        ]
        for ing in ingredients1:
            ing.save()

        steps1 = [
            CookingStep(recipe_id=recipe1.id, order=0, instruction='Bring a large pot of salted water to boil', estimated_time=5),
            CookingStep(recipe_id=recipe1.id, order=1, instruction='Cut pancetta into small pieces and fry until crispy', estimated_time=5),
            CookingStep(recipe_id=recipe1.id, order=2, instruction='Cook spaghetti according to package directions', estimated_time=10),
            CookingStep(recipe_id=recipe1.id, order=3, instruction='Beat eggs with parmesan and pepper', estimated_time=2),
            CookingStep(recipe_id=recipe1.id, order=4, instruction='Drain pasta, mix with pancetta and egg mixture off heat', estimated_time=3),
        ]
        for step in steps1:
            step.save()

        timers1 = [
            RecipeTimer(recipe_id=recipe1.id, name='Pasta cooking', duration=600, step_order=2),
        ]
        for timer in timers1:
            timer.save()

        # Recipe 2: Chicken Stir Fry
        recipe2 = Recipe(
            name='Chicken Stir Fry',
            description='Quick and healthy Asian-inspired chicken with vegetables',
            prep_time=15,
            cook_time=15,
            servings=4,
            family_id=demo_family.id,
            assigned_to_id=users[1].id
        )
        recipe2.save()

        ingredients2 = [
            Ingredient(recipe_id=recipe2.id, name='Chicken breast', quantity='500g, sliced', order=0),
            Ingredient(recipe_id=recipe2.id, name='Bell peppers', quantity='2, sliced', order=1),
            Ingredient(recipe_id=recipe2.id, name='Broccoli', quantity='1 head, cut into florets', order=2),
            Ingredient(recipe_id=recipe2.id, name='Soy sauce', quantity='3 tbsp', order=3),
            Ingredient(recipe_id=recipe2.id, name='Garlic', quantity='3 cloves, minced', order=4),
            Ingredient(recipe_id=recipe2.id, name='Ginger', quantity='1 tbsp, minced', order=5),
            Ingredient(recipe_id=recipe2.id, name='Vegetable oil', quantity='2 tbsp', order=6),
        ]
        for ing in ingredients2:
            ing.save()

        steps2 = [
            CookingStep(recipe_id=recipe2.id, order=0, instruction='Heat oil in a large wok or skillet over high heat', estimated_time=2),
            CookingStep(recipe_id=recipe2.id, order=1, instruction='Add chicken and cook until golden', estimated_time=5),
            CookingStep(recipe_id=recipe2.id, order=2, instruction='Add garlic and ginger, stir for 30 seconds', estimated_time=1),
            CookingStep(recipe_id=recipe2.id, order=3, instruction='Add vegetables and stir fry for 3-4 minutes', estimated_time=4),
            CookingStep(recipe_id=recipe2.id, order=4, instruction='Add soy sauce and toss to combine', estimated_time=1),
        ]
        for step in steps2:
            step.save()

        timers2 = [
            RecipeTimer(recipe_id=recipe2.id, name='Chicken cooking', duration=300, step_order=1),
            RecipeTimer(recipe_id=recipe2.id, name='Vegetable stir fry', duration=240, step_order=3),
        ]
        for timer in timers2:
            timer.save()

        # Recipe 3: Chocolate Chip Cookies
        recipe3 = Recipe(
            name='Chocolate Chip Cookies',
            description='Classic homemade chocolate chip cookies',
            prep_time=15,
            cook_time=12,
            servings=24,
            family_id=doe_family.id,
            assigned_to_id=users[2].id
        )
        recipe3.save()

        ingredients3 = [
            Ingredient(recipe_id=recipe3.id, name='All-purpose flour', quantity='2¼ cups', order=0),
            Ingredient(recipe_id=recipe3.id, name='Butter', quantity='1 cup, softened', order=1),
            Ingredient(recipe_id=recipe3.id, name='Sugar', quantity='¾ cup', order=2),
            Ingredient(recipe_id=recipe3.id, name='Brown sugar', quantity='¾ cup, packed', order=3),
            Ingredient(recipe_id=recipe3.id, name='Eggs', quantity='2 large', order=4),
            Ingredient(recipe_id=recipe3.id, name='Vanilla extract', quantity='2 tsp', order=5),
            Ingredient(recipe_id=recipe3.id, name='Baking soda', quantity='1 tsp', order=6),
            Ingredient(recipe_id=recipe3.id, name='Salt', quantity='1 tsp', order=7),
            Ingredient(recipe_id=recipe3.id, name='Chocolate chips', quantity='2 cups', order=8),
        ]
        for ing in ingredients3:
            ing.save()

        steps3 = [
            CookingStep(recipe_id=recipe3.id, order=0, instruction='Preheat oven to 375°F (190°C)', estimated_time=10),
            CookingStep(recipe_id=recipe3.id, order=1, instruction='Mix butter, sugars, eggs, and vanilla', estimated_time=3),
            CookingStep(recipe_id=recipe3.id, order=2, instruction='In separate bowl, combine flour, baking soda, and salt', estimated_time=2),
            CookingStep(recipe_id=recipe3.id, order=3, instruction='Gradually blend dry ingredients into butter mixture', estimated_time=3),
            CookingStep(recipe_id=recipe3.id, order=4, instruction='Stir in chocolate chips', estimated_time=1),
            CookingStep(recipe_id=recipe3.id, order=5, instruction='Drop rounded tablespoons onto ungreased cookie sheets', estimated_time=5),
            CookingStep(recipe_id=recipe3.id, order=6, instruction='Bake for 9-11 minutes until golden brown', estimated_time=10),
        ]
        for step in steps3:
            step.save()

        timers3 = [
            RecipeTimer(recipe_id=recipe3.id, name='Oven preheat', duration=600, step_order=0),
            RecipeTimer(recipe_id=recipe3.id, name='Baking time', duration=600, step_order=6),
        ]
        for timer in timers3:
            timer.save()

        # Create sample shopping lists
        print("Creating shopping lists...")

        shopping_list1 = ShoppingList(
            name='Weekly Groceries',
            family_id=demo_family.id,
            is_active=True
        )
        shopping_list1.save()

        items1 = [
            ShoppingListItem(shopping_list_id=shopping_list1.id, name='Milk', quantity='1 gallon', category='Dairy', added_by_id=users[0].id),
            ShoppingListItem(shopping_list_id=shopping_list1.id, name='Bread', quantity='2 loaves', category='Bakery', added_by_id=users[0].id),
            ShoppingListItem(shopping_list_id=shopping_list1.id, name='Apples', quantity='6', category='Produce', added_by_id=users[1].id),
            ShoppingListItem(shopping_list_id=shopping_list1.id, name='Chicken breast', quantity='2 lbs', category='Meat', added_by_id=users[0].id, checked=True, checked_by_id=users[1].id),
            ShoppingListItem(shopping_list_id=shopping_list1.id, name='Rice', quantity='1 bag', category='Grains', added_by_id=users[1].id),
        ]
        for item in items1:
            item.save()

        shopping_list2 = ShoppingList(
            name='Party Supplies',
            family_id=doe_family.id,
            is_active=True
        )
        shopping_list2.save()

        items2 = [
            ShoppingListItem(shopping_list_id=shopping_list2.id, name='Paper plates', quantity='100 count', category='Party', added_by_id=users[1].id),
            ShoppingListItem(shopping_list_id=shopping_list2.id, name='Soda', quantity='6 bottles', category='Beverages', added_by_id=users[2].id),
            ShoppingListItem(shopping_list_id=shopping_list2.id, name='Chips', quantity='3 bags', category='Snacks', added_by_id=users[1].id),
        ]
        for item in items2:
            item.save()

        print("✅ Database seeded successfully!")
        print("\n📊 Summary:")
        print(f"  - Users: {len(users)}")
        print(f"  - Families: 2")
        print(f"  - Recipes: 3")
        print(f"  - Shopping Lists: 2")
        print("\n👤 Demo credentials:")
        print("  Email: demo@mealtogether.com")
        print("  Password: Demo123!")


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Seed the database with sample data')
    parser.add_argument('--force', action='store_true', help='Force seed even in production')
    args = parser.parse_args()

    app = create_app()

    # Safety check for production
    if os.getenv('FLASK_ENV') == 'production' and not args.force:
        print("❌ Error: Cannot seed production database without --force flag")
        sys.exit(1)

    seed_database(app)
