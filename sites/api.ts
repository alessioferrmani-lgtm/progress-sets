import { database, type DatabaseBinding } from "./database.ts";
import { executeQuery, QueryError } from "./query-engine.ts";
import { ensureCatalog } from "./catalog.ts";
export type Env = { DB?: DatabaseBinding; ASSETS?: {fetch(request: Request): Promise<Response>}; };
function json(value:unknown,status=200) { return new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}}); }
export function readIdentity(request:Request) {
  const id=request.headers.get("oai-authenticated-user-id");
  const email=request.headers.get("oai-authenticated-user-email");
  if(!id||!email)return null;
  let name=request.headers.get("oai-authenticated-user-full-name")??"";
  if(request.headers.get("oai-authenticated-user-full-name-encoding")==="percent-encoded-utf-8") { try{name=decodeURIComponent(name);}catch{name="";} }
  return {id,email,user_metadata:{full_name:name||email.split("@")[0]},app_metadata:{provider:"chatgpt"}};
}
function preferenceKey(key:unknown):string {
  if(typeof key!=="string"||!(key==="running-routines"||key==="warmup-drills"||/^warmup-\d{4}-\d{2}-\d{2}$/.test(key)))throw new QueryError("Preferenza non valida");
  return key;
}
export async function handleApi(request:Request,env:Env) {
  try{
    const url=new URL(request.url); const path=url.pathname;
    if(request.method!=="GET"&&request.method!=="POST")return json({error:{message:"Metodo non consentito"}},405);
    // Never accept cross-origin mutations. A custom header also prevents form POST CSRF.
    if(request.method==="POST" && (request.headers.get("X-Progress-Sets")!=="1" || !request.headers.get("Content-Type")?.startsWith("application/json") || (request.headers.has("Origin")&&request.headers.get("Origin")!==url.origin)))return json({error:{message:"Richiesta non autorizzata"}},403);
    const user=readIdentity(request);
    if(path==="/api/sites/auth"&&request.method==="GET") {
      if(!user)return json({data:{user:null},error:null});
      const db=database(env);await ensureCatalog(db);
      await db.prepare("INSERT OR IGNORE INTO profiles (user_id,display_name) VALUES (?,?)").bind(user.id,user.user_metadata.full_name).run();
      return json({data:{user},error:null});
    }
    if(!user)return json({data:null,error:{message:"Accedi con ChatGPT per continuare",code:"UNAUTHENTICATED"}},401);
    const db=database(env);
    if(path==="/api/sites/preferences"&&request.method==="GET") {
      const key=preferenceKey(url.searchParams.get("key"));
      const row=await db.prepare("SELECT value FROM preferences WHERE user_id=? AND key=?").bind(user.id,key).first();
      return json({data:row?JSON.parse(row.value):null,error:null});
    }
    if(request.method!=="POST")return json({error:{message:"Non trovato"}},404);
    if(Number(request.headers.get("Content-Length")??0)>1_000_000)throw new QueryError("Richiesta troppo grande");
    const raw=await request.text();if(raw.length>1_000_000)throw new QueryError("Richiesta troppo grande");
    let body:any;try{body=JSON.parse(raw);}catch{throw new QueryError("Dati non validi");}
    if(path==="/api/sites/query")return json(await executeQuery(db,user.id,body));
    if(path==="/api/sites/preferences") {
      const key=preferenceKey(body?.key);const value=JSON.stringify(body.value);
      if(value===undefined||value.length>100_000)throw new QueryError("Routine troppo grande");
      await db.prepare("INSERT INTO preferences (id,user_id,key,value) VALUES (?,?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')").bind(crypto.randomUUID(),user.id,key,value).run();
      return json({data:body.value,error:null});
    }
    return json({error:{message:"Non trovato"}},404);
  }catch(error){
    if(error instanceof QueryError)return json({data:null,error:{message:error.message,code:error.code}},error.status);
    const message=error instanceof Error?error.message:String(error);
    if(/UNIQUE constraint failed/i.test(message))return json({data:null,error:{message:"Questo elemento è già stato salvato",code:"23505"}},409);
    if(/FOREIGN KEY constraint|NOT NULL constraint|CHECK constraint/i.test(message))return json({data:null,error:{message:"Controlla i dati inseriti e riprova",code:"VALIDATION_ERROR"}},400);
    console.error("Sites API error",error);
    return json({data:null,error:{message:"Salvataggio non disponibile. Nessun dato è stato confermato: riprova.",code:"SERVICE_UNAVAILABLE"}},503);
  }
}
