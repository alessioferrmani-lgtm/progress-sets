import { EXERCISE_MUSCLE_LINKS } from "./exercise-muscle-links.ts";
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "abs"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "tibialis"
  | "forearms"
  | "obliques"
  | "adductors"
  | "abductors"
  | "peroneals"
  | "feet"
  | "lowerBack";

const ANKLE_PATTERN =
  /cavigli|ankle|plantar|plantare|dorsiflex|dorsiflession|inversione|eversione|ankle pump|ankle circle|alfabeto.*piede|tallone.?punta|towel scrunch|equilibrio su una gamba|pogo jump|ankling|ankle hop|short foot|toe yoga|jump rope/i;

const SINGLE_LEG_JUMP_PATTERN =
  /single.?leg.*(?:jump|hop|bound)|(?:monopodal|a una gamba).*(?:salto|hop|jump|bound)|hurdle hop monopodal/i;

const RULES: Array<{ match: RegExp; groups: MuscleGroup[] }> = [
  { match: /copenhagen/i, groups: ["adductors", "obliques"] },
  { match: /adductor|adduttor/i, groups: ["adductors"] },
  { match: /side plank.*abdu|side plank star/i, groups: ["obliques", "abductors", "glutes"] },
  { match: /side plank|pallof|anti rotation/i, groups: ["abs", "obliques"] },
  { match: /suitcase|offset farmer|farmer carry asim/i, groups: ["forearms", "abs", "obliques"] },
  { match: /woodchop|rotational|rotazioni|rotation|rainbow|russian|windshield|side throw/i, groups: ["obliques", "abs"] },
  { match: /bird dog row|renegade row/i, groups: ["back", "biceps", "abs", "obliques", "lowerBack"] },
  { match: /bird dog|quadrupedia.*estensione/i, groups: ["abs", "lowerBack", "glutes"] },
  { match: /wrist|avambracc|plate pinch|pinch grip/i, groups: ["forearms"] },
  { match: /farmer|carry|hold da seduto/i, groups: ["forearms", "abs", "obliques"] },
  { match: /toe yoga|short foot|toe curl|towel scrunch|big toe/i, groups: ["feet"] },
  { match: /eversion.*inversion|inversion.*eversion/i, groups: ["tibialis", "peroneals"] },
  { match: /eversion/i, groups: ["peroneals"] },
  { match: /inversion/i, groups: ["tibialis"] },
  { match: /tibial|toe raise|shin raise|dorsifless|dorsiflex|camminata sui talloni/i, groups: ["tibialis"] },
  { match: /plantarfless|plantar flex|flessione plantare|calf|soleus|soleo|polpacc|camminata sulle punte/i, groups: ["calves"] },
  { match: /ankle|cavigli|tallone punta|equilibrio|bordo esterno/i, groups: ["tibialis", "peroneals", "calves", "feet"] },
  { match: /hip abduction|hip abduct|abduzione|abduttor|clamshell|monster walk|lateral band walk|lateral.*slanci/i, groups: ["abductors", "glutes"] },
  { match: /hip flex|flessor.*anca|flessione anca/i, groups: ["quads", "abs"] },
  { match: /curl inverso|hammer curl|martello|zottman/i, groups: ["biceps", "forearms"] },
  { match: /^(?!.*(?:leg curl|nordic)).*(?:curl|bicip|biceps)/i, groups: ["biceps"] },
  { match: /reverse fly|reverse pec|alzate posterior|rear delt|face pull|band pull apart|y raise/i, groups: ["shoulders", "back"] },
  { match: /scapular pull/i, groups: ["back"] },
  { match: /scrollate|shrug/i, groups: ["back"] },
  { match: /pike|military|lento avanti|shoulder press|arnold|landmine shoulder|overhead press/i, groups: ["shoulders", "triceps"] },
  { match: /push press/i, groups: ["shoulders", "triceps", "quads", "glutes"] },
  { match: /cuban|external rotation|scaption|alzat|aperture laterali/i, groups: ["shoulders"] },
  { match: /(?:^| )croci(?: |$)|chest fly|crossover ai cavi|pector|svend/i, groups: ["chest"] },
  { match: /leg raise|knee raise|garhammer/i, groups: ["abs", "quads"] },
  { match: /panca stretta|close grip|dip tricip|jm press/i, groups: ["triceps", "chest", "shoulders"] },
  { match: /tricep|tricip|french|pushdown|push down|skull|kickback|tate press|estensioni sopra/i, groups: ["triceps"] },
  { match: /dip|panca|bench|chest press|floor press|hex press|landmine chest|push up|pushup/i, groups: ["chest", "triceps", "shoulders"] },
  { match: /pullover|straight arm pulldown/i, groups: ["back", "chest"] },
  { match: /curl inverso|hammer curl|martello|zottman/i, groups: ["biceps", "forearms"] },
  { match: /leg curl|nordic|ischiocrur|femoral/i, groups: ["hamstrings"] },
  { match: /curl|bicip|biceps/i, groups: ["biceps"] },
  { match: /back extension|hyperextension|iperestension|reverse hyper|superman|swimmer/i, groups: ["lowerBack", "glutes", "hamstrings"] },
  { match: /trap bar.*deadlift/i, groups: ["quads", "glutes", "hamstrings", "lowerBack", "back"] },
  { match: /romanian|rumeno|rdl|good morning|hip hinge/i, groups: ["hamstrings", "glutes", "lowerBack"] },
  { match: /stacco sumo|sumo deadlift/i, groups: ["quads", "glutes", "adductors", "lowerBack", "back"] },
  { match: /stacc|deadlift|rack pull/i, groups: ["hamstrings", "glutes", "lowerBack", "back"] },
  { match: /stretch.*glute|foam roller glute/i, groups: ["glutes"] },
  { match: /hip thrust|glute bridge|ponte|gluteo|glutei/i, groups: ["glutes", "hamstrings"] },
  { match: /leg extension|quadricip/i, groups: ["quads"] },
  { match: /vogator|rower/i, groups: ["back", "biceps", "quads", "hamstrings", "glutes"] },
  { match: /remator|rem |pulley|lat machine|pull up|trazion|chin up|pulldown|row/i, groups: ["back", "biceps"] },
  { match: /spanish squat/i, groups: ["quads"] },
  { match: /squat jump|jumping lunge|split squat jump|weighted jump squat|step up jump/i, groups: ["quads", "glutes", "calves"] },
  { match: /squat|affond|lunge|pressa|leg press|step up|step down/i, groups: ["quads", "glutes"] },
  { match: /burpee/i, groups: ["chest", "triceps", "shoulders", "quads", "glutes", "calves", "abs"] },
  { match: /kettlebell swing/i, groups: ["glutes", "hamstrings", "lowerBack", "forearms"] },
  { match: /clean|snatch|thruster/i, groups: ["quads", "glutes", "hamstrings", "back", "shoulders", "triceps"] },
  { match: /chest pass|wall pass|shot put|scoop toss/i, groups: ["chest", "shoulders", "triceps"] },
  { match: /medicine ball.*overhead|medicine ball slam|slam ball/i, groups: ["back", "shoulders", "abs", "obliques"] },
  { match: /marcia con kettlebell sopra la testa/i, groups: ["shoulders", "abs", "obliques"] },
  { match: /battle rope/i, groups: ["shoulders", "forearms", "abs"] },
  { match: /rope climb/i, groups: ["back", "biceps", "forearms", "abs"] },
  { match: /sled pull/i, groups: ["back", "forearms", "quads", "glutes", "calves"] },
  { match: /sled push/i, groups: ["quads", "glutes", "calves", "abs"] },
  { match: /turkish/i, groups: ["shoulders", "abs", "obliques", "glutes", "quads"] },
  { match: /bear|inchworm|leopard|crab walk|shoulder tap|plank.*braccio/i, groups: ["abs", "obliques", "shoulders"] },
  { match: /plank.*gamba/i, groups: ["abs", "obliques", "glutes"] },
  { match: /plank/i, groups: ["abs", "obliques"] },
  { match: /dead bug|crunch|sit up|situp|ab wheel|rollout|hollow|body saw|stir the pot|pelvic|heel tap|toe touch/i, groups: ["abs"] },
  { match: /leg raise|knee raise|garhammer|flutter|scissor kick|l sit|toes to bar|v up|tuck up|jackknife|candlestick|mountain climber|ins and outs/i, groups: ["abs", "quads"] },
  { match: /couch stretch/i, groups: ["quads"] },
  { match: /pettoral/i, groups: ["chest"] },
  { match: /gran dorsale|open book/i, groups: ["back"] },
  { match: /foam roller fascia laterale/i, groups: ["abductors"] },
  { match: /mobilita dell.?anca|world.?s greatest/i, groups: ["glutes", "adductors", "quads"] },
  { match: /respirazione/i, groups: ["abs"] },
  { match: /single leg cycle|high knees|leg swing frontale|fast leg|pawback|wall drill|wall switch|march|marcia tecnica|a skip|b skip|c skip/i, groups: ["quads", "glutes", "hamstrings", "calves"] },
  { match: /leg swing laterale/i, groups: ["adductors", "abductors"] },
  { match: /pogo|jump rope|ankling|bounce/i, groups: ["calves", "tibialis", "feet"] },
  { match: /skater|lateral bound|lateral hop|lateral line|lateral hurdle/i, groups: ["quads", "glutes", "abductors", "calves"] },
  { match: /snap down|step off|stick|hop|jump|bound|balz/i, groups: ["quads", "glutes", "hamstrings", "calves"] },
  { match: /corsa|sprint|run|ripetut|fondo|jogging|skip|calciat|allung|stride|andatur|acceler|progressione|interval|intervalli|fartlek|billat|yasso|tempo|threshold|trial|cooper|camminata|hiking|backpedal|carioca|grapevine|dribbling|feet|agility|drill|shuffle|navetta|wicket|lean fall|falling|salita|test cronometrato|t test/i, groups: ["quads", "hamstrings", "glutes", "calves"] },
  { match: /cross country|hill repeats|tapis/i, groups: ["quads", "hamstrings", "glutes", "calves"] },
  { match: /cyclette|ellittica/i, groups: ["quads", "glutes", "hamstrings", "calves"] },
];

const STORED_GROUPS: Record<string, MuscleGroup[]> = {
  petto: ["chest"],
  schiena: ["back"],
  spalle: ["shoulders"],
  bicipiti: ["biceps"],
  tricipiti: ["triceps"],
  core: ["abs"],
  addome: ["abs"],
  glutei: ["glutes"],
  polpacci: ["calves"],
  tibiali: ["tibialis"],
  "tibiali (stinchi)": ["tibialis"],
  avambracci: ["forearms"],
  obliqui: ["obliques"],
  adduttori: ["adductors"],
  abduttori: ["abductors"],
  peronieri: ["peroneals"],
  piedi: ["feet"],
  lombari: ["lowerBack"],
  caviglia: ["tibialis", "calves"],
  caviglie: ["tibialis", "calves"],
  gambe: ["quads", "hamstrings", "glutes", "calves"],
  cardio: ["quads", "hamstrings", "glutes", "calves"],
  atletica: ["quads", "hamstrings", "glutes", "calves"],
  "full body": ["shoulders", "back", "quads", "hamstrings", "glutes"],
};

export function normalizeExerciseName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function musclesFor(exerciseName: string, storedGroup?: string | null): MuscleGroup[] {
  const normalized = normalizeExerciseName(exerciseName);
  const exact = EXERCISE_MUSCLE_LINKS[normalized];
  if (exact) return [...exact];
  for (const r of RULES) {
    if (r.match.test(normalized)) return [...r.groups];
  }
  return storedGroup ? (STORED_GROUPS[storedGroup.trim().toLocaleLowerCase("it")] ?? []) : [];
}

/** Value stored for custom imported exercises, derived from the same central mapping. */
export function storedMuscleGroupFor(exerciseName: string): string | null {
  if (ANKLE_PATTERN.test(exerciseName)) {
    return "Caviglia";
  }
  const primary = musclesFor(exerciseName)[0];
  return primary
    ? (
        {
          chest: "Petto",
          back: "Schiena",
          shoulders: "Spalle",
          biceps: "Bicipiti",
          triceps: "Tricipiti",
          abs: "Core",
          quads: "Gambe",
          hamstrings: "Gambe",
          glutes: "Glutei",
          calves: "Polpacci",
          tibialis: "Tibiali (stinchi)",
          forearms: "Avambracci",
          obliques: "Core",
          adductors: "Adduttori",
          abductors: "Abduttori",
          peroneals: "Caviglia",
          feet: "Piedi",
          lowerBack: "Lombari",
        } satisfies Record<MuscleGroup, string>
      )[primary]
    : null;
}

export function musclesForDay(
  sets: Array<{
    completed_at: string;
    exercise_name: string;
    exercise_muscle_group: string | null;
  }>,
  day: string,
): Set<MuscleGroup> {
  const active = new Set<MuscleGroup>();
  sets.forEach((set) => {
    const completed = new Date(set.completed_at);
    if (Number.isNaN(completed.getTime())) return;
    const localDay = `${completed.getFullYear()}-${String(completed.getMonth() + 1).padStart(2, "0")}-${String(completed.getDate()).padStart(2, "0")}`;
    if (localDay !== day) return;
    musclesFor(set.exercise_name, set.exercise_muscle_group).forEach((group) => active.add(group));
  });
  return active;
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Pettorali",
  back: "Dorsali e schiena",
  shoulders: "Spalle",
  biceps: "Bicipiti",
  triceps: "Tricipiti",
  forearms: "Avambracci",
  obliques: "Obliqui",
  adductors: "Adduttori",
  abductors: "Abduttori dell’anca",
  peroneals: "Peronieri",
  feet: "Muscoli del piede",
  lowerBack: "Lombari",
  abs: "Addominali",
  quads: "Quadricipiti",
  hamstrings: "Femorali",
  glutes: "Glutei",
  calves: "Polpacci",
  tibialis: "Tibiali",
};
