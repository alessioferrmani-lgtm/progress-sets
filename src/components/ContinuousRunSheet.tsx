import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { BottomSheet } from "./BottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/profile-queries";
import { computeCaloriesForRace } from "@/lib/calories";
import { CONTINUOUS_RUN, parseRunDuration, runPace } from "@/lib/continuous-run";

export function ContinuousRunSheet({open,onClose}:{open:boolean;onClose:()=>void}) {
  const qc=useQueryClient();
  const profile=useQuery({queryKey:["profile"],queryFn:fetchMyProfile});
  const [date,setDate]=useState(()=>format(new Date(),"yyyy-MM-dd"));
  const [km,setKm]=useState("");const [duration,setDuration]=useState("");const [notes,setNotes]=useState("");
  const [error,setError]=useState("");
  const distance=Number(km.replace(",","."))*1000;
  const seconds=parseRunDuration(duration);
  const calories=profile.data&&seconds?computeCaloriesForRace(profile.data,{distance_m:distance,time_sec:seconds}):null;
  const save=useMutation({mutationFn:async()=>{
    if(!Number.isFinite(distance)||distance<=0||distance>1_000_000)throw new Error("Inserisci una distanza valida in km");
    if(!seconds)throw new Error("Inserisci la durata come minuti:secondi oppure ore:minuti:secondi");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Inserisci la data");
    const {data:u}=await supabase.auth.getUser();if(!u.user)throw new Error("Sessione scaduta");
    const {data:session,error:e}=await supabase.from("interval_sessions").insert({user_id:u.user.id,date,signature:CONTINUOUS_RUN,notes:notes.trim()||null,calories_burned:calories}).select("id").single();
    if(e)throw e;
    const {error:repError}=await supabase.from("interval_reps").insert({user_id:u.user.id,session_id:session.id,rep_number:1,distance_m:distance,time_sec:seconds,rest_sec:null});
    if(repError){await supabase.from("interval_sessions").delete().eq("id",session.id);throw repError;}
  },onSuccess:()=>{
    qc.invalidateQueries({queryKey:["interval_sessions"]});qc.invalidateQueries({queryKey:["dash"]});qc.invalidateQueries({queryKey:["performance_log"]});
    toast.success("Corsa salvata");setKm("");setDuration("");setNotes("");setError("");onClose();
  },onError:(e:Error)=>setError(e.message)});
  return <BottomSheet open={open} onClose={()=>{if(!save.isPending)onClose();}} title="Nuova corsa continua">
    <form className="mx-auto max-w-md space-y-4" onSubmit={e=>{e.preventDefault();setError("");save.mutate();}}>
      <label className="block text-sm text-label">Data<input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 block w-full rounded-xl bg-fill p-3 text-base" /></label>
      <label className="block text-sm text-label">Distanza (km)<input required inputMode="decimal" placeholder="es. 8,5" value={km} onChange={e=>setKm(e.target.value)} className="mt-1 block w-full rounded-xl bg-fill p-3 text-base" /></label>
      <label className="block text-sm text-label">Durata<input required inputMode="text" placeholder="42:30 oppure 1:05:20" value={duration} onChange={e=>setDuration(e.target.value)} className="mt-1 block w-full rounded-xl bg-fill p-3 text-base" /><span className="mt-1 block text-label-secondary">Minuti:secondi oppure ore:minuti:secondi</span></label>
      <div className="ios-card grid grid-cols-2 gap-3 p-4 text-center"><div className="text-sm text-label-secondary">Passo medio<strong className="mt-1 block text-lg text-label">{runPace(distance,seconds??0)}</strong></div><div className="text-sm text-label-secondary">Kcal stimate<strong className="mt-1 block text-lg text-label">{calories??"—"}</strong></div></div>
      <p className="text-sm text-label-secondary">Stima su terreno pianeggiante da peso e distanza.{!profile.data?.weight_kg&&" Inserisci il peso nel profilo per calcolare le kcal."}</p>
      <label className="block text-sm text-label">Note (facoltative)<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Percorso e sensazioni" className="mt-1 block w-full rounded-xl bg-fill p-3 text-base" /></label>
      {error&&<p role="alert" className="text-sm text-danger">{error}</p>}
      <button disabled={save.isPending} className="w-full rounded-full bg-accent py-3 text-base font-semibold text-accent-foreground disabled:opacity-50">{save.isPending?"Salvataggio…":"Salva corsa"}</button>
    </form>
  </BottomSheet>;
}
