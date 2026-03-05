import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProjectRole } from "@/lib/auth/rbac";
import { DocumentGenerator } from "@/components/document-generator";

export default async function GenerateDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  try {
    await requireProjectRole(supabase, projectId, "admin", "architect");
  } catch {
    redirect(`/app/projects/${projectId}`);
  }

  return (
    <div className="max-w-2xl py-8">
      <DocumentGenerator projectId={projectId} />
    </div>
  );
}
