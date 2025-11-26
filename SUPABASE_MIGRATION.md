# Supabase Migration Guide

## Overview

This document outlines the migration from Flask + PostgreSQL + Flask-SocketIO to Supabase for the MealTogether application. This migration brings real-time capabilities, improved scalability, and integration of proven patterns from the turkey project.

## Why Supabase?

- **Real-time by default**: Built-in PostgreSQL change data capture (CDC)
- **Authentication included**: Email, OAuth, magic links out of the box
- **Row Level Security**: Database-level security policies
- **Auto-scaling**: Handles traffic spikes automatically
- **Client-side queries**: Reduce backend complexity
- **Cost-effective**: Generous free tier, pay-as-you-grow

## Architecture Changes

### Before (Current)
```
React Frontend → Flask API (REST) → PostgreSQL
                ↓
         Flask-SocketIO (WebSocket)
                ↓
         JWT Authentication
```

### After (Target)
```
React Frontend → Supabase Client → PostgreSQL (Supabase)
                ↓
         Real-time Subscriptions
                ↓
         Supabase Auth
```

## Database Schema Migration

### Core Tables (Migrated from Flask)

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- Optional for OAuth users
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- New columns for Supabase auth
  auth_provider TEXT DEFAULT 'email', -- 'email', 'google', 'github'
  avatar_url TEXT,

  -- User preferences
  sound_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'dark' -- 'light' or 'dark'
);

-- Link to Supabase auth.users
ALTER TABLE users ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
```

#### families
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### family_members
```sql
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(family_id, user_id)
);

CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);
```

#### recipes
```sql
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prep_time INTEGER NOT NULL, -- minutes
  cook_time INTEGER NOT NULL, -- minutes
  total_time INTEGER NOT NULL, -- minutes
  servings INTEGER NOT NULL,
  image_url TEXT,
  source_url TEXT,

  -- New: Task assignment from turkey
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- New: Timeline scheduling
  target_start_time TIMESTAMPTZ,
  target_completion_time TIMESTAMPTZ,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipes_family ON recipes(family_id);
CREATE INDEX idx_recipes_assigned_to ON recipes(assigned_to);
```

#### ingredients
```sql
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingredients_recipe ON ingredients(recipe_id);
```

#### cooking_steps
```sql
CREATE TABLE cooking_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  estimated_time INTEGER, -- minutes
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cooking_steps_recipe ON cooking_steps(recipe_id);
```

#### recipe_timers (predefined timers)
```sql
CREATE TABLE recipe_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipe_timers_recipe ON recipe_timers(recipe_id);
```

#### shopping_lists
```sql
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shopping_lists_family ON shopping_lists(family_id);
```

#### shopping_list_items
```sql
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT,
  notes TEXT,
  checked BOOLEAN DEFAULT false,

  -- User tracking
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shopping_list_items_list ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_category ON shopping_list_items(category);
```

#### cooking_sessions
```sql
CREATE TABLE cooking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  started_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_cooking_sessions_family ON cooking_sessions(family_id);
CREATE INDEX idx_cooking_sessions_recipe ON cooking_sessions(recipe_id);
CREATE INDEX idx_cooking_sessions_active ON cooking_sessions(is_active);
```

#### active_timers (Enhanced with turkey patterns)
```sql
CREATE TABLE active_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooking_session_id UUID REFERENCES cooking_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Turkey pattern: Three-state system
  default_seconds INTEGER NOT NULL, -- Original duration
  remaining_seconds INTEGER NOT NULL, -- Current remaining time
  status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'paused', 'finished')),

  -- Precision timing
  end_at TIMESTAMPTZ, -- Calculated end time for accuracy

  -- User tracking
  started_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_active_timers_session ON active_timers(cooking_session_id);
CREATE INDEX idx_active_timers_status ON active_timers(status);
CREATE INDEX idx_active_timers_end_at ON active_timers(end_at);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;

-- Users: Can read/update own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Families: Must be a family member
CREATE POLICY "Family members can view family" ON families
  FOR SELECT USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Recipes: Family members can CRUD
CREATE POLICY "Family members can view recipes" ON recipes
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Family members can create recipes" ON recipes
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- Shopping Lists: Family members can CRUD
CREATE POLICY "Family members can view shopping lists" ON shopping_lists
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
  );

-- (Similar policies for all other tables)
```

### Database Functions

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_timers_updated_at BEFORE UPDATE ON active_timers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Supabase Project Setup

### Step 1: Create Project

1. Go to https://supabase.com
2. Click "New Project"
3. Name: `meal-together`
4. Database Password: Generate strong password (save to 1Password)
5. Region: Select closest to your users (e.g., `us-east-1`)
6. Pricing Plan: Start with Free tier

### Step 2: Configure Authentication

```bash
# Enable auth providers in Supabase Dashboard
Settings → Authentication → Providers:
- Email: Enabled (with email confirmation)
- Google OAuth: Enabled
- GitHub OAuth: Enabled
```

### Step 3: Run Schema Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run migrations
supabase db push
```

### Step 4: Configure Environment Variables

```bash
# Frontend .env.local
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Data Migration Script

```javascript
// scripts/migrate-to-supabase.js
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const pgClient = new pg.Client(process.env.DATABASE_URL);

async function migrateUsers() {
  const { rows } = await pgClient.query('SELECT * FROM users');

  for (const user of rows) {
    await supabase.from('users').insert({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  }
}

async function migrateFamilies() {
  // Similar pattern for families
}

// Run all migrations
await pgClient.connect();
await migrateUsers();
await migrateFamilies();
// ... migrate all tables
await pgClient.end();
```

## Frontend Integration

### Install Dependencies

```bash
npm install @supabase/supabase-js
npm install @supabase/auth-helpers-react
```

### Initialize Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### Replace Authentication

```typescript
// Old: src/contexts/AuthContext.tsx with JWT
// New: Use Supabase Auth

import { useAuth } from '@supabase/auth-helpers-react';

export function useAuthContext() {
  const { user, session, signIn, signOut } = useAuth();
  return { user, session, signIn, signOut };
}
```

## Real-Time Subscriptions

```typescript
// src/hooks/useRealtimeSubscription.ts
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeTimers(sessionId: string) {
  useEffect(() => {
    const subscription = supabase
      .channel(`timers:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_timers',
          filter: `cooking_session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Timer change:', payload);
          // Update local state
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);
}
```

## Testing Strategy

1. **Unit Tests**: State management, timer calculations
2. **Integration Tests**: Supabase client operations
3. **E2E Tests**: Full user workflows with Playwright
4. **Load Tests**: Multiple concurrent users
5. **Migration Validation**: Data integrity checks

## Rollout Plan

### Phase 1: Parallel Systems (Week 1-2)
- Keep Flask backend running
- Add Supabase alongside
- Feature flag new features

### Phase 2: Gradual Migration (Week 3-5)
- Migrate users one family at a time
- Monitor for issues
- Collect feedback

### Phase 3: Complete Cutover (Week 6)
- Disable Flask backend
- Full Supabase production
- Decommission old infrastructure

## Monitoring & Observability

- Supabase Dashboard: Monitor queries, real-time connections
- Sentry: Error tracking for frontend
- Custom analytics: Track feature usage
- Performance monitoring: Page load times, real-time latency

## Cost Estimation

**Supabase Free Tier:**
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users

**Estimated Usage:**
- 50 families × 4 members = 200 users
- Well within free tier limits

## Support & Resources

- Supabase Docs: https://supabase.com/docs
- Discord Community: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase

## Next Steps

1. ✅ Review this migration guide
2. ⬜ Create Supabase project
3. ⬜ Run schema migrations
4. ⬜ Implement Supabase client integration
5. ⬜ Port turkey features (timers, filtering, audio)
6. ⬜ Test in development
7. ⬜ Deploy to production
