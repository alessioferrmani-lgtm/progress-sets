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
  assert.match(run, /user_id: userData\.user\.id/);
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
  assert.match(recovery, /Math\.max\(0, elapsedSec \?\? 0, storedElapsed, recoveredElapsed\)/);
});

test("un allenamento libero usa una sessione senza template ed Ã¨ recuperabile", () => {
  assert.match(recovery, /templateId: string \\| null/);
  assert.match(recovery, /export function ensureFreeWorkout\(\)/);
  assert.match(recovery, /template_id: null/);
  assert.match(recovery, /findLatestOpenSession\(userId, null\)/);
  assert.match(recovery, /Allenamento libero/);
});

test("la schermata libera permette di aggiungere esercizi e usa il recupero condiviso", () => {
  const free = readFileSync("src/routes/_authenticated/workouts/free.tsx", "utf8");
  const recoveryCard = readFileSync("src/components/WorkoutRecoveryCard.tsx", "utf8");
  assert.match(free, /ensureFreeWorkout/);
  assert.match(free, /Aggiungi esercizio/);
  assert.match(free, /aria-label="Termina allenamento"/);
  assert.match(free, /<Check className="size-5" \/> Termina allenamento/);
  assert.match(free, /user_id: auth\.user\.id/);
  assert.match(free, /WorkoutRecoveryCard/);
  assert.match(recoveryCard, /addSeconds\(-15\)/);
  assert.match(recoveryCard, /addSeconds\(15\)/);
});

test("la schermata guidata permette di saltare l'esercizio dalla parte alta della scheda", () => {
  assert.match(run, /findNextUncompletedExercise/);
  assert.match(run, /const skipExercise = \(\) =>/);
  assert.match(run, /Salta esercizio/);
  assert.match(run, /<SkipForward className="size-4" \/>/);
});
