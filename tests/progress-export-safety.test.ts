import test from "node:test";
import assert from "node:assert/strict";
import { safeExportOne, safeExportRows } from "../src/lib/progress-export-safety.ts";

test("una query riuscita conserva tutti i dati senza avvisi", async () => {
  const warnings: string[] = [];
  const rows = await safeExportRows(
    Promise.resolve({ data: [{ id: 1 }, { id: 2 }], error: null }),
    "Allenamenti",
    warnings,
  );
  assert.deepEqual(rows, [{ id: 1 }, { id: 2 }]);
  assert.deepEqual(warnings, []);
});

test("un errore Supabase non blocca l'esportazione e viene descritto", async () => {
  const warnings: string[] = [];
  const rows = await safeExportRows(
    Promise.resolve({ data: null, error: { message: "policy denied" } }),
    "Serie palestra",
    warnings,
  );
  assert.deepEqual(rows, []);
  assert.deepEqual(warnings, ["Serie palestra: policy denied"]);
});

test("un errore di rete non blocca l'esportazione", async () => {
  const warnings: string[] = [];
  const profile = await safeExportOne(Promise.reject(new Error("offline")), "Profilo", warnings);
  assert.equal(profile, null);
  assert.deepEqual(warnings, ["Profilo: offline"]);
});
