import type { DatabaseBinding, Row, Statement } from "./database.ts";
import { QueryError, validateRow, type TableName } from "./query-engine.ts";

type ImportGroup = { table: TableName; rows: Row[] };
const fail = (message: string): never => {
  throw new QueryError(message, "INVALID_IMPORT");
};
function object(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail("Il backup contiene dati non validi");
  return value as Row;
}
function rows(value: unknown, label: string): Row[] {
  if (!Array.isArray(value) || value.length > 5000)
    return fail(`Sezione mancante o troppo grande: ${label}`);
  const result = value.map(object);
  const ids = new Set<string>();
  for (const row of result) {
    if (typeof row.id !== "string" || !row.id || row.id.length > 200 || ids.has(row.id))
      fail(`Identificativo mancante o duplicato: ${label}`);
    ids.add(row.id);
  }
  return result;
}
async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function importProgress(db: DatabaseBinding, uid: string, input: unknown) {
  const request = object(input);
  if (typeof request.preview !== "boolean" || typeof request.skipEmpty !== "boolean")
    fail("Scegli prima le opzioni di importazione");
  const backup = object(request.backup);
  if (backup.application !== "Progress Sets" || backup.schema_version !== 1)
    fail("Seleziona un backup JSON di Progress Sets versione 1");
  if (
    backup.export_complete !== true ||
    !Array.isArray(backup.export_warnings) ||
    backup.export_warnings.length
  )
    fail("Questo backup è incompleto. Ripeti l’esportazione dalla vecchia app");
  const gym = object(backup.gym),
    athletics = object(backup.athletics);
  const warnings: string[] = [];
  const programs = rows(gym.programs ?? [], "programmi");
  const templates = rows(gym.templates, "schede");
  const originalSessions = rows(gym.sessions, "allenamenti");
  const sourceSets = rows(gym.logged_sets, "serie");
  // A duplicate series must have the same recorded load/repetitions. Never silently
  // choose between conflicting performances with the same series number.
  const setsByKey = new Map<string, Row>();
  for (const row of sourceSets) {
    const key = JSON.stringify([row.session_id, row.exercise_id, row.set_number]);
    const previous = setsByKey.get(key);
    if (previous && (row.weight_kg !== previous.weight_kg || row.reps !== previous.reps || (row.side ?? "both") !== (previous.side ?? "both") || (row.reps_type ?? "count") !== (previous.reps_type ?? "count") || (row.duration_sec ?? null) !== (previous.duration_sec ?? null) || (row.distance_m ?? null) !== (previous.distance_m ?? null)))
      fail(
        "Ci sono serie duplicate con carichi o ripetizioni diversi: serve controllarle prima di importare",
      );
    if (!previous || Date.parse(row.completed_at) < Date.parse(previous.completed_at))
      setsByKey.set(key, row);
  }
  const loggedSets = [...setsByKey.values()];
  const activeIds = new Set(loggedSets.map((r) => r.session_id));
  const sessions = request.skipEmpty
    ? originalSessions.filter((r) => activeIds.has(r.id) || !r.ended_at)
    : originalSessions;
  const skippedEmpty = originalSessions.length - sessions.length;
  const duplicateSets = sourceSets.length - loggedSets.length;
  if (skippedEmpty)
    warnings.push(`${skippedEmpty} allenamenti conclusi senza serie non verranno copiati.`);
  if (duplicateSets)
    warnings.push(`${duplicateSets} copie duplicate della stessa serie verranno accorpate.`);
  for (const id of new Set(templates.map((r) => r.program_id).filter(Boolean))) {
    if (!programs.some((r) => r.id === id)) {
      const weeks = templates.filter((r) => r.program_id === id).map((r) => r.program_week ?? 1);
      programs.push({
        id,
        name: "Programma importato",
        duration_weeks: Math.max(...weeks),
        current_week: Math.min(...weeks),
      });
      warnings.push(
        "Il vecchio backup non include nome e settimana corrente di un programma. Le schede resteranno raggruppate come ‘Programma importato’.",
      );
    }
  }
  const weights = rows(backup.weight_history, "storico peso");
  const groups: ImportGroup[] = [
    { table: "exercises", rows: rows(gym.exercises, "esercizi") },
    { table: "test_types", rows: rows(athletics.test_types, "tipi di test") },
    { table: "training_programs", rows: programs },
    { table: "workout_templates", rows: templates },
    { table: "template_exercises", rows: rows(gym.template_exercises, "esercizi delle schede") },
    { table: "workout_sessions", rows: sessions },
    { table: "logged_sets", rows: loggedSets },
    { table: "tests", rows: rows(athletics.tests, "test") },
    { table: "races", rows: rows(athletics.races, "gare") },
    { table: "interval_sessions", rows: rows(athletics.interval_sessions, "ripetute") },
    { table: "interval_reps", rows: rows(athletics.interval_reps, "serie di ripetute") },
    { table: "weight_logs", rows: weights },
  ];
  if (groups.reduce((n, g) => n + g.rows.length, 0) > 1000)
    fail("Il backup supera 1000 record. È necessaria un’importazione assistita in più parti");
  const maps = new Map<TableName, Map<string, string>>();
  for (const group of groups) {
    const map = new Map<string, string>();
    maps.set(group.table, map);
    for (const row of group.rows)
      map.set(row.id, `import-${await digest(JSON.stringify([uid, group.table, row.id]))}`);
    // Reuse the same readable catalog entry when the original stable ID still exists.
    // Another user's private catalog can never be selected by an uploaded ID.
    if ((group.table === "exercises" || group.table === "test_types") && group.rows.length) {
      const existing = await db
        .prepare(
          `SELECT id,name FROM "${group.table}" WHERE (user_id=? OR user_id IS NULL) AND id IN (SELECT value FROM json_each(?))`,
        )
        .bind(uid, JSON.stringify(group.rows.map((r) => r.id)))
        .all();
      for (const row of group.rows)
        if (existing.results.some((e) => e.id === row.id && e.name === row.name))
          map.set(row.id, row.id);
    }
  }
  const refs: Partial<Record<TableName, Record<string, TableName>>> = {
    workout_templates: { program_id: "training_programs" },
    template_exercises: { template_id: "workout_templates", exercise_id: "exercises" },
    workout_sessions: { template_id: "workout_templates" },
    logged_sets: { session_id: "workout_sessions", exercise_id: "exercises" },
    tests: { test_type_id: "test_types" },
    interval_reps: { session_id: "interval_sessions" },
  };
  const required: Partial<Record<TableName, string[]>> = {
    exercises: ["name"],
    test_types: ["name", "result_type"],
    training_programs: ["name"],
    workout_templates: ["name"],
    template_exercises: ["template_id", "exercise_id"],
    workout_sessions: ["started_at"],
    logged_sets: ["session_id", "exercise_id", "set_number", "completed_at"],
    tests: ["test_type_id", "date"],
    races: ["name", "date", "distance_m", "time_sec"],
    interval_sessions: ["date"],
    interval_reps: ["session_id", "rep_number", "distance_m", "time_sec"],
    weight_logs: ["weight_kg", "logged_at"],
  };
  // All references must be present in this backup, never IDs supplied for another account.
  for (const group of groups)
    for (let i = 0; i < group.rows.length; i++) {
      const source = group.rows[i];
      const row: Row = { ...source, id: maps.get(group.table)!.get(source.id), user_id: uid };
      for (const field of required[group.table] ?? [])
        if (row[field] == null) fail(`Campo mancante: ${group.table}.${field}`);
      for (const [field, parent] of Object.entries(refs[group.table] ?? {})) {
        if (row[field] == null) continue;
        const id = maps.get(parent)?.get(row[field]);
        if (!id) fail(`Il backup non contiene un record collegato: ${group.table}.${field}`);
        row[field] = id;
      }
      const validated = validateRow(group.table, row, uid);
      if (
        group.table === "workout_sessions" &&
        validated.ended_at &&
        validated.ended_at < validated.started_at
      )
        fail("Un allenamento termina prima dell’inizio");
      if (group.table === "weight_logs" && (validated.weight_kg < 20 || validated.weight_kg > 500))
        fail("Peso non valido nel backup");
      Object.assign(row, validated);
      group.rows[i] = row;
    }
  const profile =
    backup.profile == null
      ? null
      : validateRow("profiles", { ...object(backup.profile), user_id: uid }, uid);
  if (
    profile &&
    !Object.keys(profile).some((k) => !["user_id", "created_at", "updated_at"].includes(k))
  )
    fail("Il profilo nel backup è vuoto");
  const counts = Object.fromEntries(groups.map((g) => [g.table, g.rows.length]));
  const report = { counts, skippedEmpty, duplicateSets, warnings, alreadyImported: false };
  const receiptKey = `import:${await digest(JSON.stringify([backup, request.skipEmpty]))}`;
  const receipt = await db
    .prepare("SELECT value FROM preferences WHERE user_id=? AND key=?")
    .bind(uid, receiptKey)
    .first();
  if (receipt) return { ...JSON.parse(receipt.value), alreadyImported: true };
  if (request.preview) return report;
  const statements: Statement[] = [];
  const snapshotKey = `import-weights:${crypto.randomUUID()}`;
  if (profile && weights.length)
    statements.push(
      db
        .prepare(
          "INSERT INTO preferences (id,user_id,key,value) SELECT ?,?,?,COALESCE(json_group_array(id),'[]') FROM weight_logs WHERE user_id=?",
        )
        .bind(crypto.randomUUID(), uid, snapshotKey, uid),
    );
  if (profile) {
    const keys = Object.keys(profile).filter((k) => k !== "user_id");
    statements.push(
      db
        .prepare(
          `INSERT INTO profiles (user_id,${keys.map((k) => `"${k}"`).join(",")}) VALUES (?,${keys.map(() => "?").join(",")}) ON CONFLICT(user_id) DO UPDATE SET ${keys
            .filter((k) => !["created_at", "updated_at"].includes(k))
            .map((k) => `"${k}"=COALESCE(profiles."${k}",excluded."${k}")`)
            .join(",")}`,
        )
        .bind(uid, ...keys.map((k) => profile[k])),
    );
    // The normal profile trigger must not turn an imported historical weight into a new measurement.
    if (weights.length)
      statements.push(
        db
          .prepare(
            "DELETE FROM weight_logs WHERE user_id=? AND id NOT IN (SELECT value FROM json_each((SELECT value FROM preferences WHERE user_id=? AND key=?)))",
          )
          .bind(uid, uid, snapshotKey),
      );
  }
  for (const group of groups)
    for (const row of group.rows) {
      const keys = Object.keys(row);
      statements.push(
        db
          .prepare(
            `INSERT INTO "${group.table}" (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")}) ON CONFLICT(id) DO NOTHING`,
          )
          .bind(...keys.map((k) => row[k])),
      );
    }
  if (profile && weights.length)
    statements.push(
      db.prepare("DELETE FROM preferences WHERE user_id=? AND key=?").bind(uid, snapshotKey),
    );
  statements.push(
    db
      .prepare(
        "INSERT INTO preferences (id,user_id,key,value) VALUES (?,?,?,?) ON CONFLICT(user_id,key) DO NOTHING",
      )
      .bind(crypto.randomUUID(), uid, receiptKey, JSON.stringify(report)),
  );
  await db.batch(statements);
  return report;
}
