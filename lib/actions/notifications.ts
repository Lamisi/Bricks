"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function markNotificationRead(notificationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { error: "Could not mark notification as read" };
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { error: "Could not mark notifications as read" };
  return {};
}

export async function updateEmailPrefs(
  prefs: Record<string, boolean>,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Validate keys against allowed types
  const allowed = new Set(["status_change", "mention", "comment_reply", "compliance_complete"]);
  const sanitised = Object.fromEntries(
    Object.entries(prefs).filter(([k]) => allowed.has(k)),
  );

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("profiles")
    .update({ email_prefs: sanitised, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: "Could not save preferences" };
  revalidatePath("/app/settings");
  return {};
}
