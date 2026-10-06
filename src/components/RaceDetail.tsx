import { BottomSheet } from './BottomSheet';
import type { RaceRow } from '@/lib/athletics-queries';
import { formatDistance } from '@/lib/athletics-queries';

export type RaceSplit = { distance_m: number; pace_sec: number; elevation_m?: number; avg_hr?: number };
export function clock(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
export function readSplits(raw: string | null): RaceSplit[] {
  try {
    const rows = JSON.parse(raw ?? '[]');
    return Array.isArray(rows) && rows.every(r => r && Number.isFinite(r.distance_m) && r.distance_m > 0 && Number.isFinite(r.pace_sec) && r.pace_sec > 0) ? rows : [];
  } catch { return []; }
}
export function RaceDetail({ race, onClose }: { race: RaceRow | null; onClose: () => void }) {
  const splits = readSplits(race?.splits_json ?? null);
  let elapsed = 0;
  const slowest = Math.max(...splits.map(s => s.pace_sec), 1);
  const fastest = Math.min(...splits.map(s => s.pace_sec), slowest);
  return <BottomSheet open={!!race} onClose={onClose} title={race?.name ?? 'Gara'}>
    {race && <div className="space-y-4">
      <p className="text-sm text-label-secondary">{race.date.split('-').reverse().join('/')}{race.start_time ? ` · ${race.start_time}` : ''}{race.location ? ` · ${race.location}` : ''}</p>
      {race.category && <p className="text-sm font-medium text-accent">{race.category}</p>}
      <div className="grid grid-cols-2 gap-3">
        {[['Distanza registrata', formatDistance(race.distance_m)], [race.time_kind === 'moving' ? 'Tempo in movimento' : 'Tempo', clock(race.time_sec)], ['Passo medio', `${clock(race.time_sec / (race.distance_m / 1000))}/km`], ['FC media registrata', race.avg_hr ? `${race.avg_hr} bpm` : '—']].map(([label, value]) => <div key={label} className="rounded-xl bg-fill p-3"><div className="text-sm text-label-secondary">{label}</div><div className="mt-1 text-xl font-bold text-label">{value}</div></div>)}
      </div>
      {(race.official_distance_m != null || race.official_time_sec != null) && <p className="text-sm text-label-secondary">Risultato ufficiale: {race.official_distance_m != null ? formatDistance(race.official_distance_m) : 'distanza non disponibile'} · {race.official_time_sec != null ? clock(race.official_time_sec) : 'tempo non disponibile'}</p>}
      <h3 className="text-base font-semibold text-label">Parziali al chilometro</h3>
      {splits.length ? <>
        <div className="grid grid-cols-[3.5rem_4rem_1fr_4.5rem] gap-2 text-sm text-label-secondary"><span>Tratto</span><span>Passo</span><span></span><span className="text-right">Progr. ≈</span></div>
        {splits.map((s, i) => {
          elapsed += s.pace_sec * s.distance_m / 1000;
          return <div key={i} className="grid grid-cols-[3.5rem_4rem_1fr_4.5rem] items-center gap-2 text-sm text-label">
            <span>{s.distance_m === 1000 ? `Km ${i + 1}` : `${(s.distance_m / 1000).toLocaleString('it-IT')} km`}</span>
            <span className="font-semibold tabular-nums">{clock(s.pace_sec)}</span>
            <div className="h-6 rounded bg-fill"><div className="h-full rounded bg-accent" style={{width: `${35 + 65 * (slowest - s.pace_sec) / Math.max(slowest - fastest, 1)}%`}} /></div>
            <span className="text-right tabular-nums">{clock(elapsed)}</span>
          </div>;
        })}
        <p className="text-sm text-label-secondary">Passi in min/km. Il tratto finale è parziale. I progressivi sono stimati dai passi arrotondati e possono differire dal tempo totale.</p>
      </> : <p className="text-sm text-label-secondary">Parziali non registrati per questa gara.</p>}
      {race.notes && <p className="whitespace-pre-wrap text-sm text-label-secondary">{race.notes}</p>}
    </div>}
  </BottomSheet>;
}
