import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LoggedSetInsert = Database["public"]["Tables"]["logged_sets"]["Insert"];

/**
 * Older Lovable projects may still expose the pre-multi-user logged_sets
 * table.  Retry only that specific schema mismatch without weakening the
 * normal RLS/error handling path.
 */
export function isMissingLoggedSetsUserIdError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("logged_sets") &&
    message.includes("user_id") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find"))
  );
}

export async function insertLoggedSet(payload: LoggedSetInsert) {
  const modern = await supabase.from("logged_sets").insert(payload).select("id").single();
  if (!isMissingLoggedSetsUserIdError(modern.error)) return modern;

  const { user_id: _legacyOwner, ...legacyPayload } = payload;
  return supabase.from("logged_sets").insert(legacyPayload).select("id").single();
}
