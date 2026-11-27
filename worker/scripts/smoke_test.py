"""
End-to-end check of the Worker API against a running instance.

Creates throwaway accounts and a family, so run it against `wrangler dev`,
not production:

    python3 scripts/smoke_test.py --base http://localhost:8787
"""
import argparse
import json
import re
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
    policies = []
    for _ in range(2):
        with urllib.request.urlopen(base + '/', timeout=20) as page:
            html = page.read().decode()
            policies.append(page.headers.get('Content-Security-Policy') or '')
            headers = page.headers
    check('index.html served', '<div id="root">' in html)
    check('security headers on pages', headers.get('X-Frame-Options') == 'DENY', dict(headers))
    check('policy carries a nonce and no unsafe-inline scripts',
          "script-src 'self' 'nonce-" in policies[0] and "script-src 'self' 'unsafe-inline'" not in policies[0], policies[0])
    check('nonce changes on every response', policies[0] != policies[1], policies)
    check('pages are not cached or revalidated', headers.get('Cache-Control') == 'no-store'
          and not headers.get('ETag'), dict(headers))
    asset = re.search(r'/assets/index-[^"]+\.js', html)
    with urllib.request.urlopen(base + asset.group(0), timeout=20) as script:
        check('hashed files are cached long-term', 'immutable' in (script.headers.get('Cache-Control') or '')
              and 'javascript' in (script.headers.get('Content-Type') or ''), dict(script.headers))
    for missing in ('/assets/index-does-not-exist.js', '/favicon.ico'):
        try:
            with urllib.request.urlopen(base + missing, timeout=20) as wrong:
                check(f'missing file {missing} is not answered with a page', False, wrong.status)
        except urllib.error.HTTPError as error:
            check(f'missing file {missing} is a 404 that is not cached', error.code == 404
                  and error.headers.get('Cache-Control') == 'no-store', dict(error.headers))
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
    status, body, _ = call(base, 'POST', '/api/auth/register', {
        'email': f'outsider-{run}@example.test', 'password': password, 'first_name': 'Olga', 'last_name': 'Outsider'})
    outsider, outsider_id = body.get('access_token'), body['user']['id']

    # Device sign-in: a TV shows a code, a signed-in person approves it
    status, start, _ = call(base, 'POST', '/api/auth/device')
    check('device sign-in starts', status == 201 and re.fullmatch(r'[A-Z2-9]{4}-[A-Z2-9]{4}', start.get('user_code', ''))
          and start['verification_url_complete'].endswith('/link?code=' + start['user_code'])
          and start['expires_in'] > 0 and start['interval'] > 0, start)
    device_code = start['device_code']
    status, body, _ = call(base, 'POST', '/api/auth/device/token', {'device_code': device_code})
    check('device waits while the code is open', status == 200 and body == {'status': 'pending'}, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/approve', {'user_code': start['user_code']})
    check('approving needs a signed-in person', status == 401, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/approve', {'user_code': 'ZZZZ-ZZZZ'}, token=owner)
    check('unknown code rejected', status == 404, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/approve', {'user_code': 'nope'}, token=owner)
    check('malformed code rejected', status == 404, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/approve',
                           {'user_code': start['user_code'].lower().replace('-', ' ')}, token=owner)
    check('code approved as typed', status == 200, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/approve', {'user_code': start['user_code']}, token=owner)
    check('code cannot be approved twice', status == 404, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/token', {'device_code': device_code})
    check('device receives tokens for the approver', status == 200 and body.get('status') == 'approved'
          and body['user']['id'] == owner_id and 'password_hash' not in body['user'], body)
    device_access, device_refresh = body.get('access_token'), body.get('refresh_token')
    status, body, _ = call(base, 'GET', '/api/auth/me', token=device_access)
    check('device access token works', status == 200 and body['user']['id'] == owner_id, body)
    status, body, _ = call(base, 'POST', '/api/auth/refresh', token=device_refresh)
    check('device refresh token works', status == 200 and body.get('access_token'), body)
    status, body, _ = call(base, 'POST', '/api/auth/device/token', {'device_code': device_code})
    check('device code is used once', status == 410, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/token', {'device_code': 'not-a-real-code'})
    check('unknown device code rejected', status == 410, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/token', {})
    check('missing device code rejected', status == 400, body)

    status, start, _ = call(base, 'POST', '/api/auth/device')
    status, body, _ = call(base, 'POST', '/api/auth/device/deny', {'user_code': start['user_code']}, token=owner)
    check('code declined', status == 200, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/token', {'device_code': start['device_code']})
    check('declined device gets no tokens', status == 403 and 'access_token' not in body, body)
    status, body, _ = call(base, 'POST', '/api/auth/device/token', {'device_code': start['device_code']})
    check('declined code is gone', status == 410, body)

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
    # Step progress is shared by the family
    status, body, _ = call(base, 'GET', f + f'/recipes/{rid}', token=owner)
    steps = body['recipe']['steps']
    check('steps start open', status == 200 and len(steps) >= 2 and not any(s['done'] for s in steps)
          and steps[0]['done_by'] is None, body)
    sr = f + f'/recipes/{rid}/steps'
    status, body, _ = call(base, 'PUT', f"{sr}/{steps[1]['id']}", {'done': True}, token=other)
    check('member marks a step done', status == 200 and [s['done'] for s in body['recipe']['steps']][:2] == [False, True]
          and body['recipe']['steps'][1]['done_by']['id'] == other_id and body['recipe']['steps'][1]['done_at'], body)
    status, body, _ = call(base, 'GET', f + f'/recipes/{rid}', token=owner)
    check('another member sees the step done', body['recipe']['steps'][1]['done'] is True
          and body['recipe']['steps'][1]['done_by']['id'] == other_id, body)
    status, body, _ = call(base, 'PUT', f"{sr}/{steps[1]['id']}", {'done': True}, token=owner)
    check('marking a done step again keeps who did it', status == 200
          and body['recipe']['steps'][1]['done_by']['id'] == other_id, body)
    status, body, _ = call(base, 'PUT', f"{sr}/{steps[0]['id']}", {'done': 'yes'}, token=owner)
    check('done must be a boolean', status == 400, body)
    status, body, _ = call(base, 'PUT', f'{sr}/999999999', {'done': True}, token=owner)
    check('unknown step rejected', status == 404, body)
    status, body, _ = call(base, 'PUT', f"{sr}/{steps[0]['id']}", {'done': True}, token=outsider)
    check('outsider cannot mark steps', status == 404, body)
    status, body, _ = call(base, 'PUT', f"{sr}/{steps[1]['id']}", {'done': False}, token=owner)
    check('step marked not done', status == 200 and not any(s['done'] for s in body['recipe']['steps']), body)
    for step in steps[:2]:
        call(base, 'PUT', f"{sr}/{step['id']}", {'done': True}, token=owner)
    status, body, _ = call(base, 'PUT', f + f'/recipes/{rid}', {'description': 'Saved again.',
                           'steps': [{'instruction': s['instruction']} for s in steps]}, token=owner)
    check('saving the recipe keeps step progress', status == 200
          and [s['done'] for s in body['recipe']['steps']][:2] == [True, True], body)
    status, body, _ = call(base, 'POST', f'{sr}/reset', token=other)
    check('start over opens every step', status == 200 and not any(s['done'] for s in body['recipe']['steps']), body)
    call(base, 'PUT', f"{sr}/{body['recipe']['steps'][1]['id']}", {'done': True}, token=owner)

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
    by_title = {i['title']: i for i in body['meal']['items']}
    check('dish without its own cook takes the recipe cook', by_title['Better pie']['cook']['id'] == owner_id
          and by_title['Better pie']['cook_source'] == 'recipe' and by_title['Better pie']['assigned_to'] is None, body)
    check('dish with its own cook keeps it', by_title['Sides']['cook']['id'] == other_id
          and by_title['Sides']['cook_source'] == 'dish', body)
    status, body, _ = call(base, 'POST', f + f'/recipes/{rid}/assign', {'user_id': other_id}, token=owner)
    check('assign recipe to a member', status == 200 and body['recipe']['assigned_to']['id'] == other_id, body)
    status, body, _ = call(base, 'GET', m, token=owner)
    pie = next(i for i in body['meal']['items'] if i['title'] == 'Better pie')
    check('reassigning the recipe moves the dish', pie['cook']['id'] == other_id, body)
    status, body, _ = call(base, 'POST', f + f'/recipes/{rid}/assign', {'user_id': outsider_id}, token=owner)
    check('recipe cannot go to someone outside the family', status == 404, body)
    status, body, _ = call(base, 'POST', f + f'/recipes/{rid}/assign', {'user_id': None}, token=owner)
    check('unassign recipe', status == 200 and body['recipe']['assigned_to'] is None, body)
    status, body, _ = call(base, 'GET', m, token=owner)
    pie = next(i for i in body['meal']['items'] if i['title'] == 'Better pie')
    check('dish has no cook when neither is set', pie['cook'] is None and pie['cook_source'] is None, body)
    call(base, 'POST', f + f'/recipes/{rid}/assign', {'user_id': owner_id}, token=owner)
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

    # Requests to join
    status, body, _ = call(base, 'GET', '/api/join', token=outsider)
    check('closed family is not offered', status == 200 and all(x['id'] != fam for x in body['families']), body)
    status, body, _ = call(base, 'POST', '/api/join', {'family_id': fam}, token=outsider)
    check('closed family rejects requests', status == 404, body)
    status, body, _ = call(base, 'PUT', f, {'accepts_join_requests': True}, token=other)
    check('member cannot open the family to requests', status == 403, body)
    status, body, _ = call(base, 'PUT', f, {'accepts_join_requests': True}, token=owner)
    check('owner opens the family to requests', status == 200 and body['family']['accepts_join_requests'] is True, body)
    status, body, _ = call(base, 'GET', '/api/join', token=outsider)
    check('open family is offered', status == 200 and any(x['id'] == fam for x in body['families']), body)
    status, body, _ = call(base, 'GET', '/api/join', token=other)
    check('a member is not offered their own family', all(x['id'] != fam for x in body['families']), body)
    status, body, _ = call(base, 'POST', '/api/join', {'family_id': fam, 'note': 'Aunt Olga'}, token=outsider)
    check('request to join', status == 201 and body['request']['status'] == 'pending', body)
    request_id = body['request']['id']
    status, body, _ = call(base, 'POST', '/api/join', {'family_id': fam}, token=outsider)
    check('asking twice keeps one request', status == 200 and body['request']['id'] == request_id, body)
    status, body, _ = call(base, 'GET', f, token=outsider)
    check('a pending request gives no access', status == 404, body)
    status, body, _ = call(base, 'GET', f + '/join-requests', token=other)
    check('member cannot see requests', status == 403, body)
    status, body, _ = call(base, 'POST', f + f'/join-requests/{request_id}/approve', token=other)
    check('member cannot approve', status == 403, body)
    status, body, _ = call(base, 'POST', f + f'/join-requests/{request_id}/approve', token=outsider)
    check('requester cannot approve themselves', status == 404, body)
    status, body, _ = call(base, 'GET', f + '/join-requests', token=owner)
    check('owner sees the request', status == 200 and len(body['requests']) == 1
          and body['requests'][0]['user']['id'] == outsider_id and body['requests'][0]['note'] == 'Aunt Olga', body)
    status, body, _ = call(base, 'POST', f + f'/join-requests/{request_id}/approve', {'role': 'owner'}, token=owner)
    check('approval cannot grant owner', status == 400, body)
    status, body, _ = call(base, 'POST', f + f'/join-requests/{request_id}/approve', {'role': 'admin'}, token=owner)
    check('approve as admin', status == 200, body)
    status, body, _ = call(base, 'POST', f + f'/join-requests/{request_id}/approve', token=owner)
    check('approving twice conflicts', status == 409, body)
    status, body, _ = call(base, 'GET', '/api/families', token=outsider)
    mine = next((x for x in body['families'] if x['id'] == fam), None)
    check('approved person is in the family as admin', mine is not None
          and any(x['user_id'] == outsider_id and x['role'] == 'admin' for x in mine['members']), body)
    status, body, _ = call(base, 'GET', f + '/join-requests', token=outsider)
    check('new admin can see requests', status == 200 and body['requests'] == [], body)

    status, body, _ = call(base, 'POST', '/api/auth/register', {
        'email': f'fourth-{run}@example.test', 'password': password, 'first_name': 'Fay', 'last_name': 'Fourth'})
    fourth = body.get('access_token')
    status, body, _ = call(base, 'POST', '/api/join', {'family_id': fam}, token=fourth)
    declined_id = body['request']['id']
    status, body, _ = call(base, 'DELETE', f'/api/join/{declined_id}', token=other)
    check('only the requester can withdraw', status == 404, body)
    status, body, _ = call(base, 'POST', f + f'/join-requests/{declined_id}/decline', token=outsider)
    check('admin declines', status == 200, body)
    status, body, _ = call(base, 'POST', '/api/join', {'family_id': fam}, token=fourth)
    check('declined person cannot ask again', status == 403, body)
    status, body, _ = call(base, 'GET', '/api/join', token=fourth)
    check('declined person sees the outcome', status == 200 and body['requests'][0]['status'] == 'declined', body)
    status, body, _ = call(base, 'POST', f + '/members', {'email': f'fourth-{run}@example.test'}, token=owner)
    check('owner can still add a declined person by email', status == 201, body)

    # Leaving and deleting
    status, body, _ = call(base, 'POST', f + '/leave', token=owner)
    check('owner cannot leave', status == 403, body)
    status, body, _ = call(base, 'POST', f + '/leave', token=other)
    check('member leaves', status == 200, body)
    status, body, _ = call(base, 'GET', m, token=other)
    check('former member loses access', status == 404, body)
    status, body, _ = call(base, 'GET', m, token=owner)
    sides = next(i for i in body['meal']['items'] if i['title'] == 'Sides')
    check('their dishes lose their cook', sides['assigned_to'] is None and sides['cook'] is None, body)
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
