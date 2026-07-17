import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, subYears } from "date-fns";
import { it } from "date-fns/locale";

export type ExportPeriod = "1m" | "3m" | "1y" | "all";
export type PreparedExport = { file: File; format: "xlsx" | "pdf" };
export type PrepareExportResult = { empty: boolean; prepared?: PreparedExport };

export function periodStart(period: ExportPeriod, now = new Date()): Date | null {
  switch (period) {
    case "1m":
      return subMonths(now, 1);
    case "3m":
      return subMonths(now, 3);
    case "1y":
      return subYears(now, 1);
    case "all":
      return null;
  }
}

function periodLabel(period: ExportPeriod): string {
  return { "1m": "Ultimo mese", "3m": "Ultimi 3 mesi", "1y": "Ultimo anno", all: "Da sempre" }[
    period
  ];
}

type Session = {
  id: string;
  date: string;
  template: string;
  duration_min: number | null;
  calories: number | null;
};
type WorkoutSet = {
  session_id: string;
  date: string;
  template: string;
  exercise: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rest_taken_sec: number | null;
};
type Test = {
  date: string;
  type: string;
  result: string;
  avg_hr: number | null;
  calories: number | null;
  notes: string | null;
};
type Race = {
  date: string;
  name: string;
  distance_m: number;
  time_sec: number;
  placement: number | null;
  calories: number | null;
  notes: string | null;
};
type IntervalSession = {
  date: string;
  signature: string;
  repetitions: number;
  distance_m: number;
  active_time_sec: number;
  calories: number | null;
  notes: string | null;
};

export type ExportData = {
  sessions: Session[];
  workouts: WorkoutSet[];
  tests: Test[];
  races: Race[];
  intervals: IntervalSession[];
  personalRecordsGym: Array<{ exercise: string; weight_kg: number; reps: number; date: string }>;
  personalRecordsAthletics: Array<{
    distance_m: number;
    time_sec: number;
    date: string;
    source: string;
  }>;
  summary: {
    period: string;
    workout_count: number;
    test_count: number;
    race_count: number;
    interval_count: number;
    total_volume_kg: number;
    total_calories: number;
  };
};

function assertQuery<T>(
  result: { data: T | null; error: { message: string } | null },
  context: string,
): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data as T;
}

async function loadExportData(period: ExportPeriod): Promise<ExportData> {
  const auth = await supabase.auth.getUser();
  if (auth.error) throw new Error(`Accesso: ${auth.error.message}`);
  const userId = auth.data.user?.id;
  if (!userId) throw new Error("Sessione scaduta");

  const start = periodStart(period);
  const startISO = start?.toISOString() ?? null;
  const startDate = startISO?.slice(0, 10) ?? null;

  let sessQ = supabase
    .from("workout_sessions")
    .select("id,started_at,ended_at,calories_burned,workout_templates(name)")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });
  if (startISO) sessQ = sessQ.gte("started_at", startISO);
  const sessionsRaw = assertQuery(await sessQ, "Allenamenti");

  const sessions: Session[] = sessionsRaw.map((s) => {
    const tpl = s.workout_templates as { name?: string } | null;
    const duration = s.ended_at
      ? (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      : null;
    return {
      id: s.id,
      date: format(new Date(s.started_at), "yyyy-MM-dd HH:mm"),
      template: tpl?.name ?? "—",
      duration_min:
        duration !== null && Number.isFinite(duration) && duration >= 0
          ? Math.round(duration)
          : null,
      calories: s.calories_burned == null ? null : Number(s.calories_burned),
    };
  });
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  let workouts: WorkoutSet[] = [];
  if (sessions.length) {
    const logged = assertQuery(
      await supabase
        .from("logged_sets")
        .select("session_id,set_number,weight_kg,reps,rest_taken_sec,completed_at,exercises(name)")
        .in(
          "session_id",
          sessions.map((s) => s.id),
        )
        .order("completed_at", { ascending: true }),
      "Serie",
    );
    workouts = logged.map((r) => {
      const session = sessionById.get(r.session_id);
      const exercise = r.exercises as { name?: string } | null;
      return {
        session_id: r.session_id,
        date: session?.date ?? "",
        template: session?.template ?? "—",
        exercise: exercise?.name ?? "—",
        set_number: r.set_number,
        weight_kg: Number(r.weight_kg ?? 0),
        reps: r.reps,
        rest_taken_sec: r.rest_taken_sec,
      };
    });
  }

  let testQ = supabase
    .from("tests")
    .select(
      "date,time_sec,distance_covered_m,avg_hr,notes,calories_burned,test_types(name,result_type)",
    )
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (startDate) testQ = testQ.gte("date", startDate);
  const testsRaw = assertQuery(await testQ, "Test");
  const tests: Test[] = testsRaw.map((t) => {
    const type = t.test_types as { name?: string; result_type?: string } | null;
    const value =
      type?.result_type === "TIME"
        ? t.time_sec == null
          ? "—"
          : fmtTime(Number(t.time_sec))
        : t.distance_covered_m == null
          ? "—"
          : `${t.distance_covered_m} m`;
    return {
      date: t.date,
      type: type?.name ?? "—",
      result: value,
      avg_hr: t.avg_hr,
      calories: t.calories_burned == null ? null : Number(t.calories_burned),
      notes: t.notes,
    };
  });

  let raceQ = supabase
    .from("races")
    .select("date,name,distance_m,time_sec,placement,notes,calories_burned")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (startDate) raceQ = raceQ.gte("date", startDate);
  const racesRaw = assertQuery(await raceQ, "Gare");
  const races: Race[] = racesRaw.map((r) => ({
    ...r,
    calories: r.calories_burned == null ? null : Number(r.calories_burned),
  }));

  let intervalQ = supabase
    .from("interval_sessions")
    .select("date,signature,notes,calories_burned,interval_reps(distance_m,time_sec)")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (startDate) intervalQ = intervalQ.gte("date", startDate);
  const intervalsRaw = assertQuery(await intervalQ, "Ripetute");
  const intervals: IntervalSession[] = intervalsRaw.map((session) => {
    const reps = (session.interval_reps ?? []) as Array<{ distance_m: number; time_sec: number }>;
    return {
      date: session.date,
      signature: session.signature || "Sessione ripetute",
      repetitions: reps.length,
      distance_m: reps.reduce((sum, rep) => sum + Number(rep.distance_m), 0),
      active_time_sec: reps.reduce((sum, rep) => sum + Number(rep.time_sec), 0),
      calories: session.calories_burned == null ? null : Number(session.calories_burned),
      notes: session.notes,
    };
  });

  const prGymRaw = assertQuery(
    await supabase
      .from("logged_sets")
      .select("weight_kg,reps,completed_at,exercises(name),workout_sessions!inner(user_id)")
      .eq("workout_sessions.user_id", userId)
      .order("weight_kg", { ascending: false })
      .limit(5000),
    "Record palestra",
  );
  const gymMap = new Map<string, { weight_kg: number; reps: number; date: string }>();
  prGymRaw.forEach((r) => {
    const name = (r.exercises as { name?: string } | null)?.name ?? "—";
    const weight = Number(r.weight_kg ?? 0);
    const current = gymMap.get(name);
    if (weight > 0 && (!current || weight > current.weight_kg))
      gymMap.set(name, { weight_kg: weight, reps: r.reps, date: r.completed_at.slice(0, 10) });
  });

  const perf = assertQuery(
    await supabase
      .from("performance_log")
      .select("distance_m,time_sec,date,source")
      .eq("user_id", userId)
      .order("time_sec", { ascending: true }),
    "Record atletica",
  );
  const athMap = new Map<number, { time_sec: number; date: string; source: string }>();
  perf.forEach((p) => {
    if (!athMap.has(p.distance_m))
      athMap.set(p.distance_m, { time_sec: p.time_sec, date: p.date, source: p.source });
  });

  const totalVolume = workouts.reduce((sum, w) => sum + w.weight_kg * w.reps, 0);
  const totalCalories = [
    ...sessions.map((s) => s.calories),
    ...tests.map((t) => t.calories),
    ...races.map((r) => r.calories),
    ...intervals.map((session) => session.calories),
  ].reduce<number>((sum, value) => sum + (Number.isFinite(value) ? Number(value) : 0), 0);
  return {
    sessions,
    workouts,
    tests,
    races,
    intervals,
    personalRecordsGym: Array.from(gymMap, ([exercise, v]) => ({ exercise, ...v })).sort(
      (a, b) => b.weight_kg - a.weight_kg,
    ),
    personalRecordsAthletics: Array.from(athMap, ([distance_m, v]) => ({ distance_m, ...v })).sort(
      (a, b) => a.distance_m - b.distance_m,
    ),
    summary: {
      period: periodLabel(period),
      workout_count: sessions.length,
      test_count: tests.length,
      race_count: races.length,
      interval_count: intervals.length,
      total_volume_kg: Math.round(totalVolume),
      total_calories: Math.round(totalCalories),
    },
  };
}

function isEmpty(data: ExportData): boolean {
  return (
    !data.sessions.length && !data.tests.length && !data.races.length && !data.intervals.length
  );
}
function filename(ext: string): string {
  return `progress-sets-progressi-${format(new Date(), "yyyy-MM-dd")}.${ext}`;
}

export function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const hundredths = Math.round(sec * 100);
  if (hundredths < 6000) return `${(hundredths / 100).toFixed(2)}s`;
  const minutes = Math.floor(hundredths / 6000);
  const remaining = (hundredths - minutes * 6000) / 100;
  return `${minutes}:${remaining.toFixed(2).padStart(5, "0")}`;
}

function addSheet(
  wb: XLSX.WorkBook,
  name: string,
  rows: Record<string, unknown>[],
  widths: number[],
) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Informazione: "Nessun dato" }]);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  ws["!autofilter"] = ws["!ref"] ? { ref: ws["!ref"] } : undefined;
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function buildWorkbook(data: ExportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  addSheet(
    wb,
    "Riepilogo",
    [
      { Voce: "Periodo", Valore: data.summary.period },
      { Voce: "Allenamenti", Valore: data.summary.workout_count },
      { Voce: "Test", Valore: data.summary.test_count },
      { Voce: "Gare", Valore: data.summary.race_count },
      { Voce: "Sessioni atletica", Valore: data.summary.interval_count },
      { Voce: "Volume totale (kg)", Valore: data.summary.total_volume_kg },
      { Voce: "Calorie totali (kcal)", Valore: data.summary.total_calories },
    ],
    [24, 22],
  );
  addSheet(
    wb,
    "Sessioni",
    data.sessions.map((s) => ({
      Data: s.date,
      Scheda: s.template,
      Durata_min: s.duration_min ?? "",
      Calorie_kcal: s.calories ?? "",
    })),
    [19, 28, 13, 14],
  );
  addSheet(
    wb,
    "Serie",
    data.workouts.map((w) => ({
      Data: w.date,
      Scheda: w.template,
      Esercizio: w.exercise,
      Serie: w.set_number,
      Peso_kg: w.weight_kg,
      Ripetizioni: w.reps,
      Recupero_sec: w.rest_taken_sec ?? "",
    })),
    [19, 25, 28, 8, 11, 13, 14],
  );
  addSheet(
    wb,
    "Test",
    data.tests.map((t) => ({
      Data: t.date,
      Tipo: t.type,
      Risultato: t.result,
      FC_media: t.avg_hr ?? "",
      Calorie_kcal: t.calories ?? "",
      Note: t.notes ?? "",
    })),
    [13, 28, 16, 11, 14, 35],
  );
  addSheet(
    wb,
    "Gare",
    data.races.map((r) => ({
      Data: r.date,
      Nome: r.name,
      Distanza_m: r.distance_m,
      Tempo: fmtTime(r.time_sec),
      Posizione: r.placement ?? "",
      Calorie_kcal: r.calories ?? "",
      Note: r.notes ?? "",
    })),
    [13, 28, 13, 12, 11, 14, 35],
  );
  addSheet(
    wb,
    "Ripetute",
    data.intervals.map((session) => ({
      Data: session.date,
      Sessione: session.signature,
      Ripetute: session.repetitions,
      Distanza_m: session.distance_m,
      Tempo_attivo: fmtTime(session.active_time_sec),
      Calorie_kcal: session.calories ?? "",
      Note: session.notes ?? "",
    })),
    [13, 24, 11, 13, 14, 14, 35],
  );
  addSheet(
    wb,
    "Record",
    [
      ...data.personalRecordsGym.map((p) => ({
        Sezione: "Palestra",
        Prova: p.exercise,
        Risultato: `${p.weight_kg} kg × ${p.reps}`,
        Data: p.date,
      })),
      ...data.personalRecordsAthletics.map((p) => ({
        Sezione: "Atletica",
        Prova: `${p.distance_m} m`,
        Risultato: fmtTime(p.time_sec),
        Data: p.date,
      })),
    ],
    [14, 30, 18, 13],
  );
  return wb;
}

export async function deliverExportFile(
  prepared: PreparedExport,
): Promise<"shared" | "downloaded" | "opened"> {
  const { file } = prepared;
  const shareData = { files: [file], title: file.name };
  if (navigator.share && navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        throw new Error("Esportazione annullata");
      // Some iOS/PWA versions report NotAllowedError even after a direct tap.
      // Continue with the visible-file fallback below.
    }
  }
  const url = URL.createObjectURL(file);
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
    return "opened";
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}

export async function prepareExcelExport(period: ExportPeriod): Promise<PrepareExportResult> {
  const data = await loadExportData(period);
  if (isEmpty(data)) return { empty: true };
  const bytes = XLSX.write(buildWorkbook(data), {
    type: "array",
    bookType: "xlsx",
    compression: true,
  });
  const file = new File([bytes], filename("xlsx"), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return { empty: false, prepared: { file, format: "xlsx" } };
}

function table(doc: jsPDF, title: string, head: string[][], body: Array<Array<string | number>>) {
  doc.addPage();
  doc.setFontSize(14);
  doc.text(title, 14, 20);
  autoTable(doc, {
    startY: 26,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [0, 122, 255] },
  });
}

export function buildPDF(data: ExportData): jsPDF {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Progress Sets — Report progressi", 14, 20);
  doc.setFontSize(10);
  doc.text(
    `Periodo: ${data.summary.period} · Generato il ${format(new Date(), "d MMM yyyy", { locale: it })}`,
    14,
    28,
  );
  autoTable(doc, {
    startY: 38,
    head: [["Palestra", "Atletica", "Test", "Gare", "Volume kg", "Calorie kcal"]],
    body: [
      [
        data.summary.workout_count,
        data.summary.interval_count,
        data.summary.test_count,
        data.summary.race_count,
        data.summary.total_volume_kg,
        data.summary.total_calories,
      ],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 122, 255] },
  });
  if (data.sessions.length)
    table(
      doc,
      "Sessioni",
      [["Data", "Scheda", "Durata", "kcal"]],
      data.sessions.map((s) => [
        s.date,
        s.template,
        s.duration_min == null ? "—" : `${s.duration_min} min`,
        s.calories ?? "—",
      ]),
    );
  if (data.workouts.length)
    table(
      doc,
      "Serie",
      [["Data", "Scheda", "Esercizio", "Set", "Kg", "Rep", "Rec"]],
      data.workouts.map((w) => [
        w.date,
        w.template,
        w.exercise,
        w.set_number,
        w.weight_kg,
        w.reps,
        w.rest_taken_sec == null ? "—" : `${w.rest_taken_sec}s`,
      ]),
    );
  if (data.tests.length)
    table(
      doc,
      "Test",
      [["Data", "Tipo", "Risultato", "FC", "kcal", "Note"]],
      data.tests.map((t) => [
        t.date,
        t.type,
        t.result,
        t.avg_hr ?? "—",
        t.calories ?? "—",
        t.notes ?? "",
      ]),
    );
  if (data.races.length)
    table(
      doc,
      "Gare",
      [["Data", "Gara", "Distanza", "Tempo", "Pos", "kcal"]],
      data.races.map((r) => [
        r.date,
        r.name,
        `${r.distance_m}m`,
        fmtTime(r.time_sec),
        r.placement ?? "—",
        r.calories ?? "—",
      ]),
    );
  if (data.intervals.length)
    table(
      doc,
      "Sessioni atletica - Ripetute",
      [["Data", "Sessione", "Rip.", "Distanza", "Tempo", "kcal"]],
      data.intervals.map((session) => [
        session.date,
        session.signature,
        session.repetitions,
        `${session.distance_m}m`,
        fmtTime(session.active_time_sec),
        session.calories ?? "—",
      ]),
    );
  if (data.personalRecordsGym.length || data.personalRecordsAthletics.length)
    table(
      doc,
      "Record personali (da sempre)",
      [["Sezione", "Prova", "Risultato", "Data"]],
      [
        ...data.personalRecordsGym.map((p) => [
          "Palestra",
          p.exercise,
          `${p.weight_kg} kg × ${p.reps}`,
          p.date,
        ]),
        ...data.personalRecordsAthletics.map((p) => [
          "Atletica",
          `${p.distance_m} m`,
          fmtTime(p.time_sec),
          p.date,
        ]),
      ],
    );
  return doc;
}

export async function preparePDFExport(period: ExportPeriod): Promise<PrepareExportResult> {
  const data = await loadExportData(period);
  if (isEmpty(data)) return { empty: true };
  const blob = buildPDF(data).output("blob");
  const file = new File([blob], filename("pdf"), { type: "application/pdf" });
  return { empty: false, prepared: { file, format: "pdf" } };
}
