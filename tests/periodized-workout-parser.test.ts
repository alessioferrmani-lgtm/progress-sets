import assert from "node:assert/strict";
import test from "node:test";
import { parseWorkoutLocally } from "../supabase/functions/_shared/workout-parser.ts";

test("importa una tabella periodizzata in sedute e settimane", () => {
  const input = `# Programma Sala Pesi — Preparazione 400m

## SEDUTA A — Forza principale arti inferiori

| Esercizio | Obiettivo | Sett. 1 | Sett. 2 | Sett. 3 | Sett. 4 (scarico) | Recupero | RIR | Alternativa |
|---|---|---|---|---|---|---|---|---|
| Trap bar deadlift | Forza | 4×4 @125kg | 4×4 @130kg | 4×3 @135kg | 3×3 @110-115kg | 180-210s | 3→2 | RDL |
| Pallof press | Core | 3×10-12/lato | 3×10-12/lato | 3×10-12/lato | 2×10/lato | 60s | — | Dead bug |
| Calf raise monopodalico | Accessorio | 2×10/gamba corpo libero | 2×12/gamba corpo libero | 3×10/gamba | eliminare | 60s | 4 | Calf bipodalico |`;

  const templates = parseWorkoutLocally(input);
  assert.equal(templates.length, 4);
  assert.deepEqual(
    templates.map((template) => template.program_week),
    [1, 2, 3, 4],
  );
  assert.equal(templates[0].program_name, "Programma Sala Pesi — Preparazione 400m");
  assert.equal(templates[0].session_key, "A");
  assert.equal(templates[0].exercises.length, 3);
  assert.equal(templates[0].exercises[0].target_weight_kg, 125);
  assert.equal(templates[0].exercises[0].rest_sec, 180);
  assert.equal(templates[0].exercises[1].reps_display, "10-12 per lato");
  assert.equal(templates[3].exercises.length, 2);
});
