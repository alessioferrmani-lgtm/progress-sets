import { siteRequest } from "@/integrations/sites/client";
export async function readPreference(key: string): Promise<unknown> {
  const { data, error } = await siteRequest(`preferences?key=${encodeURIComponent(key)}`);
  if (error) throw error; return data;
}
export async function writePreference(key: string, value: unknown) {
  const { error } = await siteRequest("preferences", { key, value });
  if (error) throw error;
}
