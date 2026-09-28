# Progress Sets su ChatGPT Sites

Questa versione mantiene l'interfaccia dark/rossa, le schede, gli allenamenti
guidati e liberi, i programmi, i test di atletica, le andature con routine,
il profilo e le esportazioni dell'app originale. Il sito Lovable non viene
modificato: la migrazione vive sul branch `codex/migrate-to-sites`.

## Accesso e dati

- Accesso attraverso ChatGPT e identità verificata dal gateway Sites.
- Archivio nuovo, senza importazione automatica dei dati personali da Supabase.
- Dati persistenti nel database D1 di Sites, separati per account.
- Catalogo iniziale condiviso di 567 esercizi e 15 tipi di test, non modificabile
  dagli account tramite le richieste del client.
- Routine di riscaldamento salvate sul server; timer e stato di ripresa locali
  restano soltanto cache di supporto, non l'archivio degli allenamenti.
- Importazione del testo delle schede eseguita localmente, senza chiavi AI.

## Copia dei dati dalla vecchia app

Da Profilo → Importa dati si può incollare o caricare un export JSON completo
di Progress Sets. Il server verifica il backup prima della conferma e applica
la copia in un'unica transazione. Gli identificativi sono rimappati per account,
le riesecuzioni non duplicano i record e i dati già presenti non sono sovrascritti.
È possibile escludere gli allenamenti conclusi senza serie; serie con la stessa
identità e gli stessi carichi/ripetizioni vengono accorpate conservando la prima
registrazione. Se carichi o ripetizioni discordano l'importazione si ferma.
Date e calorie storiche non sono ricalcolate. I programmi mancanti negli export
precedenti vengono mantenuti raggruppati con un avviso. Il nuovo export include
anche i metadati dei programmi. Le routine locali assenti dal vecchio JSON non
sono recuperabili da quel backup. Il limite è 1000 record per importazione.

## Icona iPhone

L'apple-touch-icon e le immagini del manifest usano la copia pubblica già
esistente nel repository GitHub, fissata a una revisione immutabile. Questo
evita il login del gateway Sites per la sola immagine. Il manifest richiede
le credenziali della sessione; database e pagine restano privati su Sites.
Un collegamento iOS già installato può richiedere una nuova aggiunta alla Home;
il comportamento finale deve essere verificato sul dispositivo reale.

Il modulo chiamato `supabase/client` rimane un adattatore di compatibilità per
l'interfaccia esistente: le richieste attive passano a `/api/sites/*`, non a
Supabase. I file Postgres originali sono conservati in `docs/lovable-migrations`
e `supabase/migrations` a fini di riferimento. Solo le migrazioni SQLite
in `drizzle/` sono destinate al nuovo database Sites.

## Sicurezza e consistenza

Il server permette solo tabelle, colonne, filtri e relazioni esplicitamente
autorizzati. Ogni lettura e scrittura è vincolata all'identità fornita da Sites;
i riferimenti ad allenamenti, schede ed esercizi sono verificati anche in
scrittura. Le query usano parametri e gli inserimenti multipli sono atomici.
Vincoli univoci impediscono sessioni aperte duplicate per la stessa scheda
e serie duplicate. Gli aggiornamenti del profilo registrano il peso solo
quando cambia. I record derivati dei test e delle gare seguono aggiornamenti
ed eliminazioni attraverso trigger SQLite.

## Verifica locale

1. Installare le dipendenze con `npm ci`.
2. Eseguire `npm test` e `npx tsc --noEmit`.
3. Eseguire `npm run build`.
4. Applicare le migrazioni SOLO al database locale con
   `npx wrangler d1 migrations apply progress-sets-local --local --config wrangler.jsonc`.
5. Avviare `npm run dev:sites` e, in un secondo terminale,
   `node scripts/preview-sites.mjs`.
6. Aprire `http://127.0.0.1:5192`.

Il proxy di anteprima usa un account fittizio esclusivamente in locale e non
è incluso nell'entrypoint distribuito. I suoi dati e i file `.wrangler` non
vengono pubblicati.

## Pubblicazione

Usare il flusso ufficiale Sites, il `project_id` già presente in
`.openai/hosting.json` e l'archivio generato dalla stessa revisione inviata.
Non creare un secondo Site e non inserire credenziali nel repository.
Mantenere l'accesso privato finché il proprietario non chiede di condividerlo.
Non unire questo branch al ramo Lovable senza pianificare esplicitamente
il passaggio: i due backend sono indipendenti.

Il build produce `dist/server/index.js` (Worker), `dist/server/app` (TanStack
Start/Nitro) e `dist/client` (risorse statiche). Le migrazioni applicate online
vanno estese con nuovi file, mai riscritte.
