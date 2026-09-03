export type ParsedExercise = {
  name: string;
  sets: number;
  reps_type: "count" | "time" | "distance" | "unspecified";
  reps_value: number | null;
  reps_display: string;
  rest_sec: number;
  target_weight_kg: number | null;
  objective: string | null;
  rir: string | null;
  alternative: string | null;
};

export type ParsedTemplate = {
  name: string;
  exercises: ParsedExercise[];
  _warnings: string[];
  program_name?: string;
  program_week?: number;
  session_key?: string;
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
  const periodized = parsePeriodizedMarkdown(input);
  if (periodized) return periodized;

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

/**
 * Parses the markdown tables used by periodized programs. Each session table
 * contains four weekly prescriptions; the importer turns those columns into
 * four templates linked by program_name/program_week/session_key metadata.
 */
function parsePeriodizedMarkdown(input: string): ParsedTemplate[] | null {
  const lines = input.replace(/\r/g, "").split("\n").map((line) => line.trim());
  const programHeading = lines.find((line) => /^#\s+/.test(line) && !/^##/.test(line));
  const programName = programHeading
    ? programHeading.replace(/^#+\s*/, "").replace(/\*+/g, "").trim()
    : "Programma periodizzato";

  const sessions: Array<{
    key: string;
    name: string;
    rows: Array<{
      name: string;
      weeks: string[];
      rest: string;
      objective: string | null;
      rir: string | null;
      alternative: string | null;
    }>;
  }> = [];
  let current: (typeof sessions)[number] | null = null;
  let sawPeriodizedTable = false;

  for (const line of lines) {
    const heading = line.match(/^#{2,4}\s*SEDUTA\s+([A-Z])\s*[—–-]\s*(.+)$/i);
    if (heading) {
      current = { key: heading[1].toUpperCase(), name: heading[2].trim(), rows: [] };
      sessions.push(current);
      continue;
    }
    if (!current || !line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 7) continue;
    if (/^esercizio$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue;
    if (cells.slice(1).every((cell) => /^:?-{2,}:?$/.test(cell))) continue;
    const weeks = cells.slice(2, 6);
    if (weeks.length !== 4 || !weeks.some((value) => /\d+\s*[x×]/i.test(value))) continue;
    sawPeriodizedTable = true;
    const name = cleanExerciseName(cells[0]);
    if (name) {
      current.rows.push({
        name,
        weeks,
        rest: cells[6],
        objective: cleanCell(cells[1]),
        rir: cleanCell(cells[7]),
        alternative: cleanCell(cells[8]),
      });
    }
  }

  if (!sawPeriodizedTable || sessions.length === 0) return null;

  const templates: ParsedTemplate[] = [];
  sessions.forEach((session) => {
    for (let week = 0; week < 4; week++) {
      const exercises = session.rows
        .map((row) =>
          parsePrescription(row.name, row.weeks[week], row.rest, {
            objective: row.objective,
            rir: row.rir,
            alternative: row.alternative,
          }),
        )
        .filter((exercise): exercise is ParsedExercise => exercise !== null);
      if (exercises.length === 0) continue;
      templates.push({
        name: `Seduta ${session.key} · Settimana ${week + 1}`,
        exercises,
        program_name: programName,
        program_week: week + 1,
        session_key: session.key,
        _warnings: [
          "Programma periodizzato: controlla i valori prima di salvare.",
          "RIR, alternative, obiettivi e note mediche restano nel testo originale e non vengono trasformati in esercizi.",
        ],
      });
    }
  });
  return templates.length > 0 ? templates : null;
}

function cleanExerciseName(value: string): string {
  return value
    .replace(/\*+/g, "")
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanCell(value: string | undefined): string | null {
  const cleaned = (value ?? "").replace(/\*+/g, "").trim();
  return cleaned && !/^[-–—]$/.test(cleaned) ? cleaned : null;
}

function parsePrescription(
  name: string,
  prescription: string,
  rest: string,
  metadata: { objective: string | null; rir: string | null; alternative: string | null },
): ParsedExercise | null {
  if (!prescription || /^(eliminare|[-–—])$/i.test(prescription.trim())) return null;
  const compact = prescription.match(/^(\d+)\s*[x×]\s*(\d+(?:\s*[-–]\s*\d+)?)/i);
  if (!compact) return null;
  const repsRaw = compact[2].replace(/[–—]/g, "-").replace(/\s+/g, "");
  const repsDisplay = displayReps(repsRaw, prescription.slice(compact[0].length));
  const reps = parseReps(repsDisplay);
  const weightMatch = prescription.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  return {
    name,
    sets: Number(compact[1]),
    reps_type: reps.type,
    reps_value: reps.value,
    reps_display: repsDisplay,
    rest_sec: parseDuration(rest) ?? 90,
    target_weight_kg: weightMatch ? Number(weightMatch[1].replace(",", ".")) : null,
    objective: metadata.objective,
    rir: metadata.rir,
    alternative: metadata.alternative,
  };
}

function displayReps(value: string, tail: string): string {
  const unit = /\b(secondi|secondo|sec|s)\b/i.test(tail)
    ? "secondi"
    : /\b(minuti|minuto|min)\b/i.test(tail)
      ? "minuti"
      : /\b(metri|metro|km|m)\b/i.test(tail)
        ? "metri"
        : "";
  const side = tail.match(/(?:per\s+|\/)(gamba|lato|piede)/i)?.[1];
  return [value, unit, side ? `per ${side.toLocaleLowerCase("it")}` : ""]
    .filter(Boolean)
    .join(" ");
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
    target_weight_kg: null,
    objective: null,
    rir: null,
    alternative: null,
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
  if (/\b(sec|secondi|min|minuti|secondo|minuto|s)\b/i.test(value)) {
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
