import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { musclesFor, storedMuscleGroupFor } from "../src/lib/muscle-map.ts";
import { isAthleticsExercise, isGymExercise } from "../src/lib/exercise-categories.ts";

const catalogMigrations = [
  "supabase/migrations/20260714080144_684ae935-69f9-4749-8b03-0b1886901d95.sql",
  "supabase/migrations/20260726150000_expand_exercise_catalog.sql",
  "supabase/migrations/20260729100000_core_running_single_limb_catalog.sql",
];

function readCatalog() {
  return catalogMigrations.flatMap((path) => {
    const sql = readFileSync(path, "utf8");
    return Array.from(
      sql.matchAll(/\('([^']+)','([^']+)','[^']+','[^']+',true\)/g),
      (match) => ({ name: match[1], group: match[2] }),
    );
  });
}

test("il catalogo aggiunge esercizi a tutte le zone richieste", () => {
  const catalog = readCatalog();
  assert.ok(catalog.length >= 150);
  for (const group of ["Core", "Polpacci", "Schiena", "Petto", "Spalle", "Bicipiti", "Tricipiti", "Caviglia"]) {
    assert.ok(
      catalog.filter((exercise) => exercise.group === group).length >= (group === "Caviglia" ? 8 : 5),
      `catalogo insufficiente per ${group}`,
    );
  }
  const unlinked = catalog.filter(({ name, group }) => musclesFor(name, group).length === 0);
  assert.deepEqual(unlinked, []);
});

test("i collegamenti ambigui e la caviglia usano le zone corrette", () => {
  assert.deepEqual(musclesFor("Curl alla panca Scott", "Bicipiti"), ["biceps"]);
  assert.deepEqual(musclesFor("Wrist curl", "Avambracci"), ["forearms"]);
  assert.deepEqual(musclesFor("Reverse wrist curl", "Avambracci"), ["forearms"]);
  assert.deepEqual(musclesFor("Circonduzioni caviglia", "Caviglia"), ["tibialis", "calves"]);
  assert.deepEqual(musclesFor("Dorsiflessione con elastico", "Caviglia"), ["tibialis", "calves"]);
  assert.equal(storedMuscleGroupFor("Dorsiflessione con elastico"), "Caviglia");
  assert.deepEqual(musclesFor("Pallof press", "Core"), ["abs"]);
  assert.deepEqual(musclesFor("Rear delt row", "Spalle"), ["shoulders"]);
  assert.deepEqual(musclesFor("Rematore chest-supported", "Schiena"), ["back", "biceps"]);
  assert.deepEqual(musclesFor("Iperestensioni", "Schiena"), ["back", "hamstrings", "glutes"]);
  assert.deepEqual(musclesFor("Vogatore", "Cardio"), ["back", "biceps", "quads", "hamstrings", "glutes"]);
});

test("le varianti unilaterali attivano i muscoli corretti", () => {
  assert.deepEqual(musclesFor("Single-Leg Squat", "Gambe"), [
    "quads",
    "glutes",
    "hamstrings",
    "calves",
  ]);
  assert.deepEqual(musclesFor("Pistol Squat", "Gambe"), [
    "quads",
    "glutes",
    "hamstrings",
    "calves",
  ]);
  assert.deepEqual(musclesFor("Single-Leg Romanian Deadlift", "Gambe"), ["hamstrings", "glutes"]);
  assert.deepEqual(musclesFor("Single-Leg Calf Raise", "Polpacci"), ["calves"]);
  assert.deepEqual(musclesFor("Single-Arm Farmer Carry", "Core"), [
    "back",
    "biceps",
    "forearms",
    "abs",
  ]);
  assert.deepEqual(musclesFor("Single-Leg Box Jump", "Atletica"), [
    "quads",
    "glutes",
    "calves",
    "tibialis",
  ]);
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
  assert.match(overview, /data-testid="running-warmup-reminder"/);
  assert.match(overview, /A-Skip/);
  assert.match(overview, /localStorage/);

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

test("la sagoma dispone di semi separati per tibiali e polpacci", () => {
  const silhouette = readFileSync("src/components/dashboard/MuscleSilhouette.tsx", "utf8");
  assert.match(silhouette, /calves:\s*\[/);
  assert.match(silhouette, /tibialis:\s*\[/);
});
