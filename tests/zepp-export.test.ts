import assert from "node:assert/strict";
import test from "node:test";
import { buildZeppTcx, zeppFilename } from "../src/lib/zepp-export.ts";

test("crea un TCX per Zepp con le serie dell'allenamento", () => {
  const tcx = buildZeppTcx({
    name: "Giorno 2 & upper",
    startedAt: "2026-08-03T18:02:21.558Z",
    endedAt: "2026-08-03T20:09:56.359Z",
    calories: 1105,
    avgHr: null,
    sets: [{ exerciseName: "Panca & Press", setNumber: 1, weightKg: 30, reps: 6, completedAt: "2026-08-03T18:02:30.540Z", restTakenSec: 90 }],
  });
  assert.match(tcx, /<TrainingCenterDatabase/);
  assert.match(tcx, /Sport="Other"/);
  assert.match(tcx, /<Calories>1105<\/Calories>/);
  assert.match(tcx, /Panca &amp; Press/);
  assert.match(tcx, /<ps:RestSeconds>90<\/ps:RestSeconds>/);
});

test("crea un nome file TCX stabile", () => {
  assert.equal(zeppFilename("Giorno 2 · Spalle", "2026-08-03T18:02:21.558Z"), "progress-sets-giorno-2-spalle-2026-08-03.tcx");
});
