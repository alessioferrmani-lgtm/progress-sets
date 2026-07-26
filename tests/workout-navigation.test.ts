import test from "node:test";
import assert from "node:assert/strict";
import { findNextUncompletedSet } from "../src/lib/workout-navigation.ts";

test("avanza alla serie successiva dello stesso esercizio", () => {
  const next = findNextUncompletedSet(
    ["push", "row"],
    {
      push: [{ completed: true }, { completed: false }, { completed: false }],
      row: [{ completed: false }],
    },
    { exerciseIndex: 0, setIndex: 0 },
  );
  assert.deepEqual(next, { exerciseIndex: 0, setIndex: 1 });
});

test("passa al primo esercizio successivo quando finiscono le serie correnti", () => {
  const next = findNextUncompletedSet(
    ["push", "row"],
    {
      push: [{ completed: true }],
      row: [{ completed: false }, { completed: false }],
    },
    { exerciseIndex: 0, setIndex: 0 },
  );
  assert.deepEqual(next, { exerciseIndex: 1, setIndex: 0 });
});

test("restituisce null quando tutte le serie sono completate", () => {
  const next = findNextUncompletedSet(
    ["push", "row"],
    {
      push: [{ completed: true }],
      row: [{ completed: true }],
    },
    { exerciseIndex: 0, setIndex: 0 },
  );
  assert.equal(next, null);
});
