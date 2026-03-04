"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getUserProjectRole,
  canTransitionDocumentStatus,
  type DocumentStatus,
} from "@/lib/auth/rbac";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
  submitted: "Submitted",
};

// ---------------------------------------------------------------------------
// transitionDocumentStatus
// Validates the role-gated transition, updates documents.status, writes the
// mandatory audit log, and fires non-blocking in-app notifications.
// ---------------------------------------------------------------------------
export async function transitionDocumentStatus(
  docId: string,
  projectId: string,
  newStatus: DocumentStatus,
  note?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return { error: "Not a project member" };

  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("id, title, status, created_by")
    .eq("id", docId)
    .single();

  if (!doc) return { error: "Document not found" };

  const fromStatus = doc.status as DocumentStatus;

  if (!canTransitionDocumentStatus(role, fromStatus, newStatus)) {
    return { error: "This status transition is not permitted for your role" };
  }

  if (newStatus === "changes_requested" && !note?.trim()) {
    return { error: "Please provide a comment when requesting changes" };
  }

  // Update document status
  const { error: updateError } = await admin
    .from("documents")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", docId);

  if (updateError) return { error: "Could not update document status" };

  // Write audit log — mandatory; log failure but don't surface to user since
  // the transition has already been committed.
  const { error: auditError } = await admin
    .from("document_status_history")
    .insert({
      document_id: docId,
      from_status: fromStatus,
      to_status: newStatus,
      changed_by: user.id,
      note: note?.trim() ?? null,
    });

  if (auditError) {
    console.error("Audit log write failed:", auditError);
  }

  // Non-blocking notifications
  void sendWorkflowNotifications({
    admin,
    docId,
    projectId,
    docTitle: doc.title,
    newStatus,
    actorId: user.id,
    documentCreatedBy: doc.created_by,
    note,
  }).catch((err) => {
    console.error("Workflow notification failed:", err);
  });

  console.log("Document status changed:", {
    docId,
    from: fromStatus,
    to: newStatus,
    actorId: user.id,
  });

  revalidatePath(`/app/projects/${projectId}/documents/${docId}`);
  revalidatePath(`/app/projects/${projectId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------
async function sendWorkflowNotifications({
  admin,
  docId,
  projectId,
  docTitle,
  newStatus,
  actorId,
  documentCreatedBy,
  note,
}: {
  admin: SupabaseClient<Database>;
  docId: string;
  projectId: string;
  docTitle: string;
  newStatus: DocumentStatus;
  actorId: string;
  documentCreatedBy: string;
  note?: string;
}) {
  const link = `/app/projects/${projectId}/documents/${docId}`;

  // Get actor name
  const { data: actorProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", actorId)
    .single();
  const actorName = actorProfile?.full_name ?? "Someone";

  if (newStatus === "in_review") {
    // Notify all civil_engineers and admins in the project (reviewers)
    const { data: reviewers } = await admin
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", projectId)
      .in("role", ["civil_engineer", "admin"]);

    const recipientIds = (reviewers ?? [])
      .map((r) => r.user_id)
      .filter((id) => id !== actorId);

    if (recipientIds.length > 0) {
      const notifClient = admin as any;
      await notifClient.from("notifications").insert(
        recipientIds.map((userId: string) => ({
          user_id: userId,
          type: "status_change",
          title: `"${docTitle}" is ready for review`,
          body: `${actorName} submitted the document for review.`,
          link,
        })),
      );
    }
    return;
  }

  // For approved / changes_requested — notify the document creator
  if (
    (newStatus === "approved" || newStatus === "changes_requested") &&
    documentCreatedBy !== actorId
  ) {
    const title =
      newStatus === "approved"
        ? `"${docTitle}" was approved`
        : `Changes requested on "${docTitle}"`;

    const body =
      newStatus === "approved"
        ? `${actorName} approved the document.`
        : `${actorName} requested changes${note?.trim() ? `: ${note.trim().slice(0, 200)}` : "."}`;

    const notifClient = admin as any;
    await notifClient.from("notifications").insert([
      {
        user_id: documentCreatedBy,
        type: "status_change",
        title,
        body,
        link,
      },
    ]);
  }
}
