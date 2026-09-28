import { getTableColumns } from "drizzle-orm";
import * as schema from "../db/schema.ts";
import type { SitesQuery, Filter } from "../src/integrations/sites/query.ts";
import type { DatabaseBinding, Row } from "./database.ts";

const tables = {
  profiles:schema.profiles,weight_logs:schema.weightLogs,exercises:schema.exercises,training_programs:schema.programs,
  workout_templates:schema.templates,template_exercises:schema.templateExercises,workout_sessions:schema.sessions,
  logged_sets:schema.loggedSets,test_types:schema.testTypes,tests:schema.tests,races:schema.races,
  interval_sessions:schema.intervalSessions,interval_reps:schema.intervalReps,performance_log:schema.performanceLog,
};
export type TableName = keyof typeof tables;
const shared = new Set(["exercises","test_types"]);
const refs: Record<string, Record<string, TableName>> = {
  workout_templates:{program_id:"training_programs"},template_exercises:{template_id:"workout_templates",exercise_id:"exercises"},
  workout_sessions:{template_id:"workout_templates"},logged_sets:{session_id:"workout_sessions",exercise_id:"exercises"},
  tests:{test_type_id:"test_types"},interval_reps:{session_id:"interval_sessions"},
};
export class QueryError extends Error { code: string; status: number; constructor(message: string, code="INVALID_QUERY", status=400) { super(message); this.code=code; this.status=status; } }
const bad = (message: string): never => { throw new QueryError(message); };
function tableName(value: unknown): TableName { return typeof value==="string" && Object.hasOwn(tables,value) ? value as TableName : bad("Tabella non disponibile"); }
function columns(table: TableName): Record<string, {dataType: string; notNull: boolean}> { return getTableColumns(tables[table]); }
function column(table: TableName, value: string) { return Object.hasOwn(columns(table),value) ? `"${value}"` : bad("Campo non disponibile"); }
function scope(table: TableName, write=false) { return !write && shared.has(table) ? "(user_id = ? OR user_id IS NULL)" : "user_id = ?"; }
function sqlValue(value: unknown): string | number | null {
  if (value===null) return null;
  if (typeof value==="boolean") return value ? 1 : 0;
  if (typeof value==="number" && Number.isFinite(value)) return value;
  if (typeof value==="string" && value.length<=50_000) return value;
  return bad("Valore non valido");
}
function where(table: TableName, uid: string, filters: Filter[], write=false) {
  const parts=[scope(table,write)]; const values: unknown[]=[uid];
  for (const filter of filters) {
    if (!filter || typeof filter.column!=="string") bad("Filtro non valido");
    if (filter.column==="workout_sessions.user_id" && table==="logged_sets" && filter.op==="eq") {
      parts.push("session_id IN (SELECT id FROM workout_sessions WHERE user_id = ?)"); values.push(sqlValue(filter.value)); continue;
    }
    const field=column(table,filter.column);
    if (filter.op==="in") {
      if (!Array.isArray(filter.value) || filter.value.length>10000) bad("Filtro troppo grande");
      parts.push(`${field} IN (SELECT value FROM json_each(?))`); values.push(JSON.stringify((filter.value as unknown[]).map(sqlValue))); continue;
    }
    if (filter.op==="is") {
      if (filter.value!==null && typeof filter.value!=="boolean") bad("Filtro non valido");
      parts.push(`${field} IS ?`); values.push(sqlValue(filter.value)); continue;
    }
    const ops={eq:"=",neq:"!=",gte:">=",gt:">",lte:"<=",lt:"<",ilike:"LIKE"};
    const op=ops[filter.op as keyof typeof ops]; if (!op) bad("Operatore non disponibile");
    parts.push(`${field} ${op} ?${filter.op==="ilike" ? " COLLATE NOCASE" : ""}`); values.push(sqlValue(filter.value));
  }
  return { text:parts.join(" AND "),values };
}
function normalize(table: TableName, row: Row) {
  const result={...row};
  for (const [key,meta] of Object.entries(columns(table))) { if(meta.dataType==="boolean" && result[key]!=null) result[key]=!!result[key]; }
  return result;
}
export function validateRow(table: TableName, raw: unknown, uid: string, update=false): Row {
  if (!raw || typeof raw!=="object" || Array.isArray(raw)) return bad("Dati non validi");
  const row: Row={}; const definitions=columns(table);
  for(const [key,value] of Object.entries(raw)) {
    column(table,key);
    if(value===undefined) continue;
    if(key==="user_id") { if(value!=null && value!==uid) throw new QueryError("Accesso non consentito","FORBIDDEN",403); continue; }
    if(update && (key==="id" || key==="created_at")) bad("Identificativo non modificabile");
    const meta=definitions[key as keyof typeof definitions];
    if(value===null) { if(meta.notNull) bad(`Il campo ${key} è obbligatorio`); row[key]=null; continue; }
    if(meta.dataType==="number" && (typeof value!=="number" || !Number.isFinite(value) || Math.abs(value)>1e9)) bad(`Numero non valido: ${key}`);
    if(meta.dataType==="string" && typeof value!=="string") bad(`Testo non valido: ${key}`);
    if(meta.dataType==="boolean" && typeof value!=="boolean") bad(`Valore non valido: ${key}`);
    if(typeof value==="string" && (value.length>20000 || (key==="name" && (!value.trim() || value.length>250)))) bad(`Testo non valido: ${key}`);
    row[key]=sqlValue(value);
  }
  row.user_id=uid;
  if(!update && table!=="profiles") row.id ??=crypto.randomUUID();
  if(table==="exercises") row.is_default=0;
  if(table==="test_types") row.is_custom=1;
  if(Object.hasOwn(definitions,"updated_at")) row.updated_at=new Date().toISOString();
  for(const field of ["weight_kg","target_weight_kg","reps","target_reps","rest_seconds","rest_sec","rest_taken_sec","calories_burned","order_index"]) if(row[field]!=null && row[field]<0) bad(`Il campo ${field} non può essere negativo`);
  for(const field of ["set_number","target_sets","rep_number","current_week","duration_weeks","program_week"]) if(row[field]!=null && (!Number.isInteger(row[field]) || row[field]<1 || row[field]>1000)) bad(`Valore non valido: ${field}`);
  const enums: Record<string,string[]>={sex:["M","F","O"],activity_level:["sedentary","light","moderate","high","athlete"],result_type:["TIME","DISTANCE"],reps_type:["count","time","distance","unspecified"]};
  for(const [field,allowed] of Object.entries(enums)) if(row[field]!=null && !allowed.includes(row[field])) bad(`Valore non valido: ${field}`);
  for(const field of ["started_at","ended_at","completed_at","created_at","logged_at"]) if(row[field]!=null) {
    if(!Number.isFinite(Date.parse(row[field]))) bad(`Data non valida: ${field}`);
    row[field]=new Date(row[field]).toISOString();
  }
  for(const field of ["date","start_date","date_of_birth"]) if(row[field]!=null && !/^\d{4}-\d{2}-\d{2}$/.test(row[field])) bad(`Data non valida: ${field}`);
  if(table==="profiles" && row.weight_kg!=null && (row.weight_kg<20 || row.weight_kg>500)) bad("Peso non valido");
  return row;
}
async function validateReferences(db: DatabaseBinding,table:TableName,row:Row,uid:string) {
  for(const [field,parent] of Object.entries(refs[table]??{})) {
    if(row[field]==null) continue;
    const found=await db.prepare(`SELECT id FROM "${parent}" WHERE id = ? AND ${scope(parent)}`).bind(row[field],uid).first();
    if(!found) throw new QueryError("Il record collegato non esiste o non appartiene al tuo account","FORBIDDEN",403);
  }
}
function splitSelection(value: string) {
  const out:string[]=[];let depth=0;let start=0;
  for(let i=0;i<value.length;i++){ if(value[i]==="(")depth++; if(value[i]===")")depth--; if(depth<0||depth>2)bad("Selezione non valida"); if(value[i]===","&&depth===0){out.push(value.slice(start,i).trim());start=i+1;} }
  if(depth!==0)bad("Selezione non valida");out.push(value.slice(start).trim());return out;
}
async function project(db:DatabaseBinding,table:TableName,rows:Row[],selection:string,uid:string,depth=0):Promise<Row[]> {
  if(depth>2)bad("Selezione troppo profonda");
  const out=rows.map(()=>({} as Row));
  for(const part of splitSelection(selection)) {
    if(part==="*"){rows.forEach((row,i)=>Object.assign(out[i],normalize(table,row)));continue;}
    if(!part.includes("(")){column(table,part);rows.forEach((row,i)=>out[i][part]=normalize(table,row)[part]);continue;}
    const match=/^(?:(\w+):)?(\w+)(!inner)?\((.+)\)$/.exec(part);if(!match)bad("Relazione non disponibile");
    const [,alias,relation,,fields]=match!;const parent=tableName(relation);const key=alias||relation;
    const foreign=Object.entries(refs[table]??{}).find(([,t])=>t===parent)?.[0];
    const reverse=table==="interval_sessions" && parent==="interval_reps";
    if(!foreign&&!reverse)bad("Relazione non disponibile");
    const ids=[...new Set(rows.map(row=>reverse?row.id:row[foreign!]).filter(Boolean))];
    let related:Row[]=[];
    if(ids.length){const r=await db.prepare(`SELECT * FROM "${parent}" WHERE ${scope(parent)} AND ${reverse?"session_id":"id"} IN (SELECT value FROM json_each(?))`).bind(uid,JSON.stringify(ids)).all();related=r.results;}
    const projected=await project(db,parent,related,fields,uid,depth+1);
    rows.forEach((row,i)=>{
      if(reverse)out[i][key]=related.flatMap((r,j)=>r.session_id===row.id?[projected[j]]:[]);
      else {const index=related.findIndex(r=>r.id===row[foreign!]);out[i][key]=index<0?null:projected[index];}
    });
  }
  return out;
}
export async function executeQuery(db:DatabaseBinding,uid:string,input:SitesQuery) {
  const table=tableName(input?.table);const action=input.action;
  if(!["select","insert","update","delete","upsert"].includes(action))bad("Operazione non disponibile");
  if(!Array.isArray(input.filters)||input.filters.length>30||!Array.isArray(input.orders)||input.orders.length>5)bad("Query non valida");
  const selection=input.columns??"*";if(typeof selection!=="string"||selection.length>2000)bad("Selezione non valida");
  await project(db,table,[],selection,uid);
  const limit=input.limit??10000;if(!Number.isInteger(limit)||limit<0||limit>10000)bad("Limite non valido");
  let rows:Row[]=[];let count:number|null=null;
  const w=where(table,uid,input.filters,action!=="select");
  if(action==="select") {
    const order=input.orders.map(o=>`${column(table,o.column)} ${o.ascending===false?"DESC":"ASC"} NULLS ${o.nullsFirst?"FIRST":"LAST"}`).join(",");
    if(input.count){ const r=await db.prepare(`SELECT COUNT(*) AS n FROM "${table}" WHERE ${w.text}`).bind(...w.values).first();count=Number(r?.n??0); }
    if(!input.head){const r=await db.prepare(`SELECT * FROM "${table}" WHERE ${w.text}${order?` ORDER BY ${order}`:""} LIMIT ?`).bind(...w.values,limit+1).all(); rows=r.results;
      if(rows.length>limit){if(input.limit==null)throw new QueryError("Troppi dati: riduci l’intervallo prima di esportare","RESULT_TOO_LARGE");rows=rows.slice(0,limit);}
    }
  } else {
    if(table==="performance_log" && action!=="delete")bad("Le prestazioni sono calcolate automaticamente");
    if(table==="weight_logs")bad("Aggiorna il peso dal profilo");
    if(action==="insert"||action==="upsert") {
      if(action==="upsert" && (table!=="profiles"||input.onConflict!=="user_id"))bad("Aggiornamento non supportato");
      const payload=Array.isArray(input.payload)?input.payload:[input.payload];if(!payload.length||payload.length>500)bad("Numero di record non valido");
      const normalized=payload.map(v=>validateRow(table,v,uid));
      for(const row of normalized)await validateReferences(db,table,row,uid);
      const statements=normalized.map(row=>{
        const keys=Object.keys(row);const updates=keys.filter(k=>k!=="user_id"&&k!=="created_at").map(k=>`"${k}"=excluded."${k}"`).join(",");
        return db.prepare(`INSERT INTO "${table}" (${keys.map(k=>column(table,k)).join(",")}) VALUES (${keys.map(()=>"?").join(",")})${action==="upsert"?` ON CONFLICT(user_id) DO UPDATE SET ${updates}`:""} RETURNING *`).bind(...keys.map(k=>row[k]));
      });
      const results=await db.batch(statements);rows=results.flatMap(r=>r.results);
    } else {
      if(input.filters.length===0)bad("Seleziona prima i record da modificare");
      if(action==="delete") {
        const r=await db.prepare(`DELETE FROM "${table}" WHERE ${w.text} RETURNING *`).bind(...w.values).all();rows=r.results;
      }else{
        const row=validateRow(table,input.payload,uid,true);await validateReferences(db,table,row,uid);
        const keys=Object.keys(row).filter(k=>k!=="user_id");if(!keys.length)bad("Nessuna modifica");
        const r=await db.prepare(`UPDATE "${table}" SET ${keys.map(k=>`${column(table,k)} = ?`).join(",")} WHERE ${w.text} RETURNING *`).bind(...keys.map(k=>row[k]),...w.values).all();rows=r.results;
      }
    }
  }
  const projected=await project(db,table,rows,selection,uid);
  if(input.single){
    if(projected.length>1 || (input.single==="one"&&projected.length!==1))throw new QueryError("Record non trovato o risultato non univoco","PGRST116",404);
    return {data:projected[0]??null,error:null,count};
  }
  return {data:input.head|| (action!=="select"&&!input.returning)?null:projected,error:null,count};
}
