# Piano: Atletica + Profilo Fisico + Motore Calorie

Tre interventi coordinati che condividono lo stesso motore di calcolo calorie.

## PARTE 1 — Database (una sola migrazione)

Nuove tabelle in `public` (tutte con RLS `auth.uid() = user_id` + GRANT su `authenticated` / `service_role`):

- **profiles** — `user_id (PK, FK auth.users)`, `height_cm`, `weight_kg`, `date_of_birth`, `sex` (enum M/F/O), `activity_level` (enum), `updated_at`. Trigger che, quando cambia `weight_kg`, inserisce riga in `weight_logs`.
- **weight_logs** — `user_id`, `weight_kg`, `logged_at`.
- **test_types** — `name` (unique), `result_type` (enum TIME/DISTANCE), `distance_m`, `duration_sec`, `is_custom`, `user_id` (nullable: NULL = preset globale, leggibile da tutti gli auth; !=NULL = custom dell'utente). Seed dei 7 test preset via migration.
- **tests** — `user_id`, `test_type_id`, `date`, `time_sec`, `distance_covered_m`, `avg_hr`, `weather`, `notes`, `observations`, `calories_burned`, `created_at`.
- **races** — `user_id`, `name`, `date`, `location`, `distance_m`, `time_sec`, `placement`, `category`, `avg_hr`, `notes`, `calories_burned`, `created_at`.
- **performance_log** — `user_id`, `source` (enum TRAINING_REP/TEST/RACE), `source_id`, `distance_m`, `time_sec`, `date`, `created_at`. Popolata via trigger da `tests` (quando time_sec presente) e `races`.
- Aggiungo `avg_hr` e `rpe` (nullable) e `calories_burned` (nullable) a `workout_sessions`.

## PARTE 2 — Motore calorie condiviso

File unico `src/lib/calories.ts` con funzioni pure:
- `bmr({sex, weight_kg, height_cm, age})` — Mifflin-St Jeor (offset +5 / -161 / -78).
- `tdee(bmr, activity_level)` — moltiplicatori 1.2/1.375/1.55/1.725/1.9.
- `caloriesFromHR({avg_hr, weight_kg, age, sex, duration_min})` — formula HR, `max(0, ...)`.
- `caloriesFromMET({met, weight_kg, duration_min, rpe?})` — con correzione `met * (0.85 + rpe/50)` se sessione GYM.
- `MET_TABLE` con i valori richiesti + helper `metForTest(testType)` / `metForRace(distance, time)` che sceglie fondo/media/veloce dal pace.
- `computeCaloriesForSession(profile, session)` / `...ForTest` / `...ForRace` — orchestrano: se manca `profile.weight_kg` o `height_cm` → ritornano `null` (mai default silenzioso). Scelgono automaticamente Metodo A (HR) se `avg_hr` presente, altrimenti Metodo B (MET).

Chiamato da: salvataggio workout (`workout-queries`), form test, form race. Il valore viene scritto in `calories_burned` al momento dell'insert.

## PARTE 3 — Profilo utente

Refactor di `src/routes/_authenticated/profile.tsx`:
- Sezione "I miei dati" con form editabile (altezza, peso, data nascita → età calcolata, sesso, livello attività).
- Query `useProfile()` in `src/lib/profile-queries.ts`.
- Salvataggio via upsert su `profiles`. Trigger DB gestisce il log del peso.

Banner in `home.tsx` (`ProfileIncompleteBanner`) mostrato solo se `!profile || !weight_kg || !height_cm`, con CTA verso `/profile`.

## PARTE 4 — Sezione Atletica

Nuovo layout route `src/routes/_authenticated/athletics/route.tsx` con `<Outlet />` + segmented control Test/Gare + card insight in cima (query su `performance_log`).

Route figlie:
- `athletics/index.tsx` → redirect a `athletics/tests`.
- `athletics/tests.tsx` — lista `test_types`, ciascuno con count + PR. Bottone "+ Test personalizzato".
- `athletics/tests/$typeId.tsx` — form nuovo test + PR assoluto/stagionale (anno sportivo set-ago) + confronto con ultimo + grafico Recharts (asse Y invertito per TIME) + storico.
- `athletics/races.tsx` — lista cronologica + bottone "+ Nuova gara" (dialog/route).
- `athletics/races/new.tsx` — form nuova gara.
- `athletics/records.tsx` — record per distanza da `performance_log`.

Card insight (in `athletics/route.tsx`, max 3):
- Miglior tempo di sempre per distanza più recente.
- Delta vs anno precedente.
- Rank della prestazione più recente. Skip la card se `performance_log` vuota per quella distanza.

Query in `src/lib/athletics-queries.ts`. Aggiungo tab "Atletica" (icona `Medal`) alla `BottomTabBar`.

## PARTE 5 — Dashboard

Nuova card `CaloriesCard` in `home.tsx` — somma `calories_burned` da `workout_sessions` + `tests` + `races` ultimi 7 giorni. Se profilo incompleto → stato vuoto "Completa il profilo".

## Design

Tutte le nuove schermate usano `ios-card` / `ios-list-row` / `ios-btn-primary` già presenti in `styles.css`. Nessuna modifica al design system.

## Dettagli tecnici

- Preset test seed via `INSERT ... ON CONFLICT DO NOTHING` con `user_id = NULL`.
- RLS su `test_types`: SELECT permesso se `user_id IS NULL OR user_id = auth.uid()`; INSERT/UPDATE/DELETE solo su propri custom.
- Trigger `after insert on tests` e `after insert on races` per popolare `performance_log`.
- Trigger `before update on profiles` per loggare cambio peso in `weight_logs`.
- Il calcolo calorie avviene lato client al momento del save (legge profilo → calcola → include in insert). Nessuna edge function.
- Anno sportivo: se `month >= 9` → `[sett-anno, ago-anno+1]`, altrimenti `[sett-anno-1, ago-anno]`.
- Scelta MET per gare/corsa: pace = `time_sec / (distance_m/1000) / 60` min/km; <4:30 → 11.5, <5:30 → 9.8, altrimenti 8.3.

Confermi e procedo con migration + codice?
