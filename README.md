# MealTogether

Collaborative meal planning and cooking coordination for families and groups.

## Features

- Recipe management with ingredients, steps, and timers
- Shared shopping lists with item tracking
- Timeline scheduler for multiple recipes
- Multi-timer coordination with real-time sync
- Family group management with role-based access

## Tech Stack

### Backend
- Flask 3.0
- Flask-SocketIO (WebSocket)
- Flask-JWT-Extended (authentication)
- SQLAlchemy (ORM)
- PostgreSQL
- Eventlet (async server)

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- TanStack Query
- Zustand
- Socket.IO Client
- React Router

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
- PostgreSQL 14+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
createdb meal_together_dev
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

### Timers

Start timer:
```http
POST /api/families/{family_id}/cooking-sessions/{session_id}/timers
Authorization: Bearer <token>

{
  "name": "Timer Name",
  "duration": 1800
}
```

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

### Docker
```bash
docker-compose build
docker-compose up -d
```

### Manual

Backend:
```bash
gunicorn --worker-class eventlet -w 1 app:app --bind 0.0.0.0:5000
```

Frontend:
```bash
npm run build
```

## Environment Variables

Backend (.env):
```bash
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=<secret>
DATABASE_URL=postgresql://user:pass@localhost/meal_together
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

## Security

- JWT authentication for protected endpoints
- Family membership validation
- WebSocket authentication
- Input validation
- CSRF protection
- Rate limiting

## License

CC BY-NC-SA 4.0
