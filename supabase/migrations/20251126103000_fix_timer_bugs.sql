-- Fix Timer Bugs
-- Addresses critical issues found in Supabase migration:
-- 1. Timer reset doesn't restore default_seconds
-- 2. Timer delete policy too permissive (any member can delete)

-- Drop the old delete policy
DROP POLICY IF EXISTS "Members can delete timers" ON public.kitchen_timers;
DROP POLICY IF EXISTS "Creator or admins can delete timers" ON public.kitchen_timers;

-- Create new restrictive delete policy (creator OR admin only)
CREATE POLICY "Creator or admins can delete timers"
  ON public.kitchen_timers FOR DELETE
  USING (
    -- Allow creator to delete their own timer
    started_by = get_current_user_id()
    OR
    -- Allow family admins/owners to delete any timer
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_id = kitchen_timers.family_id
        AND user_id = get_current_user_id()
        AND role IN ('OWNER', 'ADMIN', 'owner', 'admin')
    )
  );

-- Replace the transition_timer_state function to fix reset logic
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
      WHEN new_status = 'idle' THEN default_seconds  -- FIX: Reset to default on idle
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
