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
  | "forearms";

const RULES: Array<{ match: RegExp; groups: MuscleGroup[] }> = [
  { match: /panca|bench|push[- ]?up|chest|pettoral|croci|fly|dip/i, groups: ["chest", "triceps"] },
  { match: /squat|leg press|affond|lunge|hack/i, groups: ["quads", "glutes"] },
  { match: /stacc|deadlift|good ?morning/i, groups: ["hamstrings", "glutes", "back"] },
  { match: /leg curl|femoral/i, groups: ["hamstrings"] },
  { match: /leg extension|quadric/i, groups: ["quads"] },
  { match: /polpacc|calf|calves/i, groups: ["calves"] },
  { match: /trazion|pull ?up|chin ?up|lat ?machine|pulldown|rowing|row|rematore|rem\./i, groups: ["back", "biceps"] },
  { match: /shoulder|spall|military|lento|overhead|arnold/i, groups: ["shoulders", "triceps"] },
  { match: /alzat|lateral raise|front raise|reverse fly|deltoid/i, groups: ["shoulders"] },
  { match: /curl|biceps|bicip/i, groups: ["biceps"] },
  { match: /pushdown|triceps|tricip|french press|skull/i, groups: ["triceps"] },
  { match: /crunch|plank|addom|ab wheel|sit ?up|leg raise/i, groups: ["abs"] },
  { match: /hip thrust|glute|ponte/i, groups: ["glutes"] },
  { match: /forearm|wrist|avambraccio/i, groups: ["forearms"] },
];

export function musclesFor(exerciseName: string): MuscleGroup[] {
  for (const r of RULES) {
    if (r.match.test(exerciseName)) return r.groups;
  }
  return [];
}
