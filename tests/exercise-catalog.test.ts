import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { musclesFor, storedMuscleGroupFor } from "../src/lib/muscle-map.ts";

const catalogMigrations = [
  "supabase/migrations/20260714080144_684ae935-69f9-4749-8b03-0b1886901d95.sql",
  "supabase/migrations/20260726150000_expand_exercise_catalog.sql",
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

test("la sagoma dispone di semi separati per tibiali e polpacci", () => {
  const silhouette = readFileSync("src/components/dashboard/MuscleSilhouette.tsx", "utf8");
  assert.match(silhouette, /calves:\s*\[/);
  assert.match(silhouette, /tibialis:\s*\[/);
});
