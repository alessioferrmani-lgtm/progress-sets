import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const recovery = readFileSync("src/lib/active-workout.ts", "utf8");
const prompt = readFileSync("src/components/InterruptedWorkoutPrompt.tsx", "utf8");
const layout = readFileSync("src/routes/_authenticated/route.tsx", "utf8");
const run = readFileSync("src/routes/_authenticated/workouts/$templateId/run.tsx", "utf8");

test("un allenamento aperto viene riutilizzato invece di creare duplicati", () => {
  assert.match(recovery, /readActiveWorkoutDraft\(\)/);
  assert.match(recovery, /findOpenSessionById/);
  assert.match(recovery, /findLatestOpenSession/);
  assert.match(recovery, /\.is\("ended_at", null\)/);
  assert.match(run, /ensureActiveWorkout\(templateId\)/);
  assert.doesNotMatch(run, /\.insert\(\{ user_id:/);
  assert.doesNotMatch(recovery, /RECENT_WORKOUT_WINDOW_MS/);
});

test("serie confermate e campi in modifica vengono ripristinati", () => {
  assert.match(recovery, /progress_sets_active_workout_v1/);
  assert.match(recovery, /loggedSets: \(loggedSets \?\? \[\]\)/);
  assert.match(run, /activeWorkoutData\.loggedSets/);
  assert.match(run, /activeWorkoutData\.draft\.rowsByExercise/);
  assert.match(run, /saveActiveWorkoutDraft\(/);
  assert.match(run, /visibilitychange/);
  assert.match(run, /beforeunload/);
});

test("alla riapertura compaiono Continua, Salva e termina ed Elimina", () => {
  assert.match(layout, /<InterruptedWorkoutPrompt \/>/);
  assert.match(prompt, /Continua allenamento/);
  assert.match(prompt, /Salva e termina/);
  assert.match(prompt, /Elimina/);
  assert.match(prompt, /deleteActiveWorkout/);
  assert.match(prompt, /finishActiveWorkout/);
});

test("il salvataggio dopo uno spegnimento usa anche l'ultima attività confermata", () => {
  assert.match(recovery, /const storedElapsed =/);
  assert.match(recovery, /const recoveredElapsed = estimateElapsedSeconds/);
  assert.match(recovery, /Math\.max\(storedElapsed, recoveredElapsed\)/);
});
