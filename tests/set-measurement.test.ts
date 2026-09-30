import test from "node:test";
import assert from "node:assert/strict";
import {
  addWorkoutSet,
  configureRows,
  elapsedClock,
  pauseClock,
  recordedMeasurement,
  restoreWorkoutRows,
  setLabel,
  targetValue,
} from "../src/lib/set-measurement.ts";
import { updateSetFieldAndPropagate } from "../src/lib/workout-set-utils.ts";
import { parseWorkoutLocally } from "../supabase/functions/_shared/workout-parser.ts";

test("3 serie per gamba creano 6 registrazioni indipendenti con identità stabili", () => {
  const rows = restoreWorkoutRows({ targetSets: 3, unilateral: true, target: 6, targetWeight: 20 });
  assert.deepEqual(rows.map(setLabel), ["1 SX", "1 DX", "2 SX", "2 DX", "3 SX", "3 DX"]);
  const changed = updateSetFieldAndPropagate(rows, 0, "weight", "22");
  assert.deepEqual(
    changed.map((r) => r.weight),
    ["22", "20", "22", "20", "22", "20"],
  );
  const right = updateSetFieldAndPropagate(changed, 1, "reps", "5");
  assert.deepEqual(
    right.map((r) => r.reps),
    ["6", "5", "6", "5", "6", "5"],
  );
  assert.equal(
    right.reduce(
      (sum, r) => sum + recordedMeasurement(r).weight_kg * recordedMeasurement(r).reps,
      0,
    ),
    696,
  );
  const extra = addWorkoutSet(right);
  assert.deepEqual(extra.slice(-2).map(setLabel), ["4 SX", "4 DX"]);
  assert.deepEqual(
    extra.slice(-2).map((r) => r.weight),
    ["22", "20"],
  );
});
test("cronometro usa timestamp: background, pausa, ripresa e riapertura non perdono tempo", () => {
  const clock = { elapsedMs: 1500, startedAt: 10000 };
  assert.equal(elapsedClock(JSON.parse(JSON.stringify(clock)), 310000), 301500);
  const paused = pauseClock(clock, 11000);
  assert.deepEqual(paused, { elapsedMs: 2500, startedAt: null });
  assert.equal(elapsedClock(paused, 999999), 2500);
  assert.equal(elapsedClock({ ...paused, startedAt: 50000 }, 52500), 5000);
  assert.equal(elapsedClock({ elapsedMs: 0, startedAt: 10000 }, 9000), 0);
});
test("durata e distanza non vengono conteggiate come ripetizioni o kg sollevati", () => {
  const time = recordedMeasurement({ weight: "10", reps: "32,7", reps_type: "time", side: "left" });
  assert.deepEqual(time, {
    weight_kg: 10,
    reps: 0,
    reps_type: "time",
    side: "left",
    duration_sec: 32.7,
    distance_m: null,
  });
  assert.equal(
    recordedMeasurement({ weight: "20", reps: "35", reps_type: "distance" }).distance_m,
    35,
  );
  assert.throws(
    () =>
      recordedMeasurement({
        weight: "0",
        reps: "30",
        reps_type: "time",
        clock: { elapsedMs: 0, startedAt: 1000 },
      }),
    /Stop/,
  );
  for (const reps of ["", "NaN", "0", "-1", "2.5"])
    assert.throws(() => recordedMeasurement({ weight: "0", reps, reps_type: "count" }));
});
test("ripristino conserva SX/DX e secondi, senza reinterpretare lo storico", () => {
  const rows = restoreWorkoutRows({ targetSets: 2, unilateral: true, type: "time", target: 30 });
  rows[1].clock = { elapsedMs: 2000, startedAt: 1000 };
  rows[1].reps = "31";
  const done = {
    id: "set1",
    set_number: 1,
    weight_kg: 0,
    reps: 0,
    reps_type: "time" as const,
    side: "left" as const,
    duration_sec: 28.4,
    completed_at: "2026-09-29T10:00:00Z",
  };
  const restored = restoreWorkoutRows({
    targetSets: 2,
    unilateral: true,
    type: "time",
    saved: JSON.parse(JSON.stringify(rows)),
    logged: [done],
  });
  assert.equal(restored[0].reps, "28.4");
  assert.equal(restored[0].completed, true);
  assert.deepEqual(restored[1].clock, rows[1].clock);
  assert.equal(restored[1].side, "right");
  assert.equal(configureRows(restored, false, "count"), restored);
  const legacy = restoreWorkoutRows({
    targetSets: 3,
    unilateral: true,
    logged: [{ ...done, side: undefined, reps_type: undefined, reps: 6, duration_sec: undefined }],
  });
  assert.equal(legacy.length, 3);
  assert.equal(legacy[0].side, "both");
  assert.equal(legacy[0].reps, "6");
});
test("il precedente si copia solo se lato e unità corrispondono", () => {
  const rows = restoreWorkoutRows({
    targetSets: 1,
    unilateral: true,
    target: 8,
    previous: new Map([
      [1, { weight_kg: 30, reps: 6 }],
      [2, { weight_kg: 15, reps: 4, side: "right" }],
    ]),
  });
  assert.equal(rows[0].reps, "8");
  assert.equal(rows[1].reps, "4");
  assert.equal(targetValue("1,5 minuti per lato", "time"), 90);
  assert.equal(targetValue("0.5 km", "distance"), 500);
});
test("il formato da incollare riconosce unità, lateralità, carico e recupero", () => {
  const [day] = parseWorkoutLocally(
    `GIORNO: Test\nBulgarian Split Squat\n3 serie x 6 ripetizioni per gamba\nCarico: 20 kg\nRecupero: 90 secondi\n\nSide Plank\n3 serie x 30-45 secondi per lato\nRecupero: 60 secondi\n\nFarmer Carry\n3 serie x 30-40 metri\nMonopodalico: no\nCarico: 24 kg\nRecupero: 90 secondi`,
  );
  assert.equal(day.exercises.length, 3);
  assert.deepEqual(
    day.exercises.map((e) => e.is_unilateral),
    [true, true, false],
  );
  assert.deepEqual(
    day.exercises.map((e) => e.reps_type),
    ["count", "time", "distance"],
  );
  assert.equal(day.exercises[0].target_weight_kg, 20);
  assert.equal(day.exercises[1].rest_sec, 60);
});
