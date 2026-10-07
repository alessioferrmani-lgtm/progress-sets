import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfISOWeek, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Play, CalendarDays, Dumbbell, Footprints, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { BottomSheet } from './BottomSheet';
import { readPreference, writePreference } from '@/lib/site-preferences';
import { fetchTemplates } from '@/lib/workout-queries';
import { parseDayPlan, parseWeekPlan, strengthInsight, runningInsight, type DayPlan } from '@/lib/home-insights';
import type { SessionRow, SetRow } from '@/lib/dashboard-queries';
import type { IntervalSessionRow, TestRow, RaceRow } from '@/lib/athletics-queries';
import { supabase } from '@/integrations/supabase/client';

type Props={calendar:ReactNode;userId:string;sessions:SessionRow[];sets:SetRow[];intervals:IntervalSessionRow[];tests:TestRow[];races:RaceRow[];loading:boolean;unavailable:boolean};
const days=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
function planValue(p:DayPlan|null){return p?.kind==='gym'?`gym:${p.templateId}`:p?.kind??'';}
function fromValue(v:string):DayPlan|null{return v.startsWith('gym:')?{kind:'gym',templateId:v.slice(4)}:v==='run'||v==='rest'?{kind:v}:null;}
const control='min-h-11 rounded-xl bg-fill px-3 py-2 text-base text-label';
export function HomeExperience({calendar,userId,sessions,sets,intervals,tests,races,loading,unavailable}:Props){
 const now=new Date(), date=format(now,'yyyy-MM-dd'), weekday=(now.getDay()+6)%7, cache=useQueryClient();
 const templates=useQuery({queryKey:['home-templates',userId],queryFn:fetchTemplates});
 const week=useQuery({queryKey:['home-week',userId],queryFn:()=>readPreference('home-week-plan')});
 const today=useQuery({queryKey:['home-day',userId,date],queryFn:()=>readPreference(`home-day-${date}`)});
 const wellness=useQuery({queryKey:['home-check',userId,date],queryFn:()=>readPreference(`home-check-${date}`)});
 const [picker,setPicker]=useState<'today'|'week'|null>(null), [draft,setDraft]=useState<Array<DayPlan|null>>([]);
 const [energy,setEnergy]=useState<number|null>(null),[fatigue,setFatigue]=useState<number|null>(null),[discomfort,setDiscomfort]=useState<string|null>(null);
 const plan=parseWeekPlan(week.data), planned=parseDayPlan(today.data)??plan[weekday];
 const label=(p:DayPlan|null)=>p?.kind==='gym'?(templates.data?.find(t=>t.id===p.templateId)?.name??'Scegli una scheda'):p?.kind==='run'?'Corsa':p?.kind==='rest'?'Riposo':'Da scegliere';
 const savePlan=useMutation({mutationFn:async()=>writePreference(picker==='week'?'home-week-plan':`home-day-${date}`,picker==='week'?draft:draft[0]),onSuccess:()=>{cache.invalidateQueries({queryKey:['home-week',userId]});cache.invalidateQueries({queryKey:['home-day',userId,date]});setPicker(null);toast.success('Programma salvato');},onError:()=>toast.error('Salvataggio non riuscito. Riprova.')});
 const check=wellness.data&&typeof wellness.data==='object'?wellness.data as {energy?:number;fatigue?:number;discomfort?:string}:{};
 const currentEnergy=energy??check.energy??null,currentFatigue=fatigue??check.fatigue??null,currentDiscomfort=discomfort??check.discomfort??'';
 const saveCheck=useMutation({mutationFn:()=>writePreference(`home-check-${date}`,{energy:currentEnergy,fatigue:currentFatigue,discomfort:currentDiscomfort.trim().slice(0,300)}),onSuccess:()=>{cache.invalidateQueries({queryKey:['home-check',userId,date]});toast.success('Come ti senti oggi: salvato');},onError:()=>toast.error('Salvataggio non riuscito. I dati restano qui.')});
 const weekStart=format(startOfISOWeek(now),'yyyy-MM-dd'),weekEnd=format(addDays(startOfISOWeek(now),7),'yyyy-MM-dd');
 const inWeek=(d:string)=>d>=weekStart&&d<weekEnd;
 const gym=sessions.filter(s=>s.ended_at&&inWeek(format(new Date(s.started_at),'yyyy-MM-dd')));
 const runs=[...intervals.filter(s=>s.interval_reps.length>0),...tests,...races].filter(r=>inWeek(r.date.slice(0,10)));
 const targetGym=plan.filter(p=>p?.kind==='gym').length,targetRun=plan.filter(p=>p?.kind==='run').length;
 const next=Array.from({length:7},(_,i)=>({p:plan[(weekday+i+1)%7],date:addDays(now,i+1)})).find(x=>x.p&&x.p.kind!=='rest');
 const insight=strengthInsight(sets,new Set(sessions.filter(s=>s.ended_at).map(s=>s.id)));
 const runInsight=runningInsight(intervals);
 const showRun=runInsight&&(!insight||runInsight.date.slice(0,10)>=format(new Date(sets.find(s=>s.session_id===insight.sessionId)?.completed_at??0),'yyyy-MM-dd'));
 const last=sessions.find(s=>s.ended_at&&format(new Date(s.started_at),'yyyy-MM-dd')===date);
 const [effort,setEffort]=useState(6);
 const saveEffort=useMutation({mutationFn:async()=>{if(!last)return;const {error}=await supabase.from('workout_sessions').update({rpe:effort}).eq('id',last.id);if(error)throw error;},onSuccess:()=>{cache.invalidateQueries({queryKey:['dash','sessions',userId]});toast.success('Impegno registrato');},onError:()=>toast.error('Impossibile salvare. Riprova.')});
 const ready=!templates.isLoading&&!week.isLoading&&!today.isLoading;
 return <>
 <section className="ios-card p-4" aria-label="Allenamento di oggi">
  <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Oggi cosa fai?</h2><button className="min-h-11 text-sm font-semibold text-accent" onClick={()=>{setDraft([planned]);setPicker('today');}}>Cambia</button></div>
  {!ready?<p className="mt-2 text-label-secondary">Caricamento programma…</p>:week.isError||today.isError||templates.isError?<p className="text-sm text-label-secondary">Programma non disponibile. <button className="text-accent" onClick={()=>{week.refetch();today.refetch();templates.refetch();}}>Riprova</button></p>:<>
  <div className="my-3 flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">{planned?.kind==='gym'?<Dumbbell/>:planned?.kind==='run'?<Footprints/>:<CalendarDays/>}</span><div><p className="text-xl font-bold">{planned?label(planned):'Scegli la seduta di oggi'}</p><p className="text-sm text-label-secondary">{planned?.kind==='rest'?'Riposo inserito nel tuo programma.':last?'Allenamento già registrato oggi.':'Il programma si adatta alle tue scelte.'}</p></div></div>
  {planned?.kind==='gym'&&templates.data?.some(t=>t.id===planned.templateId)?<Link className="ios-btn-primary w-full" to="/workouts/$templateId/run" params={{templateId:planned.templateId!}}><Play className="size-5"/>Inizia allenamento</Link>:planned?.kind==='run'?<Link to="/athletics" className="ios-btn-primary w-full">Registra corsa</Link>:<button className="ios-btn-primary w-full" onClick={()=>{setDraft([planned]);setPicker('today');}}>{planned?.kind==='rest'?'Cambia allenamento':'Scegli allenamento'}</button>}
  </>}
  <div className="mt-3 flex gap-3 text-sm"><Link to="/athletics" className="flex-1 rounded-xl bg-fill p-3 text-center font-semibold">Registra corsa</Link><button className="flex-1 rounded-xl bg-fill p-3 font-semibold" onClick={()=>{setDraft([{kind:'rest'}]);setPicker('today');}}>Riposo</button></div>
 </section>
 <section className="ios-card p-4" aria-label="Come ti senti">
  <h2 className="text-base font-semibold">Come ti senti?</h2>
  {wellness.isLoading?<p className="mt-3 text-sm text-label-secondary">Caricamento…</p>:wellness.isError?<p className="mt-3 text-sm text-label-secondary">Dati non disponibili. <button className="text-accent" onClick={()=>wellness.refetch()}>Riprova</button></p>:<>
  {([['Energia',currentEnergy,setEnergy,['Bassa','Normale','Alta']],['Stanchezza',currentFatigue,setFatigue,['Poca','Media','Tanta']]] as const).map(([name,value,update,labels])=><fieldset key={name} className="mt-3"><legend className="mb-2 text-sm text-label-secondary">{name}</legend><div className="grid grid-cols-3 gap-2">{labels.map((text,i)=><button type="button" key={text} aria-pressed={value===i+1} onClick={()=>update(i+1)} className={`${control} ${value===i+1?'ring-2 ring-accent text-accent font-semibold':''}`}>{text}</button>)}</div></fieldset>)}
  <label className="mt-3 block text-sm text-label-secondary">Fastidi, se presenti<input className={`${control} mt-2 w-full`} placeholder="Nessuno, oppure indica dove" value={currentDiscomfort} maxLength={300} onChange={e=>setDiscomfort(e.target.value)}/></label>
  <button disabled={!currentEnergy||!currentFatigue||saveCheck.isPending} className="mt-3 min-h-11 w-full rounded-full bg-accent py-2 font-semibold text-accent-foreground disabled:opacity-40" onClick={()=>saveCheck.mutate()}>{saveCheck.isPending?'Salvataggio…':check.energy&&energy===null&&fatigue===null&&discomfort===null?'Salvato · aggiorna':'Salva come ti senti'}</button>
  </>}
  {last&&last.rpe==null&&<div className="mt-4 border-t border-separator pt-3"><label className="text-sm font-semibold">Quanto è stato impegnativo l’allenamento?<span className="ml-2 text-accent">{effort}/10</span><input aria-label="Impegno percepito da 1 a 10" className="mt-3 w-full accent-[var(--color-accent)]" type="range" min={1} max={10} value={effort} onChange={e=>setEffort(Number(e.target.value))}/></label><p className="text-sm text-label-secondary">1 facile · 10 massimo</p><button className="mt-2 min-h-11 text-sm font-semibold text-accent" disabled={saveEffort.isPending} onClick={()=>saveEffort.mutate()}>Registra impegno</button></div>}
 </section>
 <section className="ios-card p-4" aria-label="La tua settimana">
  <div className="flex items-center justify-between"><h2 className="text-base font-semibold">La tua settimana</h2><button className="min-h-11 text-sm font-semibold text-accent" onClick={()=>{setDraft(plan);setPicker('week');}}>Programma</button></div>
  {unavailable?<p className="text-sm text-label-secondary">Le attività non sono disponibili. Riapri la Home per riprovare.</p>:loading?<p className="text-sm text-label-secondary">Caricamento attività…</p>:<div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-fill p-3"><p className="text-2xl font-bold">{gym.length}{targetGym>0&&<span className="text-base text-label-secondary"> / {targetGym}</span>}</p><p className="text-sm text-label-secondary">Palestre completate</p></div><div className="rounded-2xl bg-fill p-3"><p className="text-2xl font-bold">{runs.length}{targetRun>0&&<span className="text-base text-label-secondary"> / {targetRun}</span>}</p><p className="text-sm text-label-secondary">Corse registrate</p></div></div>}
  <div className="mt-3 grid grid-cols-7 gap-1">{days.map((day,i)=><button aria-label={`${day}: ${label(plan[i])}`} key={day} onClick={()=>{setDraft(plan);setPicker('week');}} className={`rounded-xl px-0.5 py-2 text-center ${i===weekday?'bg-accent-soft text-accent':'bg-fill text-label-secondary'}`}><span className="block text-xs font-semibold">{day.slice(0,3)}</span><span className="mt-1 block text-xs">{plan[i]?.kind==='gym'?'Gym':plan[i]?.kind==='run'?'Corsa':plan[i]?.kind==='rest'?'Rip.':'—'}</span></button>)}</div>
  <p className="mt-3 text-sm text-label-secondary">{next?`Prossima: ${format(next.date,'EEEE',{locale:it})} · ${label(next.p)}`:'Imposta la settimana per vedere la prossima seduta.'}</p>
 </section>
 {calendar}
 <section className="ios-card p-4" aria-label="Il tuo progresso"><h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="size-5 text-accent"/>Un passo avanti</h2>
 {unavailable?<p className="mt-3 text-sm text-label-secondary">Confronto non disponibile al momento.</p>:loading?<p className="mt-3 text-sm text-label-secondary">Cerco confronti…</p>:showRun&&runInsight?<><p className="mt-3 text-lg font-bold">Ripetute: media −{runInsight.delta.toFixed(1)} s</p><p className="mt-1 text-sm text-label-secondary">{runInsight.count} ripetute{runInsight.distance?` da ${runInsight.distance} m`:''}, con distanze e recuperi uguali alla seduta del {format(new Date(runInsight.previousDate),'d MMMM',{locale:it})}.</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent" to="/athletics">Apri le ripetute</Link></>:insight?<><p className="mt-3 text-lg font-bold">{insight.name}: +{insight.delta} kg</p><p className="mt-1 text-sm text-label-secondary">{insight.previous} → {insight.current} kg, sempre {insight.reps} ripetizioni. Confronto con il {format(new Date(insight.previousDate),'d MMMM',{locale:it})}, sullo stesso lato.</p><Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent" to="/sessions/$sessionId/summary" params={{sessionId:insight.sessionId}}>Scopri il confronto</Link></>:<><p className="mt-3 text-sm text-label-secondary">Nessun aumento di carico confrontabile nell’ultima seduta. I confronti usano lo stesso esercizio, lato e ripetizioni.</p><Link to="/workouts" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent">Apri le tue schede</Link></>}
 </section>
 <BottomSheet open={picker!==null} onClose={()=>setPicker(null)} title={picker==='week'?'Programma la settimana':'Allenamento di oggi'}>
  <div className="space-y-3">{draft.map((p,i)=><label key={i} className="block text-sm text-label-secondary">{picker==='week'?days[i]:'Scegli attività'}<select className={`${control} mt-1 w-full`} value={planValue(p)} onChange={e=>setDraft(old=>old.map((v,j)=>j===i?fromValue(e.target.value):v))}><option value="">Da scegliere</option><option value="run">Corsa</option><option value="rest">Riposo</option>{templates.data?.map(t=><option key={t.id} value={`gym:${t.id}`}>{t.name}</option>)}</select></label>)}</div><button disabled={savePlan.isPending||templates.isLoading} onClick={()=>savePlan.mutate()} className="ios-btn-primary mt-5 w-full">{savePlan.isPending?'Salvataggio…':'Salva programma'}</button>
 </BottomSheet>
 </>;
}
