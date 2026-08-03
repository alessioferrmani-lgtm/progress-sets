import assert from "node:assert/strict";
import test from "node:test";
import { buildZeppTcx, zeppFilename } from "../src/lib/zepp-export.ts";

test("builds a Zepp-compatible TCX activity with strength metadata", () => {
  const tcx = buildZeppTcx({
    name: "Giorno 2 & upper",
    startedAt: "2026-08-03T18:02:21.558Z",
    endedAt: "2026-08-03T20:09:56.359Z",
    calories: 1105,
    avgHr: null,
    sets: [
      {
        exerciseName: "Incline <Bench> & Press",
        setNumber: 1,
        weightKg: 30,
        reps: 6,
        completedAt: "2026-08-03T18:02:30.540Z",
        restTakenSec: null,
      },
      {
        exerciseName: "Pull Up",
        setNumber: 2,
        weightKg: 0,
        reps: 8,
        completedAt: "2026-08-03T18:32:53.067Z",
        restTakenSec: 261,
      },
    ],
  });

  assert.match(tcx, /<TrainingCenterDatabase/);
  assert.match(tcx, /Sport="Other"/);
  assert.match(tcx, /<TotalTimeSeconds>7655<\/TotalTimeSeconds>/);
  assert.match(tcx, /<Calories>1105<\/Calories>/);
  assert.match(tcx, /Incline &lt;Bench&gt; &amp; Press/);
  assert.match(tcx, /<ps:WeightKg>30\.00<\/ps:WeightKg>/);
  assert.match(tcx, /<ps:RestSeconds>261<\/ps:RestSeconds>/);
  assert.match(tcx, /2026-08-03T18:32:53\.067Z/);
});

test("creates a stable, safe TCX filename", () => {
  assert.equal(
    zeppFilename("Giorno 2 · Spalle", "2026-08-03T18:02:21.558Z"),
    "progress-sets-giorno-2-spalle-2026-08-03.tcx",
  );
});
