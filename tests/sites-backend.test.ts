import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { executeQuery } from "../sites/query-engine.ts";
import { handleApi } from "../sites/api.ts";
import type { SitesQuery } from "../src/integrations/sites/query.ts";
import type { DatabaseBinding } from "../sites/database.ts";
import { importProgress } from "../sites/progress-import.ts";

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort()) sqlite.exec(readFileSync(`drizzle/${file}`,"utf8"));
  const db: DatabaseBinding = {
    prepare(sql:string) {
      let values:any[]=[];
      return {
        bind(...args:any[]){values=args;return this;},
        async all(){return {results:sqlite.prepare(sql).all(...values) as any[]};},
        async first(){return sqlite.prepare(sql).get(...values) as any??null;},
        async run(){return sqlite.prepare(sql).run(...values);},
      };
    },
    async batch(statements:any[]){
      sqlite.exec("BEGIN");
      try{const results=[];for(const statement of statements) results.push(await statement.all());sqlite.exec("COMMIT");return results;}
      catch(error){sqlite.exec("ROLLBACK");throw error;}
    },
  };
  const query=(table:string,patch:Partial<SitesQuery>={},uid="alice")=>executeQuery(db,uid,{table,action:"select",columns:"*",filters:[],orders:[],...patch});
  const insert=(table:string,payload:any,uid="alice")=>query(table,{action:"insert",payload,returning:true,single:"one"},uid);
  const api=async(path:string,body?:unknown,uid:string|null="alice",origin="https://progress.test")=>{
    const headers:Record<string,string>={};
    if(uid){headers["oai-authenticated-user-id"]=uid;headers["oai-authenticated-user-email"]=`${uid}@example.test`;}
    if(body!==undefined){headers["Content-Type"]="application/json";headers["X-Progress-Sets"]="1";headers.Origin=origin;}
    return handleApi(new Request(`https://progress.test/api/sites/${path}`,{method:body===undefined?"GET":"POST",headers,body:body===undefined?undefined:JSON.stringify(body)}),{DB:db});
  };
  return {sqlite,db,query,insert,api};
}
const eq=(column:string,value:unknown)=>({column,op:"eq" as const,value});

test("Sites: accesso e catalogo completo senza dipendere da Supabase",async()=>{
  const {api,query}=setup();
  assert.equal((await api("query",{table:"profiles"},null)).status,401);
  assert.equal((await (await api("auth",undefined,null)).json()).data.user,null);
  const auth=await (await api("auth")).json();assert.equal(auth.data.user.id,"alice");
  assert.equal((await query("exercises")).data.length,567);
  assert.equal((await query("test_types")).data.length,15);
  await api("auth");assert.equal((await query("exercises")).data.length,567);
  assert.equal((await query("profiles")).data[0].display_name,"alice");
});
test("Sites: ogni query, join e modifica è isolata per utente",async()=>{
  const {query,insert}=setup();
  const a=(await insert("workout_templates",{name:"Alice"})).data;
  const b=(await insert("workout_templates",{name:"Bob"},"bob")).data;
  assert.deepEqual((await query("workout_templates",{columns:"name"})).data,[{name:"Alice"}]);
  assert.equal((await query("workout_templates",{action:"update",payload:{name:"Hacked"},filters:[eq("id",b.id)],returning:true})).data.length,0);
  assert.equal((await query("workout_templates",{action:"delete",filters:[eq("id",b.id)],returning:true})).data.length,0);
  await assert.rejects(()=>insert("workout_templates",{name:"Bad",user_id:"bob"}),/Accesso non consentito/);
  await assert.rejects(()=>insert("workout_sessions",{template_id:b.id}),/record collegato/);
  const session=(await insert("workout_sessions",{template_id:a.id})).data;
  assert.deepEqual((await query("workout_sessions",{columns:"id,template:workout_templates(name)"})).data,[{id:session.id,template:{name:"Alice"}}]);
  assert.equal((await query("workout_sessions",{},"bob")).data.length,0);
});
test("Sites: due avvii paralleli non creano doppioni; serie e ripristino conservano il timer",async()=>{
  const {query,insert}=setup();
  const exercise=(await insert("exercises",{name:"Squat"})).data;
  const session=(await insert("workout_sessions",{started_at:"2026-09-27T10:00:00Z"})).data;
  await assert.rejects(()=>insert("workout_sessions",{}),/UNIQUE/);
  const set=(await insert("logged_sets",{session_id:session.id,exercise_id:exercise.id,set_number:1,weight_kg:50,reps:8})).data;
  await assert.rejects(()=>insert("logged_sets",{session_id:session.id,exercise_id:exercise.id,set_number:1,weight_kg:50,reps:8}),/UNIQUE/);
  const rows=await query("logged_sets",{columns:"id,weight_kg,reps,exercise:exercises(name),workout_sessions!inner(user_id,started_at)",filters:[eq("workout_sessions.user_id","alice")]});
  assert.equal(rows.data[0].workout_sessions.started_at,"2026-09-27T10:00:00.000Z");
  assert.equal(rows.data[0].exercise.name,"Squat");
  await query("logged_sets",{action:"update",payload:{reps:9},filters:[eq("id",set.id)]});
  await query("workout_sessions",{action:"update",payload:{ended_at:"2026-09-27T12:00:00Z"},filters:[eq("id",session.id)]});
  const count=await query("logged_sets",{columns:"id",count:"exact",head:true});assert.equal(count.count,1);
  assert.equal((await query("logged_sets")).data[0].reps,9);
  assert.equal((await query("workout_sessions")).data.length,1);
  await insert("workout_sessions",{});
});
test("Sites: un inserimento multiplo fallito viene annullato completamente",async()=>{
  const {query,insert}=setup();
  const e=(await insert("exercises",{name:"Squat"})).data;
  const s=(await insert("workout_sessions",{})).data;
  const row={session_id:s.id,exercise_id:e.id,set_number:1,reps:8,weight_kg:30};
  await assert.rejects(()=>query("logged_sets",{action:"insert",payload:[row,row]}),/UNIQUE/);
  assert.equal((await query("logged_sets")).data.length,0);
});
test("Sites: catalogo condiviso in sola lettura e riferimenti privati protetti",async()=>{
  const {query,insert,api}=setup();await api("auth");
  const e=(await query("exercises",{limit:1})).data[0];
  assert.equal((await query("exercises",{action:"update",payload:{name:"Hacked"},filters:[eq("id",e.id)],returning:true})).data.length,0);
  const other=(await insert("exercises",{name:"Privato"},"bob")).data;
  const s=(await insert("workout_sessions",{})).data;
  await assert.rejects(()=>insert("logged_sets",{session_id:s.id,exercise_id:other.id,set_number:1}),/record collegato/);
});
test("Sites: peso, test, gare e ripetute aggiornano lo storico e le prestazioni",async()=>{
  const {query,insert,api}=setup();await api("auth");
  await query("profiles",{action:"upsert",payload:{weight_kg:80},onConflict:"user_id"});
  await query("profiles",{action:"upsert",payload:{weight_kg:80},onConflict:"user_id"});
  await query("profiles",{action:"upsert",payload:{weight_kg:79.5},onConflict:"user_id"});
  assert.equal((await query("weight_logs")).data.length,2);
  const t=(await insert("tests",{test_type_id:"test-400",time_sec:52,date:"2026-09-27"})).data;
  const r=(await insert("races",{name:"Gara",distance_m:400,time_sec:51,date:"2026-09-27"})).data;
  const s=(await insert("interval_sessions",{date:"2026-09-27"})).data;
  await insert("interval_reps",{session_id:s.id,rep_number:1,distance_m:200,time_sec:25});
  assert.equal((await query("performance_log")).data.length,3);
  const joined=await query("interval_sessions",{columns:"id,interval_reps(id,distance_m,time_sec)"});assert.equal(joined.data[0].interval_reps.length,1);
  await query("tests",{action:"update",payload:{time_sec:50},filters:[eq("id",t.id)]});
  assert.equal((await query("performance_log",{filters:[eq("source","TEST")]})).data[0].time_sec,50);
  await query("tests",{action:"delete",filters:[eq("id",t.id)]});
  await query("races",{action:"delete",filters:[eq("id",r.id)]});
  await query("interval_sessions",{action:"delete",filters:[eq("id",s.id)]});
  assert.equal((await query("performance_log")).data.length,0);
});
test("Sites: routine persistenti per account e protezione CSRF",async()=>{
  const {api}=setup();const value=[{id:"r1",name:"Pre-gara",drillIds:["a-skip"],createdAt:"2026-09-27"}];
  assert.equal((await api("preferences",{key:"running-routines",value})).status,200);
  assert.deepEqual((await (await api("preferences?key=running-routines")).json()).data,value);
  assert.equal((await (await api("preferences?key=running-routines",undefined,"bob")).json()).data,null);
  assert.equal((await api("preferences",{key:"running-routines",value:[]},"alice","https://evil.test")).status,403);
  assert.deepEqual((await (await api("preferences?key=running-routines")).json()).data,value);
});
test("Sites: le query rifiutano SQL arbitrario e dati invalidi senza mutazioni",async()=>{
  const {query,insert}=setup();
  await assert.rejects(()=>query('profiles; DROP TABLE profiles'),/Tabella/);
  await assert.rejects(()=>query('profiles',{columns:'user_id);DROP TABLE profiles;--'}),/non valida|disponibile/);
  await assert.rejects(()=>insert('workout_sessions',{started_at:'oggi'}),/Data non valida/);
  await assert.rejects(()=>insert('workout_templates',{name:'ok',secret:'x'}),/Campo/);
  assert.equal((await query('workout_templates')).data.length,0);
});

function backupFixture() {
  return {application:"Progress Sets",schema_version:1,export_complete:true,export_warnings:[],
    profile:{user_id:"old-user",weight_kg:80,display_name:"Atleta"},
    weight_history:[{id:"w",user_id:"old-user",weight_kg:80,logged_at:"2026-01-01T10:00:00Z"}],
    gym:{programs:[{id:"p",name:"Programma",duration_weeks:4,current_week:3}],
      exercises:[{id:"e",name:"Squat",is_default:true,user_id:null}],
      templates:[{id:"t",name:"Seduta A",program_id:"p",program_week:3,session_key:"A"}],
      template_exercises:[{id:"te",template_id:"t",exercise_id:"e",target_sets:2,target_reps:6}],
      sessions:[{id:"s",template_id:"t",started_at:"2026-01-01T10:00:00Z",ended_at:"2026-01-01T12:00:00Z",calories_burned:400},{id:"empty",started_at:"2026-01-01T12:00:01Z",ended_at:"2026-01-01T12:00:03Z"}],
      logged_sets:[{id:"a",session_id:"s",exercise_id:"e",set_number:1,weight_kg:60,reps:6,completed_at:"2026-01-01T10:05:00Z"},{id:"b",session_id:"s",exercise_id:"e",set_number:1,weight_kg:60,reps:6,completed_at:"2026-01-01T10:05:00.050Z"}]},
    athletics:{test_types:[],tests:[],races:[],interval_sessions:[],interval_reps:[],performance_log:[]}};
}

test("Sites: misure SX/DX, secondi e metri persistono senza volume fittizio",async()=>{
  const {query,insert}=setup();
  const e=(await insert("exercises",{name:"Side plank"})).data;
  const t=(await insert("workout_templates",{name:"Unilaterale"})).data;
  await insert("template_exercises",{template_id:t.id,exercise_id:e.id,is_unilateral:true,reps_type:"time",target_sets:3});
  assert.equal((await query("template_exercises")).data[0].is_unilateral,true);
  const s=(await insert("workout_sessions",{template_id:t.id})).data;
  for(const [set_number,side,duration_sec] of [[1,"left",30.5],[2,"right",28.7]] as const)
    await insert("logged_sets",{session_id:s.id,exercise_id:e.id,set_number,side,reps_type:"time",duration_sec,reps:0,weight_kg:10});
  const sets=(await query("logged_sets",{orders:[{column:"set_number",ascending:true}]})).data;
  assert.deepEqual(sets.map((r:any)=>[r.side,r.duration_sec,r.reps]),[["left",30.5,0],["right",28.7,0]]);
  assert.equal(sets.reduce((n:number,r:any)=>n+r.weight_kg*r.reps,0),0);
  assert.equal((await query("logged_sets",{},"bob")).data.length,0);
  await query("logged_sets",{action:"update",payload:{duration_sec:32.4},filters:[eq("id",sets[0].id)]});
  assert.equal((await query("logged_sets",{filters:[eq("id",sets[0].id)]})).data[0].duration_sec,32.4);
  await assert.rejects(()=>insert("logged_sets",{session_id:s.id,exercise_id:e.id,set_number:3,reps_type:"time",duration_sec:30,reps:30}),/tempo/);
  await assert.rejects(()=>insert("logged_sets",{session_id:s.id,exercise_id:e.id,set_number:3,side:"wrong"}),/Valore/);
});

test("Sites: il backup mantiene le nuove unità e rifiuta durate discordanti",async()=>{
  const {db,query}=setup();const backup:any=backupFixture();
  backup.gym.template_exercises[0].is_unilateral=true;
  backup.gym.logged_sets=backup.gym.logged_sets.map((r:any,i:number)=>({...r,set_number:i+1,side:i?"right":"left",reps_type:"time",reps:0,duration_sec:i?31:30}));
  await importProgress(db,"alice",{backup,skipEmpty:true,preview:false});
  const sets=(await query("logged_sets")).data;
  assert.equal(sets.length,2);assert.deepEqual(sets.map((r:any)=>r.duration_sec).sort(),[30,31]);
  const conflicting=structuredClone(backup);conflicting.gym.logged_sets[1].set_number=1;
  await assert.rejects(()=>importProgress(db,"alice",{backup:conflicting,skipEmpty:true,preview:true}),/diversi/);
});
test("Import: anteprima senza scritture, copia atomica, proprietà e storico peso",async()=>{
  const {db,query,api}=setup(); await api("auth");
  const backup=backupFixture(); const original=JSON.stringify(backup);
  const preview=await importProgress(db,"alice",{backup,skipEmpty:true,preview:true});
  assert.equal(preview.skippedEmpty,1);assert.equal(preview.duplicateSets,1);
  assert.equal((await query("workout_templates")).data.length,0);
  assert.equal(JSON.stringify(backup),original);
  await importProgress(db,"alice",{backup,skipEmpty:true,preview:false});
  assert.equal((await query("workout_sessions")).data.length,1);
  assert.equal((await query("logged_sets")).data.length,1);
  assert.equal((await query("weight_logs")).data.length,1);
  assert.equal((await query("weight_logs")).data[0].logged_at,"2026-01-01T10:00:00.000Z");
  assert.equal((await query("profiles")).data[0].weight_kg,80);
  assert.equal((await query("profiles")).data[0].display_name,"alice"); // preserve existing values
  assert.equal((await query("training_programs")).data[0].current_week,3);
  assert.equal((await query("workout_sessions")).data[0].calories_burned,400);
  assert.equal((await query("workout_sessions",{},"bob")).data.length,0);
  const result=await importProgress(db,"alice",{backup,skipEmpty:true,preview:false});
  assert.equal(result.alreadyImported,true);
  assert.equal((await query("logged_sets")).data.length,1);
  await importProgress(db,"bob",{backup,skipEmpty:true,preview:false});
  assert.equal((await query("workout_sessions",{},"bob")).data.length,1);
  assert.notEqual((await query("workout_sessions")).data[0].id,(await query("workout_sessions",{},"bob")).data[0].id);
});
test("Import: replay con data esportazione diversa non duplica e i programmi mancanti restano visibili",async()=>{
  const {db,query}=setup();const backup:any=backupFixture();delete backup.gym.programs;
  const result=await importProgress(db,"alice",{backup,skipEmpty:false,preview:false});
  assert.equal(result.counts.workout_sessions,2);
  assert.equal((await query("training_programs")).data[0].name,"Programma importato");
  backup.exported_at="2026-02-01T10:00:00Z";
  await importProgress(db,"alice",{backup,skipEmpty:false,preview:false});
  assert.equal((await query("workout_sessions")).data.length,2);
  assert.equal((await query("weight_logs")).data.length,1);
});
test("Import: backup incompleti, riferimenti estranei e serie discordanti non scrivono nulla",async()=>{
  const {db,query,api}=setup();
  assert.equal((await api("import",{backup:backupFixture(),skipEmpty:true,preview:false},null)).status,401);
  assert.equal((await api("import",{backup:backupFixture(),skipEmpty:true,preview:false},"alice","https://evil.test")).status,403);
  const incomplete=backupFixture();incomplete.export_complete=false;
  await assert.rejects(()=>importProgress(db,"alice",{backup:incomplete,skipEmpty:true,preview:false}),/incompleto/);
  const mismatch=backupFixture();mismatch.gym.logged_sets[1].weight_kg=70;
  await assert.rejects(()=>importProgress(db,"alice",{backup:mismatch,skipEmpty:true,preview:false}),/diversi/);
  const missing=backupFixture();missing.gym.logged_sets[0].exercise_id="another-user-exercise";
  await assert.rejects(()=>importProgress(db,"alice",{backup:missing,skipEmpty:true,preview:false}),/record collegato/);
  assert.equal((await query("profiles")).data.length,0);
  assert.equal((await query("workout_sessions")).data.length,0);
});
test("Import: un vincolo fallito annulla anche profilo e schede",async()=>{
  const {db,query,insert}=setup();await insert("workout_sessions",{});
  const backup:any=backupFixture();backup.gym.sessions[0].ended_at=null;backup.gym.sessions[0].template_id=null;
  await assert.rejects(()=>importProgress(db,"alice",{backup,skipEmpty:true,preview:false}),/UNIQUE/);
  assert.equal((await query("profiles")).data.length,0);
  assert.equal((await query("workout_templates")).data.length,0);
  assert.equal((await query("workout_sessions")).data.length,1);
});
