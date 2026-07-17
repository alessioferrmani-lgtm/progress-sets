import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { musclesFor, musclesForDay, storedMuscleGroupFor } from "../src/lib/muscle-map.ts";

test("collega gli esercizi principali ai muscoli specifici", () => {
  assert.deepEqual(musclesFor("Panca piana con bilanciere", "Petto"), ["chest", "triceps"]);
  assert.deepEqual(musclesFor("Panca stretta", "Tricipiti"), ["triceps", "chest"]);
  assert.deepEqual(musclesFor("Pulley basso", "Schiena"), ["back", "biceps"]);
  assert.deepEqual(musclesFor("Leg curl sdraiato", "Gambe"), ["hamstrings"]);
  assert.deepEqual(musclesFor("Hip thrust", "Glutei"), ["glutes"]);
  assert.deepEqual(musclesFor("Tibialis raise", "Tibiali (stinchi)"), ["tibialis"]);
});

test("usa il gruppo strutturato quando il nome è personalizzato", () => {
  assert.deepEqual(musclesFor("Esercizio personale", "Spalle"), ["shoulders"]);
  assert.deepEqual(musclesFor("Esercizio personale", "Gambe"), [
    "quads",
    "hamstrings",
    "glutes",
    "calves",
  ]);
  assert.deepEqual(musclesFor("Esercizio personale", "Tibiali (stinchi)"), ["tibialis"]);
});

test("classifica i nuovi esercizi importati", () => {
  assert.equal(storedMuscleGroupFor("Curl con manubri"), "Bicipiti");
  assert.equal(storedMuscleGroupFor("Calf raise in piedi"), "Polpacci");
  assert.equal(storedMuscleGroupFor("Esercizio sconosciuto"), null);
});

test("tutti gli esercizi del catalogo sono collegati ad almeno un muscolo", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260714080144_684ae935-69f9-4749-8b03-0b1886901d95.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const exercises = Array.from(
    migration.matchAll(/\('([^']+)','([^']+)','[^']+','[^']+',true\)/g),
    (match) => ({ name: match[1], group: match[2] }),
  );
  assert.ok(exercises.length >= 100);
  const unlinked = exercises.filter(({ name, group }) => musclesFor(name, group).length === 0);
  assert.deepEqual(unlinked, []);
});

test("la sagoma contiene soltanto i muscoli del giorno selezionato", () => {
  const sets = [
    {
      completed_at: "2026-07-17T08:00:00",
      exercise_name: "Panca piana",
      exercise_muscle_group: "Petto",
    },
    { completed_at: "2026-07-16T08:00:00", exercise_name: "Squat", exercise_muscle_group: "Gambe" },
  ];
  assert.deepEqual([...musclesForDay(sets, "2026-07-17")], ["chest", "triceps"]);
  assert.deepEqual([...musclesForDay(sets, "2026-07-16")], ["quads", "glutes"]);
});

test("le zone bilaterali sono specchiate sugli assi centrali della sagoma", () => {
  const frontGroups = ["chest", "abs", "biceps", "quads", "tibialis"];
  const backGroups = ["back", "triceps", "glutes", "hamstrings", "calves"];

  frontGroups.forEach((group) => {
    const svg = readFileSync(new URL(`../public/muscle-map/${group}.svg`, import.meta.url), "utf8");
    assert.match(svg, /translate\(214 0\) scale\(-1 1\)/, `${group} non è centrato sul fronte`);
  });
  backGroups.forEach((group) => {
    const svg = readFileSync(new URL(`../public/muscle-map/${group}.svg`, import.meta.url), "utf8");
    assert.match(svg, /translate\(624 0\) scale\(-1 1\)/, `${group} non è centrato sul retro`);
  });
});

test("la sagoma è presente nei riepiloghi allenamento ma non nella Home", () => {
  const home = readFileSync(new URL("../src/routes/_authenticated/home.tsx", import.meta.url), "utf8");
  const summary = readFileSync(
    new URL("../src/routes/_authenticated/sessions/$sessionId/summary.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(home, /MuscleSilhouette|MuscleSection/);
  assert.match(summary, /<MuscleSilhouette active=\{data\.activeMuscles\}/);
});
