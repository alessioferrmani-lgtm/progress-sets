-- Keep logged_sets ownership aligned with its parent workout session.
--
-- Some sessions created before the owner-column repair can still reach the
-- logger with a stale client-side user_id. The parent session is the source
-- of truth; copying its owner before RLS checks repairs those writes without
-- allowing a user to write into somebody else's session.

CREATE OR REPLACE FUNCTION public.sync_logged_set_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_owner UUID;
BEGIN
  SELECT user_id
  INTO session_owner
  FROM public.workout_sessions
  WHERE id = NEW.session_id;

  IF session_owner IS NOT NULL THEN
    NEW.user_id := session_owner;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS logged_sets_sync_owner ON public.logged_sets;
CREATE TRIGGER logged_sets_sync_owner
  BEFORE INSERT OR UPDATE OF session_id, user_id ON public.logged_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_logged_set_owner();

NOTIFY pgrst, 'reload schema';
