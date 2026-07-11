Molte cose richieste sono già presenti (Google login, `display_name`, `WorkoutImport` con Edge Function `parse-workout`, `CaloriesCard`, trigger `handle_new_user`, RLS su tutte le tabelle già con `auth.uid() = user_id`). Prima di rifare tutto, propongo di lavorare per **audit + fix mirati**, non un rewrite.

## Audit iniziale (nessuna modifica)
1. Verificare RLS + colonna `user_id` su tutte le 9 tabelle (`supabase--read_query` sul catalogo). Segnalare eventuali gap.
2. Verificare che il provider Google sia effettivamente abilitato lato Supabase (`supabase--configure_social_auth` se manca).

## Fix mirati (in ordine)

### 1. Auth / Google
- Se Google non è abilitato in Supabase: attivare con `supabase--configure_social_auth({providers:["google"]})`.
- La UI ha già il pulsante — nessuna modifica.

### 2. Isolamento multi-utente
- Solo se l'audit trova tabelle senza `user_id` o senza policy `user_id = auth.uid()`: migration correttiva.
- Attesa: nessuna migration necessaria (tutte le tabelle risultano già isolate).

### 3. Import scheda AI (Parte 3)
- `WorkoutImport` esiste già in `workouts/new.tsx` con Edge Function `parse-workout`. Verificare che la schermata di conferma editabile esista prima del salvataggio; se no, aggiungerla (form con giorni/esercizi/serie/reps/rest modificabili + "Salva scheda").

### 4. Bug fix

**#1 Tempo test**: In `athletics/tests/$typeId.tsx` uniformare input tempo a **secondi decimali** (`42.18`), placeholder chiaro, `parseFloat` → `tests.time_sec`.

**#2 Salvataggio Test/Gare**: Verificare tramite Playwright inserimento reale; toast di errore già presenti — solo controllo che INSERT funzioni con RLS.

**#3 Età automatica**: Il profilo attuale non ha campo età manuale (solo `date_of_birth` + `age` derivata). Nessuna modifica se già così.

**#4 Nome in Home**: Già implementato correttamente (`displayName` con fallback a "Aggiungi il tuo nome…").

**#5 Allenamenti recenti cliccabili**: 
- Creare route `src/routes/_authenticated/sessions/$sessionId/index.tsx` (dettaglio con esercizi + serie da `logged_sets` filtrate per `session_id`).
- Rendere le righe recenti in `home.tsx` `<Link to="/sessions/$sessionId">`.

**#6 Calorie dashboard = 0**:
- Verificare che `computeCaloriesForSession` sia effettivamente chiamato in `workouts/$templateId/run.tsx` al finish e che `calories_burned` venga salvato.
- Verificare che `CaloriesCard` sommi correttamente `calories_burned` da `workout_sessions`+`tests`+`races` ultimi 7gg.
- Se profilo incompleto → messaggio chiaro (già gestito via `ProfileBanner`).

## Verifica finale
- Playwright: login, salvataggio test 300m/42.18s, salvataggio gara, apertura dettaglio sessione, controllo calorie card > 0.
- Screenshot ad ogni step.

## Cosa NON verrà rifatto
- La UI di login (Google button già presente)
- Trigger `handle_new_user` (già crea profilo vuoto)
- Design system iOS (già applicato)
- `CaloriesCard`, `ProfileBanner`, calcolo `age` da `date_of_birth`
- WorkoutImport base (solo controllo schermata conferma)

Confermi che procediamo così (audit → fix mirati), oppure preferisci che rifaccia da zero anche le parti già funzionanti?
