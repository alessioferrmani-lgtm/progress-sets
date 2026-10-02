import { similarRuns,runningMetric,readRunMeta } from "@/lib/similar-workouts";
import { CONTINUOUS_RUN } from "@/lib/continuous-run";
import type { IntervalSessionRow } from "@/lib/athletics-queries";
export function RunComparison({session,all}:{session:IntervalSessionRow;all:IntervalSessionRow[]}){
 const matches=similarRuns(session,all),continuous=session.signature===CONTINUOUS_RUN;
 const metric=runningMetric(session),best=matches.reduce<IntervalSessionRow|null>((b,s)=>!b||runningMetric(s)<runningMetric(b)?s:b,null);
 const label=(s:IntervalSessionRow)=>{const n=runningMetric(s), rounded=Math.round(n);return continuous?`${Math.floor(rounded/60)}:${String(rounded%60).padStart(2,"0")}/km`:`${n.toFixed(1)} s medi`;};
 const diff=(s:IntervalSessionRow)=>{const d=metric-runningMetric(s);return `${Math.abs(d).toFixed(1)} s${continuous?"/km":""} ${d<0?"più veloce":d>0?"più lento":"di differenza"}`;};
 const meta=readRunMeta(session.notes);
 return <details className="mt-2 text-sm text-label-secondary"><summary className="cursor-pointer text-accent">Confronta allenamenti simili ({matches.length})</summary>
 {!matches.length?<p className="mt-2">Nessun precedente comparabile. Il confronto apparirà dopo altri allenamenti simili.</p>:<div className="mt-2 space-y-2">
 <p>Ultima · {matches[0].date}: {label(matches[0])} · {diff(matches[0])}</p>
 {best&&<p>Migliore precedente · {best.date}: {label(best)} · {diff(best)}</p>}
 <p className="font-semibold">Ultimi cinque precedenti</p>{matches.slice(0,5).map(s=><p key={s.id}>{s.date} · {label(s)}{readRunMeta(s.notes).rpe?` · Fatica ${readRunMeta(s.notes).rpe}/10`:""}</p>)}
 </div>}
 {continuous?<p className="mt-2">Distanza ±10%, stessa intensità. {meta.effort==="unknown"&&"Intensità dei dati precedenti non indicata. "}Percorso, dislivello e fatica possono cambiare il risultato.{meta.rpe?` Fatica attuale ${meta.rpe}/10.`:""}{meta.route?` Percorso: ${meta.route}.`:""}{meta.elevation!==null?` D+ ${meta.elevation} m.`:""}</p>:<p className="mt-2">Stesse distanze e numero di ripetute; recuperi entro ±10% o 10 s. Migliore {Math.min(...session.interval_reps.map(r=>r.time_sec)).toFixed(1)} s, peggiore {Math.max(...session.interval_reps.map(r=>r.time_sec)).toFixed(1)} s. Variazione prima–ultima {(session.interval_reps.at(-1)!.time_sec-session.interval_reps[0].time_sec).toFixed(1)} s.</p>}
 </details>;
}
