"""
Print SQL that loads the family holiday recipes and the Thanksgiving 2026
schedule into a family in D1.

The family is found from a member's email, or given by id. Only missing rows
are added: recipes are matched by name, the meal by name, items by title.

    python3 scripts/make_seed_sql.py --email you@example.com --timezone America/Los_Angeles > /tmp/seed.sql
    wrangler d1 execute mealtogether --remote --file /tmp/seed.sql
"""
import argparse
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'backend'))

from family_recipes import RECIPES, THANKSGIVING  # noqa: E402


def q(value):
    """SQL literal for text, a number, or NULL"""
    if value is None:
        return 'NULL'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument('--email', help='Email of a member of the family that receives the recipes')
    target.add_argument('--family-id', type=int)
    parser.add_argument('--timezone', required=True, help='IANA timezone of the kitchen, such as America/Los_Angeles')
    args = parser.parse_args()

    tz = ZoneInfo(args.timezone)
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

    if args.family_id:
        family = str(args.family_id)
    else:
        family = (
            '(SELECT m.family_id FROM family_members m JOIN users u ON u.id = m.user_id '
            f'WHERE u.email = {q(args.email.strip().lower())} ORDER BY m.id LIMIT 1)'
        )
    owner = f"(SELECT user_id FROM family_members WHERE family_id = {family} AND role = 'owner' LIMIT 1)"

    def recipe_id(name):
        return f'(SELECT id FROM recipes WHERE family_id = {family} AND name = {q(name)} LIMIT 1)'

    out = []
    for recipe in RECIPES:
        name = recipe['name']
        rid = recipe_id(name)
        out.append(
            'INSERT INTO recipes (family_id, name, description, prep_time, cook_time, servings, source_url, '
            'assigned_to_id, created_at, updated_at) '
            f"SELECT {family}, {q(name)}, {q(recipe['description'])}, {recipe['prep_time']}, {recipe['cook_time']}, "
            f"{recipe['servings']}, {q(recipe['source_url'])}, {owner}, {q(now)}, {q(now)} "
            f'WHERE {family} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM recipes WHERE family_id = {family} AND name = {q(name)});'
        )
        for position, (quantity, ingredient) in enumerate(recipe['ingredients']):
            out.append(
                'INSERT INTO ingredients (recipe_id, name, quantity, position, created_at, updated_at) '
                f'SELECT {rid}, {q(ingredient)}, {q(quantity)}, {position}, {q(now)}, {q(now)} '
                f'WHERE {rid} IS NOT NULL AND NOT EXISTS '
                f'(SELECT 1 FROM ingredients WHERE recipe_id = {rid} AND position = {position});'
            )
        for position, (instruction, minutes) in enumerate(recipe['steps']):
            out.append(
                'INSERT INTO cooking_steps (recipe_id, instruction, position, estimated_time, created_at, updated_at) '
                f'SELECT {rid}, {q(instruction)}, {position}, {q(minutes)}, {q(now)}, {q(now)} '
                f'WHERE {rid} IS NOT NULL AND NOT EXISTS '
                f'(SELECT 1 FROM cooking_steps WHERE recipe_id = {rid} AND position = {position});'
            )
        for timer_name, minutes, step_number in recipe['timers']:
            out.append(
                'INSERT INTO recipe_timers (recipe_id, name, duration, step_order, created_at, updated_at) '
                f'SELECT {rid}, {q(timer_name)}, {minutes * 60}, {step_number}, {q(now)}, {q(now)} '
                f'WHERE {rid} IS NOT NULL AND NOT EXISTS '
                f'(SELECT 1 FROM recipe_timers WHERE recipe_id = {rid} AND name = {q(timer_name)});'
            )

    year, month, day = THANKSGIVING['date']

    def utc(hour, minute):
        local = datetime(year, month, day, hour, minute, tzinfo=tz)
        return local.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

    meal_name = THANKSGIVING['name']
    meal = f'(SELECT id FROM meals WHERE family_id = {family} AND name = {q(meal_name)} LIMIT 1)'
    out.append(
        'INSERT INTO meals (family_id, name, serve_at, created_at, updated_at) '
        f"SELECT {family}, {q(meal_name)}, {q(utc(*THANKSGIVING['serve_at']))}, {q(now)}, {q(now)} "
        f'WHERE {family} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM meals WHERE family_id = {family} AND name = {q(meal_name)});'
    )
    for (hour, minute), title, kind, color, recipe_name in THANKSGIVING['items']:
        linked = recipe_id(recipe_name) if recipe_name else 'NULL'
        out.append(
            'INSERT INTO meal_items (meal_id, kind, title, recipe_id, start_at, color, created_at, updated_at) '
            f'SELECT {meal}, {q(kind)}, {q(title)}, {linked}, {q(utc(hour, minute))}, {q(color)}, {q(now)}, {q(now)} '
            f'WHERE {meal} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM meal_items WHERE meal_id = {meal} AND title = {q(title)});'
        )

    print('\n'.join(out))


if __name__ == '__main__':
    main()
