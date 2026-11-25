# MealTogether

Collaborative meal planning and cooking coordination for families and groups.

## Features

- **Recipe Management**: Ingredients, cooking steps, and predefined timers
- **Collaborative Shopping Lists**: Real-time item tracking with optimistic locking
- **Meal Plans**: A meal with a serve time and a schedule sheet of dishes, each with a start time, a cook, and a done state
- **Kitchen Dashboard**: Countdown to the meal, countdown to each dish's start, and the family timer board
- **Timer Board**: Shared countdowns and stopwatches with add-time, pause, reset, and overtime after zero
- **Cook Mode**: One recipe step per screen with preset timers and screen wake lock
- **Shopping From a Meal**: Add every ingredient on a meal's menu to the shopping list, merged by name and grouped by store section
- **Family Groups**: Role-based access control (Owner, Organizer, Member)
- **Join Requests**: A new account asks to join a family that accepts requests; an owner or organizer approves or declines
- **Recipe Cooks**: Assign a recipe to a member. Dishes on a meal show that person as the cook unless the dish is given to someone else
- **Personal Views**: Kitchen lists the signed-in person's dishes first, dishes with no cook to claim, and, for organizers, pending requests. Plan and Recipes filter to that person's items
- **Real-Time Updates**: WebSocket-based live collaboration
- **Performance Optimized**: Redis caching, lazy loading, code splitting

## Tech Stack

### Backend (local, not deployed)
- Flask 3.0 + Flask-SocketIO (WebSocket)
- Flask-JWT-Extended (JWT authentication)
- Flask-Caching + Redis (caching layer)
- SQLAlchemy (ORM) + PostgreSQL
- Celery (background tasks)
- Optimistic locking (race condition prevention)

### Production API (Cloudflare)
- Cloudflare Worker in TypeScript, no runtime dependencies
- D1 (SQLite) database
- PBKDF2-SHA256 password hashes and HS256 tokens on WebCrypto
- Rate limiting binding on sign-in, sign-up, and password change

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- TanStack Query (data fetching)
- Socket.IO Client (WebSocket)
- React Router (routing)
- Lucide React (icons)
- Code splitting + lazy loading

## Project Structure

```
meal-together/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── routes/          # API endpoints
│   │   ├── websockets/      # WebSocket events
│   │   ├── services/        # Business logic
│   │   └── utils/           # Decorators and utilities
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── app.py
│
└── frontend/
    ├── src/
    │   ├── contexts/        # Auth, Family, WebSocket
    │   ├── components/      # React components
    │   ├── pages/           # Page components
    │   ├── hooks/           # Custom hooks
    │   ├── services/        # API client
    │   └── types/           # TypeScript types
    ├── package.json
    └── vite.config.ts
```

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (for caching and Celery)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Edit .env with your database and Redis URLs

# Create database
createdb meal_together_dev

# Run migrations
flask db upgrade

# Start Redis (if not running)
redis-server

# Start backend server
python app.py
```

Backend runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## API

### Authentication

Register:
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "first_name": "John",
  "last_name": "Doe"
}
```

Login:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### Family Management

Create family:
```http
POST /api/families
Authorization: Bearer <token>

{
  "name": "Family Name",
  "description": "Description"
}
```

### Recipes

Create recipe:
```http
POST /api/families/{family_id}/recipes
Authorization: Bearer <token>

{
  "name": "Recipe Name",
  "prep_time": 30,
  "cook_time": 180,
  "servings": 8,
  "ingredients": [
    {"name": "Ingredient", "quantity": "1 lb"}
  ],
  "steps": [
    {"instruction": "Step 1", "order": 0}
  ],
  "timers": [
    {"name": "Timer", "duration": 1800}
  ]
}
```

### Shopping Lists

Add item:
```http
POST /api/families/{family_id}/shopping-lists/{list_id}/items
Authorization: Bearer <token>

{
  "name": "Item",
  "quantity": "1 lb",
  "category": "Meat"
}
```

Check off item:
```http
PUT /api/families/{family_id}/shopping-lists/{list_id}/items/{item_id}
Authorization: Bearer <token>

{
  "checked": true
}
```

### Timeline

Calculate start times:
```http
POST /api/families/{family_id}/cooking-sessions/timeline
Authorization: Bearer <token>

{
  "recipe_ids": [1, 2, 3],
  "target_time": "2025-11-28T18:00:00Z"
}
```

### Meals

```http
GET    /api/families/{family_id}/meals
POST   /api/families/{family_id}/meals
PUT    /api/families/{family_id}/meals/{meal_id}
DELETE /api/families/{family_id}/meals/{meal_id}
POST   /api/families/{family_id}/meals/{meal_id}/items
PUT    /api/families/{family_id}/meals/{meal_id}/items/{item_id}
DELETE /api/families/{family_id}/meals/{meal_id}/items/{item_id}
POST   /api/families/{family_id}/meals/{meal_id}/shopping-list
```

Create a meal:
```http
POST /api/families/{family_id}/meals
Authorization: Bearer <token>

{
  "name": "Thanksgiving 2026",
  "serve_at": "2026-11-27T02:00:00Z"
}
```

Add a dish. Without `start_at`, the start time is the serve time minus the recipe's prep and cook time:
```http
POST /api/families/{family_id}/meals/{meal_id}/items
Authorization: Bearer <token>

{
  "kind": "dish",
  "recipe_id": 5,
  "title": "Turkey",
  "color": "brown"
}
```

### Join Requests

```http
GET    /api/join                                                   # families open to requests, and your requests
POST   /api/join                                                   # {"family_id": 1, "note": "optional"}
DELETE /api/join/{request_id}                                      # withdraw your open request
GET    /api/families/{family_id}/join-requests                     # owner or organizer
POST   /api/families/{family_id}/join-requests/{id}/approve        # {"role": "member" | "admin"}
POST   /api/families/{family_id}/join-requests/{id}/decline
PUT    /api/families/{family_id}                                   # {"accepts_join_requests": true}
```

A pending request gives no access to the family. A declined person cannot ask again; an owner or organizer can still add them by email.

### Cooks

```http
POST /api/families/{family_id}/recipes/{recipe_id}/assign          # {"user_id": 7} or {"user_id": null}
```

Meal items return `assigned_to` (cook set on the dish), `cook` (that person, or else the recipe's cook), and `cook_source` (`dish`, `recipe`, or `null`). Removing someone from a family clears their recipes and dishes.

### Timer Board

```http
GET    /api/families/{family_id}/timers
POST   /api/families/{family_id}/timers
POST   /api/families/{family_id}/timers/{timer_id}/start
POST   /api/families/{family_id}/timers/{timer_id}/pause
POST   /api/families/{family_id}/timers/{timer_id}/reset
POST   /api/families/{family_id}/timers/{timer_id}/add
DELETE /api/families/{family_id}/timers/{timer_id}
```

Start a countdown:
```http
POST /api/families/{family_id}/timers
Authorization: Bearer <token>

{
  "name": "Rolls in the oven",
  "kind": "countdown",
  "duration": 720,
  "color": "tan"
}
```

Timer state is stored as timestamps. Every response includes `server_time` so clients can correct for clock drift. A running countdown whose `anchor_at` has passed is finished.

### Cooking Session Timers

Start timer:
```http
POST /api/families/{family_id}/cooking-sessions/{session_id}/timers
Authorization: Bearer <token>

{
  "name": "Timer Name",
  "duration": 1800
}
```

### Family Recipe Seed

Load the family holiday recipes and the Thanksgiving 2026 schedule into an existing family:
```bash
cd backend
python seed_family_recipes.py --email you@example.com --timezone America/Los_Angeles
```

The script adds only missing recipes and skips the meal if one with the same name exists.

## WebSocket Events

### Client → Server

Authenticate:
```javascript
socket.emit('authenticate', { token: 'jwt-token' })
```

Join family room:
```javascript
socket.emit('join_family', { family_id: 1 })
```

### Server → Client

Shopping list updates:
```javascript
socket.on('shopping_item_added', (data) => { })
socket.on('shopping_item_updated', (data) => { })
```

Timer events:
```javascript
socket.on('timer_started', (data) => { })
socket.on('timer_completed', (data) => { })
```

## Development

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Deployment

### Production Deployment

Production runs on Cloudflare at **mealtogether.chuckycastle.io**: one Worker (`worker/`) serves the built frontend and the JSON API, backed by a D1 database.

```bash
cd worker
npm install
npm run deploy
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for authentication, migrations, secrets, the recipe loader, logs, and rollback.

The Flask backend in `backend/` is not deployed. It runs locally and documents the original API.

## Environment Variables

Backend (.env):
```bash
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=<secret>
DATABASE_URL=postgresql://user:pass@localhost/meal_together
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=<secret>
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
FRONTEND_URL=https://yourdomain.com
PORT=5000
```

Frontend (.env.local):
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

## Security & Performance

### Security
- JWT authentication for protected endpoints
- Family membership validation on all routes
- WebSocket authentication before room join
- Input validation and sanitization
- CSRF protection
- Optimistic locking for concurrent updates

### Performance Optimizations
- Redis caching for frequently accessed data
- Database query optimization with eager loading
- WebSocket payload size reduction (70-90%)
- React Query configuration optimization
- Code splitting and lazy loading
- Event throttling and debouncing
- Pagination on all list endpoints

## License

CC BY-NC-SA 4.0
