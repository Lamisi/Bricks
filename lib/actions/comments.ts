"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { notify, notifyMany } from "@/lib/notifications/notify";

/** Strip HTML tags and trim whitespace — comments are stored as plain text. */
function sanitizeBody(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim().slice(0, 10_000);
}

// ---------------------------------------------------------------------------
// postComment
// ---------------------------------------------------------------------------
export async function postComment(
  versionId: string,
  projectId: string,
  docId: string,
  body: string,
  parentId?: string,
): Promise<{ commentId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return { error: "Not a project member" };

  const clean = sanitizeBody(body);
  if (!clean) return { error: "Comment body is required" };

  const admin = createAdminClient();

  const { data: comment, error } = await admin
    .from("comments")
    .insert({
      document_version_id: versionId,
      created_by: user.id,
      body: clean,
      parent_id: parentId ?? null,
    })
    .select("id")
    .single();

  if (error || !comment) return { error: "Could not save comment" };

  // Fetch author name + doc owner once for all notifications below
  const [authorResult, docResult] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", user.id).single(),
    admin.from("documents").select("created_by").eq("id", docId).single(),
  ]);
  const authorName = authorResult.data?.full_name ?? "Someone";
  const docOwnerId = docResult.data?.created_by ?? null;

  // ── @mention detection ──────────────────────────────────────────────────
  // Match @Word patterns (single token) against project members' first names.
  const mentionTokens = Array.from(clean.matchAll(/@(\w+)/g)).map((m) =>
    m[1].toLowerCase(),
  );

  let mentionedIds: string[] = [];
  if (mentionTokens.length > 0) {
    const { data: members } = await admin
      .from("project_members")
      .select("user_id, profiles(full_name)")
      .eq("project_id", projectId);

    mentionedIds = (members ?? [])
      .filter((m) => {
        const profileData = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const firstName = (profileData?.full_name ?? "").split(" ")[0].toLowerCase();
        return mentionTokens.includes(firstName);
      })
      .map((m) => m.user_id)
      .filter((id) => id !== user.id);

    if (mentionedIds.length > 0) {
      await notifyMany(
        mentionedIds.map((userId) => ({
          userId,
          type: "mention" as const,
          title: `${authorName} mentioned you in a comment`,
          body: clean.slice(0, 200),
          link: `/app/projects/${projectId}/documents/${docId}`,
        })),
      );
    }
  }

  // ── Notify doc owner of new comment (skip if they authored it or were already mentioned) ──
  if (docOwnerId && docOwnerId !== user.id && !mentionedIds.includes(docOwnerId)) {
    await notify({
      userId: docOwnerId,
      type: "comment_reply",
      title: `New comment on your document`,
      body: `${authorName}: ${clean.slice(0, 100)}`,
      link: `/app/projects/${projectId}/documents/${docId}`,
    });
  }

  revalidatePath(`/app/projects/${projectId}/documents/${docId}`);
  return { commentId: comment.id };
}

// ---------------------------------------------------------------------------
// resolveComment
// ---------------------------------------------------------------------------
export async function resolveComment(
  commentId: string,
  projectId: string,
  docId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return { error: "Not a project member" };

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("comments")
    .select("id, created_by, resolved_at")
    .eq("id", commentId)
    .single();

  if (!comment) return { error: "Comment not found" };
  if (comment.resolved_at) return {}; // already resolved

  // Only comment author or admin may resolve
  if (comment.created_by !== user.id && role !== "admin") {
    return { error: "Insufficient permissions" };
  }

  const { error } = await admin
    .from("comments")
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", commentId);

  if (error) return { error: "Could not resolve comment" };

  revalidatePath(`/app/projects/${projectId}/documents/${docId}`);
  return {};
}

// ---------------------------------------------------------------------------
// reopenComment
// ---------------------------------------------------------------------------
export async function reopenComment(
  commentId: string,
  projectId: string,
  docId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return { error: "Not a project member" };

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("comments")
    .select("id, created_by, resolved_at")
    .eq("id", commentId)
    .single();

  if (!comment) return { error: "Comment not found" };
  if (!comment.resolved_at) return {}; // already open

  if (comment.created_by !== user.id && role !== "admin") {
    return { error: "Insufficient permissions" };
  }

  const { error } = await admin
    .from("comments")
    .update({ resolved_at: null, resolved_by: null })
    .eq("id", commentId);

  if (error) return { error: "Could not reopen comment" };

  revalidatePath(`/app/projects/${projectId}/documents/${docId}`);
  return {};
}
