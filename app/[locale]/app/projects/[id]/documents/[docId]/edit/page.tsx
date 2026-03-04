import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectRole } from "@/lib/auth/rbac";
import { RichTextEditor } from "@/components/rich-text-editor";

export default async function EditDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; docId: string }>;
  searchParams: Promise<{ suggestions?: string }>;
}) {
  const { id: projectId, docId } = await params;
  const { suggestions } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Only architects and admins can edit
  try {
    await requireProjectRole(supabase, projectId, "admin", "architect");
  } catch {
    redirect(`/app/projects/${projectId}/documents/${docId}`);
  }

  // Fetch document (RLS enforces project membership)
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, status, project_id")
    .eq("id", docId)
    .eq("project_id", projectId)
    .single();

  if (!doc) return notFound();

  // Approved documents are immutable — redirect to viewer
  if (doc.status === "approved") {
    redirect(`/app/projects/${projectId}/documents/${docId}`);
  }

  // Fetch latest rich_text version (if any)
  const admin = createAdminClient();
  const { data: version } = await admin
    .from("document_versions")
    .select("id, rich_text_json")
    .eq("document_id", docId)
    .eq("content_type", "rich_text")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <RichTextEditor
      docId={docId}
      projectId={projectId}
      initialTitle={doc.title}
      initialContent={version?.rich_text_json ?? undefined}
      initialVersionId={version?.id ?? null}
      autoOpenSuggestions={suggestions === "1"}
    />
  );
}
