import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatVolumeKg } from "../src/lib/dashboard-format.ts";

const read = (path: string) => readFileSync(path, "utf8");

test("il volume della dashboard contiene una sola unità di misura", () => {
  assert.equal(formatVolumeKg(2750), "2.8k kg");
  assert.equal(formatVolumeKg(42.4), "42 kg");
  assert.equal(formatVolumeKg(Number.NaN), "0 kg");
});

test("l'import assegna il proprietario a esercizi privati e righe della scheda", () => {
  const source = read("src/routes/_authenticated/workouts/new.tsx");
  assert.match(source, /user_id: userId/);
  assert.match(source, /select\("id,muscle_group,user_id"\)/);
  assert.match(source, /createdTemplateIds\.push\(created\.id\)/);
  assert.match(source, /\.delete\(\)[\s\S]*\.in\("id", createdTemplateIds\)/);
});

test("la chiusura di una sessione vuota non inventa un minuto di calorie", () => {
  const source = read("src/lib/active-workout.ts");
  assert.match(source, /hasCompletedSets = session\.completedSets > 0/);
  assert.match(source, /Math\.max\(0, elapsedSec/);
  assert.match(source, /calories: number \| null = hasCompletedSets \? null : 0/);
  assert.doesNotMatch(source, /Math\.max\(\s*60\s*,/);
});

test("logged_sets ricalcola l'owner dalla sessione prima dell'RLS", () => {
  const migration = read("supabase/migrations/20260726130000_sync_logged_set_owner.sql");
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SELECT user_id[\s\S]*FROM public\.workout_sessions/);
  assert.match(migration, /NEW\.user_id := session_owner/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OF session_id, user_id/);
});

test("il salvataggio delle ripetute elimina la sessione se le righe falliscono", () => {
  const source = read("src/routes/_authenticated/workouts/intervals/new.tsx");
  assert.match(source, /let sessionId: string \| null = null/);
  assert.match(source, /if \(sessionId\)[\s\S]*\.from\("interval_sessions"\)[\s\S]*\.delete\(\)/);
  assert.match(source, /\.eq\("user_id", uid\)/);
});

test("i collegamenti di supporto e le azioni della scheda libera non sono ambigui", () => {
  const profile = read("src/routes/_authenticated/profile.tsx");
  const free = read("src/routes/_authenticated/workouts/free.tsx");
  assert.match(profile, /mailto:alessioferrmani@gmail\.com\?subject=Progress%20Sets%20Feedback/);
  assert.match(free, /selectedIds\.length > 0 && \([\s\S]*aria-label="Termina allenamento"/);
});
