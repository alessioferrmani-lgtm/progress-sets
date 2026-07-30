-- Keep strength movements available in Gym even though they were listed in
-- the running-strength source section of the previous catalog migration.
UPDATE public.exercises
SET category = 'Forza'
WHERE is_default = true
  AND category = 'Corsa'
  AND lower(name) IN (
    'squat',
    'front squat',
    'goblet squat',
    'split squat',
    'bulgarian split squat',
    'affondi',
    'affondi indietro',
    'affondi camminati',
    'step-up',
    'step-down',
    'single-leg squat',
    'pistol squat',
    'romanian deadlift',
    'single-leg romanian deadlift',
    'leg curl',
    'nordic hamstring curl',
    'calf raise',
    'single-leg calf raise',
    'soleus raise',
    'tibialis raise',
    'toe raise',
    'hip abduction',
    'monster walk',
    'lateral band walk'
  );

NOTIFY pgrst, 'reload schema';
