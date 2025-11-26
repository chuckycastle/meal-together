-- RLS Policies for Kitchen Timers
-- Add policies for the new kitchen_timers table only
-- (Other table policies already exist in 20250125000002_row_level_security.sql)

-- Enable RLS on kitchen_timers
ALTER TABLE public.kitchen_timers ENABLE ROW LEVEL SECURITY;

-- Kitchen timers policies (family-level access)
CREATE POLICY "Members can view family timers"
  ON public.kitchen_timers FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = get_current_user_id()
    )
  );

CREATE POLICY "Members can create timers"
  ON public.kitchen_timers FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = get_current_user_id()
    )
  );

CREATE POLICY "Members can update timers"
  ON public.kitchen_timers FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members
      WHERE user_id = get_current_user_id()
    )
  );

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
