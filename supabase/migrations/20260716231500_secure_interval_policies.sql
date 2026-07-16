-- Scope interval workout data policies to signed-in users only.
-- The ownership predicates are unchanged; explicitly setting the role prevents
-- anonymous requests from being evaluated against these policies.

DROP POLICY IF EXISTS "own interval sessions" ON public.interval_sessions;

CREATE POLICY "own interval sessions"
ON public.interval_sessions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own interval reps" ON public.interval_reps;

CREATE POLICY "own interval reps"
ON public.interval_reps
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
