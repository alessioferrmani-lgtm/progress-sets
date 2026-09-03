-- Periodized strength programs group session templates by week without
-- changing the meaning of existing workout history rows.
CREATE TABLE IF NOT EXISTS public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sport TEXT,
  duration_weeks INT NOT NULL DEFAULT 1 CHECK (duration_weeks > 0),
  current_week INT NOT NULL DEFAULT 1 CHECK (current_week > 0),
  start_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_programs TO authenticated;
GRANT ALL ON public.training_programs TO service_role;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_programs_own ON public.training_programs;
CREATE POLICY training_programs_own ON public.training_programs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.training_programs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS program_week INT,
  ADD COLUMN IF NOT EXISTS session_key TEXT;

ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS rir TEXT,
  ADD COLUMN IF NOT EXISTS alternative TEXT;

ALTER TABLE public.workout_templates
  DROP CONSTRAINT IF EXISTS workout_templates_program_week_check;
ALTER TABLE public.workout_templates
  ADD CONSTRAINT workout_templates_program_week_check
  CHECK (program_week IS NULL OR program_week > 0);

CREATE INDEX IF NOT EXISTS workout_templates_program_idx
  ON public.workout_templates(program_id, program_week, session_key);

NOTIFY pgrst, 'reload schema';