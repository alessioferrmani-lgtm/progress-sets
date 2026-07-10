import { supabase } from "@/integrations/supabase/client";
import type { UserProfileForCalc } from "./calories";

export type Profile = UserProfileForCalc & { user_id: string };

export async function fetchMyProfile(): Promise<Profile | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,weight_kg,height_cm,date_of_birth,sex,activity_level")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function upsertMyProfile(
  patch: Partial<Omit<Profile, "user_id">>,
): Promise<Profile> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: uid, ...patch },
      { onConflict: "user_id" },
    )
    .select("user_id,weight_kg,height_cm,date_of_birth,sex,activity_level")
    .single();
  if (error) throw error;
  return data as Profile;
}
