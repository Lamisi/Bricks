"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { encryptSecret } from "@/lib/webhooks/crypto";
import { validateWebhookUrl } from "@/lib/webhooks/ssrf";
import { randomBytes } from "crypto";

function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

export async function createIntegration(
  projectId: string,
  name: string,
  webhookUrl: string,
  customSecret?: string,
): Promise<{ error?: string; secret?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserProjectRole(supabase, projectId);
  if (role !== "admin") return { error: "Only project admins can manage integrations" };

  try {
    await validateWebhookUrl(webhookUrl);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid webhook URL" };
  }

  const secret = customSecret?.trim() || generateSecret();
  const encrypted = encryptSecret(secret);
  const admin = createAdminClient();

  const { error } = await (admin as any).from("integrations").insert({
    project_id: projectId,
    name: name.trim(),
    type: "webhook_outbound",
    webhook_url: webhookUrl.trim(),
    webhook_secret_enc: encrypted,
    created_by: user.id,
  });

  if (error) return { error: "Could not create integration" };

  revalidatePath(`/app/projects/${projectId}/settings`);
  return { secret };
}

export async function deleteIntegration(
  integrationId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserProjectRole(supabase, projectId);
  if (role !== "admin") return { error: "Only project admins can manage integrations" };

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("integrations")
    .delete()
    .eq("id", integrationId)
    .eq("project_id", projectId);

  if (error) return { error: "Could not delete integration" };

  revalidatePath(`/app/projects/${projectId}/settings`);
  return {};
}

export async function toggleIntegrationStatus(
  integrationId: string,
  projectId: string,
  status: "active" | "inactive",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserProjectRole(supabase, projectId);
  if (role !== "admin") return { error: "Only project admins can manage integrations" };

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("integrations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", integrationId)
    .eq("project_id", projectId);

  if (error) return { error: "Could not update integration status" };

  revalidatePath(`/app/projects/${projectId}/settings`);
  return {};
}
