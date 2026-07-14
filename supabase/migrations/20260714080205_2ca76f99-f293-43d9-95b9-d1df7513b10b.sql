
DROP POLICY IF EXISTS exercises_insert_auth ON public.exercises;
CREATE POLICY exercises_insert_auth ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (is_default = false);
