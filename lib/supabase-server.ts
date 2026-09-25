// Server-only helpers for API routes: who is calling, and the daily AI limit.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AiKind = "translate" | "family" | "retelling";

/**
 * Verifies the "Authorization: Bearer <access token>" header sent by the browser.
 * Returns a Supabase client acting as that user (so Row Level Security applies), or null.
 */
export async function getRequestUser(req: Request): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!url || !key || !token) return null;

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

/** True while the user has made fewer than `limit` requests of this kind in the last 24 hours. */
export async function underDailyLimit(supabase: SupabaseClient, kind: AiKind, limit: number): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", since);
  if (error) {
    console.error("[ai_usage] count failed:", error.message);
    return false;
  }
  return (count ?? 0) < limit;
}

export async function recordUsage(supabase: SupabaseClient, kind: AiKind): Promise<void> {
  const { error } = await supabase.from("ai_usage").insert({ kind });
  if (error) console.error("[ai_usage] insert failed:", error.message);
}
