import test from "node:test";
import assert from "node:assert/strict";
import {
  similarRuns,
  packRunNotes,
  readRunMeta,
  runningMetric,
} from "../src/lib/similar-workouts.ts";
const meta = { effort: "easy", rpe: 4, route: "Pista", elevation: 0 };
const base = {
  id: "now",
  date: "2026-10-02",
  created_at: "2026-10-02T12:00:00",
  signature: "Corsa continua",
  notes: packRunNotes(meta, "ok"),
  interval_reps: [{ distance_m: 10000, time_sec: 3000, rest_sec: null }],
};
test("confronto esclude futuro, se stesso, distanza e intensità diverse", () => {
  const old = {
    ...base,
    id: "old",
    date: "2026-10-01",
    interval_reps: [{ distance_m: 9500, time_sec: 2900, rest_sec: null }],
  };
  assert.deepEqual(
    similarRuns(base, [
      base,
      old,
      { ...old, id: "far", interval_reps: [{ distance_m: 8000, time_sec: 2000, rest_sec: null }] },
      { ...old, id: "hard", notes: packRunNotes({ ...meta, effort: "hard" }, "") },
      { ...old, id: "future", date: "2026-10-03" },
    ]).map((s) => s.id),
    ["old"],
  );
  assert.equal(readRunMeta(base.notes).rpe, 4);
  assert.equal(readRunMeta("old notes").effort, "unknown");
});
test("ripetute richiedono sequenza e recupero comparabili", () => {
  const s = {
    ...base,
    signature: "2×400",
    interval_reps: [
      { distance_m: 400, time_sec: 60, rest_sec: 120 },
      { distance_m: 400, time_sec: 62, rest_sec: 120 },
    ],
  };
  const old = { ...s, id: "old", date: "2026-10-01" };
  assert.equal(
    similarRuns(s, [
      old,
      {
        ...old,
        id: "different",
        interval_reps: old.interval_reps.map((r) => ({ ...r, rest_sec: 60 })),
      },
    ]).length,
    1,
  );
});
test("ripetute non cronometrate escluse dai confronti", () => {
  const untimed = { ...base, interval_reps: [{ distance_m: 100, time_sec: null, rest_sec: null }] };
  assert.deepEqual(similarRuns(untimed, [{ ...untimed, id: "old", date: "2026-10-01" }]), []);
  assert.ok(Number.isNaN(runningMetric(untimed)));
});
