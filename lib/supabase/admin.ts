import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Supabase admin client using the service role key.
 * BYPASSES Row Level Security — use only for server-side admin operations
 * (e.g. triggering compliance checks, creating profiles on sign-up).
 *
 * NEVER import this in Client Components or expose to the client bundle.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
