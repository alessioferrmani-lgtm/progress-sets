import { supabase } from "@/integrations/supabase/client";

export type TestType = {
  id: string;
  user_id: string | null;
  name: string;
  result_type: "TIME" | "DISTANCE";
  distance_m: number | null;
  duration_sec: number | null;
  is_custom: boolean;
};

export type TestRow = {
  id: string;
  test_type_id: string;
  date: string;
  time_sec: number | null;
  distance_covered_m: number | null;
  avg_hr: number | null;
  weather: string | null;
  notes: string | null;
  observations: string | null;
  calories_burned: number | null;
  created_at: string;
};

export type RaceRow = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  distance_m: number;
  time_sec: number;
  placement: number | null;
  category: string | null;
  avg_hr: number | null;
  notes: string | null;
  calories_burned: number | null;
  created_at: string;
};

export type PerformanceRow = {
  id: string;
  source: "TRAINING_REP" | "TEST" | "RACE";
  source_id: string;
  distance_m: number;
  time_sec: number;
  date: string;
};

export async function fetchTestTypes(): Promise<TestType[]> {
  const { data, error } = await supabase
    .from("test_types")
    .select("id,user_id,name,result_type,distance_m,duration_sec,is_custom")
    .order("is_custom", { ascending: true })
    .order("distance_m", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) throw error;
  return data as TestType[];
}

export async function fetchTestType(id: string): Promise<TestType> {
  const { data, error } = await supabase
    .from("test_types")
    .select("id,user_id,name,result_type,distance_m,duration_sec,is_custom")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as TestType;
}

export async function fetchTestsForType(typeId: string): Promise<TestRow[]> {
  const { data, error } = await supabase
    .from("tests")
    .select(
      "id,test_type_id,date,time_sec,distance_covered_m,avg_hr,weather,notes,observations,calories_burned,created_at",
    )
    .eq("test_type_id", typeId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as TestRow[];
}

export async function fetchAllTests(): Promise<TestRow[]> {
  const { data, error } = await supabase
    .from("tests")
    .select(
      "id,test_type_id,date,time_sec,distance_covered_m,avg_hr,weather,notes,observations,calories_burned,created_at",
    )
    .order("date", { ascending: false });
  if (error) throw error;
  return data as TestRow[];
}

export async function fetchRaces(): Promise<RaceRow[]> {
  const { data, error } = await supabase
    .from("races")
    .select(
      "id,name,date,location,distance_m,time_sec,placement,category,avg_hr,notes,calories_burned,created_at",
    )
    .order("date", { ascending: false });
  if (error) throw error;
  return data as RaceRow[];
}

export async function fetchPerformanceLog(): Promise<PerformanceRow[]> {
  const { data, error } = await supabase
    .from("performance_log")
    .select("id,source,source_id,distance_m,time_sec,date")
    .order("date", { ascending: false });
  if (error) throw error;
  return data as PerformanceRow[];
}

/** Sports year: Sep 1 → Aug 31. Returns [start, end] Dates. */
export function currentSportsYear(now = new Date()): { start: Date; end: Date } {
  const y = now.getFullYear();
  if (now.getMonth() >= 8) {
    return { start: new Date(y, 8, 1), end: new Date(y + 1, 7, 31, 23, 59, 59) };
  }
  return { start: new Date(y - 1, 8, 1), end: new Date(y, 7, 31, 23, 59, 59) };
}

export function formatTime(sec: number | null | undefined): string {
  if (sec == null) return "—";
  if (sec < 60) return sec.toFixed(sec % 1 ? 2 : 0) + "s";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${String(Math.round(s)).padStart(2, "0")}`;
}

export function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 2)}km`;
  return `${m}m`;
}
