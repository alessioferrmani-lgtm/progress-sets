import { corsHeaders } from "../_shared/cors.ts";
import { parseWorkoutLocally } from "../_shared/workout-parser.ts";

const systemPrompt = `Sei un parser di schede di allenamento in italiano.
Restituisci SOLO un JSON valido con questa struttura:

{
  "templates": [
    {
      "name": "nome del giorno",
      "exercises": [
        {
          "name": "nome esercizio",
          "sets": <numero intero>,
          "reps_type": "count" | "time" | "distance" | "unspecified",
          "reps_value": <numero o null>,
          "reps_display": "<stringa da mostrare all'utente>",
          "rest_sec": <numero di secondi, 0 ammesso>
        }
      ]
    }
  ]
}

REGOLE FONDAMENTALI:

1. Formati supportati:
   • Abbreviato: "Squat 3x10", "Panca 4x8-10", "Trazioni 3x max"
   • Esteso multi-riga:
       Squat
       Serie: 3
       Ripetizioni: 10
       Recupero: 120
   • Un template per ogni riga "GIORNO: Nome" o intestazione simile
     ("Giorno A", "Push", "Richiamo", "Lunedì" ecc.). Se non ci sono
     intestazioni usa "Scheda" come nome unico.

2. reps_type:
   • "count"       → ripetizioni numeriche pure (es. "10", "8-10"). reps_value = numero (usa il minimo dell'intervallo). reps_display = testo originale ("10", "8-10").
   • "distance"    → contiene metri/km (es. "100 metri", "1 km"). reps_value = null. reps_display = testo originale ("100 metri").
   • "time"        → contiene secondi/minuti (es. "30 secondi", "35-40 secondi", "1 minuto"). reps_value = null. reps_display = testo originale.
   • "unspecified" → assente, vuoto, "max", "amrap", trattino "-". reps_value = null. reps_display = "-" oppure il testo trovato.

3. rest_sec:
   • Se il testo dice "0" o "nessuno" → 0 (ZERO è un valore valido!).
   • Se in minuti → converti in secondi (2 min → 120).
   • Se manca completamente il campo Recupero → 90.
   • Non usare mai 90 come fallback per un valore esplicito 0.

4. sets: sempre un intero ≥ 1. Se manca usa 3.

5. Non inventare esercizi. Mantieni i nomi originali con lettera maiuscola.

6. Restituisci SOLO il JSON, senza testo introduttivo o markdown.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Inserisci una scheda da analizzare.");
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return jsonResponse({ templates: parseWorkoutLocally(text), parser: "local" });
    }

    let ai: Response;
    try {
      ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
        }),
      });
    } catch (error) {
      console.error("AI gateway request failed", error);
      return jsonResponse({ templates: parseWorkoutLocally(text), parser: "local" });
    }

    if (!ai.ok) {
      const body = await ai.text();
      console.error("AI gateway error", ai.status, body);
      return jsonResponse({ templates: parseWorkoutLocally(text), parser: "local" });
    }

    const payload = await ai.json();
    const content = payload.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return jsonResponse({ templates: parseWorkoutLocally(text), parser: "local" });
    }

    // Robust normalization: never throw for a single bad exercise.
    const raw = parsed as { templates?: unknown[] };
    if (!Array.isArray(raw.templates)) {
      return jsonResponse({ templates: parseWorkoutLocally(text), parser: "local" });
    }

    const templates: Array<{
      name: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps_type: "count" | "time" | "distance" | "unspecified";
        reps_value: number | null;
        reps_display: string;
        rest_sec: number;
        _warning?: string;
      }>;
      _warnings: string[];
    }> = [];

    for (const t of raw.templates) {
      const tt = t as { name?: unknown; exercises?: unknown[] };
      const name = typeof tt.name === "string" && tt.name.trim() ? tt.name.trim() : "Scheda";
      const warnings: string[] = [];
      const exercises: (typeof templates)[number]["exercises"] = [];

      if (!Array.isArray(tt.exercises)) {
        warnings.push("Nessun esercizio riconosciuto in questo giorno.");
      } else {
        for (const e of tt.exercises) {
          const ee = e as Record<string, unknown>;
          const exName = typeof ee.name === "string" ? ee.name.trim() : "";
          if (!exName) {
            warnings.push("Esercizio senza nome ignorato.");
            continue;
          }
          const sets = Number.isFinite(Number(ee.sets)) && Number(ee.sets) > 0
            ? Math.round(Number(ee.sets))
            : 3;

          const repsType = (["count", "time", "distance", "unspecified"] as const).includes(
            ee.reps_type as never,
          )
            ? (ee.reps_type as "count" | "time" | "distance" | "unspecified")
            : "unspecified";

          const repsValue =
            repsType === "count" && ee.reps_value !== null && ee.reps_value !== undefined
              ? Number(ee.reps_value) || null
              : null;

          const repsDisplay =
            typeof ee.reps_display === "string" && ee.reps_display.trim()
              ? ee.reps_display.trim()
              : repsType === "count" && repsValue
                ? String(repsValue)
                : "-";

          // CRITICAL: 0 must survive. Only fallback to 90 when truly missing.
          const rawRest = ee.rest_sec;
          const restSec =
            rawRest === null || rawRest === undefined || rawRest === ""
              ? 90
              : Number.isFinite(Number(rawRest)) && Number(rawRest) >= 0
                ? Math.round(Number(rawRest))
                : 90;

          exercises.push({
            name: exName,
            sets,
            reps_type: repsType,
            reps_value: repsValue,
            reps_display: repsDisplay,
            rest_sec: restSec,
          });
        }
      }

      templates.push({ name, exercises, _warnings: warnings });
    }

    return new Response(JSON.stringify({ templates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
