import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { EXERCISE_MUSCLE_LINKS } from "../src/lib/exercise-muscle-links.ts";
import { musclesFor, storedMuscleGroupFor, normalizeExerciseName } from "../src/lib/muscle-map.ts";
import { isAthleticsExercise, isGymExercise } from "../src/lib/exercise-categories.ts";
import { RUNNING_DRILLS, runningDrillImageFile } from "../src/lib/running-drills.ts";

const catalogMigrations = [
  "supabase/migrations/20260714080144_684ae935-69f9-4749-8b03-0b1886901d95.sql",
  "supabase/migrations/20260726150000_expand_exercise_catalog.sql",
  "supabase/migrations/20260729100000_core_running_single_limb_catalog.sql",
];

function readCatalog() {
  return catalogMigrations.flatMap((path) => {
    const sql = readFileSync(path, "utf8");
    return Array.from(sql.matchAll(/\('([^']+)','([^']+)','[^']+','[^']+',true\)/g), (match) => ({
      name: match[1],
      group: match[2],
    }));
  });
}

test("il catalogo aggiunge esercizi a tutte le zone richieste", () => {
  const catalog = readCatalog();
  assert.ok(catalog.length >= 150);
  for (const group of [
    "Core",
    "Polpacci",
    "Schiena",
    "Petto",
    "Spalle",
    "Bicipiti",
    "Tricipiti",
    "Caviglia",
  ]) {
    assert.ok(
      catalog.filter((exercise) => exercise.group === group).length >=
        (group === "Caviglia" ? 8 : 5),
      `catalogo insufficiente per ${group}`,
    );
  }
  const unlinked = catalog.filter(({ name, group }) => musclesFor(name, group).length === 0);
  assert.deepEqual(unlinked, []);
});

test("gli isolamenti e le varianti ambigue attivano soltanto le zone previste", () => {
  const expectations: Array<[string, string[]]> = [
    ["Curl alla panca Scott", ["biceps"]],
    ["Wrist curl", ["forearms"]],
    ["Reverse wrist curl", ["forearms"]],
    ["Dorsiflessione con elastico", ["tibialis"]],
    ["Eversione caviglia con elastico", ["peroneals"]],
    ["Inversione caviglia con elastico", ["tibialis"]],
    ["Pallof press", ["abs", "obliques"]],
    ["Rear delt row", ["shoulders", "back"]],
    ["Rematore chest-supported", ["back", "biceps"]],
    ["Iperestensioni", ["lowerBack", "glutes", "hamstrings"]],
    ["Vogatore", ["back", "biceps", "quads", "hamstrings", "glutes"]],
    ["Single-Leg Squat", ["quads", "glutes"]],
    ["Pistol Squat", ["quads", "glutes"]],
    ["Single-Leg Romanian Deadlift", ["hamstrings", "glutes", "lowerBack"]],
    ["Single-Leg Calf Raise", ["calves"]],
    ["Single-Arm Farmer Carry", ["forearms", "abs", "obliques"]],
    ["Single-Leg Box Jump", ["quads", "glutes", "hamstrings", "calves"]],
    ["Croci con manubri", ["chest"]],
    ["Copenhagen plank", ["adductors", "obliques"]],
    ["Bird Dog Row", ["back", "biceps", "abs", "obliques", "lowerBack"]],
    ["Short Foot", ["feet"]],
    ["Corsa incrociata", ["quads", "hamstrings", "glutes", "calves"]],
    ["Leg Raise su panca", ["abs", "quads"]],
    ["Garhammer Raise", ["abs", "quads"]],
  ];
  for (const [name, expected] of expectations) assert.deepEqual(musclesFor(name, "Gambe"), expected, name);
});

test("l'editor manuale offre una ricerca filtrabile", () => {
  const editor = readFileSync(
    new URL("../src/routes/_authenticated/workouts/new.tsx", import.meta.url),
    "utf8",
  );
  assert.match(editor, /data-testid="exercise-search"/);
  assert.match(editor, /isGymExercise/);
  assert.match(editor, /filteredExercises/);
  assert.match(editor, /Nessun esercizio corrisponde alla ricerca/);
});

test("anche l'allenamento libero filtra il catalogo", () => {
  const freeWorkout = readFileSync(
    new URL("../src/routes/_authenticated/workouts/free.tsx", import.meta.url),
    "utf8",
  );
  assert.match(freeWorkout, /data-testid="free-exercise-search"/);
  assert.match(freeWorkout, /isGymExercise/);
  assert.match(freeWorkout, /filteredExercises/);
});

test("gli esercizi di corsa restano in Atletica e non nel picker palestra", () => {
  assert.equal(isAthleticsExercise({ name: "A-Skip", category: "Corsa" }), true);
  assert.equal(isAthleticsExercise({ name: "Jogging leggero", category: "Riscaldamento" }), true);
  assert.equal(isGymExercise({ name: "Pistol Squat", category: "Forza" }), true);
  assert.equal(isGymExercise({ name: "Pistol Squat", category: "Corsa" }), false);

  const overview = readFileSync(
    new URL("../src/routes/_authenticated/athletics/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(overview, /<CustomizableWarmupReminder/);

  const recategorization = readFileSync(
    new URL(
      "../supabase/migrations/20260729103000_classify_running_strength_exercises.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(recategorization, /SET category = 'Forza'/);
  assert.match(recategorization, /'single-leg squat'/);
});

test("ogni collegamento ha una zona anatomica selezionabile", () => {
  const links = readFileSync("src/lib/exercise-muscle-links.ts", "utf8");
  const paths = readFileSync("src/lib/muscle-vector-paths.ts", "utf8");
  const linkedGroups = [...new Set([...links.matchAll(/"(chest|back|shoulders|biceps|triceps|abs|quads|hamstrings|glutes|calves|tibialis|forearms|obliques|adductors|abductors|peroneals|feet|lowerBack)"/g)].map(m => m[1]))];
  for (const group of linkedGroups) assert.ok(paths.includes(`"${group}":`), `zona mancante: ${group}`);
});

test("Atletica espone il catalogo completo delle andature e la routine personalizzata", () => {
  assert.equal(RUNNING_DRILLS.length, 31);
  assert.equal(new Set(RUNNING_DRILLS.map((drill) => drill.id)).size, RUNNING_DRILLS.length);
  assert.equal(
    new Set(RUNNING_DRILLS.map((drill) => runningDrillImageFile(drill.id))).size,
    RUNNING_DRILLS.length,
    "ogni andatura deve avere un file immagine distinto",
  );
  assert.ok(RUNNING_DRILLS.some((drill) => drill.name === "A-Skip"));
  assert.ok(RUNNING_DRILLS.some((drill) => drill.name === "Wall Drill"));
  assert.ok(RUNNING_DRILLS.some((drill) => drill.name === "Pawback Drill"));
  assert.ok(
    RUNNING_DRILLS.every(
      (drill) => drill.description.length > 20 && drill.cue.length > 0 && drill.dosage.length > 0,
    ),
  );
  for (const drill of RUNNING_DRILLS) {
    assert.equal(
      existsSync(`public/running-drills/${runningDrillImageFile(drill.id)}`),
      true,
      `immagine mancante per ${drill.name}`,
    );
  }
  for (const drill of RUNNING_DRILLS) {
    assert.equal(
      runningDrillImageFile(drill.id),
      `${drill.id}.jpg`,
      `immagine coerente non collegata per ${drill.id}`,
    );
  }

  const overview = readFileSync(
    new URL("../src/routes/_authenticated/athletics/index.tsx", import.meta.url),
    "utf8",
  );
  assert.match(overview, /data-testid="open-running-warmup"/);
  assert.match(overview, /<RunningWarmupSheet/);
  assert.match(overview, /CustomizableWarmupReminder/);

  const sheet = readFileSync(
    new URL("../src/components/RunningWarmupSheet.tsx", import.meta.url),
    "utf8",
  );
  assert.match(sheet, /RunningDrillIllustration/);
  assert.match(sheet, /readPreference/);
  assert.match(sheet, /writePreference/);
  assert.doesNotMatch(sheet, /localStorage/);
  assert.match(sheet, /Salva routine/);
  assert.match(sheet, /Sposta .* sopra/);

  const illustration = readFileSync(
    new URL("../src/components/RunningDrillIllustration.tsx", import.meta.url),
    "utf8",
  );
  assert.match(illustration, /running-drill-image/);
  assert.match(illustration, /runningDrillImageFile/);
  assert.match(illustration, /v=20260804-3/);
  assert.match(sheet, /drill\.description/);

  const home = readFileSync(
    new URL("../src/routes/_authenticated/home.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(home, /CustomizableWarmupReminder/);
  assert.doesNotMatch(home, /running-warmup-reminder/);
  const homeReminder = readFileSync(
    new URL("../src/components/CustomizableWarmupReminder.tsx", import.meta.url),
    "utf8",
  );
  assert.match(homeReminder, /data-testid="customize-running-warmup"/);
  assert.match(homeReminder, /CONFIG_STORAGE_KEY/);
  assert.match(homeReminder, /Salva routine/);
  assert.match(homeReminder, /writePreference/);
});

test("il catalogo usa collegamenti espliciti, indipendenti dai vecchi gruppi generici", () => {
  const catalog = JSON.parse(readFileSync("sites/catalog-data.json", "utf8"));
  for (const exercise of catalog) {
    const key = normalizeExerciseName(exercise.name);
    assert.ok(EXERCISE_MUSCLE_LINKS[key], `associazione esplicita mancante: ${exercise.name}`);
    assert.deepEqual(musclesFor(exercise.name, "Gambe"), EXERCISE_MUSCLE_LINKS[key]);
  }
  assert.ok(Object.keys(EXERCISE_MUSCLE_LINKS).length >= 614);
});
