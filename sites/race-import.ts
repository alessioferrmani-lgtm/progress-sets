import type { DatabaseBinding } from './database.ts';

// One explicitly requested import, isolated to the existing owner's profile.
// The durable marker prevents re-creation after the user deletes the race.
const owner = 'nGz8jO9jNuiAN9oc4keDjNYyaA4b3mdQnVClooMNpwVUbyh71cFByR';
const marker = 'race-import-skopje-2026-10-04-v1';
const raceId = 'race-skopje-relay-2026-10-04';
const splits = [270,278,285,287,285,270,270,274,275,250].map((pace_sec, i) => ({
  distance_m: i === 9 ? 810 : 1000, pace_sec,
  elevation_m: [4,3,3,5,1,-1,-5,-3,-3,-2][i], avg_hr: i === 9 ? 133 : 117,
}));
export async function importRequestedRace(db: DatabaseBinding) {
  if (await db.prepare('SELECT value FROM app_meta WHERE key=?').bind(marker).first()) return;
  const profile = await db.prepare('SELECT user_id FROM profiles WHERE user_id=?').bind(owner).first();
  if (!profile) throw new Error('Profilo destinatario della gara non disponibile');
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO races
      (id,user_id,name,date,distance_m,time_sec,location,category,avg_hr,notes,calories_burned,splits_json,start_time,time_kind)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      raceId, owner, 'Marathon Relay Skopje', '2026-10-04', 9810, 2694, 'Skopje',
      'Staffetta su strada', 118,
      'Dati Strava / Amazfit T-Rex 3 Pro. Dislivello positivo: 4 m. Ultimo tratto mostrato da Strava come 0,8 km; 0,81 km ricavati dalla distanza totale. Tempo e distanza ufficiali non disponibili. Calorie riportate da Strava.',
      300, JSON.stringify(splits), '09:38', 'moving'),
    db.prepare('INSERT OR IGNORE INTO app_meta (key,value) VALUES (?,?)').bind(marker, raceId),
  ]);
}
