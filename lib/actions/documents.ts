"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectRole } from "@/lib/auth/rbac";
import { embedDocument } from "@/lib/search/embed-document";
import type { Json } from "@/types/database";

// ---------------------------------------------------------------------------
// createRichTextDocument
// Creates a new document record for a native rich-text document.
// ---------------------------------------------------------------------------
export async function createRichTextDocument(
  projectId: string,
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/sign-in" });

  await requireProjectRole(supabase, projectId, "admin", "architect");

  const title = (formData.get("title") as string).trim();
  if (!title) redirect({ href: `/app/projects/${projectId}/documents/new` });

  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .insert({ project_id: projectId, title, created_by: user.id, status: "draft" })
    .select("id")
    .single();

  if (error || !doc) redirect({ href: `/app/projects/${projectId}/documents/new` });

  void embedDocument(doc.id, title).catch((err) => {
    console.error("Doc embed failed:", err);
  });

  revalidatePath(`/app/projects/${projectId}`);
  redirect({ href: `/app/projects/${projectId}/documents/${doc.id}/edit` });
}

// ---------------------------------------------------------------------------
// saveDocumentVersion
// Creates a new document_version row with Tiptap JSON content and updates
// documents.current_version_id to the latest version.
// ---------------------------------------------------------------------------
export async function saveDocumentVersion(
  docId: string,
  projectId: string,
  content: Json,
): Promise<{ versionId?: string; versionNumber?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await requireProjectRole(supabase, projectId, "admin", "architect");

  const admin = createAdminClient();

  // Approved documents are immutable — no new versions allowed
  const { data: docCheck } = await admin
    .from("documents")
    .select("status")
    .eq("id", docId)
    .single();

  if (docCheck?.status === "approved") {
    return { error: "Approved documents cannot be edited. Create a new version." };
  }

  const { data: latestVersion } = await admin
    .from("document_versions")
    .select("version_number")
    .eq("document_id", docId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latestVersion?.version_number ?? 0) + 1;

  const { data: version, error } = await admin
    .from("document_versions")
    .insert({
      document_id: docId,
      version_number: nextVersion,
      content_type: "rich_text",
      created_by: user.id,
      rich_text_json: content,
    })
    .select("id")
    .single();

  if (error || !version) return { error: "Could not save version." };

  await admin
    .from("documents")
    .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
    .eq("id", docId);

  console.log("Document saved:", { docId, versionId: version.id, versionNumber: nextVersion });

  revalidatePath(`/app/projects/${projectId}/documents/${docId}`);
  return { versionId: version.id, versionNumber: nextVersion };
}

// ---------------------------------------------------------------------------
// createDocumentForGeneration
// Creates an empty document record to receive AI-generated content.
// Returns { docId } so the client can start streaming generation.
// ---------------------------------------------------------------------------
export async function createDocumentForGeneration(
  projectId: string,
  title: string,
): Promise<{ docId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await requireProjectRole(supabase, projectId, "admin", "architect");

  const admin = createAdminClient();
  const { data: doc, error } = await admin
    .from("documents")
    .insert({ project_id: projectId, title, created_by: user.id, status: "draft" })
    .select("id")
    .single();

  if (error || !doc) return { error: "Could not create document" };

  void embedDocument(doc.id, title).catch((err) => {
    console.error("Doc embed failed:", err);
  });

  revalidatePath(`/app/projects/${projectId}`);
  return { docId: doc.id };
}
