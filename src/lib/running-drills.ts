export type RunningDrillCategory = "Andature" | "Tecnica" | "Coordinazione" | "Accelerazione";
export type RunningDrillPose = "march" | "skip" | "straight" | "side" | "wall" | "start";

export type RunningDrill = {
  id: string;
  name: string;
  category: RunningDrillCategory;
  pose: RunningDrillPose;
  description: string;
  cue: string;
  dosage: string;
};

/** Running drills shown in Atletica. They are intentionally not gym exercises. */
const RUNNING_DRILL_BASE: Omit<RunningDrill, "description">[] = [
  {
    id: "marcia-tecnica",
    name: "Marcia tecnica",
    category: "Andature",
    pose: "march",
    cue: "Postura alta e appoggio sotto il bacino.",
    dosage: "2 × 20 m",
  },
  {
    id: "a-march",
    name: "A-March",
    category: "Andature",
    pose: "march",
    cue: "Ginocchio alto, piede attivo e braccia coordinate.",
    dosage: "2 × 20 m",
  },
  {
    id: "a-skip",
    name: "A-Skip",
    category: "Andature",
    pose: "skip",
    cue: "Rimbalzo elastico senza perdere l’allineamento.",
    dosage: "2 × 20 m",
  },
  {
    id: "b-skip",
    name: "B-Skip",
    category: "Andature",
    pose: "skip",
    cue: "Estendi la gamba in avanti e richiudila rapidamente.",
    dosage: "2 × 20 m",
  },
  {
    id: "c-skip",
    name: "C-Skip",
    category: "Andature",
    pose: "skip",
    cue: "Tallone verso il gluteo con ritmo controllato.",
    dosage: "2 × 20 m",
  },
  {
    id: "skip-basso",
    name: "Skip basso",
    category: "Andature",
    pose: "skip",
    cue: "Contatti rapidi e bassi, busto fermo.",
    dosage: "2 × 20 m",
  },
  {
    id: "skip-medio",
    name: "Skip medio",
    category: "Andature",
    pose: "skip",
    cue: "Alza il ginocchio mantenendo una cadenza fluida.",
    dosage: "2 × 20 m",
  },
  {
    id: "skip-alto",
    name: "Skip alto",
    category: "Andature",
    pose: "skip",
    cue: "Ginocchio all’altezza dell’anca, appoggio reattivo.",
    dosage: "2 × 20 m",
  },
  {
    id: "high-knees",
    name: "High Knees",
    category: "Andature",
    pose: "march",
    cue: "Ginocchia rapide e braccia attive.",
    dosage: "2 × 15 s",
  },
  {
    id: "calciata-dietro",
    name: "Calciata dietro",
    category: "Andature",
    pose: "skip",
    cue: "Talloni verso i glutei senza inclinarti indietro.",
    dosage: "2 × 20 m",
  },
  {
    id: "corsa-calciata",
    name: "Corsa calciata",
    category: "Andature",
    pose: "skip",
    cue: "Unisci calciata e avanzamento progressivo.",
    dosage: "2 × 20 m",
  },
  {
    id: "ankling",
    name: "Ankling",
    category: "Coordinazione",
    pose: "straight",
    cue: "Caviglia rigida e contatto breve sull’avampiede.",
    dosage: "2 × 20 m",
  },
  {
    id: "dribbling-basso",
    name: "Dribbling basso",
    category: "Coordinazione",
    pose: "straight",
    cue: "Passi corti, rilassati e veloci.",
    dosage: "2 × 20 m",
  },
  {
    id: "dribbling-medio",
    name: "Dribbling medio",
    category: "Coordinazione",
    pose: "straight",
    cue: "Aumenta ampiezza senza perdere frequenza.",
    dosage: "2 × 20 m",
  },
  {
    id: "dribbling-alto",
    name: "Dribbling alto",
    category: "Coordinazione",
    pose: "straight",
    cue: "Ciclo di gamba più ampio e appoggio attivo.",
    dosage: "2 × 20 m",
  },
  {
    id: "straight-leg-run",
    name: "Straight-Leg Run",
    category: "Tecnica",
    pose: "straight",
    cue: "Gambe quasi tese e piede che atterra sotto il corpo.",
    dosage: "2 × 20 m",
  },
  {
    id: "corsa-balzata",
    name: "Corsa balzata",
    category: "Tecnica",
    pose: "skip",
    cue: "Spingi in avanti mantenendo ritmo elastico.",
    dosage: "2 × 30 m",
  },
  {
    id: "bounding",
    name: "Bounding",
    category: "Tecnica",
    pose: "skip",
    cue: "Alterna balzi ampi con atterraggio stabile.",
    dosage: "2 × 30 m",
  },
  {
    id: "carioca",
    name: "Carioca",
    category: "Coordinazione",
    pose: "side",
    cue: "Ruota il bacino senza incrociare il busto.",
    dosage: "2 × 20 m",
  },
  {
    id: "grapevine",
    name: "Grapevine",
    category: "Coordinazione",
    pose: "side",
    cue: "Passi laterali incrociati e controllo del tronco.",
    dosage: "2 × 20 m",
  },
  {
    id: "corsa-laterale",
    name: "Corsa laterale",
    category: "Coordinazione",
    pose: "side",
    cue: "Spingi dal piede esterno e mantieni il baricentro basso.",
    dosage: "2 × 20 m",
  },
  {
    id: "corsa-incrociata",
    name: "Corsa incrociata",
    category: "Coordinazione",
    pose: "side",
    cue: "Incrocia le gambe con passi rapidi e controllati.",
    dosage: "2 × 20 m",
  },
  {
    id: "corsa-indietro",
    name: "Corsa all’indietro",
    category: "Coordinazione",
    pose: "side",
    cue: "Guarda avanti e appoggia il piede con prudenza.",
    dosage: "2 × 20 m",
  },
  {
    id: "wall-drill",
    name: "Wall Drill",
    category: "Tecnica",
    pose: "wall",
    cue: "Linea testa-bacino-piede e ginocchio attivo.",
    dosage: "2 × 10 per lato",
  },
  {
    id: "wall-switch",
    name: "Wall Switch",
    category: "Tecnica",
    pose: "wall",
    cue: "Scambia rapidamente le gambe mantenendo il busto fermo.",
    dosage: "2 × 10 s",
  },
  {
    id: "falling-start",
    name: "Falling Start",
    category: "Accelerazione",
    pose: "start",
    cue: "Lasciati cadere e parti con passi brevi e progressivi.",
    dosage: "4 × 10 m",
  },
  {
    id: "lean-fall-run",
    name: "Lean-Fall-Run",
    category: "Accelerazione",
    pose: "start",
    cue: "Inclina il corpo e accelera senza piegarti in vita.",
    dosage: "4 × 15 m",
  },
  {
    id: "wicket-drill",
    name: "Wicket Drill",
    category: "Tecnica",
    pose: "straight",
    cue: "Mantieni ritmo e distanza regolare tra gli appoggi.",
    dosage: "3 × 20 m",
  },
  {
    id: "fast-leg-drill",
    name: "Fast Leg Drill",
    category: "Tecnica",
    pose: "straight",
    cue: "Ciclo rapido della gamba con spalle rilassate.",
    dosage: "2 × 10 s per lato",
  },
  {
    id: "single-leg-cycle",
    name: "Single-Leg Cycle",
    category: "Tecnica",
    pose: "march",
    cue: "Ripeti il ciclo completo con una gamba alla volta.",
    dosage: "2 × 10 per lato",
  },
  {
    id: "pawback-drill",
    name: "Pawback Drill",
    category: "Tecnica",
    pose: "straight",
    cue: "Richiama il piede sotto il bacino con contatto attivo.",
    dosage: "2 × 20 m",
  },
];

const RUNNING_DRILL_DESCRIPTIONS: Record<string, string> = {
  "marcia-tecnica": "Marcia controllata che insegna postura, appoggio e coordinazione di base.",
  "a-march": "Marcia tecnica con ginocchio alto per costruire la corretta meccanica di corsa.",
  "a-skip": "Versione ritmica dell’A-March che aggiunge elasticità e coordinazione.",
  "b-skip": "Andatura che combina ginocchio alto, estensione e richiamo rapido della gamba.",
  "c-skip": "Skip coordinativo con richiamo del tallone per rendere fluido il ciclo posteriore.",
  "skip-basso": "Skip rapido e vicino al terreno per allenare frequenza e reattività dei piedi.",
  "skip-medio": "Skip intermedio per coordinare cadenza, ginocchio e appoggio sotto il corpo.",
  "skip-alto": "Skip ampio con ginocchia alte per migliorare forza elastica e postura.",
  "high-knees": "Corsa sul posto o in avanzamento con ginocchia rapide e braccia attive.",
  "calciata-dietro":
    "Andatura con talloni ai glutei per migliorare rapidità di recupero della gamba.",
  "corsa-calciata": "Calciata eseguita avanzando per trasferire il gesto alla corsa reale.",
  ankling: "Piccoli appoggi elastici che rinforzano caviglie e sensibilità dell’avampiede.",
  "dribbling-basso":
    "Passi molto brevi e veloci per sviluppare frequenza e controllo dell’appoggio.",
  "dribbling-medio": "Dribbling con ampiezza moderata per collegare frequenza e avanzamento.",
  "dribbling-alto": "Dribbling ampio che prepara il ciclo completo della gamba nella corsa.",
  "straight-leg-run":
    "Corsa a gambe quasi tese per allenare richiamo del piede e catena posteriore.",
  "corsa-balzata":
    "Balzi alternati in avanzamento per potenza, ampiezza e controllo dell’atterraggio.",
  bounding: "Sequenza di balzi lunghi alternati per sviluppare forza elastica e propulsione.",
  carioca: "Andatura laterale incrociata che migliora mobilità del bacino e coordinazione.",
  grapevine: "Passi laterali incrociati continui per agilità, ritmo e controllo del tronco.",
  "corsa-laterale": "Corsa sul piano laterale per rapidità, stabilità e spinta multidirezionale.",
  "corsa-incrociata": "Avanzamento laterale con incrocio delle gambe per coordinazione dinamica.",
  "corsa-indietro": "Corsa controllata all’indietro per propriocezione, appoggio e rapidità.",
  "wall-drill": "Esercizio al muro che fissa inclinazione, postura e posizione di spinta.",
  "wall-switch": "Scambi rapidi delle gambe al muro per allenare reattività e assetto.",
  "falling-start":
    "Partenza dalla caduta in avanti per imparare a proiettare il corpo in accelerazione.",
  "lean-fall-run": "Progressione inclinazione-caduta-corsa per collegare postura e accelerazione.",
  "wicket-drill":
    "Corsa tra riferimenti regolari per controllare ritmo, ampiezza e punto d’appoggio.",
  "fast-leg-drill": "Ciclo rapido di una gamba per aumentare velocità e precisione del richiamo.",
  "single-leg-cycle":
    "Ciclo completo eseguito con una gamba per isolare e correggere il movimento.",
  "pawback-drill": "Richiamo attivo del piede verso il terreno per ridurre frenata e dispersioni.",
};

export const RUNNING_DRILLS: RunningDrill[] = RUNNING_DRILL_BASE.map((drill) => ({
  ...drill,
  description: RUNNING_DRILL_DESCRIPTIONS[drill.id] ?? drill.cue,
}));

export const runningDrillById = (id: string) => RUNNING_DRILLS.find((drill) => drill.id === id);

export function runningDrillImageFile(id: string) {
  // The JPG set shares the same anatomical black/white/orange illustration style.
  // Keep one deterministic extension so old mixed PNG previews cannot reappear.
  return `${id}.jpg`;
}
