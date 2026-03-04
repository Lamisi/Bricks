import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedViewUrl } from "@/lib/supabase/storage";
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

  // Fetch all versions newest-first (admin client — RLS already checked above)
  const admin = createAdminClient();
  const { data: versions } = await admin
    .from("document_versions")
    .select("id, version_number, file_name, file_size, mime_type, storage_path, created_by, created_at")
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

  // Generate initial signed URL for the latest version
  const latestVersion = versions[0];
  let initialSignedUrl: string | null = null;
  if (latestVersion.storage_path) {
    try {
      initialSignedUrl = await getSignedViewUrl(latestVersion.storage_path);
    } catch {
      // Client will show error state + retry button
    }
  }

  // Observability
  console.log("Document viewed:", {
    documentId: docId,
    versionId: latestVersion.id,
    viewerUserId: user.id,
  });

  return (
    <DocumentViewerClient
      document={{ id: doc.id, title: doc.title, status: doc.status }}
      versions={versions.map((v) => ({
        ...v,
        uploaderName: profileMap[v.created_by] ?? "Unknown",
      }))}
      initialVersionId={latestVersion.id}
      initialSignedUrl={initialSignedUrl}
      projectId={projectId}
    />
  );
}
