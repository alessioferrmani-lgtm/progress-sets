import assert from "node:assert/strict";
import test from "node:test";
import {
  ageFromDOB,
  caloriesFromMET,
  computeCaloriesForRace,
  computeCaloriesForSession,
  computeCaloriesForTest,
  metForRun,
  type UserProfileForCalc,
} from "../src/lib/calories.ts";

const profile: UserProfileForCalc = {
  weight_kg: 70,
  height_cm: 175,
  date_of_birth: "1990-07-17",
  sex: "M",
  activity_level: "moderate",
};

test("calcola l'età senza errori di fuso orario e rifiuta date impossibili", () => {
  assert.equal(ageFromDOB("2000-07-18", new Date(2026, 6, 17)), 25);
  assert.equal(ageFromDOB("2000-07-17", new Date(2026, 6, 17)), 26);
  assert.equal(ageFromDOB("2026-02-30", new Date(2026, 6, 17)), null);
  assert.equal(ageFromDOB("2027-01-01", new Date(2026, 6, 17)), null);
});

test("formula MET usa la conversione standard ACSM", () => {
  assert.equal(caloriesFromMET({ met: 5, weight_kg: 70, duration_min: 60 }), 367.5);
  assert.equal(caloriesFromMET({ met: 5, weight_kg: 70, duration_min: -1 }), 0);
});

test("RPE viene limitato all'intervallo 1-10", () => {
  const ten = caloriesFromMET({ met: 5, weight_kg: 70, duration_min: 60, rpe: 10 });
  const impossible = caloriesFromMET({ met: 5, weight_kg: 70, duration_min: 60, rpe: 99 });
  assert.equal(impossible, ten);
});

test("una sessione richiede peso e durata ma non altezza", () => {
  assert.equal(
    computeCaloriesForSession({ ...profile, height_cm: null }, { duration_min: 60 }),
    404,
  );
  assert.equal(computeCaloriesForSession(profile, { duration_min: 0 }), null);
});

test("FC non plausibile usa il fallback MET", () => {
  const fallback = computeCaloriesForSession(profile, { duration_min: 30 });
  assert.equal(computeCaloriesForSession(profile, { duration_min: 30, avg_hr: 400 }), fallback);
});

test("test e gare rifiutano durata o distanza non valide", () => {
  assert.equal(computeCaloriesForRace(profile, { distance_m: 0, time_sec: 300 }), null);
  assert.equal(computeCaloriesForRace(profile, { distance_m: 1000, time_sec: -1 }), null);
  assert.equal(
    computeCaloriesForTest(profile, {
      result_type: "TIME",
      distance_m: 100,
      duration_sec: null,
      time_sec: 0,
    }),
    null,
  );
});

test("selezione MET corsa gestisce input non validi", () => {
  assert.equal(metForRun(Number.NaN, 300), 8.3);
  assert.equal(metForRun(1000, 240), 11.5);
});
