# CLAUDE.md - MealTogether Project Instructions

## ⚠️ CRITICAL: NO AI/CLAUDE/ANTHROPIC ATTRIBUTION

**MANDATORY RULE - ZERO TOLERANCE:**
- ❌ NEVER add "Generated with Claude Code" to ANY commit message
- ❌ NEVER add "Co-Authored-By: Claude" to ANY commit message
- ❌ NEVER add 🤖 emoji to ANY commit message
- ❌ NEVER add Claude/Anthropic references to source files
- ❌ NEVER add AI attribution to documentation

**PRE-COMMIT VERIFICATION CHECKLIST:**
Before EVERY commit, verify:
1. ✅ Commit message contains NO AI attribution
2. ✅ Commit message contains NO "Generated with" text
3. ✅ Commit message contains NO "Co-Authored-By: Claude"
4. ✅ Commit message contains NO 🤖 emoji
5. ✅ No source files contain Claude/Anthropic references

**If you violate this rule, the commit MUST be undone and git history rewritten.**

## Project Overview

**MealTogether** is a collaborative meal planning and cooking coordination application for families and groups.

- **Backend**: Flask 3.0 + Flask-SocketIO + SQLAlchemy + PostgreSQL
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Real-Time**: WebSocket with room-based family isolation
- **Authentication**: JWT with refresh tokens
- **Package Managers**: pip (backend), npm (frontend)
- **Python Version**: >= 3.10
- **Node Version**: >= 18.0.0

## Architecture

### Backend Structure
```
backend/
├── app/
│   ├── __init__.py           # App factory
│   ├── models/               # SQLAlchemy models
│   │   ├── base.py          # Base model with common fields
│   │   ├── user.py          # User authentication
│   │   ├── family.py        # Family groups and memberships
│   │   ├── recipe.py        # Recipes, ingredients, steps
│   │   ├── shopping_list.py # Shopping lists and items
│   │   └── cooking_session.py # Sessions and timers
│   ├── routes/              # API endpoints (blueprints)
│   │   ├── auth.py          # Authentication
│   │   ├── families.py      # Family management
│   │   ├── recipes.py       # Recipe CRUD
│   │   ├── shopping_lists.py # Shopping list operations
│   │   └── cooking_sessions.py # Cooking and timers
│   ├── websockets/          # Real-time events
│   │   └── events.py        # Socket.IO event handlers
│   ├── services/            # Business logic
│   │   └── timer_service.py # Timer coordination
│   └── utils/               # Utilities
│       └── decorators.py    # Auth decorators
├── migrations/              # Database migrations
├── tests/
├── requirements.txt
├── .env.example
└── app.py                   # Entry point
```

### Frontend Structure
```
frontend/
├── src/
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── FamilyContext.tsx
│   │   └── WebSocketContext.tsx
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── features/       # Feature-specific components
│   │   └── layout/         # Layout components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API client and WebSocket
│   └── types/              # TypeScript types
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Development Commands

### Backend
```bash
# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Development
python app.py                # Run server (localhost:5000)

# Testing
pytest tests/ -v             # Run tests
pytest --cov=app             # With coverage

# Database
flask db upgrade             # Run migrations
flask db migrate -m "msg"    # Create migration
```

### Frontend
```bash
# Setup
npm install

# Development
npm run dev                  # Run dev server (localhost:5173)

# Building
npm run build               # Production build
npm run preview             # Preview build

# Code Quality
npm run lint                # ESLint
npm run format              # Prettier format
npm run type-check          # TypeScript check
```

## Key Features

### Real-Time Collaboration
- WebSocket events for instant updates
- Room-based isolation per family
- Shopping list synchronization
- Timer coordination across devices

### Recipe Management
- Ingredients with quantities
- Step-by-step instructions
- Predefined timers
- Assignment to family members

### Shopping Lists
- Collaborative item tracking
- User attribution (who added/checked)
- Category organization
- Bulk operations

### Timeline Scheduling
- Calculate start times for multiple recipes
- Target completion time alignment
- Automatic recipe ordering

### Multi-Timer System
- Start/pause/resume timers
- Real-time sync across family members
- Completion notifications
- Session-based timer grouping

## Database Schema

### Core Models
- **User**: Email/password authentication
- **Family**: Group container with name/description
- **FamilyMember**: User-Family many-to-many with roles (OWNER/ADMIN/MEMBER)
- **Recipe**: Name, times, servings, assignment
- **Ingredient**: Recipe items with quantities
- **CookingStep**: Ordered instructions
- **RecipeTimer**: Predefined timers for recipes
- **ShoppingList**: Family shopping list container
- **ShoppingListItem**: Items with checked status and user tracking
- **CookingSession**: Active cooking instance
- **ActiveTimer**: Running timers with pause/resume

### Relationships
- User ←→ Family (many-to-many via FamilyMember)
- Family → Recipes (one-to-many)
- Family → ShoppingLists (one-to-many)
- Recipe → Ingredients (one-to-many)
- Recipe → CookingSteps (one-to-many)
- CookingSession → ActiveTimers (one-to-many)

## API Patterns

### Authentication
- POST `/api/auth/register` - Create account
- POST `/api/auth/login` - Login (returns JWT)
- POST `/api/auth/refresh` - Refresh access token
- GET `/api/auth/me` - Current user profile

### Resource Access
- All family resources use pattern: `/api/families/{family_id}/{resource}`
- Authorization via `@family_member_required` decorator
- Admin operations use `@family_admin_required`

### WebSocket Flow
1. Client connects to Socket.IO server
2. Client emits `authenticate` with JWT token
3. Server verifies token, stores user_id in session
4. Client emits `join_family` with family_id
5. Server validates membership, adds to room
6. All family events broadcast to room

## Security Considerations

### Authentication & Authorization
- JWT access tokens (1 hour expiry)
- JWT refresh tokens (30 day expiry)
- Password hashing with bcrypt
- Family membership validation on all routes
- WebSocket authentication before room join

### Input Validation
- All user inputs validated at API level
- Email format validation
- Required field enforcement
- Type checking on numeric fields

### Real-Time Security
- Token validation before WebSocket connection
- Room access verification
- User session tracking
- Automatic disconnection on invalid auth

## WebSocket Events

### Client → Server
- `connect` - Initial connection
- `authenticate` - JWT token validation
- `join_family` - Subscribe to family updates
- `leave_family` - Unsubscribe from family
- `ping` - Health check
- `typing` - Typing indicator
- `request_sync` - Request full state

### Server → Client
- `connected` - Connection confirmed
- `authenticated` - Auth successful
- `joined_family` - Family room joined
- `shopping_item_added` - New shopping item
- `shopping_item_updated` - Item changed
- `shopping_item_deleted` - Item removed
- `timer_started` - Timer begun
- `timer_paused` - Timer paused
- `timer_resumed` - Timer continued
- `timer_completed` - Timer finished
- `timer_cancelled` - Timer stopped
- `user_joined` - Family member connected
- `user_left` - Family member disconnected
- `error` - Error occurred

## Testing Strategy

### Backend Testing
- Unit tests for models
- Route tests for API endpoints
- Service tests for business logic
- WebSocket event tests
- Target: 80%+ coverage

### Frontend Testing
- Component tests with React Testing Library
- Hook tests
- Integration tests for user flows
- E2E tests for critical paths

## Common Pitfalls

1. **WebSocket authentication** - Always authenticate before joining rooms
2. **Family membership** - Validate on every protected route
3. **Timer cleanup** - Stop timers when sessions complete
4. **Database sessions** - Always rollback on error
5. **CORS configuration** - Update for production domains

## Environment Variables

### Backend (.env)
```bash
FLASK_APP=app.py
FLASK_ENV=development|production
SECRET_KEY=<random-secret>
DATABASE_URL=postgresql://localhost/meal_together_dev
JWT_SECRET_KEY=<random-secret>
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000
FRONTEND_URL=http://localhost:5173
PORT=5000
```

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:5000
VITE_WS_URL=http://localhost:5000
```

## Documentation Writing Standards

**CRITICAL**: These standards are MANDATORY and must be applied from the start.

### Principles
- **Factual over qualitative** - State what it does, not how good it is
- **Concise over verbose** - Remove redundancy
- **Show, don't tell** - Features demonstrate quality
- **Consistent tone** - Use imperative voice

### Forbidden Qualifiers

**NEVER** use these words:
- Quality claims: "professional", "robust", "powerful", "comprehensive"
- Subjective: "easy", "simple", "intuitive", "smart", "better"
- Superlatives: "best", "most", "ultimate", "perfect"
- Vague: "enhanced", "improved", "modern", "advanced"
- Buzzwords: "cutting-edge", "revolutionary", "seamless", "elegant"

### Examples

❌ **Bad**: "Smart timeline calculation with comprehensive optimization"
✅ **Good**: "Timeline calculation with automatic start times"

❌ **Bad**: "Powerful real-time collaboration features"
✅ **Good**: "Real-time updates via WebSocket"

### Enforcement

Apply to ALL documentation:
- README.md
- CHANGELOG.md
- Commit messages
- Code comments
- API documentation

**Pre-Publish Checklist:**
- [ ] No forbidden qualifiers
- [ ] All statements factual
- [ ] Imperative mood
- [ ] No marketing language
- [ ] Specific, not vague
- [ ] Concise, no redundancy

## Git Workflow

### Commit Messages
- Use imperative mood: "Add feature" not "Added feature"
- Be specific: "Fix timer pause bug" not "Fix bugs"
- No AI attribution (see top of file)

### Branch Strategy
- `main` - production-ready code
- Feature branches for new work
- No direct commits to main

## License

CC BY-NC-SA 4.0 - See LICENSE file
