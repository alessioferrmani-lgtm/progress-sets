ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.exercises SET created_by = NULL WHERE is_default = true;

CREATE INDEX IF NOT EXISTS exercises_created_by_idx ON public.exercises(created_by);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;

DROP POLICY IF EXISTS exercises_insert_auth ON public.exercises;
CREATE POLICY exercises_insert_own
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (is_default = false AND created_by = auth.uid());

CREATE POLICY exercises_update_own
  ON public.exercises FOR UPDATE TO authenticated
  USING (created_by IS NOT NULL AND created_by = auth.uid())
  WITH CHECK (is_default = false AND created_by = auth.uid());

CREATE POLICY exercises_delete_own
  ON public.exercises FOR DELETE TO authenticated
  USING (created_by IS NOT NULL AND created_by = auth.uid());