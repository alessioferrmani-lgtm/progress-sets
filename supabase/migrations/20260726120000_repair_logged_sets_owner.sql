-- Repair the owner column used by the workout logger.
--
-- The original multi-user migration can be skipped on an existing Lovable
-- project when an earlier schema change fails.  The app writes user_id on
-- every logged set, so leave the database in the same shape as the client and
-- keep this repair safe to run more than once.

ALTER TABLE public.logged_sets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.logged_sets AS ls
SET user_id = ws.user_id
FROM public.workout_sessions AS ws
WHERE ws.id = ls.session_id
  AND ls.user_id IS NULL;

ALTER TABLE public.logged_sets
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS logged_sets_user_session
  ON public.logged_sets(user_id, session_id);

DROP POLICY IF EXISTS "ls_own" ON public.logged_sets;
DROP POLICY IF EXISTS "logged_sets_own" ON public.logged_sets;
CREATE POLICY "logged_sets_own" ON public.logged_sets
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Make PostgREST see the column immediately after the migration.
NOTIFY pgrst, 'reload schema';
