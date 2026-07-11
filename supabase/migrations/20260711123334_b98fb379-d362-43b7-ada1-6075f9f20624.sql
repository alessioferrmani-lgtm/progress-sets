
-- Seed missing standard TIME test types
INSERT INTO public.test_types (user_id, name, result_type, distance_m, duration_sec, is_custom)
SELECT NULL, v.name, 'TIME'::public.test_result_type, v.d, NULL, false
FROM (VALUES
  (50,  '50 metri'),
  (80,  '80 metri'),
  (110, '110 metri'),
  (120, '120 metri'),
  (200, '200 metri'),
  (500, '500 metri'),
  (600, '600 metri'),
  (1500,'1500 metri')
) AS v(d, name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_types tt
  WHERE tt.is_custom = false AND tt.result_type = 'TIME' AND tt.distance_m = v.d
);

-- Interval sessions
CREATE TABLE public.interval_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  signature TEXT,
  notes TEXT,
  calories_burned NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interval_sessions TO authenticated;
GRANT ALL ON public.interval_sessions TO service_role;
ALTER TABLE public.interval_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own interval sessions" ON public.interval_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER interval_sessions_updated_at
  BEFORE UPDATE ON public.interval_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Interval reps
CREATE TABLE public.interval_reps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interval_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rep_number INTEGER NOT NULL,
  distance_m NUMERIC NOT NULL,
  time_sec NUMERIC NOT NULL,
  rest_sec INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interval_reps TO authenticated;
GRANT ALL ON public.interval_reps TO service_role;
ALTER TABLE public.interval_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own interval reps" ON public.interval_reps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX interval_reps_session_idx ON public.interval_reps(session_id);

-- Feed reps into performance_log
CREATE OR REPLACE FUNCTION public.perf_from_interval_rep()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE;
BEGIN
  SELECT date INTO d FROM public.interval_sessions WHERE id = NEW.session_id;
  INSERT INTO public.performance_log (user_id, source, source_id, distance_m, time_sec, date)
  VALUES (NEW.user_id, 'TRAINING_REP', NEW.id, NEW.distance_m, NEW.time_sec, COALESCE(d, CURRENT_DATE))
  ON CONFLICT (source, source_id) DO UPDATE
    SET time_sec = EXCLUDED.time_sec,
        distance_m = EXCLUDED.distance_m,
        date = EXCLUDED.date;
  RETURN NEW;
END;
$$;

CREATE TRIGGER interval_reps_to_perf
  AFTER INSERT OR UPDATE ON public.interval_reps
  FOR EACH ROW EXECUTE FUNCTION public.perf_from_interval_rep();
