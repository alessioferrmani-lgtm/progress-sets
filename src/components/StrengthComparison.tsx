import {useQuery} from "@tanstack/react-query";
import {supabase} from "@/integrations/supabase/client";
type CurrentSet={exerciseId:string;exerciseName:string;weightKg:number;reps:number;side:string;repsType:string;durationSec:number|null;distanceM:number|null};
export function StrengthComparison({sessionId,startedAt,sets}:{sessionId:string;startedAt:string;sets:CurrentSet[]}){
 const q=useQuery({queryKey:["similar-strength",sessionId],queryFn:async()=>{
  const ids=[...new Set(sets.map(s=>s.exerciseId))];if(!ids.length)return [];
  const {data,error}=await supabase.from("logged_sets").select("session_id,exercise_id,weight_kg,reps,side,reps_type,duration_sec,distance_m,completed_at").in("exercise_id",ids).neq("session_id",sessionId).lt("completed_at",startedAt).order("completed_at",{ascending:false});if(error)throw error;return data??[];
 }});
 const groups=[...new Map(sets.map(s=>[`${s.exerciseId}/${s.side}/${s.repsType}/${s.reps}`,s])).values()];
 return <section className="ios-card my-4 p-4"><h2 className="text-base font-semibold text-label">Confronto con allenamenti simili</h2>
 {q.isLoading?<p className="mt-2 text-sm">Caricamento…</p>:q.isError?<p className="mt-2 text-sm text-danger">Confronto non disponibile. <button onClick={()=>q.refetch()}>Riprova</button></p>:groups.map(s=>{
 const current=sets.filter(t=>t.exerciseId===s.exerciseId&&t.side===s.side&&t.repsType===s.repsType&&t.reps===s.reps).reduce((b,t)=>t.weightKg>b.weightKg?t:b,s);
 const target=s.repsType==="time"?s.durationSec:s.repsType==="distance"?s.distanceM:s.reps;
 const history=(q.data??[]).filter(r=>r.exercise_id===s.exerciseId&&(r.side??"both")===s.side&&(r.reps_type??"count")===s.repsType&&(s.repsType==="time"?Number(r.duration_sec)===target:s.repsType==="distance"?Number(r.distance_m)===target:Number(r.reps)===target));
 const bySession=new Map<string,typeof history[number]>();for(const r of history){const old=bySession.get(r.session_id);if(!old||Number(r.weight_kg)>Number(old.weight_kg))bySession.set(r.session_id,r);}
 const recent=[...bySession.values()].sort((a,b)=>b.completed_at.localeCompare(a.completed_at));
 const best=recent.reduce<typeof history[number]|null>((b,r)=>!b||Number(r.weight_kg)>Number(b.weight_kg)?r:b,null);
 const unit=s.repsType==="time"?"s":s.repsType==="distance"?"m":"rip.";
 return <details key={`${s.exerciseId}/${s.side}/${s.repsType}/${s.reps}`} className="mt-3 text-sm text-label-secondary"><summary className="cursor-pointer text-accent">{s.exerciseName} · {target} {unit}{s.side!=="both"?` · ${s.side==="left"?"sinistra":"destra"}`:""}</summary>
 <p className="mt-2">Questa seduta: {current.weightKg} kg</p>
 {!recent.length?<p>Nessun precedente con stesso esercizio, lato e quantità.</p>:<><p>Ultima: {Number(recent[0].weight_kg)} kg · {recent[0].completed_at.slice(0,10)} · {(current.weightKg-Number(recent[0].weight_kg))>0?"+":""}{(current.weightKg-Number(recent[0].weight_kg)).toFixed(1)} kg</p><p>Migliore precedente: {Number(best!.weight_kg)} kg · {best!.completed_at.slice(0,10)}</p><p className="mt-2 font-semibold">Ultime cinque sedute</p>{recent.slice(0,5).map(r=><p key={r.session_id}>{r.completed_at.slice(0,10)} · {Number(r.weight_kg)} kg × {target} {unit}</p>)}</>}
 </details>;
 })}<p className="mt-3 text-sm text-label-secondary">Confronto a parità di esercizio, lato e ripetizioni, secondi o metri. Per ogni seduta viene mostrato il carico migliore.</p></section>;
}
