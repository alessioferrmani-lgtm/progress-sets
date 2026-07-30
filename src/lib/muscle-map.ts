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
  | "forearms";

const ANKLE_PATTERN =
  /cavigli|ankle|plantar|plantare|dorsiflex|dorsiflession|inversione|eversione|ankle pump|ankle circle|alfabeto.*piede|tallone.?punta|towel scrunch|equilibrio su una gamba|pogo jump|ankling|jump rope/i;

const SINGLE_LEG_JUMP_PATTERN =
  /single.?leg.*(?:jump|hop|bound)|(?:monopodal|a una gamba).*(?:salto|hop|jump|bound)|hurdle hop monopodal/i;

const RULES: Array<{ match: RegExp; groups: MuscleGroup[] }> = [
  {
    match: ANKLE_PATTERN,
    groups: ["tibialis", "calves"],
  },
  {
    match: /single.?leg.*(?:calf|soleus)|single.?leg calf raise|soleus raise|calf raise|polpacc/i,
    groups: ["calves"],
  },
  {
    match: SINGLE_LEG_JUMP_PATTERN,
    groups: ["quads", "glutes", "calves", "tibialis"],
  },
  {
    match: /single.?leg.*(?:squat|split squat)|pistol squat|bulgarian split squat|split squat|single.?leg step/i,
    groups: ["quads", "glutes", "hamstrings", "calves"],
  },
  {
    match: /single.?leg.*(?:romanian deadlift|deadlift|good morning)|single.?leg glute bridge|single.?leg hip thrust/i,
    groups: ["hamstrings", "glutes"],
  },
  {
    match: /single.?arm.*(?:row|rematore)|one.?arm.*(?:row|rematore)|single.?arm.*carry|waiter carry a un braccio/i,
    groups: ["back", "biceps", "forearms", "abs"],
  },
  {
    match: /single.?arm.*(?:press|push)|one.?arm.*(?:press|push)/i,
    groups: ["chest", "shoulders", "triceps"],
  },
  { match: /wrist curl|reverse wrist curl|wrist roller|plate pinch|pinch grip/i, groups: ["forearms"] },
  { match: /curl alla panca scott/i, groups: ["biceps"] },
  { match: /rematore chest.?supported|chest.?supported row/i, groups: ["back", "biceps"] },
  { match: /iperestension|reverse hyper|back extension 45/i, groups: ["back", "hamstrings", "glutes"] },
  { match: /pullover con manubrio/i, groups: ["back", "chest"] },
  { match: /vogatore|rower/i, groups: ["back", "biceps", "quads", "hamstrings", "glutes"] },
  { match: /rack pull/i, groups: ["back", "hamstrings", "glutes"] },
  { match: /straight.?arm pulldown/i, groups: ["back"] },
  { match: /pallof|woodchop|hollow body|v.?up|toes to bar|rollout|copenhagen plank/i, groups: ["abs"] },
  { match: /plank shoulder tap|bear crawl/i, groups: ["abs", "shoulders"] },
  { match: /crossover|floor press|svend press|hex press|landmine chest/i, groups: ["chest", "triceps"] },
  { match: /cuban press|rear delt row|band pull.?apart|scaption|y raise/i, groups: ["shoulders"] },
  { match: /external rotation/i, groups: ["shoulders"] },
  { match: /pike push.?up|landmine shoulder press/i, groups: ["shoulders", "triceps"] },
  { match: /jm press|tate press|rolling dumbbell triceps|triceps extension machine/i, groups: ["triceps"] },
  { match: /panca stretta|close.grip|dip tricip/i, groups: ["triceps", "chest"] },
  {
    match: /panca|bench|push[- ]?up|chest|pettoral|croci|fly|dip alle/i,
    groups: ["chest", "triceps"],
  },
  { match: /squat|leg press|affond|lunge|hack/i, groups: ["quads", "glutes"] },
  { match: /stacc|deadlift|good ?morning/i, groups: ["hamstrings", "glutes", "back"] },
  { match: /leg curl|femoral/i, groups: ["hamstrings"] },
  { match: /leg extension|quadric/i, groups: ["quads"] },
  { match: /tibial|tibialis|shin raise|toe raise|stinco|stinchi/i, groups: ["tibialis"] },
  { match: /polpacc|calf|calves/i, groups: ["calves"] },
  {
    match:
      /trazion|pull ?up|chin ?up|lat ?machine|pulldown|pulley|rowing|row|rematore|rem\.|iperestension|pullover/i,
    groups: ["back", "biceps"],
  },
  { match: /shoulder|spall|military|lento|overhead|arnold/i, groups: ["shoulders", "triceps"] },
  {
    match: /alzat|lateral raise|front raise|reverse fly|reverse pec|face pull|deltoid|scrollat/i,
    groups: ["shoulders"],
  },
  { match: /curl|biceps|bicip/i, groups: ["biceps"] },
  {
    match: /push ?down|triceps|tricip|french press|skull|kickback|estension.*testa/i,
    groups: ["triceps"],
  },
  { match: /crunch|plank|addom|ab wheel|sit ?up|leg raise/i, groups: ["abs"] },
  { match: /hip thrust|glute|ponte/i, groups: ["glutes"] },
  { match: /forearm|wrist|avambracc|farmer/i, groups: ["forearms"] },
  { match: /adduttor/i, groups: ["quads"] },
  { match: /abduttor/i, groups: ["glutes"] },
  {
    match: /corsa|sprint|tapis|cyclette|ellittica|skip|calciata|andatur|balz|box jump/i,
    groups: ["quads", "hamstrings", "glutes", "calves"],
  },
  { match: /vogator/i, groups: ["back", "biceps", "quads"] },
  {
    match: /burpee|kettlebell swing|clean|snatch|thruster/i,
    groups: ["shoulders", "back", "quads", "hamstrings", "glutes"],
  },
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
  caviglia: ["tibialis", "calves"],
  caviglie: ["tibialis", "calves"],
  gambe: ["quads", "hamstrings", "glutes", "calves"],
  cardio: ["quads", "hamstrings", "glutes", "calves"],
  atletica: ["quads", "hamstrings", "glutes", "calves"],
  "full body": ["shoulders", "back", "quads", "hamstrings", "glutes"],
};

export function musclesFor(exerciseName: string, storedGroup?: string | null): MuscleGroup[] {
  for (const r of RULES) {
    if (r.match.test(exerciseName)) return r.groups;
  }
  return storedGroup ? (STORED_GROUPS[storedGroup.trim().toLocaleLowerCase("it")] ?? []) : [];
}

/** Value stored for custom imported exercises, derived from the same central mapping. */
export function storedMuscleGroupFor(exerciseName: string): string | null {
  if (
    ANKLE_PATTERN.test(exerciseName)
  ) {
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
