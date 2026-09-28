import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { loadProgressExport } from "@/lib/progress-json-export";
type ModelContext = { registerTool(tool: {
  name: string; title: string; description: string; inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(input: unknown): Promise<unknown>;
}, options: {signal: AbortSignal}): void | Promise<void> };
const emptyInput = (input: unknown) => {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("Questo strumento non accetta parametri.");
};
export function SitesAgentTools() {
  const router = useRouter();
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const inputSchema = {type:"object",properties:{},additionalProperties:false};
    const tools = [
      { name:"read_progress_summary",title:"Leggi riepilogo progressi",
        description:"Legge i conteggi e lo stato dei progressi del tuo account, senza modificarli.",inputSchema,
        annotations:{readOnlyHint:true,untrustedContentHint:true},
        async execute(input:unknown) {emptyInput(input);const data=await loadProgressExport();return {totals:data.totals,complete:data.export_complete,warnings:data.export_warnings};} },
      { name:"open_training_plan_builder",title:"Apri creazione scheda",
        description:"Apre la schermata di creazione o importazione scheda. Non salva né avvia allenamenti: l’utente può controllare e completare il flusso.",inputSchema,
        annotations:{readOnlyHint:false,untrustedContentHint:false},
        async execute(input:unknown) {emptyInput(input);await router.navigate({to:"/workouts/new"});return {status:"builder_open",saved:false};} },
    ];
    for(const tool of tools) {try {void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Normal UI remains available. */}}
    return ()=>lifecycle.abort();
  },[router]);
  return null;
}
