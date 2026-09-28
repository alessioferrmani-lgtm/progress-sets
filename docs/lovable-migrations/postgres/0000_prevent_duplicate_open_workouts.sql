-- Only one unfinished session of each workout type may exist for a user.
-- This is intentionally enforced in the database because Web Locks are not
-- available in every browser (notably older iOS versions and some PWAs).

-- Repair duplicates created before this constraint existed. Keep the session
-- with the most logged sets (then the newest one) and close the others at their
-- original start so their history is preserved without inventing duration.
WITH ranked AS (
  SELECT
    ws.id,
    row_number() OVER (
      PARTITION BY ws.user_id,
        coalesce(ws.template_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ORDER BY (
        SELECT count(*)
        FROM public.logged_sets ls
        WHERE ls.session_id = ws.id
      ) DESC,
      ws.started_at DESC,
      ws.id DESC
    ) AS duplicate_rank
  FROM public.workout_sessions ws
  WHERE ws.ended_at IS NULL
)
UPDATE public.workout_sessions ws
SET ended_at = ws.started_at
FROM ranked
WHERE ws.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_one_open_per_type
  ON public.workout_sessions (
    user_id,
    coalesce(template_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE ended_at IS NULL;