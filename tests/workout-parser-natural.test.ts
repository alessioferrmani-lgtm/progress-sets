import assert from "node:assert/strict";
import test from "node:test";

import { parseWorkoutLocally } from "../supabase/functions/_shared/workout-parser.ts";

const plan = `GIORNO 1

Trap Bar Deadlift con maniglie alte
4 serie x 4 ripetizioni
Recupero: 180 secondi

Bulgarian Split Squat
3 serie x 6 ripetizioni per gamba
Recupero: 150 secondi

Hip Thrust con bilanciere
3 serie x 5 ripetizioni
Recupero: 150 secondi

Leg Curl da seduto
3 serie x 6-8 ripetizioni
Recupero: 120 secondi

Calf Raise monopodalico in piedi pesante
4 serie x 6-8 ripetizioni per gamba
Recupero: 90 secondi

Soleus Raise da seduto pesante
4 serie x 8-10 ripetizioni
Recupero: 90 secondi

Tibialis Raise
3 serie x 15-20 ripetizioni
Recupero: 60 secondi

Inversione caviglia con elastico
2 serie x 15 ripetizioni per lato
Recupero: 45 secondi

Eversione caviglia con elastico
2 serie x 15 ripetizioni per lato
Recupero: 45 secondi

Incline Bench Press con manubri
3 serie x 6-8 ripetizioni
Recupero: 120 secondi

Pull Up
4 serie x 5-8 ripetizioni
Recupero: 150 secondi

Face Pull
2 serie x 15 ripetizioni
Recupero: 60 secondi

Dead Bug caricato
3 serie x 6 ripetizioni per lato
Recupero: 60 secondi

Ab Wheel
3 serie x 6-8 ripetizioni
Recupero: 90 secondi

Suitcase Carry pesante
3 serie x 30-40 metri per lato
Recupero: 90 secondi

GIORNO 2

Single Leg Romanian Deadlift
3 serie x 6 ripetizioni per gamba
Recupero: 120 secondi

Reverse Lunge
3 serie x 6 ripetizioni per gamba
Recupero: 120 secondi

Step Down lento
2 serie x 6-8 ripetizioni per gamba
Recupero: 90 secondi

Leg Extension controllata
2 serie x 8 ripetizioni
Recupero: 120 secondi

Spanish Squat Isometrico
2 serie x 30-45 secondi
Recupero: 60 secondi

Soleus Isometrico monopodalico
3 serie x 30-45 secondi per gamba
Recupero: 60 secondi

Abduzione anca al cavo
2 serie x 10 ripetizioni per gamba
Recupero: 60 secondi

Flessione anca al cavo
3 serie x 8 ripetizioni per gamba
Recupero: 60 secondi

Shoulder Press con manubri
3 serie x 6-8 ripetizioni
Recupero: 120 secondi

Cable Row unilaterale in Split Stance
3 serie x 8 ripetizioni per lato
Recupero: 90 secondi

Dip
3 serie x 6-10 ripetizioni
Recupero: 120 secondi

Copenhagen Plank
3 serie x 20-30 secondi per lato
Recupero: 60 secondi

Pallof Press
3 serie x 8 ripetizioni per lato
Recupero: 60 secondi

Bird Dog Row
2 serie x 8 ripetizioni per lato
Recupero: 60 secondi

Side Plank con abduzione gamba superiore
2 serie x 20-30 secondi per lato
Recupero: 60 secondi

GIORNO 3

Pogo Jump bilaterale basso
3 serie x 12-15 secondi
Recupero: 60 secondi

Ankle Hop avanti-indietro
2 serie x 10 ripetizioni
Recupero: 60 secondi

Ankle Hop laterale
2 serie x 10 ripetizioni
Recupero: 60 secondi

Snap Down
2 serie x 4 ripetizioni
Recupero: 60 secondi

Step Off + Stick da rialzo basso
2 serie x 3 ripetizioni
Recupero: 90 secondi

Trap Bar Jump
4 serie x 3 ripetizioni
Recupero: 150 secondi

Step Up esplosivo
3 serie x 4 ripetizioni per gamba
Recupero: 120 secondi

Push Press
4 serie x 3 ripetizioni
Recupero: 150 secondi

Pull Up esplosivo
3 serie x 4-5 ripetizioni
Recupero: 120 secondi

Incline Bench Press con manubri
3 serie x 8 ripetizioni
Recupero: 120 secondi

Rematore con petto appoggiato
3 serie x 8 ripetizioni
Recupero: 120 secondi

Alzate Laterali
2 serie x 12-15 ripetizioni
Recupero: 60 secondi

Farmer Carry pesante
3 serie x 30-40 metri
Recupero: 90 secondi

Hanging Knee Raise
3 serie x 8-10 ripetizioni
Recupero: 60 secondi

Copenhagen Plank dinamico
2 serie x 6-8 ripetizioni per lato
Recupero: 60 secondi

Pallof Press Split Stance
2 serie x 8 ripetizioni per lato
Recupero: 60 secondi

Short Foot
2 serie x 20-30 secondi per piede
Recupero: 30 secondi

Toe Yoga
2 serie x 10 ripetizioni per piede
Recupero: 30 secondi`;

test("importa la scheda a tre giorni nel formato naturale italiano", () => {
  const templates = parseWorkoutLocally(plan);

  assert.deepEqual(
    templates.map((template) => [template.name, template.exercises.length]),
    [
      ["1", 15],
      ["2", 15],
      ["3", 18],
    ],
  );

  const day1 = templates[0].exercises;
  assert.deepEqual(
    [day1[0], day1[3], day1[7], day1[14]].map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps_display,
      type: exercise.reps_type,
      rest: exercise.rest_sec,
    })),
    [
      {
        name: "Trap Bar Deadlift con maniglie alte",
        sets: 4,
        reps: "4",
        type: "count",
        rest: 180,
      },
      {
        name: "Leg Curl da seduto",
        sets: 3,
        reps: "6-8",
        type: "count",
        rest: 120,
      },
      {
        name: "Inversione caviglia con elastico",
        sets: 2,
        reps: "15 per lato",
        type: "count",
        rest: 45,
      },
      {
        name: "Suitcase Carry pesante",
        sets: 3,
        reps: "30-40 metri per lato",
        type: "distance",
        rest: 90,
      },
    ],
  );

  assert.equal(templates[1].exercises[4].reps_type, "time");
  assert.equal(templates[1].exercises[4].reps_display, "30-45 secondi");
  assert.equal(templates[2].exercises[0].reps_type, "time");
  assert.equal(templates[2].exercises[16].rest_sec, 30);
});
