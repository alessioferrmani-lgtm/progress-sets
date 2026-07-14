-- Restore reliable CRUD permissions for athletic tests.
-- Each authenticated user can only read and modify their own test rows.

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tests TO authenticated;

DROP POLICY IF EXISTS tests_select_own ON public.tests;
CREATE POLICY tests_select_own
ON public.tests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS tests_insert_own ON public.tests;
CREATE POLICY tests_insert_own
ON public.tests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS tests_update_own ON public.tests;
CREATE POLICY tests_update_own
ON public.tests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS tests_delete_own ON public.tests;
CREATE POLICY tests_delete_own
ON public.tests
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Keep the unified performance history consistent when a test is deleted.
CREATE OR REPLACE FUNCTION public.perf_cleanup_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.performance_log
  WHERE source = 'TEST'::public.performance_source
    AND source_id = OLD.id
    AND user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tests_perf_cleanup ON public.tests;
CREATE TRIGGER tests_perf_cleanup
AFTER DELETE ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.perf_cleanup_test();
