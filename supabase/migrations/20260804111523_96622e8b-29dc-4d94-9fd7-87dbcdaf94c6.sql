-- exercises: use user_id as the owner column (matches app code)
ALTER TABLE public.exercises RENAME COLUMN created_by TO user_id;
ALTER INDEX IF EXISTS exercises_created_by_idx RENAME TO exercises_user_id_idx;

DROP POLICY IF EXISTS exercises_insert_own ON public.exercises;
DROP POLICY IF EXISTS exercises_update_own ON public.exercises;
DROP POLICY IF EXISTS exercises_delete_own ON public.exercises;

CREATE POLICY exercises_insert_own
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (is_default = false AND user_id = auth.uid());

CREATE POLICY exercises_update_own
  ON public.exercises FOR UPDATE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (is_default = false AND user_id = auth.uid());

CREATE POLICY exercises_delete_own
  ON public.exercises FOR DELETE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Owner columns the app already writes; parent-scoped policies remain the gate.
ALTER TABLE public.logged_sets ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE public.logged_sets ls SET user_id = s.user_id
  FROM public.workout_sessions s WHERE s.id = ls.session_id AND ls.user_id IS NULL;

ALTER TABLE public.template_exercises ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE public.template_exercises te SET user_id = t.user_id
  FROM public.workout_templates t WHERE t.id = te.template_id AND te.user_id IS NULL;

NOTIFY pgrst, 'reload schema';