import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export type ExportPeriod = "1m" | "3m" | "1y" | "all";

function periodStart(period: ExportPeriod): Date | null {
  const now = new Date();
  const d = new Date(now);
  switch (period) {
    case "1m":
      d.setMonth(d.getMonth() - 1);
      return d;
    case "3m":
      d.setMonth(d.getMonth() - 3);
      return d;
    case "1y":
      d.setFullYear(d.getFullYear() - 1);
      return d;
    case "all":
      return null;
  }
}

function periodLabel(period: ExportPeriod): string {
  switch (period) {
    case "1m":
      return "Ultimo mese";
    case "3m":
      return "Ultimi 3 mesi";
    case "1y":
      return "Ultimo anno";
    case "all":
      return "Da sempre";
  }
}

type ExportData = {
  workouts: Array<{
    date: string;
    template: string;
    exercise: string;
    set_number: number;
    weight_kg: number;
    reps: number;
    reps_display: string;
    rest_taken_sec: number | null;
    calories_burned: number | null;
    session_id: string;
  }>;
  tests: Array<{
    date: string;
    type: string;
    result: string;
    avg_hr: number | null;
    notes: string | null;
  }>;
  races: Array<{
    date: string;
    name: string;
    distance_m: number;
    time_sec: number;
    placement: number | null;
    notes: string | null;
  }>;
  personalRecordsGym: Array<{ exercise: string; weight_kg: number; reps: number; date: string }>;
  personalRecordsAthletics: Array<{ distance_m: number; time_sec: number; date: string; source: string }>;
  summary: {
    period: string;
    workout_count: number;
    total_volume_kg: number;
    total_calories: number;
  };
};

async function loadExportData(period: ExportPeriod): Promise<ExportData> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error("Sessione scaduta");

  const start = periodStart(period);
  const startISO = start ? start.toISOString() : null;
  const startDate = start ? start.toISOString().slice(0, 10) : null;

  // Sessions in period
  let sessQ = supabase
    .from("workout_sessions")
    .select("id,started_at,template_id,calories_burned,workout_templates(name)")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
  if (startISO) sessQ = sessQ.gte("started_at", startISO);
  const { data: sessions } = await sessQ;

  const sessionIds = (sessions ?? []).map((s) => s.id);
  let logged: Array<Record<string, unknown>> = [];
  if (sessionIds.length) {
    const { data } = await supabase
      .from("logged_sets")
      .select(
        "session_id,exercise_id,set_number,weight_kg,reps,rest_taken_sec,completed_at,exercises(name)",
      )
      .in("session_id", sessionIds);
    logged = (data ?? []) as Array<Record<string, unknown>>;
  }

  const sessionById = new Map<string, { started_at: string; template: string; calories: number | null }>();
  (sessions ?? []).forEach((s) => {
    const tpl = s.workout_templates as { name?: string } | null;
    sessionById.set(s.id, {
      started_at: s.started_at,
      template: tpl?.name ?? "—",
      calories: s.calories_burned,
    });
  });

  const workouts = logged.map((r) => {
    const info = sessionById.get(r.session_id as string);
    const ex = r.exercises as { name?: string } | null;
    return {
      date: info ? format(new Date(info.started_at), "yyyy-MM-dd HH:mm") : "",
      template: info?.template ?? "—",
      exercise: ex?.name ?? "—",
      set_number: r.set_number as number,
      weight_kg: Number(r.weight_kg ?? 0),
      reps: r.reps as number,
      reps_display: String(r.reps ?? ""),
      rest_taken_sec: (r.rest_taken_sec as number | null) ?? null,
      calories_burned: info?.calories ?? null,
      session_id: r.session_id as string,
    };
  });

  // Tests
  let testQ = supabase
    .from("tests")
    .select(
      "date,time_sec,distance_covered_m,avg_hr,notes,observations,test_types(name,result_type,distance_m,duration_sec)",
    )
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (startDate) testQ = testQ.gte("date", startDate);
  const { data: testsRaw } = await testQ;
  const tests = (testsRaw ?? []).map((t) => {
    const tt = t.test_types as {
      name?: string;
      result_type?: string;
      distance_m?: number | null;
    } | null;
    const isTime = tt?.result_type === "TIME";
    const result = isTime
      ? t.time_sec != null
        ? `${t.time_sec}s`
        : "—"
      : t.distance_covered_m != null
        ? `${t.distance_covered_m}m`
        : "—";
    return {
      date: t.date as string,
      type: tt?.name ?? "—",
      result,
      avg_hr: (t.avg_hr as number | null) ?? null,
      notes: (t.notes as string | null) ?? null,
    };
  });

  // Races
  let raceQ = supabase
    .from("races")
    .select("date,name,distance_m,time_sec,placement,notes")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (startDate) raceQ = raceQ.gte("date", startDate);
  const { data: races } = await raceQ;

  // PR gym: max weight per exercise across ALL time (records are always all-time)
  const { data: prGymRaw } = await supabase
    .from("logged_sets")
    .select(
      "weight_kg,reps,completed_at,exercises(name),workout_sessions!inner(user_id)",
    )
    .eq("workout_sessions.user_id", userId)
    .order("weight_kg", { ascending: false })
    .limit(2000);
  const prGymMap = new Map<string, { weight_kg: number; reps: number; date: string }>();
  (prGymRaw ?? []).forEach((r) => {
    const ex = r.exercises as { name?: string } | null;
    const name = ex?.name ?? "—";
    const cur = prGymMap.get(name);
    const w = Number(r.weight_kg ?? 0);
    if (!cur || w > cur.weight_kg) {
      prGymMap.set(name, {
        weight_kg: w,
        reps: r.reps as number,
        date: (r.completed_at as string).slice(0, 10),
      });
    }
  });

  // PR athletics: best per distance from performance_log
  const { data: perfAll } = await supabase
    .from("performance_log")
    .select("distance_m,time_sec,date,source")
    .eq("user_id", userId)
    .order("time_sec", { ascending: true });
  const prAthMap = new Map<number, { time_sec: number; date: string; source: string }>();
  (perfAll ?? []).forEach((p) => {
    const cur = prAthMap.get(p.distance_m);
    if (!cur || p.time_sec < cur.time_sec) {
      prAthMap.set(p.distance_m, {
        time_sec: p.time_sec,
        date: p.date,
        source: p.source,
      });
    }
  });

  const totalVolume = workouts.reduce((s, w) => s + w.weight_kg * w.reps, 0);
  const uniqueSessions = new Set(workouts.map((w) => w.session_id));
  const totalCalories = Array.from(uniqueSessions).reduce((sum, sid) => {
    const info = sessionById.get(sid);
    return sum + (info?.calories ?? 0);
  }, 0);

  return {
    workouts,
    tests,
    races: (races ?? []) as ExportData["races"],
    personalRecordsGym: Array.from(prGymMap.entries())
      .map(([exercise, v]) => ({ exercise, ...v }))
      .sort((a, b) => b.weight_kg - a.weight_kg),
    personalRecordsAthletics: Array.from(prAthMap.entries())
      .map(([distance_m, v]) => ({ distance_m, ...v }))
      .sort((a, b) => a.distance_m - b.distance_m),
    summary: {
      period: periodLabel(period),
      workout_count: uniqueSessions.size,
      total_volume_kg: Math.round(totalVolume),
      total_calories: Math.round(totalCalories),
    },
  };
}

function filename(ext: string): string {
  const yyyymm = new Date().toISOString().slice(0, 7);
  return `fitlog-progressi-${yyyymm}.${ext}`;
}

export async function exportToExcel(period: ExportPeriod): Promise<{ ok: boolean; empty: boolean }> {
  const data = await loadExportData(period);
  if (
    !data.workouts.length &&
    !data.tests.length &&
    !data.races.length &&
    !data.personalRecordsGym.length &&
    !data.personalRecordsAthletics.length
  ) {
    return { ok: false, empty: true };
  }

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.workouts.map((w) => ({
        Data: w.date,
        Scheda: w.template,
        Esercizio: w.exercise,
        Serie: w.set_number,
        Peso_kg: w.weight_kg,
        Ripetizioni: w.reps,
        Recupero_sec: w.rest_taken_sec ?? "",
      })),
    ),
    "Allenamenti",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.tests.map((t) => ({
        Data: t.date,
        Tipo: t.type,
        Risultato: t.result,
        FC_media: t.avg_hr ?? "",
        Note: t.notes ?? "",
      })),
    ),
    "Test",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.races.map((r) => ({
        Data: r.date,
        Nome: r.name,
        Distanza_m: r.distance_m,
        Tempo_sec: r.time_sec,
        Posizione: r.placement ?? "",
        Note: r.notes ?? "",
      })),
    ),
    "Gare",
  );

  const prSheet = [
    { Sezione: "Palestra", "": "" },
    ...data.personalRecordsGym.map((p) => ({
      Sezione: p.exercise,
      Valore: `${p.weight_kg}kg × ${p.reps}`,
      Data: p.date,
    })),
    { Sezione: "", "": "" },
    { Sezione: "Atletica", "": "" },
    ...data.personalRecordsAthletics.map((p) => ({
      Sezione: `${p.distance_m}m`,
      Valore: `${p.time_sec}s`,
      Data: p.date,
    })),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prSheet), "Record");

  XLSX.writeFile(wb, filename("xlsx"));
  return { ok: true, empty: false };
}

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec.toFixed(2)}s`;
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${String(Math.round(s)).padStart(2, "0")}`;
}

export async function exportToPDF(period: ExportPeriod): Promise<{ ok: boolean; empty: boolean }> {
  const data = await loadExportData(period);
  if (
    !data.workouts.length &&
    !data.tests.length &&
    !data.races.length &&
    !data.personalRecordsGym.length &&
    !data.personalRecordsAthletics.length
  ) {
    return { ok: false, empty: true };
  }

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Report progressi", 14, 20);
  doc.setFontSize(10);
  doc.text(
    `Periodo: ${data.summary.period}  ·  Generato il ${format(new Date(), "d MMM yyyy", { locale: it })}`,
    14,
    28,
  );

  doc.setFontSize(12);
  doc.text("Riepilogo", 14, 40);
  autoTable(doc, {
    startY: 44,
    head: [["Allenamenti", "Volume totale (kg)", "Calorie stimate"]],
    body: [[
      String(data.summary.workout_count),
      String(data.summary.total_volume_kg),
      String(data.summary.total_calories),
    ]],
    styles: { fontSize: 10 },
  });

  if (data.workouts.length) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Allenamenti", 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [["Data", "Scheda", "Esercizio", "Set", "Kg", "Rep", "Rec"]],
      body: data.workouts.slice(0, 300).map((w) => [
        w.date,
        w.template,
        w.exercise,
        String(w.set_number),
        String(w.weight_kg),
        String(w.reps),
        w.rest_taken_sec != null ? `${w.rest_taken_sec}s` : "—",
      ]),
      styles: { fontSize: 8 },
    });
  }

  if (data.tests.length) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Test", 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [["Data", "Tipo", "Risultato", "FC", "Note"]],
      body: data.tests.map((t) => [t.date, t.type, t.result, t.avg_hr ?? "—", t.notes ?? ""]),
      styles: { fontSize: 9 },
    });
  }

  if (data.races.length) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Gare", 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [["Data", "Gara", "Distanza", "Tempo", "Pos", "Note"]],
      body: data.races.map((r) => [
        r.date,
        r.name,
        `${r.distance_m}m`,
        fmtTime(r.time_sec),
        r.placement ?? "—",
        r.notes ?? "",
      ]),
      styles: { fontSize: 9 },
    });
  }

  if (data.personalRecordsGym.length || data.personalRecordsAthletics.length) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text("Record personali", 14, 20);
    if (data.personalRecordsGym.length) {
      doc.setFontSize(11);
      doc.text("Palestra", 14, 30);
      autoTable(doc, {
        startY: 34,
        head: [["Esercizio", "Peso", "Ripetizioni", "Data"]],
        body: data.personalRecordsGym.map((p) => [
          p.exercise,
          `${p.weight_kg}kg`,
          String(p.reps),
          p.date,
        ]),
        styles: { fontSize: 9 },
      });
    }
    if (data.personalRecordsAthletics.length) {
      const startY =
        // @ts-expect-error jspdf-autotable extends doc with lastAutoTable at runtime
        (doc.lastAutoTable?.finalY ?? 30) + 10;
      doc.setFontSize(11);
      doc.text("Atletica", 14, startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [["Distanza", "Tempo", "Fonte", "Data"]],
        body: data.personalRecordsAthletics.map((p) => [
          `${p.distance_m}m`,
          fmtTime(p.time_sec),
          p.source,
          p.date,
        ]),
        styles: { fontSize: 9 },
      });
    }
  }

  doc.save(filename("pdf"));
  return { ok: true, empty: false };
}
