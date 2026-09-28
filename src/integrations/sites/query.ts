export type Filter = { column: string; op: "eq" | "neq" | "gte" | "gt" | "lte" | "lt" | "is" | "in" | "ilike"; value: unknown };
export type SitesQuery = {
  table: string; action: "select" | "insert" | "update" | "delete" | "upsert";
  columns: string; filters: Filter[];
  orders: Array<{ column: string; ascending?: boolean; nullsFirst?: boolean }>;
  payload?: unknown; limit?: number; count?: "exact"; head?: boolean;
  returning?: boolean; onConflict?: string; single?: "one" | "maybe";
};
