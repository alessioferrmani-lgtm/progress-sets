export type ParsedExercise = {
  name: string;
  sets: number;
  reps_type: "count" | "time" | "distance" | "unspecified";
  reps_value: number | null;
  reps_display: string;
  rest_sec: number;
};

export type ParsedTemplate = {
  name: string;
  exercises: ParsedExercise[];
  _warnings: string[];
};

type ExerciseDraft = {
  name: string;
  sets?: number;
  reps?: string;
  rest?: string;
};

const FIELD = /^(serie|set|ripetizioni|reps?|recupero|rest)\s*:\s*(.+)$/i;
const DAY = /^(?:giorno|day)\s*[:\-]?\s*(.+)$/i;
const NAMED_DAY = /^(luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica|push|pull|gambe|legs|upper|lower)\s*:?$/i;
const COMPACT = /^(.+?)\s+(\d+)\s*[x×]\s*(.+?)(?:\s+(?:rec(?:upero)?|rest)\s*[:\-]?\s*(.+))?$/i;

export function parseWorkoutLocally(input: string): ParsedTemplate[] {
  const lines = input
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);

  const templates: ParsedTemplate[] = [];
  let template = createTemplate("Scheda");
  let draft: ExerciseDraft | null = null;

  const flushExercise = () => {
    if (!draft) return;
    template.exercises.push(toExercise(draft));
    draft = null;
  };

  const flushTemplate = () => {
    flushExercise();
    if (template.exercises.length > 0) templates.push(template);
  };

  for (const line of lines) {
    const day = line.match(DAY);
    if (day || NAMED_DAY.test(line)) {
      flushTemplate();
      const name = day?.[1]?.trim() || line.replace(/:$/, "").trim();
      template = createTemplate(name || "Scheda");
      continue;
    }

    const compact = line.match(COMPACT);
    if (compact) {
      flushExercise();
      template.exercises.push(
        toExercise({
          name: compact[1].trim(),
          sets: Number(compact[2]),
          reps: compact[3].trim(),
          rest: compact[4]?.trim(),
        }),
      );
      continue;
    }

    const field = line.match(FIELD);
    if (field && draft) {
      const key = field[1].toLowerCase();
      const value = field[2].trim();
      if (key === "serie" || key === "set") draft.sets = positiveInteger(value) ?? 3;
      else if (key.startsWith("rip") || key.startsWith("rep")) draft.reps = value;
      else draft.rest = value;
      continue;
    }

    flushExercise();
    draft = { name: line.replace(/:$/, "").trim() };
  }

  flushTemplate();

  if (templates.length === 0) {
    throw new Error("Nessun esercizio riconosciuto nella scheda.");
  }

  for (const item of templates) {
    item._warnings.push(
      "Scheda interpretata in modalità locale: controlla serie, ripetizioni e recuperi prima di salvare.",
    );
  }

  return templates;
}

function createTemplate(name: string): ParsedTemplate {
  return { name, exercises: [], _warnings: [] };
}

function toExercise(draft: ExerciseDraft): ParsedExercise {
  const repsDisplay = draft.reps?.trim() || "-";
  const reps = parseReps(repsDisplay);
  return {
    name: draft.name,
    sets: draft.sets && draft.sets > 0 ? Math.round(draft.sets) : 3,
    reps_type: reps.type,
    reps_value: reps.value,
    reps_display: repsDisplay,
    rest_sec: parseDuration(draft.rest) ?? 90,
  };
}

function parseReps(value: string): {
  type: ParsedExercise["reps_type"];
  value: number | null;
} {
  if (/\b(km|m|metri|metro)\b/i.test(value)) return { type: "distance", value: null };
  if (/\b(sec|secondi|min|minuti)\b/i.test(value)) return { type: "time", value: null };
  const count = value.match(/^(\d+)(?:\s*[-–]\s*\d+)?$/);
  if (count) return { type: "count", value: Number(count[1]) };
  return { type: "unspecified", value: null };
}

function parseDuration(value?: string): number | null {
  if (!value) return null;
  if (/^(nessuno|no|zero)$/i.test(value.trim())) return 0;
  const number = Number(value.replace(",", ".").match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(/\b(min|minuti?)\b/i.test(value) ? number * 60 : number);
}

function positiveInteger(value: string): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
