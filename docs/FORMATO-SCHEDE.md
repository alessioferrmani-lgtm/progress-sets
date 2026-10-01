# Schede da incollare in Progress Sets

## Prompt da copiare in una nuova chat

Riformatta la scheda che ti fornirò per l’importazione in Progress Sets, senza cambiare la programmazione e senza inventare esercizi o valori mancanti.

Usa solo testo semplice, niente tabelle Markdown. Per ogni giornata scrivi `GIORNO: nome`. Per ogni esercizio usa un blocco separato da una riga vuota:

Nome completo dell’esercizio
Serie: numero
Ripetizioni: valore o intervallo con unità
Monopodalico: sì oppure no
Carico: numero kg
Recupero: numero secondi
Superserie: nome del blocco (solo per esercizi abbinati)
Nota: eventuali indicazioni da conservare

Regole:
- Per le ripetizioni usa `6` o `6-8`.
- Per gli esercizi a tempo usa `30 secondi` o `30-45 secondi`.
- Per le distanze usa `30 metri` o `30-40 metri`.
- Per un esercizio eseguito separatamente sui due lati aggiungi `per gamba`, `per lato`, `per piede` o `per braccio` a Ripetizioni e imposta `Monopodalico: sì`.
- Le Serie sono il numero PER LATO: `Serie: 3` con monopodalico sì significa 3 SX e 3 DX. Non raddoppiare il numero nel testo.
- Per gli esercizi bilaterali usa `Monopodalico: no`.
- Per una superserie, assegna lo stesso nome del blocco ai due esercizi, nell'ordine A poi B. L'app registra A1, B1, A2, B2; nessun timer fra A e B, recupero dopo B. Il recupero del blocco è quello del secondo esercizio.
- Il carico è quello registrato per una singola esecuzione/lato; mantieni la convenzione della scheda. Se non è specificato, ometti la riga Carico. Non inventare pesi.
- Mantieni l’ordine originale e le unità esplicite. Non convertire secondi o metri in ripetizioni.
- Se mancano serie, ripetizioni/unità o recupero, chiedimi il dato prima di produrre il testo definitivo.
- Metti eventuali note e spiegazioni fuori dal testo da incollare; non inserirle come nuovi esercizi.

Ecco la scheda da riformattare:
[INCOLLA QUI LA SCHEDA]

## Esempio verificato

GIORNO: Forza e stabilità

Bulgarian Split Squat
Serie: 3
Ripetizioni: 6 per gamba
Monopodalico: sì
Carico: 20 kg
Recupero: 90 secondi

Side Plank
Serie: 3
Ripetizioni: 30-45 secondi per lato
Monopodalico: sì
Carico: 0 kg
Recupero: 60 secondi

Farmer Carry
Serie: 3
Ripetizioni: 30-40 metri
Monopodalico: no
Carico: 24 kg
Recupero: 90 secondi

## Controllo prima del salvataggio

In Schede → Nuova scheda → Incolla scheda, analizza il testo. Controlla il selettore SX/DX, serie, unità, carico, recupero e gruppo muscolare prima di salvare. La selezione SX/DX può essere modificata anche manualmente.

Negli esercizi a tempo, Avvia/Pausa/Riprendi controllano il cronometro della serie, separato dal recupero. Stop riporta i secondi misurati nel campo; puoi correggerli e poi premere Conferma serie. La bozza del cronometro resta sul dispositivo, le serie confermate sono salvate nell’account.

Il backup JSON conserva `side`, `reps_type`, `duration_sec` e `distance_m`. I secondi e i metri non entrano nel volume calcolato come kg × ripetizioni. I vecchi allenamenti non vengono reinterpretati automaticamente.
