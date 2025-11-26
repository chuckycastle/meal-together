-- MealTogether Row Level Security Policies
-- Ensures users can only access data from families they belong to

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

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

-- ============================================================================
-- HELPER FUNCTION: Get current user's internal ID from auth
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth_user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Users can insert their own profile (on registration)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- ============================================================================
-- FAMILIES TABLE POLICIES
-- ============================================================================

-- Users can view families they belong to
CREATE POLICY "Users can view their families"
  ON families FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- Users can create new families
CREATE POLICY "Users can create families"
  ON families FOR INSERT
  WITH CHECK (created_by = get_current_user_id());

-- Family owners can update their families
CREATE POLICY "Owners can update families"
  ON families FOR UPDATE
  USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role = 'OWNER'
    )
  );

-- Family owners can delete their families
CREATE POLICY "Owners can delete families"
  ON families FOR DELETE
  USING (
    id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role = 'OWNER'
    )
  );

-- ============================================================================
-- FAMILY MEMBERS TABLE POLICIES
-- ============================================================================

-- Users can view members of their families
CREATE POLICY "Users can view family members"
  ON family_members FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- Owners and admins can add members
CREATE POLICY "Admins can add members"
  ON family_members FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Owners and admins can remove members
CREATE POLICY "Admins can remove members"
  ON family_members FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- RECIPES TABLE POLICIES
-- ============================================================================

-- Family members can view recipes
CREATE POLICY "Family members can view recipes"
  ON recipes FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- Family members can create recipes
CREATE POLICY "Family members can create recipes"
  ON recipes FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- Recipe creators can update their recipes
CREATE POLICY "Creators can update recipes"
  ON recipes FOR UPDATE
  USING (
    created_by = get_current_user_id()
    OR family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Recipe creators and admins can delete recipes
CREATE POLICY "Creators and admins can delete recipes"
  ON recipes FOR DELETE
  USING (
    created_by = get_current_user_id()
    OR family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- INGREDIENTS TABLE POLICIES
-- ============================================================================

-- Family members can view ingredients
CREATE POLICY "Family members can view ingredients"
  ON ingredients FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Recipe creators can manage ingredients
CREATE POLICY "Recipe creators can manage ingredients"
  ON ingredients FOR ALL
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE created_by = get_current_user_id()
        OR family_id IN (
          SELECT family_id FROM family_members
          WHERE user_id = get_current_user_id()
            AND role IN ('OWNER', 'ADMIN')
        )
    )
  );

-- ============================================================================
-- COOKING STEPS TABLE POLICIES
-- ============================================================================

-- Family members can view cooking steps
CREATE POLICY "Family members can view cooking steps"
  ON cooking_steps FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Recipe creators can manage cooking steps
CREATE POLICY "Recipe creators can manage cooking steps"
  ON cooking_steps FOR ALL
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE created_by = get_current_user_id()
        OR family_id IN (
          SELECT family_id FROM family_members
          WHERE user_id = get_current_user_id()
            AND role IN ('OWNER', 'ADMIN')
        )
    )
  );

-- ============================================================================
-- RECIPE TIMERS TABLE POLICIES
-- ============================================================================

-- Family members can view recipe timers
CREATE POLICY "Family members can view recipe timers"
  ON recipe_timers FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Recipe creators can manage recipe timers
CREATE POLICY "Recipe creators can manage recipe timers"
  ON recipe_timers FOR ALL
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE created_by = get_current_user_id()
        OR family_id IN (
          SELECT family_id FROM family_members
          WHERE user_id = get_current_user_id()
            AND role IN ('OWNER', 'ADMIN')
        )
    )
  );

-- ============================================================================
-- SHOPPING LISTS TABLE POLICIES
-- ============================================================================

-- Family members can view shopping lists
CREATE POLICY "Family members can view shopping lists"
  ON shopping_lists FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- Family members can create shopping lists
CREATE POLICY "Family members can create shopping lists"
  ON shopping_lists FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- List creators and admins can update shopping lists
CREATE POLICY "Creators and admins can update shopping lists"
  ON shopping_lists FOR UPDATE
  USING (
    created_by = get_current_user_id()
    OR family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- List creators and admins can delete shopping lists
CREATE POLICY "Creators and admins can delete shopping lists"
  ON shopping_lists FOR DELETE
  USING (
    created_by = get_current_user_id()
    OR family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
        AND role IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================================================
-- SHOPPING LIST ITEMS TABLE POLICIES
-- ============================================================================

-- Family members can view shopping list items
CREATE POLICY "Family members can view shopping list items"
  ON shopping_list_items FOR SELECT
  USING (
    shopping_list_id IN (
      SELECT id FROM shopping_lists
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Family members can add shopping list items
CREATE POLICY "Family members can add shopping list items"
  ON shopping_list_items FOR INSERT
  WITH CHECK (
    shopping_list_id IN (
      SELECT id FROM shopping_lists
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Family members can update shopping list items (checking/unchecking)
CREATE POLICY "Family members can update shopping list items"
  ON shopping_list_items FOR UPDATE
  USING (
    shopping_list_id IN (
      SELECT id FROM shopping_lists
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Item creators can delete their items
CREATE POLICY "Item creators can delete shopping list items"
  ON shopping_list_items FOR DELETE
  USING (
    added_by = get_current_user_id()
    OR shopping_list_id IN (
      SELECT id FROM shopping_lists
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
          AND role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- ============================================================================
-- COOKING SESSIONS TABLE POLICIES
-- ============================================================================

-- Family members can view cooking sessions
CREATE POLICY "Family members can view cooking sessions"
  ON cooking_sessions FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- Family members can start cooking sessions
CREATE POLICY "Family members can start cooking sessions"
  ON cooking_sessions FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = get_current_user_id()
    )
  );

-- Session starters can update their sessions
CREATE POLICY "Session starters can update cooking sessions"
  ON cooking_sessions FOR UPDATE
  USING (started_by = get_current_user_id());

-- Session starters can end their sessions
CREATE POLICY "Session starters can delete cooking sessions"
  ON cooking_sessions FOR DELETE
  USING (started_by = get_current_user_id());

-- ============================================================================
-- ACTIVE TIMERS TABLE POLICIES
-- ============================================================================

-- Family members can view active timers
CREATE POLICY "Family members can view active timers"
  ON active_timers FOR SELECT
  USING (
    cooking_session_id IN (
      SELECT id FROM cooking_sessions
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Family members can create timers in their sessions
CREATE POLICY "Family members can create active timers"
  ON active_timers FOR INSERT
  WITH CHECK (
    cooking_session_id IN (
      SELECT id FROM cooking_sessions
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Anyone in the family can update timers (collaborative)
CREATE POLICY "Family members can update active timers"
  ON active_timers FOR UPDATE
  USING (
    cooking_session_id IN (
      SELECT id FROM cooking_sessions
      WHERE family_id IN (
        SELECT family_id FROM family_members
        WHERE user_id = get_current_user_id()
      )
    )
  );

-- Timer starters can delete their timers
CREATE POLICY "Timer starters can delete active timers"
  ON active_timers FOR DELETE
  USING (
    started_by = get_current_user_id()
    OR cooking_session_id IN (
      SELECT id FROM cooking_sessions
      WHERE started_by = get_current_user_id()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_current_user_id IS 'Helper function to get internal user ID from Supabase auth UID';
COMMENT ON POLICY "Users can view own profile" ON users IS 'Users can only see their own profile data';
COMMENT ON POLICY "Family members can view recipes" ON recipes IS 'Users can view recipes from families they belong to';
COMMENT ON POLICY "Family members can update active timers" ON active_timers IS 'Collaborative timer control - any family member can pause/resume';
