-- Security hardening, automatic profiles, and user-owned workout details.
-- This migration is deliberately idempotent where possible so it is safe on
-- the existing Lovable/Supabase project.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE public.template_exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.template_exercises te
SET user_id = wt.user_id
FROM public.workout_templates wt
WHERE te.template_id = wt.id AND te.user_id IS NULL;
ALTER TABLE public.template_exercises ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.logged_sets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.logged_sets ls
SET user_id = ws.user_id
FROM public.workout_sessions ws
WHERE ls.session_id = ws.id AND ls.user_id IS NULL;
ALTER TABLE public.logged_sets ALTER COLUMN user_id SET NOT NULL;

-- Exercises remain a shared catalogue, with an optional private exercise
-- library for names imported from a user's written routine.
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS exercises_global_name_unique
  ON public.exercises (lower(name)) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS exercises_user_name_unique
  ON public.exercises (user_id, lower(name)) WHERE user_id IS NOT NULL;
DROP POLICY IF EXISTS "exercises_read_all_auth" ON public.exercises;
CREATE POLICY "exercises_read_visible" ON public.exercises FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "exercises_insert_own" ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "exercises_update_own" ON public.exercises FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "exercises_delete_own" ON public.exercises FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Direct user_id predicates are both easier to audit and prevent a query
-- mistake from exposing another user's rows.
DROP POLICY IF EXISTS "te_own" ON public.template_exercises;
CREATE POLICY "template_exercises_own" ON public.template_exercises FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "ls_own" ON public.logged_sets;
CREATE POLICY "logged_sets_own" ON public.logged_sets FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS template_exercises_user_template ON public.template_exercises(user_id, template_id);
CREATE INDEX IF NOT EXISTS logged_sets_user_session ON public.logged_sets(user_id, session_id);

-- Email and OAuth registrations always start with an empty, editable profile.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Existing accounts that predate the trigger also receive a blank profile.
INSERT INTO public.profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
