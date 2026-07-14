import assert from "node:assert/strict";
import test from "node:test";

import { parseWorkoutLocally } from "./workout-parser.ts";

test("parses compact exercises and repetition ranges", () => {
  const [template] = parseWorkoutLocally("Squat 3x10\nPanca 4x8-10");

  assert.equal(template.name, "Scheda");
  assert.deepEqual(
    template.exercises.map(({ name, sets, reps_type, reps_value, reps_display, rest_sec }) => ({
      name,
      sets,
      reps_type,
      reps_value,
      reps_display,
      rest_sec,
    })),
    [
      {
        name: "Squat",
        sets: 3,
        reps_type: "count",
        reps_value: 10,
        reps_display: "10",
        rest_sec: 90,
      },
      {
        name: "Panca",
        sets: 4,
        reps_type: "count",
        reps_value: 8,
        reps_display: "8-10",
        rest_sec: 90,
      },
    ],
  );
});

test("parses extended format and preserves an explicit zero recovery", () => {
  const [template] = parseWorkoutLocally(
    "GIORNO: Richiamo\nBox Jump\nSerie: 3\nRipetizioni: 3\nRecupero: 0",
  );

  assert.equal(template.name, "Richiamo");
  assert.equal(template.exercises[0].name, "Box Jump");
  assert.equal(template.exercises[0].rest_sec, 0);
});

test("recognizes time, distance and recovery in minutes", () => {
  const [template] = parseWorkoutLocally(
    "Push\nPlank 3x30 secondi rec 60\nCorsa 4x100 metri recupero 2 min",
  );

  assert.equal(template.name, "Push");
  assert.equal(template.exercises[0].reps_type, "time");
  assert.equal(template.exercises[0].rest_sec, 60);
  assert.equal(template.exercises[1].reps_type, "distance");
  assert.equal(template.exercises[1].rest_sec, 120);
});
