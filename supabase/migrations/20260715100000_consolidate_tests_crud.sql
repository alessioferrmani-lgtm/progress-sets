-- Consolidate athletic-test CRUD after the exercise catalogue migration.
-- This migration is intentionally idempotent so it repairs environments where
-- earlier policy fixes were only partially applied.

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tests TO authenticated;

DROP POLICY IF EXISTS tests_own ON public.tests;
DROP POLICY IF EXISTS tests_select_own ON public.tests;
DROP POLICY IF EXISTS tests_insert_own ON public.tests;
DROP POLICY IF EXISTS tests_update_own ON public.tests;
DROP POLICY IF EXISTS tests_delete_own ON public.tests;

CREATE POLICY tests_select_own
ON public.tests
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY tests_insert_own
ON public.tests
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY tests_update_own
ON public.tests
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY tests_delete_own
ON public.tests
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);

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

REVOKE EXECUTE ON FUNCTION public.perf_cleanup_test() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tests_perf_cleanup ON public.tests;
CREATE TRIGGER tests_perf_cleanup
AFTER DELETE ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.perf_cleanup_test();
