-- Elite-athlete foundation: daily readiness check-ins and planned sessions.
-- Additive migration: it does not alter or delete existing workout data.

CREATE TABLE IF NOT EXISTS public.athlete_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours NUMERIC,
  sleep_quality INTEGER,
  soreness INTEGER,
  stress INTEGER,
  motivation INTEGER,
  resting_hr INTEGER,
  hrv_ms NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT athlete_checkins_user_date_key UNIQUE (user_id, date),
  CONSTRAINT athlete_checkins_sleep_hours_check CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24)),
  CONSTRAINT athlete_checkins_sleep_quality_check CHECK (sleep_quality IS NULL OR sleep_quality BETWEEN 1 AND 5),
  CONSTRAINT athlete_checkins_soreness_check CHECK (soreness IS NULL OR soreness BETWEEN 1 AND 5),
  CONSTRAINT athlete_checkins_stress_check CHECK (stress IS NULL OR stress BETWEEN 1 AND 5),
  CONSTRAINT athlete_checkins_motivation_check CHECK (motivation IS NULL OR motivation BETWEEN 1 AND 5),
  CONSTRAINT athlete_checkins_resting_hr_check CHECK (resting_hr IS NULL OR resting_hr BETWEEN 25 AND 240),
  CONSTRAINT athlete_checkins_hrv_check CHECK (hrv_ms IS NULL OR (hrv_ms >= 0 AND hrv_ms <= 500))
);

CREATE INDEX IF NOT EXISTS athlete_checkins_user_date_idx
  ON public.athlete_checkins(user_id, date DESC);

ALTER TABLE public.athlete_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS athlete_checkins_own ON public.athlete_checkins;
CREATE POLICY athlete_checkins_own ON public.athlete_checkins
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS athlete_checkins_updated_at ON public.athlete_checkins;
CREATE TRIGGER athlete_checkins_updated_at
  BEFORE UPDATE ON public.athlete_checkins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.training_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'strength',
  target TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  linked_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT training_plan_items_type_check CHECK (type IN ('strength', 'running', 'test', 'race', 'recovery', 'other')),
  CONSTRAINT training_plan_items_status_check CHECK (status IN ('planned', 'completed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS training_plan_items_user_date_idx
  ON public.training_plan_items(user_id, date ASC);

ALTER TABLE public.training_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS training_plan_items_own ON public.training_plan_items;
CREATE POLICY training_plan_items_own ON public.training_plan_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS training_plan_items_updated_at ON public.training_plan_items;
CREATE TRIGGER training_plan_items_updated_at
  BEFORE UPDATE ON public.training_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
