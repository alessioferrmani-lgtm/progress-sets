import test from "node:test";
import assert from "node:assert/strict";
import { intervalKind, intervalTitle } from "../src/lib/interval-kind.ts";
import { similarRuns } from "../src/lib/similar-workouts.ts";
import { runningInsight } from "../src/lib/home-insights.ts";

test("le sessioni precedenti restano normali e le salite hanno titoli distinti", () => {
  assert.equal(intervalKind(null), "standard");
  assert.equal(intervalTitle({ signature: "4x100" }), "4x100");
  assert.equal(
    intervalTitle({ signature: "4x100", interval_kind: "hill_short" }),
    "Salite corte · 4x100",
  );
  assert.equal(
    intervalTitle({ signature: "3x400", interval_kind: "hill_long" }),
    "Salite lunghe · 3x400",
  );
});
test("i confronti non mescolano piano, salite corte e salite lunghe", () => {
  const rep = { distance_m: 100, time_sec: 20, rest_sec: 60 };
  const current = {
    id: "new",
    date: "2026-10-22",
    created_at: "2026-10-22",
    signature: "2x100",
    notes: null,
    interval_kind: "hill_short",
    interval_reps: [rep, rep],
  };
  const older = {
    ...current,
    id: "old",
    date: "2026-10-20",
    created_at: "2026-10-20",
    interval_reps: [
      { ...rep, time_sec: 25 },
      { ...rep, time_sec: 25 },
    ],
  };
  assert.equal(similarRuns(current, [older]).length, 1);
  assert.equal(similarRuns(current, [{ ...older, interval_kind: "hill_long" }]).length, 0);
  assert.equal(similarRuns(current, [{ ...older, interval_kind: "standard" }]).length, 0);
  assert.ok(runningInsight([current, older]));
  assert.equal(runningInsight([current, { ...older, interval_kind: "standard" }]), null);
});
