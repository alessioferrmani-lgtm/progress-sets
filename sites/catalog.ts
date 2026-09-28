import catalog from "./catalog-data.json" with { type: "json" };
import type { DatabaseBinding } from "./database.ts";
export async function ensureCatalog(db: DatabaseBinding) {
  const existing=await db.prepare("SELECT value FROM app_meta WHERE key = ?").bind("catalog-v1").first();
  if(existing)return;
  for(let i=0;i<catalog.length;i+=40){
    await db.batch(catalog.slice(i,i+40).map(row=>db.prepare("INSERT OR IGNORE INTO exercises (id,name,muscle_group,equipment,category,is_default) VALUES (?,?,?,?,?,1)").bind(row.id,row.name,row.muscle_group,row.equipment,row.category)));
  }
  await db.batch([50,60,80,100,110,120,150,200,300,400,500,600,1000,1500].map(distance=>db.prepare("INSERT OR IGNORE INTO test_types (id,name,result_type,distance_m,is_custom) VALUES (?,?,'TIME',?,0)").bind(`test-${distance}`,`${distance} metri`,distance)));
  await db.prepare("INSERT OR IGNORE INTO test_types (id,name,result_type,duration_sec,is_custom) VALUES ('test-cooper','Cooper Test','DISTANCE',720,0)").run();
  await db.prepare("INSERT OR IGNORE INTO app_meta (key,value) VALUES (?,?)").bind("catalog-v1","1").run();
}
