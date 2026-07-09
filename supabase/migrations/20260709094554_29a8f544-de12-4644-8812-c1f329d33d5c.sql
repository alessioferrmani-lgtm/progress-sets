
-- EXERCISES (shared library)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_read_all_auth" ON public.exercises FOR SELECT TO authenticated USING (true);

-- WORKOUT TEMPLATES
CREATE TABLE public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_templates TO authenticated;
GRANT ALL ON public.workout_templates TO service_role;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wt_own" ON public.workout_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TEMPLATE EXERCISES
CREATE TABLE public.template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index INT NOT NULL DEFAULT 0,
  target_sets INT NOT NULL DEFAULT 3,
  target_reps INT NOT NULL DEFAULT 10,
  target_weight_kg NUMERIC(6,2),
  rest_seconds INT NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_exercises TO authenticated;
GRANT ALL ON public.template_exercises TO service_role;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "te_own" ON public.template_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE INDEX ON public.template_exercises(template_id, order_index);

-- WORKOUT SESSIONS
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_own" ON public.workout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.workout_sessions(user_id, started_at DESC);

-- LOGGED SETS
CREATE TABLE public.logged_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  set_number INT NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rest_taken_sec INT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logged_sets TO authenticated;
GRANT ALL ON public.logged_sets TO service_role;
ALTER TABLE public.logged_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_own" ON public.logged_sets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
CREATE INDEX ON public.logged_sets(session_id);
CREATE INDEX ON public.logged_sets(exercise_id, completed_at DESC);

-- Seed exercises
INSERT INTO public.exercises (name) VALUES
  ('Panca piana con bilanciere'),
  ('Panca inclinata con manubri'),
  ('Squat con bilanciere'),
  ('Stacco da terra'),
  ('Stacco rumeno'),
  ('Military press'),
  ('Alzate laterali'),
  ('Lat machine'),
  ('Rematore con bilanciere'),
  ('Pulley basso'),
  ('Trazioni alla sbarra'),
  ('Dip alle parallele'),
  ('Curl con bilanciere'),
  ('Curl con manubri'),
  ('Push down ai cavi'),
  ('French press'),
  ('Leg press'),
  ('Leg curl');
