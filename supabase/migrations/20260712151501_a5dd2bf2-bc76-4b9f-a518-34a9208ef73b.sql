DO $$ BEGIN
  CREATE TYPE public.reps_type_enum AS ENUM ('count', 'time', 'distance', 'unspecified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.template_exercises
  ADD COLUMN IF NOT EXISTS reps_type public.reps_type_enum NOT NULL DEFAULT 'count',
  ADD COLUMN IF NOT EXISTS reps_display TEXT;

ALTER TABLE public.template_exercises
  ALTER COLUMN target_reps DROP NOT NULL;