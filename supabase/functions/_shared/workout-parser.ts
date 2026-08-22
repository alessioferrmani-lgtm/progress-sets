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
const DAY = /^(?:giorno|day)\s*[:-]?\s*(.+)$/i;
const NAMED_DAY =
  /^(luned[i\u00ec]|marted[i\u00ec]|mercoled[i\u00ec]|gioved[i\u00ec]|venerd[i\u00ec]|sabato|domenica|push|pull|gambe|legs|upper|lower)\s*:?$/i;
const COMPACT =
  /^(.+?)\s+(\d+)\s*[xX\u00d7]\s*(.+?)(?:\s+(?:rec(?:upero)?|rest)\s*[:-]?\s*(.+))?$/i;
const SERIES_LINE = /^(\d+)\s*(?:serie|sets?)\s*(?:(?:x|\u00d7|da|per)\s*)?(.+)$/i;

/**
 * Parses the plain-text format used by the paste importer without relying on
 * the AI service. In particular, it supports the natural Italian format:
 * "Esercizio" followed by "4 serie x 4 ripetizioni" and "Recupero: 180 secondi".
 */
export function parseWorkoutLocally(input: string): ParsedTemplate[] {
  const lines = input
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim().replace(/^[-*\u2022]\s*/, ""))
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
    if (compact && !SERIES_LINE.test(line)) {
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
      applyField(draft, field[1], field[2]);
      continue;
    }

    const series = line.match(SERIES_LINE);
    if (series && draft) {
      draft.sets = positiveInteger(series[1]) ?? 3;
      draft.reps = normalizeRepsText(series[2]);
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

function applyField(draft: ExerciseDraft, rawKey: string, rawValue: string) {
  const key = rawKey.toLowerCase();
  const value = rawValue.trim();
  if (key === "serie" || key === "set") draft.sets = positiveInteger(value) ?? 3;
  else if (key.startsWith("rip") || key.startsWith("rep")) draft.reps = normalizeRepsText(value);
  else draft.rest = value;
}

function toExercise(draft: ExerciseDraft): ParsedExercise {
  const repsDisplay = normalizeRepsText(draft.reps || "-") || "-";
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

function normalizeRepsText(value: string): string {
  return value
    .trim()
    .replace(/\bripetizioni?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseReps(value: string): {
  type: ParsedExercise["reps_type"];
  value: number | null;
} {
  if (/\b(km|m|metri|metro)\b/i.test(value)) return { type: "distance", value: null };
  if (/\b(sec|secondi|min|minuti|secondo|minuto)\b/i.test(value)) {
    return { type: "time", value: null };
  }
  const count = value.match(/^(\d+)(?:\s*[-\u2013]\s*\d+)?(?:\s+.*)?$/);
  if (count) return { type: "count", value: Number(count[1]) };
  return { type: "unspecified", value: null };
}

function parseDuration(value?: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^(nessuno|no|zero)$/i.test(trimmed)) return 0;

  const clock = trimmed.match(/^(\d+)\s*:\s*([0-5]\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  const number = Number(trimmed.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(/\b(min|minuti?)\b/i.test(trimmed) ? number * 60 : number);
}

function positiveInteger(value: string): number | null {
  const number = Number(value.trim());
  return Number.isInteger(number) && number > 0 ? number : null;
}
