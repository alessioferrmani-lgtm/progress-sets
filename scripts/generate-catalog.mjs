import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const exercises = new Map();
for (const file of readdirSync('supabase/migrations').sort()) {
  const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
  for (const match of sql.matchAll(/INSERT INTO public\.exercises\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi)) {
    const columns = match[1].split(',').map(x => x.trim());
    for (const values of match[2].matchAll(/\((('(?:[^']|'')*'|true|false|NULL)\s*,?\s*)+\)/g)) {
      const cells = [...values[0].matchAll(/'((?:[^']|'')*)'|\b(true|false|NULL)\b/g)].map(m => m[1] === undefined ? m[2] === 'true' ? true : m[2] === 'false' ? false : null : m[1].replaceAll("''", "'"));
      const row = Object.fromEntries(columns.map((name, index) => [name, cells[index]]));
      const key = row.name.toLocaleLowerCase('it');
      const old = exercises.get(key);
      if (!old || !old.muscle_group) exercises.set(key, { ...old, ...row });
    }
  }
}
const strength = new Set(['squat','front squat','goblet squat','split squat','bulgarian split squat','affondi','affondi indietro','affondi camminati','step-up','step-down','single-leg squat','pistol squat','romanian deadlift','single-leg romanian deadlift','leg curl','nordic hamstring curl','calf raise','single-leg calf raise','soleus raise','tibialis raise','toe raise','hip abduction','monster walk','lateral band walk']);
const rows = [...exercises].map(([key, row]) => ({
  id: `catalog-${createHash('sha256').update(key).digest('hex').slice(0,24)}`,
  name: row.name, muscle_group: row.muscle_group ?? null, equipment: row.equipment ?? null,
  category: row.category === 'Corsa' && strength.has(key) ? 'Forza' : row.category ?? null,
})).sort((a,b)=>a.name.localeCompare(b.name,'it'));
if (rows.length < 100) throw new Error('Catalogo incompleto: controllare il formato delle migrazioni');
writeFileSync('sites/catalog-data.json', JSON.stringify(rows, null, 2) + '\n');
console.log(`Catalogo migrato: ${rows.length} esercizi`);
