import test from "node:test";
import assert from "node:assert/strict";
import { updateWeightAndPropagate } from "../src/lib/workout-set-utils.ts";

test("il carico della prima serie viene copiato alle serie successive non completate", () => {
  const rows = [
    { weight: "", completed: false, reps: "8" },
    { weight: "", completed: false, reps: "8" },
    { weight: "15", completed: true, reps: "7" },
    { weight: "", completed: false, reps: "6" },
  ];

  const updated = updateWeightAndPropagate(rows, 0, "20");

  assert.deepEqual(
    updated.map((row) => row.weight),
    ["20", "20", "15", "20"],
  );
  assert.notEqual(updated, rows);
});

test("la modifica di una serie diversa dalla prima resta locale", () => {
  const rows = [
    { weight: "20", completed: false },
    { weight: "20", completed: false },
    { weight: "20", completed: false },
  ];

  assert.deepEqual(
    updateWeightAndPropagate(rows, 1, "22.5").map((row) => row.weight),
    ["20", "22.5", "20"],
  );
});
