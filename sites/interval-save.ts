import type { DatabaseBinding } from "./database.ts";
import { QueryError, validateRow } from "./query-engine.ts";

/** Replace a session and its repetitions atomically, always scoped to its owner. */
export async function updateInterval(db: DatabaseBinding, uid: string, body: any) {
  if (
    typeof body?.id !== "string" ||
    !Array.isArray(body.reps) ||
    !body.reps.length ||
    body.reps.length > 500
  )
    throw new QueryError("Seleziona una sessione e da 1 a 500 ripetute");
  const existing = await db
    .prepare("SELECT id FROM interval_sessions WHERE id=? AND user_id=?")
    .bind(body.id, uid)
    .first();
  if (!existing) throw new QueryError("Sessione non trovata", "NOT_FOUND", 404);
  const session = validateRow("interval_sessions", body.session, uid, true);
  const rows = body.reps.map((raw: any, i: number) =>
    validateRow(
      "interval_reps",
      {
        distance_m: raw.distance_m,
        time_sec: raw.time_sec,
        rest_sec: raw.rest_sec,
        rest_mode: raw.rest_mode,
        rest_distance_m: raw.rest_distance_m,
        notes: raw.notes,
        session_id: body.id,
        rep_number: i + 1,
      },
      uid,
    ),
  );
  if (rows.some((r: any) => !(r.distance_m > 0))) throw new QueryError("Distanza non valida");
  const keys = Object.keys(session).filter((k) => k !== "user_id");
  const statements = [
    db
      .prepare(
        `UPDATE interval_sessions SET ${keys.map((k) => `"${k}"=?`).join(",")} WHERE id=? AND user_id=?`,
      )
      .bind(...keys.map((k) => session[k]), body.id, uid),
    db.prepare("DELETE FROM interval_reps WHERE session_id=? AND user_id=?").bind(body.id, uid),
    ...rows.map((r: any) => {
      const fields = Object.keys(r);
      return db
        .prepare(
          `INSERT INTO interval_reps (${fields.map((k) => `"${k}"`).join(",")}) SELECT ${fields.map(() => "?").join(",")} FROM interval_sessions WHERE id=? AND user_id=?`,
        )
        .bind(...fields.map((k) => r[k]), body.id, uid);
    }),
  ];
  await db.batch(statements);
  return { id: body.id };
}
