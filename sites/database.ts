export type Row = Record<string, any>;
export interface Statement {
  bind(...values: unknown[]): Statement;
  all<T = Row>(): Promise<{ results: T[]; meta?: unknown }>;
  first<T = Row>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface DatabaseBinding {
  prepare(sql: string): Statement;
  batch<T = Row>(statements: Statement[]): Promise<Array<{ results: T[]; meta?: unknown }>>;
}
export function database(env: { DB?: DatabaseBinding }) {
  if (!env.DB) throw new Error("Database Sites non disponibile"); return env.DB;
}
