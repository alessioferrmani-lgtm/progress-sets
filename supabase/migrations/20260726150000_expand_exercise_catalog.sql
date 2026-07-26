-- Additional catalogue entries reviewed against the ACE Exercise Library
-- (https://www.acefitness.org/resources/everyone/exercise-library/) and
-- NHS ankle-strengthening guidance (https://www.nhs.uk/conditions/ankle-pain/).
-- Ankle and foot drills are stored as Caviglia; the app renders that group
-- through the tibialis and calf zones available in the body silhouette.

INSERT INTO public.exercises (name, muscle_group, equipment, category, is_default) VALUES
  -- Core
  ('Hollow body hold','Core','Corpo libero','Isometrico',true),
  ('Pallof press','Core','Elastico','Anti-rotazione',true),
  ('Cable woodchop','Core','Cavi','Rotazione',true),
  ('V-up','Core','Corpo libero','Isolamento',true),
  ('Bear crawl','Core','Corpo libero','Full body',true),
  ('Stability ball rollout','Core','Fitball','Isolamento',true),
  ('Copenhagen plank','Core','Corpo libero','Isometrico',true),
  ('Toes to bar','Core','Corpo libero','Isolamento',true),
  ('Plank shoulder taps','Core','Corpo libero','Isolamento',true),
  ('Dead bug con elastico','Core','Elastico','Isolamento',true),
  -- Polpacci e tibiali
  ('Calf raise a una gamba','Polpacci','Corpo libero','Isolamento',true),
  ('Donkey calf raise','Polpacci','Macchina','Isolamento',true),
  ('Calf raise al multipower','Polpacci','Multipower','Isolamento',true),
  ('Calf raise con manubri','Polpacci','Manubri','Isolamento',true),
  ('Calf raise su step','Polpacci','Corpo libero','Isolamento',true),
  ('Tibialis raise','Caviglia','Corpo libero','Isolamento',true),
  ('Seated toe raise','Caviglia','Macchina','Isolamento',true),
  -- Schiena
  ('Rematore chest-supported','Schiena','Manubri','Multi-articolare',true),
  ('Rematore unilaterale al cavo','Schiena','Cavi','Multi-articolare',true),
  ('High row','Schiena','Macchina','Multi-articolare',true),
  ('Seal row','Schiena','Bilanciere','Multi-articolare',true),
  ('Meadows row','Schiena','Bilanciere','Multi-articolare',true),
  ('Straight-arm pulldown','Schiena','Cavi','Isolamento',true),
  ('Scapular pull-up','Schiena','Corpo libero','Tecnica',true),
  ('Rack pull','Schiena','Bilanciere','Multi-articolare',true),
  ('Reverse hyperextension','Schiena','Macchina','Multi-articolare',true),
  ('Back extension 45 gradi','Schiena','Corpo libero','Isolamento',true),
  -- Petto
  ('Panca con presa neutra manubri','Petto','Manubri','Multi-articolare',true),
  ('Floor press','Petto','Bilanciere','Multi-articolare',true),
  ('Push up inclinato','Petto','Corpo libero','Multi-articolare',true),
  ('Push up declinato','Petto','Corpo libero','Multi-articolare',true),
  ('Crossover ai cavi','Petto','Cavi','Isolamento',true),
  ('Svend press','Petto','Disco','Isolamento',true),
  ('Hex press','Petto','Manubri','Isolamento',true),
  ('Landmine chest press','Petto','Bilanciere','Multi-articolare',true),
  -- Braccia e avambracci
  ('Bayesian curl','Bicipiti','Cavi','Isolamento',true),
  ('Spider curl','Bicipiti','Manubri','Isolamento',true),
  ('Curl a martello al cavo','Bicipiti','Cavi','Isolamento',true),
  ('Curl inclinato con manubri','Bicipiti','Manubri','Isolamento',true),
  ('Zottman curl','Bicipiti','Manubri','Isolamento',true),
  ('Curl machine','Bicipiti','Macchina','Isolamento',true),
  ('Skull crusher','Tricipiti','Bilanciere','Isolamento',true),
  ('JM press','Tricipiti','Bilanciere','Multi-articolare',true),
  ('Tate press','Tricipiti','Manubri','Isolamento',true),
  ('Rolling dumbbell triceps extension','Tricipiti','Manubri','Isolamento',true),
  ('Triceps extension machine','Tricipiti','Macchina','Isolamento',true),
  ('Wrist roller','Avambracci','Attrezzo','Isolamento',true),
  ('Plate pinch hold','Avambracci','Dischi','Isometrico',true),
  -- Spalle e cuffia dei rotatori
  ('Landmine shoulder press','Spalle','Bilanciere','Multi-articolare',true),
  ('Cuban press','Spalle','Manubri','Prevenzione',true),
  ('Rear delt row','Spalle','Manubri','Isolamento',true),
  ('Y raise','Spalle','Manubri','Isolamento',true),
  ('Pike push-up','Spalle','Corpo libero','Multi-articolare',true),
  ('Band pull-apart','Spalle','Elastico','Isolamento',true),
  ('External rotation ai cavi','Spalle','Cavi','Prevenzione',true),
  ('Scaption raise','Spalle','Manubri','Isolamento',true),
  -- Caviglia e piede
  ('Circonduzioni caviglia','Caviglia','Corpo libero','Mobilita',true),
  ('Ankle pumps','Caviglia','Corpo libero','Mobilita',true),
  ('Inversione caviglia con elastico','Caviglia','Elastico','Stabilita',true),
  ('Eversione caviglia con elastico','Caviglia','Elastico','Stabilita',true),
  ('Dorsiflessione con elastico','Caviglia','Elastico','Rinforzo',true),
  ('Flessione plantare con elastico','Caviglia','Elastico','Rinforzo',true),
  ('Alfabeto con la caviglia','Caviglia','Corpo libero','Mobilita',true),
  ('Equilibrio su una gamba','Caviglia','Corpo libero','Stabilita',true),
  ('Camminata tallone-punta','Caviglia','Corpo libero','Coordinazione',true),
  ('Towel scrunches','Caviglia','Corpo libero','Rinforzo',true)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
