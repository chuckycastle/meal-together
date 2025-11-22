# MealTogether Backend

Flask-based REST API with WebSocket support for collaborative meal planning.

## Prerequisites

- Python 3.10 or higher
- PostgreSQL 14 or higher
- Redis 7 or higher (for Celery task queue and caching)

## Development Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration:
# - Update DATABASE_URL with your PostgreSQL credentials
# - Change SECRET_KEY and JWT_SECRET_KEY to random strings
# - Update REDIS_URL if not using default
```

### 4. Setup Database

```bash
# Create PostgreSQL database
createdb meal_together_dev

# Run migrations
flask db upgrade

# (Optional) Seed with sample data
python scripts/seed_database.py
```

### 5. Start Services

#### Terminal 1: Redis
```bash
redis-server
```

#### Terminal 2: Celery Worker
```bash
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info
```

#### Terminal 3: Flask Server
```bash
cd backend
source venv/bin/activate
python app.py
```

Server runs at: http://localhost:5000

## API Documentation

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (database + Redis)
- `GET /health/live` - Liveness check

### Authentication

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login (returns JWT)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Resources

All family resources follow pattern: `/api/families/{family_id}/{resource}`

See full API documentation in `/docs/API.md`

## WebSocket Events

### Client → Server
- `authenticate` - Authenticate with JWT token
- `join_family` - Subscribe to family updates
- `leave_family` - Unsubscribe from family

### Server → Client
- `shopping_item_updated` - Item changed
- `timer_started` - Timer begun
- `timer_completed` - Timer finished
- `user_joined` - Family member connected

## Database Migrations

```bash
# Create new migration
flask db migrate -m "description"

# Apply migrations
flask db upgrade

# Rollback last migration
flask db downgrade
```

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_routes.py -v
```

## Logging

Logs are written to:
- `logs/mealtogether.log` - All logs
- `logs/errors.log` - Errors only

Configure log level in `.env`:
```bash
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

## Production Deployment

See `DEPLOYMENT.md` for full production setup instructions.

Quick deployment:
```bash
# On server
cd /opt/applications/meal-together/backend
git pull
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
sudo systemctl restart meal-together
sudo systemctl restart celery
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql meal_together_dev
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### Celery Issues
```bash
# Check Celery worker status
celery -A celery_app inspect active

# Purge all tasks
celery -A celery_app purge
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py           # App factory
│   ├── models/               # SQLAlchemy models
│   ├── routes/               # API endpoints
│   ├── services/             # Business logic
│   ├── utils/                # Utilities
│   └── websockets/           # Socket.IO events
├── migrations/               # Database migrations
├── scripts/                  # Utility scripts
├── tests/                    # Test suite
├── logs/                     # Log files
├── app.py                    # Entry point
├── celery_app.py             # Celery configuration
└── requirements.txt          # Dependencies
```
