## Obiettivo
Modulo PWA fitness con flusso di esecuzione scheda identico a Hevy: precompilazione da sessione precedente, tap-per-confermare, timer di recupero globale non bloccante, riepilogo con PR.

## Backend (Lovable Cloud / Supabase)
Abilito Lovable Cloud e creo lo schema:

- `exercises` — id, name, created_at
- `workout_templates` — id, user_id, name, created_at
- `template_exercises` — id, template_id, exercise_id, order_index, target_sets, target_reps, target_weight_kg, rest_seconds
- `workout_sessions` — id, user_id, template_id, started_at, ended_at
- `logged_sets` — id, session_id, exercise_id, set_number, weight_kg, reps, completed_at, rest_taken_sec

RLS per user_id + policy owner-only. Grants per `authenticated`. Auth email/password (login minimo, no conferma email per velocità).

Seed di ~15 esercizi comuni (Panca piana, Squat, Stacco, Lat machine, ecc.).

## Struttura route (TanStack)
- `/auth` — login/signup
- `/_authenticated/` — layout protetto
  - `/workouts` — Schermata 1: lista schede
  - `/workouts/new` — editor scheda (nome + esercizi + serie/reps/recupero)
  - `/workouts/$templateId/edit`
  - `/workouts/$templateId/run` — Schermata 2: esecuzione
  - `/workouts/session/$sessionId/summary` — Schermata 3: riepilogo

## Schermata 2 — dettagli implementativi
Layout:
- Header con nome scheda + timer sessione + bottone chiudi
- Tab orizzontali scrollabili con nome esercizio corrente (swipe per cambiare)
- Card esercizio: titolo + note recupero target
- Tabella serie: `SERIE | PRECEDENTE | KG | REP | ✓`
  - PRECEDENTE letto da ultima `logged_sets` per (user, exercise, set_number)
  - KG/REP input `inputMode="decimal"` precompilati con valore precedente
  - Stepper +/- accanto (tap lungo = held? no, semplici bottoni)
  - Tap su ✓ → INSERT `logged_sets`, riga verde, avvia timer, focus riga successiva

## Timer globale (critico)
Store Zustand `useRestTimer`:
- state: `{ endsAt, duration, running, exerciseId }`
- `start(seconds)`, `addSeconds(n)`, `skip()`, `tick()`
- Un `useEffect` root che fa `requestAnimationFrame` loop per aggiornare `now`; countdown derivato = `endsAt - now`
- Persistenza in `sessionStorage` per sopravvivere a nav
- Componente `<RestTimerBar />` montato nel layout `_authenticated`, visibile solo quando running; posizione `fixed bottom-20`, sopra tab bar, con barra di progresso lineare che si svuota (`width: ${remaining/duration*100}%`) con `transition: width 1s linear`
- Bottoni `-15s`, `+15s`, `Salta`
- A 0: `navigator.vibrate([200,100,200])` + beep WebAudio + auto-hide

`rest_taken_sec` = `now - previousSet.completed_at` calcolato al salvataggio della serie successiva.

## Schermata 3 — riepilogo
- Durata = `ended_at - started_at`
- N. serie completate (count logged_sets della sessione)
- PR: per ogni esercizio della sessione, confronta max(weight_kg) con max storico precedente; mostra badge "Nuovo record"
- Bottone "Fine" → UPDATE `ended_at`, redirect a `/workouts`

## Design system iOS-like
Modifico `src/styles.css`:
- Background `#F2F2F7` light / `#000` dark
- Card `bg-white` (light) / `#1C1C1E` (dark), radius 14px, ombra sottile
- Font: `-apple-system, BlinkMacSystemFont, "SF Pro"...`
- Tab bar fissa in basso con `backdrop-blur-xl bg-white/70`
- Auto dark via `@media (prefers-color-scheme: dark)` che aggiunge `.dark` a `<html>` (o CSS media diretto)
- Tokens semantici: `--surface`, `--surface-2`, `--separator`, `--label`, `--label-secondary`, `--fill-tertiary`, `--accent` (blu iOS `#007AFF`), `--success` (verde `#34C759`)
- Semantic per riga completata: `--row-completed` verde tenue

## Componenti principali
- `src/lib/rest-timer-store.ts` (Zustand)
- `src/components/RestTimerBar.tsx`
- `src/components/BottomTabBar.tsx`
- `src/components/workout/SetRow.tsx`
- `src/components/workout/ExerciseTabs.tsx`
- `src/routes/_authenticated/workouts/index.tsx` (lista)
- `src/routes/_authenticated/workouts/new.tsx` + `$templateId.edit.tsx` (editor)
- `src/routes/_authenticated/workouts/$templateId.run.tsx` (esecuzione)
- `src/routes/_authenticated/workouts/session.$sessionId.summary.tsx`

Query fetch via `createServerFn` con `requireSupabaseAuth`; mutations con `useMutation`.

## Fuori scope (v1)
- Editor drag-drop per riordinare esercizi (uso frecce su/giù)
- Grafici storici
- Social/condivisione
- Video esercizi

Confermi e procedo?