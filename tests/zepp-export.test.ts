import assert from "node:assert/strict";
import test from "node:test";
import { buildZeppFit, buildZeppTcx, zeppFilename } from "../src/lib/zepp-export.ts";

test("crea un TCX per Zepp con le serie dell'allenamento", () => {
  const tcx = buildZeppTcx({
    name: "Giorno 2 & upper",
    startedAt: "2026-08-03T18:02:21.558Z",
    endedAt: "2026-08-03T20:09:56.359Z",
    calories: 1105,
    avgHr: null,
    sets: [
      {
        exerciseName: "Panca & Press",
        setNumber: 1,
        weightKg: 30,
        reps: 6,
        completedAt: "2026-08-03T18:02:30.540Z",
        restTakenSec: 90,
      },
    ],
  });
  assert.match(tcx, /<TrainingCenterDatabase/);
  assert.match(tcx, /Sport="Other"/);
  assert.match(tcx, /<Calories>1105<\/Calories>/);
  assert.match(tcx, /Panca &amp; Press/);
  assert.match(tcx, /<ps:RestSeconds>90<\/ps:RestSeconds>/);
});

test("crea un nome file FIT stabile", () => {
  assert.equal(
    zeppFilename("Giorno 2 · Spalle", "2026-08-03T18:02:21.558Z"),
    "progress-sets-giorno-2-spalle-2026-08-03-zepp-strength-v2.fit",
  );
});

test("crea un FIT binario valido con serie standard e developer fields", () => {
  const fit = buildZeppFit({
    name: "Giorno 2",
    startedAt: "2026-08-03T18:02:21.558Z",
    endedAt: "2026-08-03T20:09:56.359Z",
    calories: 1105,
    avgHr: 132,
    sets: [
      {
        exerciseName: "Panca",
        setNumber: 1,
        weightKg: 30,
        reps: 6,
        completedAt: "2026-08-03T18:02:30.540Z",
        restTakenSec: 90,
      },
    ],
  });
  assert.equal(fit[0], 14);
  assert.equal(String.fromCharCode(...fit.slice(8, 12)), ".FIT");
  assert.ok(fit.length > 16);
  const findDefinition = (localMessageType: number, globalMessageNumber: number) =>
    fit.findIndex(
      (byte, index) =>
        byte === 0x40 + localMessageType &&
        fit[index + 1] === 0 &&
        fit[index + 2] === 0 &&
        fit[index + 3] === globalMessageNumber &&
        fit[index + 4] === 0,
    );
  const sessionDefinition = findDefinition(1, 18);
  assert.ok(sessionDefinition > 0, "manca la sessione FIT");
  const sessionFieldCount = fit[sessionDefinition + 5];
  const sessionFieldNumbers = Array.from(
    { length: sessionFieldCount },
    (_, index) => fit[sessionDefinition + 6 + index * 3],
  );
  assert.ok(sessionFieldNumbers.includes(5), "manca il campo sport");
  assert.ok(sessionFieldNumbers.includes(6), "manca il campo sub_sport");
  const workoutDefinition = findDefinition(8, 26);
  const workoutStepDefinition = findDefinition(9, 27);
  const setDefinition = findDefinition(7, 225);
  assert.ok(workoutDefinition > 0, "manca il workout FIT standard");
  assert.ok(workoutStepDefinition > 0, "mancano gli esercizi FIT standard");
  assert.ok(setDefinition > 0, "mancano le serie FIT standard");
  const setFieldCount = fit[setDefinition + 5];
  const setFieldNumbers = Array.from(
    { length: setFieldCount },
    (_, index) => fit[setDefinition + 6 + index * 3],
  );
  assert.ok(setFieldNumbers.includes(3), "mancano le ripetizioni standard");
  assert.ok(setFieldNumbers.includes(4), "manca il peso standard");
  assert.ok(setFieldNumbers.includes(11), "manca il collegamento all'esercizio standard");
  const recordDefinition = fit.findIndex(
    (byte, index) => byte === 0x63 && fit[index + 3] === 20 && fit[index + 4] === 0,
  );
  assert.ok(recordDefinition > 0, "manca la definition message dei record");
  const standardFieldCount = fit[recordDefinition + 5];
  const developerFieldCount = fit[recordDefinition + 6 + standardFieldCount * 3];
  assert.equal(standardFieldCount, 1);
  assert.equal(developerFieldCount, 6, "le sei colonne della serie devono essere developer fields");
  assert.ok(new TextDecoder().decode(fit).includes("Panca"));
});
