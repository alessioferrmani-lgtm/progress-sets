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
  assert.deepEqual(musclesFor("Tibialis raise", "Tibiali (stinchi)"), ["calves"]);
});

test("usa il gruppo strutturato quando il nome è personalizzato", () => {
  assert.deepEqual(musclesFor("Esercizio personale", "Spalle"), ["shoulders"]);
  assert.deepEqual(musclesFor("Esercizio personale", "Gambe"), [
    "quads",
    "hamstrings",
    "glutes",
    "calves",
  ]);
  assert.deepEqual(musclesFor("Esercizio personale", "Tibiali (stinchi)"), ["calves"]);
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
