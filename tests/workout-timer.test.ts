import test from "node:test";
import assert from "node:assert/strict";
import { getWorkoutElapsedSeconds } from "../src/lib/workout-timer.ts";

test("il timer usa l'orario di inizio della sessione", () => {
  const now = Date.parse("2026-07-28T10:05:30.000Z");
  assert.equal(
    getWorkoutElapsedSeconds("2026-07-28T10:00:00.000Z", now),
    330,
  );
});

test("il timer non diventa negativo e limita sessioni rimaste aperte", () => {
  const now = Date.parse("2026-07-28T10:00:00.000Z");
  assert.equal(getWorkoutElapsedSeconds("2026-07-28T10:01:00.000Z", now), 0);
  assert.equal(getWorkoutElapsedSeconds("2026-07-28T00:00:00.000Z", now), 4 * 60 * 60);
});
