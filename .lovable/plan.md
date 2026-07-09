# Piano: Design System iOS + Dashboard personalizzata

## Parte 1 — Design System coerente (tutte le schermate)

### Token (src/styles.css)
Aggiorno le variabili CSS con i valori esatti richiesti (hex non oklch, così i colori sono identici alle spec Apple):

Light:
- `--background: #F2F2F7`, `--surface: #FFFFFF`
- `--label: #000000`, `--label-secondary: rgba(60,60,67,0.6)`, `--label-tertiary: rgba(60,60,67,0.3)`
- `--separator: rgba(60,60,67,0.16)`
- `--accent: #007AFF`, `--accent-soft: rgba(0,122,255,0.12)`
- `--success: #34C759`, `--warning: #FF9500`, `--danger: #FF3B30`

Dark (via `prefers-color-scheme`, già gestito da ThemeManager):
- `--background: #000000`, `--surface: #1C1C1E`, `--surface-2: #2C2C2E`
- `--label: #FFFFFF`, `--label-secondary: rgba(235,235,245,0.6)`
- `--separator: rgba(84,84,88,0.6)`
- `--accent: #0A84FF`

### Utility + componenti condivisi
- `ios-card` (radius 14px, padding 16-20, shadow leggera)
- `ios-list` + `ios-list-row` per liste grouped con separatore 0.5px `inset-inline-start: 16px`
- `ios-btn-primary` (pillola, `active:scale-[0.97]`, transition 200ms ease-out)
- `ios-tabbar` con `backdrop-filter: saturate(180%) blur(20px)` e superficie translucida
- Transizione globale 200ms ease-out su interattivi

### Applicazione
Refactor delle schermate esistenti per usare i nuovi token/utility:
- `workouts/index.tsx`, `workouts/new.tsx`, `workouts/$templateId/run.tsx`, `sessions/$sessionId/summary.tsx`, `auth.tsx`
- Rimozione bordi spessi, ombre pesanti, corner squadrati
- `RestTimerBar` allineata al nuovo stile blur
- Icone lineari da `lucide-react` (già disponibile) al posto di emoji

### Tab bar inferiore
Nuovo componente `BottomTabBar` fisso in fondo con 3 voci: Home (dashboard), Allenamenti (schede), Profilo. Renderizzato nel layout `_authenticated`. Sostituisce/affianca `RestTimerBar` che rimane appena sopra la tab.

## Parte 2 — Dashboard personalizzata `/home`

Nuova route `src/routes/_authenticated/home.tsx` (impostata come rotta di default: `/` autenticato → redirect a `/home`).

Ogni sezione è un componente indipendente che usa `useQuery` proprio → caricamento progressivo con skeleton individuali.

### Sezioni
1. **HeaderGreeting** — "Ciao {nome/email}", data odierna in italiano (`Intl.DateTimeFormat("it-IT")`).
2. **StreakCard** — Query su `workout_sessions` ultime 12 settimane; calcola settimane consecutive con ≥1 sessione. Se settimana corrente vuota → CTA "Inizia la tua settimana" (link a `/workouts`). Icona `Flame` da lucide.
3. **WeeklyVolumeChart** — Recharts (già in dipendenze o da installare). Toggle segmentato "Durata / Volume / Ripetizioni". Aggrega `logged_sets` + `workout_sessions` ultimi 90gg per settimana ISO. Totale settimana corrente in grande sopra il grafico.
4. **MuscleMap** — Silhouette SVG frontale + posteriore semplificate. Mappa `exercise.name` → gruppo muscolare tramite tabella statica (es. "Panca" → petto, "Squat" → quadricipiti). Gruppi allenati negli ultimi 7gg in `--accent`, altri in `--fill`. Sotto: 7 pallini per i giorni della settimana corrente (L-D), evidenziati quelli con sessione.
5. **RecentPRs** — Query aggrega MAX(weight_kg) per exercise_id + data del PR. Mostra ultimi 5 PR dell'ultimo mese con delta rispetto al record precedente. Fallback: top-3 esercizi più allenati con record assoluto.
6. **RecentSessions** — Ultime 5 sessioni con `ended_at NOT NULL`, con durata, volume totale (sum weight×reps), n. serie. Tap → link a summary esistente.
7. **MonthCalendar** — `<details>` collassabile "Vedi calendario completo". Griglia 7 colonne del mese corrente, pallino blu sui giorni con sessione, sotto nome scheda breve.

### Query centralizzata
Nuovo `src/lib/dashboard-queries.ts` con funzioni pure che ricevono `userId` e ritornano DTO plain. Ogni componente ha il suo `useQuery` key stabile.

### Stati vuoti
Ogni sezione ha un empty state amichevole (icona + testo + eventuale CTA), mai card vuota silenziosa.

## Dettagli tecnici
- Nessuna modifica DB: le query aggiuntive usano tabelle e RLS già esistenti.
- `recharts` da installare se non presente (verifico prima).
- SVG silhouette custom inline in `src/components/MuscleMap.tsx` con `<path>` per gruppo, `data-active` toggle.
- Routing: aggiungo `home.tsx` sotto `_authenticated/` e faccio redirect da `/workouts` root a `/home` non è necessario; aggiorno solo il link default post-login e la tab bar.

## Non incluso
- Modifiche allo schema DB
- Nuovi esercizi/mapping muscolare esaustivo (userò un dizionario base estendibile)
- Modifiche al flusso di esecuzione allenamento (solo restyling visivo)
