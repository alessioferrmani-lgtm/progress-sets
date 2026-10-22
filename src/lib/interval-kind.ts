export const INTERVAL_KINDS = {
  standard: "Ripetute",
  hill_short: "Salite corte",
  hill_long: "Salite lunghe",
} as const;
export type IntervalKind = keyof typeof INTERVAL_KINDS;
export function intervalKind(value: unknown): IntervalKind {
  return value === "hill_short" || value === "hill_long" ? value : "standard";
}
export function intervalTitle(session: {
  interval_kind?: string | null;
  signature?: string | null;
}): string {
  const kind = intervalKind(session.interval_kind);
  return kind === "standard"
    ? session.signature || "Sessione ripetute"
    : `${INTERVAL_KINDS[kind]} · ${session.signature || "Ripetute in salita"}`;
}
