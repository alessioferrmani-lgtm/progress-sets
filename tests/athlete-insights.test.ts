import test from "node:test";
import assert from "node:assert/strict";
import {
  acuteChronicRatio,
  comparePeriods,
  computeReadiness,
  estimateOneRepMax,
  trainingLoad,
} from "../src/lib/athlete-insights.ts";

test("calcola il carico session-RPE senza valori negativi", () => {
  assert.equal(
    trainingLoad({ date: "2026-08-08", durationMin: 60, kind: "strength", rpe: 8, volumeKg: 900 }),
    510,
  );
  assert.equal(trainingLoad({ date: "2026-08-08", durationMin: -5, kind: "running" }), 0);
});

test("readiness distingue recupero, adattamento e giornata pronta", () => {
  assert.equal(
    computeReadiness({ sleepHours: 8, sleepQuality: 5, soreness: 1, stress: 1, motivation: 5 })
      .label,
    "Pronto",
  );
  assert.equal(
    computeReadiness({ sleepHours: 4, sleepQuality: 1, soreness: 5, stress: 5, motivation: 1 })
      .label,
    "Recupera",
  );
  assert.equal(
    computeReadiness({ sleepHours: 7, sleepQuality: 3, soreness: 3, stress: 3, motivation: 3 })
      .label,
    "Adatta",
  );
});

test("ACWR usa le quattro settimane precedenti come baseline", () => {
  const now = new Date("2026-08-08T12:00:00Z");
  const activities = [
    { date: "2026-08-07T12:00:00Z", durationMin: 60, kind: "running" as const, rpe: 8 },
    { date: "2026-07-25T12:00:00Z", durationMin: 30, kind: "running" as const, rpe: 6 },
    { date: "2026-07-18T12:00:00Z", durationMin: 30, kind: "running" as const, rpe: 6 },
    { date: "2026-07-11T12:00:00Z", durationMin: 30, kind: "running" as const, rpe: 6 },
    { date: "2026-07-04T12:00:00Z", durationMin: 30, kind: "running" as const, rpe: 6 },
  ];
  assert.equal(acuteChronicRatio(activities, now), 2.67);
});

test("confronta periodi e stima 1RM solo su input plausibili", () => {
  assert.deepEqual(comparePeriods(1200, 1000), {
    current: 1200,
    previous: 1000,
    delta: 200,
    percentage: 20,
    trend: "up",
  });
  assert.equal(estimateOneRepMax(30, 8), 38);
  assert.equal(estimateOneRepMax(30, 31), null);
});
