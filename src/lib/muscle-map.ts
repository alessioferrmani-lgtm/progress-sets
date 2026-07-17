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

const RULES: Array<{ match: RegExp; groups: MuscleGroup[] }> = [
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
