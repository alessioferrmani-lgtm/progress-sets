import test from "node:test";
import assert from "node:assert/strict";
import {
  findNextUncompletedExercise,
  findNextUncompletedSet,
} from "../src/lib/workout-navigation.ts";

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

test("salta all'esercizio successivo ancora da completare", () => {
  const next = findNextUncompletedExercise(
    ["push", "row", "legs"],
    {
      push: [{ completed: false }, { completed: false }],
      row: [{ completed: true }],
      legs: [{ completed: false }, { completed: true }],
    },
    0,
  );
  assert.deepEqual(next, { exerciseIndex: 2, setIndex: 0 });
});

test("saltare non restituisce l'esercizio corrente se è l'unico pendente", () => {
  const next = findNextUncompletedExercise(
    ["push", "row"],
    {
      push: [{ completed: false }],
      row: [{ completed: true }],
    },
    0,
  );
  assert.equal(next, null);
});
