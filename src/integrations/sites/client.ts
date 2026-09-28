import type { SupabaseClient, Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import type { Database } from "../supabase/types";
import type { Filter, SitesQuery } from "./query";

type Result = { data: any; error: (Error & { code?: string }) | null; count?: number | null };
export async function siteRequest(path: string, body?: unknown): Promise<Result> {
  try {
    const response = await fetch(`/api/sites/${path}`, {
      method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
      headers: body === undefined ? {} : { "Content-Type": "application/json", "X-Progress-Sets": "1" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (result.error || !response.ok) return { data: null, error: Object.assign(new Error(result.error?.message || "Servizio momentaneamente non disponibile. Riprova."), { code: result.error?.code }) };
    return result;
  } catch { return { data: null, error: new Error("Connessione non disponibile. I dati inseriti restano nella schermata: riprova quando sei online.") }; }
}
export class SitesQueryBuilder implements PromiseLike<Result> {
  private query: SitesQuery; private pending?: Promise<Result>;
  constructor(table: string) { this.query = { table, action: "select", columns: "*", filters: [], orders: [] }; }
  select(columns = "*", options: { count?: "exact"; head?: boolean } = {}) { Object.assign(this.query, { columns, returning: true, ...options }); return this; }
  insert(payload: unknown) { Object.assign(this.query, { action: "insert", payload }); return this; }
  update(payload: unknown) { Object.assign(this.query, { action: "update", payload }); return this; }
  delete() { this.query.action = "delete"; return this; }
  upsert(payload: unknown, options: { onConflict?: string } = {}) { Object.assign(this.query, { action: "upsert", payload, ...options }); return this; }
  private filter(op: Filter["op"], column: string, value: unknown) { this.query.filters.push({ op, column, value }); return this; }
  eq(c: string, v: unknown) { return this.filter("eq", c, v); }
  neq(c: string, v: unknown) { return this.filter("neq", c, v); }
  gte(c: string, v: unknown) { return this.filter("gte", c, v); }
  gt(c: string, v: unknown) { return this.filter("gt", c, v); }
  lte(c: string, v: unknown) { return this.filter("lte", c, v); }
  lt(c: string, v: unknown) { return this.filter("lt", c, v); }
  is(c: string, v: unknown) { return this.filter("is", c, v); }
  in(c: string, v: unknown[]) { return this.filter("in", c, v); }
  ilike(c: string, v: string) { return this.filter("ilike", c, v); }
  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) { this.query.orders.push({ column, ...options }); return this; }
  limit(limit: number) { this.query.limit = limit; return this; }
  single() { this.query.single = "one"; return this; }
  maybeSingle() { this.query.single = "maybe"; return this; }
  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    this.pending ??= siteRequest("query", this.query); return this.pending.then(onfulfilled, onrejected);
  }
}
let authPromise: Promise<{ user: User | null; error: Error | null }> | undefined;
let authUntil = 0;
async function getUser() {
  if (typeof window === "undefined") return { data: { user: null }, error: null };
  if (!authPromise || Date.now() > authUntil) {
    authUntil = Date.now() + 30_000;
    authPromise = siteRequest("auth").then(({ data, error }) => {
      if (error) { authUntil = 0; return { user: null, error }; }
      return { user: data?.user as User | null, error: null };
    });
  }
  const { user, error } = await authPromise; return { data: { user }, error };
}
const listeners = new Set<(event: AuthChangeEvent, session: Session | null) => void>();
async function getSession() {
  const { data, error } = await getUser();
  // Identity is checked server-side. No bearer tokens are stored or fabricated.
  return { data: { session: data.user ? { user: data.user } as Session : null }, error };
}
const auth = {
  getUser, getSession,
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    listeners.add(callback);
    void getSession().then(({ data }) => { if (listeners.has(callback)) callback("INITIAL_SESSION", data.session); });
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
  async signOut() {
    authPromise = undefined; authUntil = 0;
    try { localStorage.removeItem("progress_sets_active_workout_v1"); localStorage.removeItem("rest_timer_state_v2"); } catch {}
    window.location.assign("/signout-with-chatgpt?return_to=%2Fauth"); return { error: null };
  },
};
// Preserve typed existing queries; every network call now goes to Sites, not Supabase.
export const sitesClient = { from: (table: string) => new SitesQueryBuilder(table), auth } as unknown as SupabaseClient<Database>;
