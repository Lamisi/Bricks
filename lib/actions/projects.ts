"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectRole } from "@/lib/auth/rbac";
import { sendProjectInviteEmail } from "@/lib/email/resend";
import type { ProjectRole } from "@/lib/auth/rbac";

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

// ---------------------------------------------------------------------------
// createProject
// Uses the create_project() DB function to atomically create the project
// and add the creator as admin (bypasses the project_members RLS bootstrap).
// Organization is created if the user has none.
// ---------------------------------------------------------------------------
export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  if (!user) redirect({ href: "/sign-in", locale });

  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const location = (formData.get("location") as string | null)?.trim() ?? null;
  const orgName = (formData.get("org_name") as string | null)?.trim();

  if (!name) return { error: "Project name is required." };

  // Resolve or create the organization
  let orgId: string | null = null;

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("created_by", user.id)
    .limit(1)
    .single();

  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    // Create a new org using the SECURITY DEFINER function
    const resolvedOrgName = orgName || "My Organization";
    const { data: newOrgId, error: orgError } = await supabase.rpc(
      "create_organization",
      { p_name: resolvedOrgName, p_slug: slugify(resolvedOrgName) },
    );
    if (orgError || !newOrgId) {
      return { error: "Could not create organization. Please try again." };
    }
    orgId = newOrgId as string;
  }

  // Create project + add creator as admin atomically
  const { data: projectId, error: projectError } = await supabase.rpc(
    "create_project",
    {
      p_organization_id: orgId,
      p_name: name,
      p_description: description ?? "",
      p_location: location ?? "",
    },
  );

  if (projectError || !projectId) {
    return { error: "Could not create project. Please try again." };
  }

  revalidatePath("/app/projects");
  redirect({ href: `/app/projects/${projectId}`, locale });
}

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------
export async function updateProject(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const supabase = await createClient();
  await requireProjectRole(supabase, projectId, "admin");

  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const location = (formData.get("location") as string | null)?.trim() ?? null;

  if (!name) return { error: "Project name is required." };

  const { error } = await supabase
    .from("projects")
    .update({ name, description, location, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { error: "Could not update project. Please try again." };

  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/app/projects/${projectId}/settings`);
  return {};
}

// ---------------------------------------------------------------------------
// archiveProject
// ---------------------------------------------------------------------------
export async function archiveProject(projectId: string): Promise<void> {
  const supabase = await createClient();
  await requireProjectRole(supabase, projectId, "admin");

  await supabase
    .from("projects")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  revalidatePath("/app/projects");
  const locale = await getLocale();
  redirect({ href: "/app/projects", locale });
}

// ---------------------------------------------------------------------------
// inviteMember
// ---------------------------------------------------------------------------
export async function inviteMember(
  projectId: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const supabase = await createClient();
  await requireProjectRole(supabase, projectId, "admin");

  const email = (formData.get("email") as string).trim().toLowerCase();
  const role = formData.get("role") as ProjectRole;

  if (!email) return { error: "Email is required." };
  if (!role) return { error: "Role is required." };

  // Get inviter profile for the email
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found." };

  // Create the invite token
  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("project_invites")
    .insert({
      project_id: projectId,
      email,
      role,
      invited_by: user!.id,
    })
    .select("token")
    .single();

  if (inviteError || !invite) {
    return { error: "Could not create invite. Please try again." };
  }

  // Send invite email
  try {
    await sendProjectInviteEmail({
      to: email,
      inviterName: profile?.full_name ?? "A team member",
      projectName: project.name,
      role,
      token: invite.token,
    });
  } catch (err) {
    // Clean up the invite if email fails
    console.error("inviteMember: email send failed:", err);
    await admin.from("project_invites").delete().eq("token", invite.token);
    return {
      error: "Could not send invite email. Please check the address and try again.",
    };
  }

  revalidatePath(`/app/projects/${projectId}`);
  return { error: undefined };
}

// ---------------------------------------------------------------------------
// joinProject — validates token and adds user to project
// ---------------------------------------------------------------------------
export async function joinProject(token: string): Promise<{ error?: string; projectId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  if (!user) redirect({ href: "/sign-in", locale });

  const admin = createAdminClient();

  const { data: invite, error } = await admin
    .from("project_invites")
    .select("id, project_id, email, role, expires_at, used_at")
    .eq("token", token)
    .single();

  if (error || !invite) return { error: "Invalid or expired invitation." };
  if (invite.used_at) return { error: "This invitation has already been used." };
  if (new Date(invite.expires_at) < new Date())
    return { error: "This invitation has expired. Please ask for a new one." };

  // Add member — use admin client to bypass RLS on project_members for non-admin actors
  const { error: memberError } = await admin.from("project_members").upsert(
    { project_id: invite.project_id, user_id: user.id, role: invite.role },
    { onConflict: "project_id,user_id" },
  );

  if (memberError) return { error: "Could not join project. Please try again." };

  // Mark invite as used
  await admin
    .from("project_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath("/app/projects");
  return { projectId: invite.project_id };
}
