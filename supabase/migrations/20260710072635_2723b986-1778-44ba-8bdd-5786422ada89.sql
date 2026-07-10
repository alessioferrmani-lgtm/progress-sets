
-- Enums
CREATE TYPE public.sex_enum AS ENUM ('M', 'F', 'O');
CREATE TYPE public.activity_level_enum AS ENUM ('sedentary', 'light', 'moderate', 'high', 'athlete');
CREATE TYPE public.test_result_type AS ENUM ('TIME', 'DISTANCE');
CREATE TYPE public.performance_source AS ENUM ('TRAINING_REP', 'TEST', 'RACE');

-- helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ profiles ============
CREATE TABLE public.profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  date_of_birth DATE,
  sex public.sex_enum,
  activity_level public.activity_level_enum,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_own ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ weight_logs ============
CREATE TABLE public.weight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX weight_logs_user_time ON public.weight_logs (user_id, logged_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY weight_logs_own ON public.weight_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- trigger: log weight change
CREATE OR REPLACE FUNCTION public.log_weight_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.weight_kg IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.weight_kg IS DISTINCT FROM OLD.weight_kg) THEN
    INSERT INTO public.weight_logs (user_id, weight_kg) VALUES (NEW.user_id, NEW.weight_kg);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER profiles_weight_log
  AFTER INSERT OR UPDATE OF weight_kg ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_weight_change();

-- ============ test_types ============
CREATE TABLE public.test_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,  -- NULL = preset globale
  name TEXT NOT NULL,
  result_type public.test_result_type NOT NULL,
  distance_m NUMERIC,
  duration_sec INTEGER,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE UNIQUE INDEX test_types_preset_name ON public.test_types (name) WHERE user_id IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_types TO authenticated;
GRANT ALL ON public.test_types TO service_role;
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY test_types_read ON public.test_types FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY test_types_write_own ON public.test_types FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_custom = true);
CREATE POLICY test_types_update_own ON public.test_types FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY test_types_delete_own ON public.test_types FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Seed preset test types
INSERT INTO public.test_types (name, result_type, distance_m, duration_sec, is_custom) VALUES
  ('60 metri', 'TIME', 60, NULL, false),
  ('100 metri', 'TIME', 100, NULL, false),
  ('150 metri', 'TIME', 150, NULL, false),
  ('300 metri', 'TIME', 300, NULL, false),
  ('400 metri', 'TIME', 400, NULL, false),
  ('1000 metri', 'TIME', 1000, NULL, false),
  ('Cooper Test', 'DISTANCE', NULL, 720, false);

-- ============ tests ============
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  test_type_id UUID NOT NULL REFERENCES public.test_types ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time_sec NUMERIC,
  distance_covered_m NUMERIC,
  avg_hr INTEGER,
  weather TEXT,
  notes TEXT,
  observations TEXT,
  calories_burned NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tests_user_type_date ON public.tests (user_id, test_type_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tests_own ON public.tests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ races ============
CREATE TABLE public.races (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  distance_m NUMERIC NOT NULL,
  time_sec NUMERIC NOT NULL,
  placement INTEGER,
  category TEXT,
  avg_hr INTEGER,
  notes TEXT,
  calories_burned NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX races_user_date ON public.races (user_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.races TO authenticated;
GRANT ALL ON public.races TO service_role;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
CREATE POLICY races_own ON public.races FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ performance_log ============
CREATE TABLE public.performance_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source public.performance_source NOT NULL,
  source_id UUID NOT NULL,
  distance_m NUMERIC NOT NULL,
  time_sec NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX perf_log_user_dist ON public.performance_log (user_id, distance_m, time_sec);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_log TO authenticated;
GRANT ALL ON public.performance_log TO service_role;
ALTER TABLE public.performance_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY perf_log_own ON public.performance_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- trigger: populate performance_log from tests
CREATE OR REPLACE FUNCTION public.perf_from_test() RETURNS TRIGGER AS $$
DECLARE
  d NUMERIC;
  t NUMERIC;
  rt public.test_result_type;
  dur INTEGER;
BEGIN
  SELECT result_type, distance_m, duration_sec INTO rt, d, dur
  FROM public.test_types WHERE id = NEW.test_type_id;

  IF rt = 'TIME' AND NEW.time_sec IS NOT NULL AND d IS NOT NULL THEN
    INSERT INTO public.performance_log (user_id, source, source_id, distance_m, time_sec, date)
    VALUES (NEW.user_id, 'TEST', NEW.id, d, NEW.time_sec, NEW.date)
    ON CONFLICT (source, source_id) DO UPDATE SET time_sec = EXCLUDED.time_sec, distance_m = EXCLUDED.distance_m, date = EXCLUDED.date;
  ELSIF rt = 'DISTANCE' AND NEW.distance_covered_m IS NOT NULL AND dur IS NOT NULL THEN
    INSERT INTO public.performance_log (user_id, source, source_id, distance_m, time_sec, date)
    VALUES (NEW.user_id, 'TEST', NEW.id, NEW.distance_covered_m, dur, NEW.date)
    ON CONFLICT (source, source_id) DO UPDATE SET time_sec = EXCLUDED.time_sec, distance_m = EXCLUDED.distance_m, date = EXCLUDED.date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER tests_to_perf AFTER INSERT OR UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.perf_from_test();

-- trigger: populate performance_log from races
CREATE OR REPLACE FUNCTION public.perf_from_race() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.performance_log (user_id, source, source_id, distance_m, time_sec, date)
  VALUES (NEW.user_id, 'RACE', NEW.id, NEW.distance_m, NEW.time_sec, NEW.date)
  ON CONFLICT (source, source_id) DO UPDATE SET time_sec = EXCLUDED.time_sec, distance_m = EXCLUDED.distance_m, date = EXCLUDED.date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER races_to_perf AFTER INSERT OR UPDATE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.perf_from_race();

-- ============ workout_sessions additions ============
ALTER TABLE public.workout_sessions
  ADD COLUMN avg_hr INTEGER,
  ADD COLUMN rpe INTEGER,
  ADD COLUMN calories_burned NUMERIC;
