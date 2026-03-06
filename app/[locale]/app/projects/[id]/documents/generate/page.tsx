import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProjectRole } from "@/lib/auth/rbac";
import { DocumentGenerator } from "@/components/document-generator";

export default async function GenerateDocumentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/sign-in", locale });

  try {
    await requireProjectRole(supabase, projectId, "admin", "architect");
  } catch {
    redirect({ href: `/app/projects/${projectId}`, locale });
  }

  return (
    <div className="max-w-2xl py-8">
      <DocumentGenerator projectId={projectId} />
    </div>
  );
}
