-- MealTogether Initial Schema Migration for Supabase
-- This migration creates all tables with enhanced columns from the turkey project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- Optional for OAuth users
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Link to Supabase auth.users
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User preferences (from turkey)
  sound_enabled BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),

  -- OAuth metadata
  auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'google', 'github')),
  avatar_url TEXT
);

CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- FAMILIES TABLE
-- ============================================================================
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_families_created_by ON families(created_by);

-- ============================================================================
-- FAMILY MEMBERS TABLE
-- ============================================================================
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  joined_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(family_id, user_id)
);

CREATE INDEX idx_family_members_family ON family_members(family_id);
CREATE INDEX idx_family_members_user ON family_members(user_id);

-- ============================================================================
-- RECIPES TABLE (Enhanced with turkey patterns)
-- ============================================================================
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prep_time INTEGER NOT NULL CHECK (prep_time >= 0), -- minutes
  cook_time INTEGER NOT NULL CHECK (cook_time >= 0), -- minutes
  total_time INTEGER NOT NULL CHECK (total_time >= 0), -- minutes
  servings INTEGER NOT NULL CHECK (servings > 0),
  image_url TEXT,
  source_url TEXT,

  -- Task assignment (from turkey)
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timeline scheduling (from turkey)
  target_start_time TIMESTAMPTZ,
  target_completion_time TIMESTAMPTZ,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipes_family ON recipes(family_id);
CREATE INDEX idx_recipes_assigned_to ON recipes(assigned_to);
CREATE INDEX idx_recipes_target_start_time ON recipes(target_start_time);

-- ============================================================================
-- INGREDIENTS TABLE
-- ============================================================================
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity TEXT,
  "order" INTEGER NOT NULL CHECK ("order" >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ingredients_recipe ON ingredients(recipe_id);
CREATE INDEX idx_ingredients_order ON ingredients(recipe_id, "order");

-- ============================================================================
-- COOKING STEPS TABLE
-- ============================================================================
CREATE TABLE cooking_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  "order" INTEGER NOT NULL CHECK ("order" >= 0),
  instruction TEXT NOT NULL,
  estimated_time INTEGER CHECK (estimated_time >= 0), -- minutes
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cooking_steps_recipe ON cooking_steps(recipe_id);
CREATE INDEX idx_cooking_steps_order ON cooking_steps(recipe_id, "order");

-- ============================================================================
-- RECIPE TIMERS TABLE (Predefined timers)
-- ============================================================================
CREATE TABLE recipe_timers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0), -- seconds
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recipe_timers_recipe ON recipe_timers(recipe_id);

-- ============================================================================
-- SHOPPING LISTS TABLE
-- ============================================================================
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shopping_lists_family ON shopping_lists(family_id);

-- ============================================================================
-- SHOPPING LIST ITEMS TABLE
-- ============================================================================
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE NOT NULL,
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
CREATE INDEX idx_shopping_list_items_checked ON shopping_list_items(checked);

-- ============================================================================
-- COOKING SESSIONS TABLE
-- ============================================================================
CREATE TABLE cooking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  started_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_cooking_sessions_family ON cooking_sessions(family_id);
CREATE INDEX idx_cooking_sessions_recipe ON cooking_sessions(recipe_id);
CREATE INDEX idx_cooking_sessions_active ON cooking_sessions(is_active);

-- ============================================================================
-- ACTIVE TIMERS TABLE (Enhanced with turkey precision pattern)
-- ============================================================================
CREATE TABLE active_timers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cooking_session_id UUID REFERENCES cooking_sessions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,

  -- Turkey pattern: Three-state system with precision tracking
  default_seconds INTEGER NOT NULL CHECK (default_seconds > 0), -- Original duration
  remaining_seconds INTEGER NOT NULL CHECK (remaining_seconds >= 0), -- Current remaining time
  status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'paused', 'finished')),

  -- Precision timing: Store end timestamp for accuracy across devices
  end_at TIMESTAMPTZ, -- Calculated end time when timer starts

  -- User tracking
  started_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_active_timers_session ON active_timers(cooking_session_id);
CREATE INDEX idx_active_timers_status ON active_timers(status);
CREATE INDEX idx_active_timers_end_at ON active_timers(end_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on record changes
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_timers_updated_at
  BEFORE UPDATE ON active_timers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with Supabase auth integration';
COMMENT ON TABLE families IS 'Family groups for collaborative meal planning';
COMMENT ON TABLE family_members IS 'Many-to-many relationship between users and families';
COMMENT ON TABLE recipes IS 'Recipes with timeline scheduling and task assignment';
COMMENT ON TABLE ingredients IS 'Recipe ingredients with quantities';
COMMENT ON TABLE cooking_steps IS 'Step-by-step cooking instructions';
COMMENT ON TABLE recipe_timers IS 'Predefined timers for recipes';
COMMENT ON TABLE shopping_lists IS 'Collaborative shopping lists';
COMMENT ON TABLE shopping_list_items IS 'Shopping list items with user tracking';
COMMENT ON TABLE cooking_sessions IS 'Active cooking sessions';
COMMENT ON TABLE active_timers IS 'Running timers with precision tracking (turkey pattern)';

COMMENT ON COLUMN active_timers.end_at IS 'Precision timestamp for accurate countdown across devices';
COMMENT ON COLUMN active_timers.default_seconds IS 'Original timer duration (immutable)';
COMMENT ON COLUMN active_timers.remaining_seconds IS 'Current remaining time (mutable)';
COMMENT ON COLUMN recipes.assigned_to IS 'User assigned to cook this recipe (turkey pattern)';
COMMENT ON COLUMN recipes.target_start_time IS 'Calculated start time for timeline (turkey pattern)';
