import { notFound } from "next/navigation";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { getSignedViewUrl } from "@/lib/supabase/storage";
import { tiptapJsonToHtml } from "@/lib/tiptap/html";
import { DocumentViewerClient } from "@/components/document-viewer-client";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id: projectId, docId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // RLS enforces project membership — returns null if user is not a member
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, status, project_id")
    .eq("id", docId)
    .eq("project_id", projectId)
    .single();

  if (!doc) return notFound();

  const role = await getUserProjectRole(supabase, projectId);
  const canEdit = role === "admin" || role === "architect";

  // Fetch all versions newest-first (admin client — membership already verified)
  const admin = createAdminClient();
  const { data: versions } = await admin
    .from("document_versions")
    .select(
      "id, version_number, content_type, file_name, file_size, mime_type, storage_path, rich_text_json, created_by, created_at",
    )
    .eq("document_id", docId)
    .order("version_number", { ascending: false });

  if (!versions || versions.length === 0) return notFound();

  // Resolve uploader display names
  const uploaderIds = Array.from(new Set(versions.map((v) => v.created_by)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", uploaderIds);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? "Unknown"]),
  );

  // Resolve initial content for the latest version
  const latestVersion = versions[0];
  let initialContent:
    | { type: "file"; url: string }
    | { type: "rich_text"; html: string }
    | null = null;

  if (latestVersion.content_type === "file" && latestVersion.storage_path) {
    try {
      const url = await getSignedViewUrl(latestVersion.storage_path);
      initialContent = { type: "file", url };
    } catch {
      // Client shows error + retry
    }
  } else if (
    latestVersion.content_type === "rich_text" &&
    latestVersion.rich_text_json
  ) {
    initialContent = {
      type: "rich_text",
      html: tiptapJsonToHtml(latestVersion.rich_text_json),
    };
  }

  console.log("Document viewed:", {
    documentId: docId,
    versionId: latestVersion.id,
    viewerUserId: user.id,
  });

  return (
    <DocumentViewerClient
      document={{ id: doc.id, title: doc.title, status: doc.status }}
      versions={versions.map((v) => ({
        id: v.id,
        version_number: v.version_number,
        content_type: v.content_type,
        file_name: v.file_name,
        file_size: v.file_size,
        mime_type: v.mime_type,
        storage_path: v.storage_path,
        created_by: v.created_by,
        created_at: v.created_at,
        uploaderName: profileMap[v.created_by] ?? "Unknown",
      }))}
      initialVersionId={latestVersion.id}
      initialContent={initialContent}
      projectId={projectId}
      canEdit={canEdit}
      currentUserId={user.id}
      userRole={role ?? "carpenter"}
      canDismissCompliance={role === "admin" || role === "architect"}
    />
  );
}
