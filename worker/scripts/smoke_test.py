"""
End-to-end check of the Worker API against a running instance.

Creates throwaway accounts and a family, so run it against `wrangler dev`,
not production:

    python3 scripts/smoke_test.py --base http://localhost:8787
"""
import argparse
import json
import secrets
import sys
import urllib.error
import urllib.request

FAILURES = []


def call(base, method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(base + path, data=data, method=method)
    if data is not None:
        request.add_header('Content-Type', 'application/json')
    if token:
        request.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.loads(response.read() or b'{}'), response.headers
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            return error.code, json.loads(raw or b'{}'), error.headers
        except json.JSONDecodeError:
            return error.code, {'raw': raw[:200].decode(errors='replace')}, error.headers


def check(label, condition, detail=''):
    print(f'{"ok  " if condition else "FAIL"} {label}{"  " + str(detail) if detail and not condition else ""}')
    if not condition:
        FAILURES.append(label)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--base', required=True)
    base = parser.parse_args().base.rstrip('/')
    if not base.startswith(('http://localhost:', 'http://127.0.0.1:')):
        sys.exit('This script writes test data. Run it against a local instance, such as http://localhost:8787.')

    run = secrets.token_hex(4)
    password = secrets.token_urlsafe(12)
    owner_email = f'owner-{run}@example.test'
    other_email = f'other-{run}@example.test'

    # Health and static files
    status, body, _ = call(base, 'GET', '/api/health')
    check('health', status == 200 and body.get('status') == 'healthy', body)
    with urllib.request.urlopen(base + '/', timeout=20) as page:
        html = page.read().decode()
        check('index.html served', '<div id="root">' in html)
        check('security headers on pages', page.headers.get('X-Frame-Options') == 'DENY', dict(page.headers))
    with urllib.request.urlopen(base + '/plan', timeout=20) as page:
        check('client routes fall back to index.html', '<div id="root">' in page.read().decode())

    # Accounts
    status, body, _ = call(base, 'POST', '/api/auth/register', {
        'email': owner_email.upper(), 'password': password, 'first_name': 'Olive', 'last_name': 'Owner'})
    check('register', status == 201 and body['user']['email'] == owner_email, body)
    owner, refresh = body.get('access_token'), body.get('refresh_token')
    owner_id = body['user']['id']
    check('user shape', body['user']['full_name'] == 'Olive Owner' and 'password_hash' not in body['user'], body)

    status, body, _ = call(base, 'POST', '/api/auth/register', {
        'email': owner_email, 'password': password, 'first_name': 'A', 'last_name': 'B'})
    check('duplicate email rejected', status == 409, body)
    status, body, _ = call(base, 'POST', '/api/auth/register', {
        'email': 'nope', 'password': password, 'first_name': 'A', 'last_name': 'B'})
    check('bad email rejected', status == 400, body)
    status, body, _ = call(base, 'POST', '/api/auth/register', {
        'email': f'short-{run}@example.test', 'password': '123', 'first_name': 'A', 'last_name': 'B'})
    check('short password rejected', status == 400, body)

    status, body, _ = call(base, 'POST', '/api/auth/login', {'email': owner_email, 'password': password})
    check('login', status == 200 and body.get('access_token'), body)
    status, body, _ = call(base, 'POST', '/api/auth/login', {'email': owner_email, 'password': password + 'x'})
    check('wrong password rejected', status == 401, body)
    status, body, _ = call(base, 'POST', '/api/auth/login', {'email': f'ghost-{run}@example.test', 'password': 'x' * 8})
    check('unknown account rejected the same way', status == 401 and body.get('error') == 'Invalid credentials', body)

    status, body, _ = call(base, 'GET', '/api/auth/me', token=owner)
    check('me', status == 200 and body['user']['id'] == owner_id, body)
    status, body, _ = call(base, 'GET', '/api/auth/me')
    check('me without a token rejected', status == 401, body)
    status, body, _ = call(base, 'GET', '/api/auth/me', token=refresh)
    check('refresh token is not an access token', status == 401, body)
    status, body, _ = call(base, 'POST', '/api/auth/refresh', token=refresh)
    check('refresh', status == 200 and body.get('access_token'), body)
    status, body, _ = call(base, 'POST', '/api/auth/refresh', token=owner)
    check('access token is not a refresh token', status == 401, body)
    status, body, _ = call(base, 'PUT', '/api/auth/me', {'first_name': 'Olivia'}, token=owner)
    check('update profile', status == 200 and body['user']['first_name'] == 'Olivia', body)

    status, body, _ = call(base, 'POST', '/api/auth/register', {
        'email': other_email, 'password': password, 'first_name': 'Otto', 'last_name': 'Other'})
    other, other_id = body.get('access_token'), body['user']['id']

    # Families
    status, body, _ = call(base, 'GET', '/api/families', token=owner)
    check('no families at first', status == 200 and body['families'] == [], body)
    status, body, _ = call(base, 'POST', '/api/families', {'name': 'Test family'}, token=owner)
    check('create family', status == 201 and body['family']['members'][0]['role'] == 'owner', body)
    fam = body['family']['id']
    f = f'/api/families/{fam}'

    status, body, _ = call(base, 'GET', f, token=other)
    check('outsider cannot read the family', status == 404, body)
    status, body, _ = call(base, 'GET', f + '/recipes', token=other)
    check('outsider cannot read recipes', status == 404, body)
    status, body, _ = call(base, 'POST', f + '/members', {'email': other_email}, token=owner)
    check('add member', status == 201 and body['member']['user']['id'] == other_id, body)
    member_id = body['member']['id']
    status, body, _ = call(base, 'POST', f + '/members', {'email': other_email}, token=owner)
    check('add member twice rejected', status == 409, body)
    status, body, _ = call(base, 'PUT', f, {'name': 'Renamed'}, token=other)
    check('member cannot rename the family', status == 403, body)
    status, body, _ = call(base, 'DELETE', f, token=other)
    check('member cannot delete the family', status == 403, body)
    status, body, _ = call(base, 'PUT', f + f'/members/{member_id}', {'role': 'owner'}, token=owner)
    check('owner role cannot be handed out', status == 400, body)
    status, body, _ = call(base, 'GET', '/api/families', token=other)
    check('member sees the family', status == 200 and len(body['families']) == 1
          and body['families'][0]['member_count'] == 2, body)

    # Recipes
    recipe = {
        'name': 'Test pie', 'description': 'A pie', 'prep_time': 15, 'cook_time': 55, 'servings': 8,
        'source_url': 'https://example.com/pie',
        'ingredients': [{'name': 'Butter', 'quantity': '1 cup'}, {'name': 'White sugar', 'quantity': '2 cups'}],
        'steps': [{'instruction': 'Mix.', 'estimated_time': 5}, {'instruction': 'Bake.'}],
        'timers': [{'name': 'Bake pie', 'duration': 3300, 'step_order': 2}],
    }
    status, body, _ = call(base, 'POST', f + '/recipes', recipe, token=owner)
    check('create recipe', status == 201 and body['recipe']['total_time'] == 70
          and [i['order'] for i in body['recipe']['ingredients']] == [0, 1]
          and body['recipe']['timers'][0]['step_order'] == 2, body)
    rid = body['recipe']['id']
    status, body, _ = call(base, 'POST', f + '/recipes', {**recipe, 'source_url': 'javascript:alert(1)'}, token=owner)
    check('script link rejected', status == 400, body)
    status, body, _ = call(base, 'POST', f + '/recipes', {'name': 'Soup', 'prep_time': 5, 'cook_time': 'ten'}, token=owner)
    check('bad number rejected', status == 400, body)
    status, body, _ = call(base, 'POST', f + '/recipes', {
        'name': 'Sides', 'prep_time': 5, 'cook_time': 10,
        'ingredients': [{'name': 'Butter', 'quantity': '2 tablespoons'}, {'name': 'Green beans'}]}, token=other)
    check('member creates a recipe', status == 201, body)
    rid2 = body['recipe']['id']
    status, body, _ = call(base, 'GET', f + '/recipes', token=owner)
    check('list recipes', status == 200 and body['pagination']['total'] == 2 and 'ingredients' not in body['recipes'][0], body)
    status, body, _ = call(base, 'PUT', f + f'/recipes/{rid}', {'name': 'Better pie', 'steps': [{'instruction': 'Only step.'}]}, token=owner)
    check('update recipe', status == 200 and body['recipe']['name'] == 'Better pie'
          and len(body['recipe']['steps']) == 1 and len(body['recipe']['ingredients']) == 2, body)
    status, body, _ = call(base, 'DELETE', f + f'/recipes/{rid}', token=other)
    check('member cannot delete another cook\'s recipe', status == 403, body)
    status, body, _ = call(base, 'POST', f + '/recipes/import', {'url': 'https://example.com'}, token=owner)
    check('import reports unavailable', status == 501, body)

    # Meals
    status, body, _ = call(base, 'POST', f + '/meals', {'name': 'Test dinner', 'serve_at': '2026-11-27T02:00:00Z'}, token=owner)
    check('create meal', status == 201 and body['meal']['serve_at'] == '2026-11-27T02:00:00.000Z', body)
    meal = body['meal']['id']
    m = f + f'/meals/{meal}'
    status, body, _ = call(base, 'POST', m + '/items', {'recipe_id': rid, 'color': 'red'}, token=owner)
    item = body['meal']['items'][0] if status == 201 else {}
    check('add dish with default start', status == 201 and item.get('start_at') == '2026-11-27T00:50:00.000Z'
          and item.get('title') == 'Better pie' and item['recipe']['timers'][0]['name'] == 'Bake pie', body)
    status, body, _ = call(base, 'POST', m + '/items', {'recipe_id': rid2, 'title': 'Sides', 'assigned_to_id': other_id}, token=owner)
    check('add second dish with a cook', status == 201 and len(body['meal']['items']) == 2, body)
    status, body, _ = call(base, 'POST', m + '/items', {'kind': 'event', 'title': 'Parade', 'start_at': '2026-11-26T16:30:00Z'}, token=owner)
    check('add event, sorted first', status == 201 and body['meal']['items'][0]['title'] == 'Parade', body)
    status, body, _ = call(base, 'POST', m + '/items', {'title': 'x', 'color': 'purple'}, token=owner)
    check('bad marker rejected', status == 400, body)
    status, body, _ = call(base, 'PUT', m + f'/items/{item["id"]}', {'done': True}, token=other)
    done = next(i for i in body['meal']['items'] if i['id'] == item['id'])
    check('check off a dish', status == 200 and done['done'] and done['done_by_id'] == other_id, body)
    status, body, _ = call(base, 'PUT', m, {'serve_at': '2026-11-27T03:00:00Z'}, token=owner)
    moved = next(i for i in body['meal']['items'] if i['id'] == item['id'])
    check('moving the meal moves start times', status == 200 and moved['start_at'] == '2026-11-27T01:50:00.000Z', body)
    status, body, _ = call(base, 'GET', f + '/meals', token=other)
    check('list meals', status == 200 and len(body['meals']) == 1 and len(body['meals'][0]['items']) == 3, body)

    # Shopping
    status, body, _ = call(base, 'POST', m + '/shopping-list', token=owner)
    check('menu to shopping list', status == 200 and body['added'] == 3 and body['skipped'] == 0, body)
    list_id = body.get('shopping_list_id')
    status, body, _ = call(base, 'POST', m + '/shopping-list', token=owner)
    check('second run adds nothing', status == 200 and body['added'] == 0 and body['skipped'] == 3, body)
    s = f + f'/shopping-lists/{list_id}'
    status, body, _ = call(base, 'GET', s, token=other)
    items = {i['name']: i for i in body['shopping_list']['items']}
    check('merged ingredient lists each dish', status == 200 and items['Butter']['quantity'] is None
          and 'Better pie: 1 cup' in items['Butter']['notes'] and items['Butter']['category'] == 'Dairy & eggs', body)
    status, body, _ = call(base, 'POST', s + '/items', {'name': 'Ice', 'category': 'Frozen'}, token=other)
    check('add item', status == 201 and body['item']['added_by']['id'] == other_id, body)
    ice = body['item']
    status, body, _ = call(base, 'PUT', s + f'/items/{ice["id"]}', {'checked': True, 'version': ice['version']}, token=owner)
    check('check item', status == 200 and body['item']['checked'] and body['item']['version'] == ice['version'] + 1, body)
    status, body, _ = call(base, 'PUT', s + f'/items/{ice["id"]}', {'checked': False, 'version': ice['version']}, token=other)
    check('stale version conflicts', status == 409 and body['current_item']['checked'] is True, body)
    status, body, _ = call(base, 'GET', f + '/shopping-lists', token=owner)
    check('list shopping lists', status == 200 and body['shopping_lists'][0]['total_items'] == 4
          and body['shopping_lists'][0]['checked_items'] == 1, body)
    status, body, _ = call(base, 'DELETE', s + f'/items/{ice["id"]}', token=owner)
    check('delete item', status == 200, body)

    # Timers
    t = f + '/timers'
    status, body, _ = call(base, 'POST', t, {'name': 'Rolls', 'duration': 600, 'color': 'tan', 'recipe_id': rid}, token=owner)
    check('start countdown', status == 201 and body['timer']['status'] == 'running'
          and body['timer']['recipe_name'] == 'Better pie' and body.get('server_time'), body)
    timer = body['timer']['id']
    status, body, _ = call(base, 'POST', t + f'/{timer}/pause', token=other)
    check('pause', status == 200 and body['timer']['status'] == 'paused' and 590 <= body['timer']['held_seconds'] <= 600, body)
    status, body, _ = call(base, 'POST', t + f'/{timer}/add', {'seconds': 60}, token=owner)
    check('add time', status == 200 and 650 <= body['timer']['held_seconds'] <= 660, body)
    status, body, _ = call(base, 'POST', t + f'/{timer}/start', token=owner)
    check('resume', status == 200 and body['timer']['status'] == 'running' and body['timer']['anchor_at'], body)
    status, body, _ = call(base, 'POST', t + f'/{timer}/reset', token=owner)
    check('reset', status == 200 and body['timer']['status'] == 'idle' and body['timer']['held_seconds'] == 600, body)
    status, body, _ = call(base, 'POST', t, {'name': 'Resting', 'kind': 'stopwatch'}, token=owner)
    check('stopwatch', status == 201 and body['timer']['kind'] == 'stopwatch', body)
    status, body, _ = call(base, 'POST', t + f'/{body["timer"]["id"]}/add', {'seconds': 60}, token=owner)
    check('stopwatch rejects added time', status == 400, body)
    status, body, _ = call(base, 'POST', t, {'name': 'x', 'duration': '9'}, token=owner)
    check('bad duration rejected', status == 400, body)
    status, body, _ = call(base, 'GET', t, token=other)
    check('list timers', status == 200 and len(body['timers']) == 2, body)
    status, body, _ = call(base, 'DELETE', t + f'/{timer}', token=owner)
    check('remove timer', status == 200, body)
    status, body, _ = call(base, 'GET', t + f'/{timer}/start', token=owner)
    check('wrong method rejected', status == 405, body)

    # Deleting a recipe keeps the dish on the meal
    status, body, _ = call(base, 'DELETE', f + f'/recipes/{rid}', token=owner)
    check('delete recipe', status == 200, body)
    status, body, _ = call(base, 'GET', m, token=owner)
    kept = next(i for i in body['meal']['items'] if i['id'] == item['id'])
    check('dish stays without its recipe', kept['recipe'] is None and kept['title'] == 'Better pie', body)

    # Leaving and deleting
    status, body, _ = call(base, 'POST', f + '/leave', token=owner)
    check('owner cannot leave', status == 403, body)
    status, body, _ = call(base, 'POST', f + '/leave', token=other)
    check('member leaves', status == 200, body)
    status, body, _ = call(base, 'GET', m, token=other)
    check('former member loses access', status == 404, body)
    status, body, _ = call(base, 'DELETE', f, token=owner)
    check('owner deletes the family', status == 200, body)
    status, body, _ = call(base, 'GET', '/api/families', token=owner)
    check('family is gone', status == 200 and body['families'] == [], body)
    status, body, _ = call(base, 'GET', '/api/nope', token=owner)
    check('unknown route', status == 404, body)

    print(f'\n{len(FAILURES)} failed' if FAILURES else '\nall checks passed')
    sys.exit(1 if FAILURES else 0)


if __name__ == '__main__':
    main()
