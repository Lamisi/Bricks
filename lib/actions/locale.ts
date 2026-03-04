"use server";

import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

/**
 * Persists the user's preferred locale to profiles.language.
 * Silently no-ops for unauthenticated users or invalid locales.
 */
export async function updateUserLocale(locale: string): Promise<void> {
  if (!routing.locales.includes(locale as "no" | "en")) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ language: locale as "no" | "en" })
    .eq("id", user.id);
}
