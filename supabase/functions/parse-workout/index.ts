Exit code: 0
Wall time: 0.5 seconds
Output:
import { corsHeaders } from "../_shared/cors.ts";

const systemPrompt = `Converti questa scheda di allenamento scritta in linguaggio naturale in una struttura JSON.

Schema di output:

{
"templates": [
{
"name": "nome del giorno",
"exercises": [
{
"name": "nome esercizio",
"sets": numero,
"reps": numero,
"rest_sec": numero
}
]
}
]
}

Regole:

* se la scheda contiene piÃ¹ giorni crea un template separato;
* interpreta abbreviazioni comuni;
* "3x10" = 3 serie da 10;
* "4x8-10" = usa 8;
* recuperi espressi in minuti vanno convertiti in secondi;
* se il recupero manca usa 90 secondi;
* interpreta automaticamente i nomi abbreviati degli esercizi;
* restituisci SOLO JSON senza testo aggiuntivo.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Non autenticato" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) throw new Error("Inserisci una scheda da analizzare.");
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("Il servizio AI non Ã¨ ancora configurato.");
    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }] }),
    });
    if (!ai.ok) throw new Error("Il servizio AI non Ã¨ disponibile.");
    const payload = await ai.json();
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "");
    if (!Array.isArray(parsed.templates)) throw new Error("Risposta AI non valida.");
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

