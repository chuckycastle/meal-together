-- Codex Improved Schema
-- Enhancements to existing schema: kitchen timers, role-based RLS, and additional columns

-- Helper function for checking admin role
CREATE OR REPLACE FUNCTION public.is_family_admin(family uuid)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members m
    WHERE m.family_id = family
      AND m.user_id = auth.uid()
      AND m.role IN ('OWNER','ADMIN')
  );
$$;

-- Update family_members role check to match Codex lowercase
-- (Keep existing UPPERCASE values, just update constraint to accept both)
DO $$
BEGIN
  -- Drop old constraint
  ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_role_check;

  -- Add new constraint accepting both formats
  ALTER TABLE public.family_members ADD CONSTRAINT family_members_role_check
    CHECK (role IN ('owner','admin','member','OWNER','ADMIN','MEMBER'));
END $$;

-- Kitchen timers table (new table from Codex - family-level timers)
-- Drop existing table if it has incorrect schema
DROP TABLE IF EXISTS public.kitchen_timers CASCADE;

CREATE TABLE public.kitchen_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  session_id uuid, -- optional: for cooking sessions
  name text,       -- optional label
  default_seconds integer NOT NULL CHECK (default_seconds > 0),
  remaining_seconds integer NOT NULL CHECK (remaining_seconds >= 0),
  status text NOT NULL CHECK (status IN ('idle','running','paused','finished')),
  assigned_to text,
  started_by uuid REFERENCES public.users(id),
  end_at timestamptz,

  -- Telemetry for debugging
  last_sync_at timestamptz DEFAULT now(),
  sync_source text, -- 'realtime', 'api', 'websocket'
  channel_id text,  -- For tracking channel drops

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add is_active column to shopping_lists if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_lists'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.shopping_lists ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Add family_id to shopping_list_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_list_items'
    AND column_name = 'family_id'
  ) THEN
    ALTER TABLE public.shopping_list_items ADD COLUMN family_id uuid REFERENCES public.families(id) ON DELETE CASCADE;

    -- Backfill family_id from shopping_list
    UPDATE public.shopping_list_items si
    SET family_id = sl.family_id
    FROM public.shopping_lists sl
    WHERE si.shopping_list_id = sl.id;
  END IF;
END $$;

-- Add position column to shopping_list_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_list_items'
    AND column_name = 'position'
  ) THEN
    ALTER TABLE public.shopping_list_items ADD COLUMN position integer DEFAULT 0;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kitchen_timers_family ON public.kitchen_timers(family_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_timers_status ON public.kitchen_timers(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_timers_channel ON public.kitchen_timers(channel_id) WHERE channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shopping_lists_active ON public.shopping_lists(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shopping_items_family ON public.shopping_list_items(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_position ON public.shopping_list_items(shopping_list_id, checked, position);

-- Add trigger for kitchen_timers updated_at
CREATE TRIGGER update_kitchen_timers_updated_at BEFORE UPDATE ON public.kitchen_timers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Timer state transition function
CREATE OR REPLACE FUNCTION public.transition_timer_state(
  timer_id uuid,
  new_status text,
  user_id uuid
) RETURNS public.kitchen_timers AS $$
DECLARE
  current_timer public.kitchen_timers;
  result public.kitchen_timers;
BEGIN
  -- Get current timer with lock
  SELECT * INTO current_timer
  FROM public.kitchen_timers
  WHERE id = timer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Timer not found: %', timer_id;
  END IF;

  -- Validate state transition
  IF current_timer.status = 'finished' AND new_status != 'idle' THEN
    RAISE EXCEPTION 'Cannot transition from finished state to % (must reset to idle first)', new_status;
  END IF;

  -- Update timer
  UPDATE public.kitchen_timers
  SET
    status = new_status,
    started_by = CASE WHEN new_status = 'running' THEN user_id ELSE started_by END,
    end_at = CASE
      WHEN new_status = 'running' THEN now() + (remaining_seconds * interval '1 second')
      WHEN new_status = 'paused' OR new_status = 'idle' THEN NULL
      ELSE end_at
    END,
    remaining_seconds = CASE
      WHEN new_status = 'idle' THEN default_seconds  -- Reset to default on idle
      WHEN new_status = 'paused' AND current_timer.end_at IS NOT NULL THEN
        GREATEST(0, EXTRACT(EPOCH FROM (current_timer.end_at - now()))::integer)
      ELSE remaining_seconds
    END,
    last_sync_at = now(),
    updated_at = now()
  WHERE id = timer_id
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.transition_timer_state(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_admin(uuid) TO authenticated;
