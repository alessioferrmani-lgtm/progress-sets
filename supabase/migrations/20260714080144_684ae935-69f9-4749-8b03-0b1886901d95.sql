
-- 1. Extend exercises table with catalog metadata
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS muscle_group text,
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- 2. Allow authenticated users to insert new exercises (custom entries from import)
DROP POLICY IF EXISTS exercises_insert_auth ON public.exercises;
CREATE POLICY exercises_insert_auth ON public.exercises
  FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Cleanup performance_log when a test or race is deleted
CREATE OR REPLACE FUNCTION public.perf_cleanup_test()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.performance_log WHERE source = 'TEST' AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS tests_perf_cleanup ON public.tests;
CREATE TRIGGER tests_perf_cleanup AFTER DELETE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.perf_cleanup_test();

CREATE OR REPLACE FUNCTION public.perf_cleanup_race()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.performance_log WHERE source = 'RACE' AND source_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS races_perf_cleanup ON public.races;
CREATE TRIGGER races_perf_cleanup AFTER DELETE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.perf_cleanup_race();

-- 4. Seed ~100 common exercises. The catalogue uses partial, expression-based
-- unique indexes, so PostgreSQL cannot infer an ON CONFLICT (name) target.
INSERT INTO public.exercises (name, muscle_group, equipment, category, is_default) VALUES
  -- Petto
  ('Panca piana con bilanciere','Petto','Bilanciere','Multi-articolare',true),
  ('Panca inclinata con bilanciere','Petto','Bilanciere','Multi-articolare',true),
  ('Panca declinata con bilanciere','Petto','Bilanciere','Multi-articolare',true),
  ('Panca piana con manubri','Petto','Manubri','Multi-articolare',true),
  ('Panca inclinata con manubri','Petto','Manubri','Multi-articolare',true),
  ('Chest press','Petto','Macchina','Multi-articolare',true),
  ('Croci con manubri','Petto','Manubri','Isolamento',true),
  ('Croci ai cavi','Petto','Cavi','Isolamento',true),
  ('Pectoral machine','Petto','Macchina','Isolamento',true),
  ('Push up','Petto','Corpo libero','Multi-articolare',true),
  ('Dip alle parallele','Petto','Corpo libero','Multi-articolare',true),
  -- Schiena
  ('Lat machine','Schiena','Macchina','Multi-articolare',true),
  ('Lat machine presa inversa','Schiena','Macchina','Multi-articolare',true),
  ('Trazioni alla sbarra','Schiena','Corpo libero','Multi-articolare',true),
  ('Pull up assistite','Schiena','Macchina','Multi-articolare',true),
  ('Pulley basso','Schiena','Cavi','Multi-articolare',true),
  ('Rematore con bilanciere','Schiena','Bilanciere','Multi-articolare',true),
  ('Rematore con manubrio','Schiena','Manubri','Multi-articolare',true),
  ('Rematore T-bar','Schiena','Bilanciere','Multi-articolare',true),
  ('Pulldown','Schiena','Macchina','Multi-articolare',true),
  ('Iperestensioni','Schiena','Corpo libero','Isolamento',true),
  ('Pullover con manubrio','Schiena','Manubri','Isolamento',true),
  -- Spalle
  ('Military press','Spalle','Bilanciere','Multi-articolare',true),
  ('Shoulder press','Spalle','Macchina','Multi-articolare',true),
  ('Lento avanti con manubri','Spalle','Manubri','Multi-articolare',true),
  ('Arnold press','Spalle','Manubri','Multi-articolare',true),
  ('Alzate laterali','Spalle','Manubri','Isolamento',true),
  ('Alzate laterali ai cavi','Spalle','Cavi','Isolamento',true),
  ('Alzate frontali','Spalle','Manubri','Isolamento',true),
  ('Alzate posteriori','Spalle','Manubri','Isolamento',true),
  ('Reverse pec deck','Spalle','Macchina','Isolamento',true),
  ('Face pull','Spalle','Cavi','Isolamento',true),
  ('Scrollate con bilanciere','Spalle','Bilanciere','Isolamento',true),
  ('Scrollate con manubri','Spalle','Manubri','Isolamento',true),
  -- Bicipiti
  ('Curl con bilanciere','Bicipiti','Bilanciere','Isolamento',true),
  ('Curl con manubri','Bicipiti','Manubri','Isolamento',true),
  ('Curl alternato con manubri','Bicipiti','Manubri','Isolamento',true),
  ('Hammer curl','Bicipiti','Manubri','Isolamento',true),
  ('Curl ai cavi','Bicipiti','Cavi','Isolamento',true),
  ('Curl alla panca Scott','Bicipiti','Bilanciere','Isolamento',true),
  ('Curl concentrato','Bicipiti','Manubri','Isolamento',true),
  ('Curl con bilanciere EZ','Bicipiti','Bilanciere','Isolamento',true),
  ('Curl inverso','Bicipiti','Bilanciere','Isolamento',true),
  -- Tricipiti
  ('Push down ai cavi','Tricipiti','Cavi','Isolamento',true),
  ('Push down corda','Tricipiti','Cavi','Isolamento',true),
  ('French press','Tricipiti','Bilanciere','Isolamento',true),
  ('French press manubri','Tricipiti','Manubri','Isolamento',true),
  ('Estensioni sopra la testa ai cavi','Tricipiti','Cavi','Isolamento',true),
  ('Dip tricipiti alla panca','Tricipiti','Corpo libero','Multi-articolare',true),
  ('Kickback con manubri','Tricipiti','Manubri','Isolamento',true),
  ('Panca stretta','Tricipiti','Bilanciere','Multi-articolare',true),
  -- Gambe
  ('Squat con bilanciere','Gambe','Bilanciere','Multi-articolare',true),
  ('Front squat','Gambe','Bilanciere','Multi-articolare',true),
  ('Hack squat','Gambe','Macchina','Multi-articolare',true),
  ('Goblet squat','Gambe','Manubri','Multi-articolare',true),
  ('Leg press','Gambe','Macchina','Multi-articolare',true),
  ('Pressa 45°','Gambe','Macchina','Multi-articolare',true),
  ('Bulgarian split squat','Gambe','Manubri','Multi-articolare',true),
  ('Affondi con manubri','Gambe','Manubri','Multi-articolare',true),
  ('Affondi camminati','Gambe','Manubri','Multi-articolare',true),
  ('Affondi con bilanciere','Gambe','Bilanciere','Multi-articolare',true),
  ('Leg extension','Gambe','Macchina','Isolamento',true),
  ('Leg curl sdraiato','Gambe','Macchina','Isolamento',true),
  ('Leg curl seduto','Gambe','Macchina','Isolamento',true),
  ('Stacco da terra','Gambe','Bilanciere','Multi-articolare',true),
  ('Stacco rumeno','Gambe','Bilanciere','Multi-articolare',true),
  ('Stacco sumo','Gambe','Bilanciere','Multi-articolare',true),
  ('Good morning','Gambe','Bilanciere','Multi-articolare',true),
  ('Hip thrust','Glutei','Bilanciere','Multi-articolare',true),
  ('Glute bridge','Glutei','Corpo libero','Isolamento',true),
  ('Calf raise in piedi','Polpacci','Macchina','Isolamento',true),
  ('Calf raise seduto','Polpacci','Macchina','Isolamento',true),
  ('Calf raise alla pressa','Polpacci','Macchina','Isolamento',true),
  ('Adduttori macchina','Gambe','Macchina','Isolamento',true),
  ('Abduttori macchina','Gambe','Macchina','Isolamento',true),
  -- Core
  ('Plank','Core','Corpo libero','Isolamento',true),
  ('Side plank','Core','Corpo libero','Isolamento',true),
  ('Crunch','Core','Corpo libero','Isolamento',true),
  ('Crunch inverso','Core','Corpo libero','Isolamento',true),
  ('Sit up','Core','Corpo libero','Isolamento',true),
  ('Hanging leg raise','Core','Corpo libero','Isolamento',true),
  ('Leg raise a terra','Core','Corpo libero','Isolamento',true),
  ('Russian twist','Core','Corpo libero','Isolamento',true),
  ('Ab wheel','Core','Attrezzo','Isolamento',true),
  ('Dead bug','Core','Corpo libero','Isolamento',true),
  ('Mountain climber','Core','Corpo libero','Cardio',true),
  ('Cable crunch','Core','Cavi','Isolamento',true),
  ('Bird dog','Core','Corpo libero','Isolamento',true),
  -- Avambracci
  ('Wrist curl','Avambracci','Bilanciere','Isolamento',true),
  ('Reverse wrist curl','Avambracci','Bilanciere','Isolamento',true),
  ('Farmer walk','Avambracci','Manubri','Full body',true),
  -- Cardio / Atletica
  ('Corsa','Cardio','Corpo libero','Cardio',true),
  ('Corsa in salita','Cardio','Corpo libero','Cardio',true),
  ('Skip','Atletica','Corpo libero','Tecnica',true),
  ('Skip alto','Atletica','Corpo libero','Tecnica',true),
  ('Calciata dietro','Atletica','Corpo libero','Tecnica',true),
  ('Andature A','Atletica','Corpo libero','Tecnica',true),
  ('Balzi alternati','Atletica','Corpo libero','Pliometria',true),
  ('Balzi a piedi pari','Atletica','Corpo libero','Pliometria',true),
  ('Box jump','Atletica','Attrezzo','Pliometria',true),
  ('Sprint','Atletica','Corpo libero','Velocità',true),
  ('Allunghi','Atletica','Corpo libero','Velocità',true),
  ('Cyclette','Cardio','Macchina','Cardio',true),
  ('Vogatore','Cardio','Macchina','Cardio',true),
  ('Tapis roulant','Cardio','Macchina','Cardio',true),
  ('Ellittica','Cardio','Macchina','Cardio',true),
  ('Burpees','Full body','Corpo libero','Cardio',true),
  ('Kettlebell swing','Full body','Kettlebell','Multi-articolare',true),
  ('Clean','Full body','Bilanciere','Olimpico',true),
  ('Snatch','Full body','Bilanciere','Olimpico',true),
  ('Thruster','Full body','Bilanciere','Multi-articolare',true)
ON CONFLICT DO NOTHING;
