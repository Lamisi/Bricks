import { notFound } from "next/navigation";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { ProjectClient } from "@/components/project-client";

export default async function ProjectPage({
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

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, location, status, organizations(name)")
    .eq("id", projectId)
    .single();

  if (!project) return notFound();

  const [role, { data: memberRows }, { data: documentRows }] =
    await Promise.all([
      getUserProjectRole(supabase, projectId),
      supabase
        .from("project_members")
        .select("user_id, role, profiles!user_id(full_name, avatar_url)")
        .eq("project_id", projectId),
      supabase
        .from("documents")
        .select(
          `id, title, status, updated_at,
           document_versions!current_version_id(
             id, version_number, file_name, mime_type, file_size, storage_path
           )`,
        )
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false }),
    ]);

  const documents = (documentRows ?? []).map((d) => {
    const ver = Array.isArray(d.document_versions)
      ? d.document_versions[0]
      : d.document_versions;
    return {
      id: d.id,
      title: d.title,
      status: d.status,
      updated_at: d.updated_at,
      current_version: ver
        ? {
            id: ver.id,
            version_number: ver.version_number,
            file_name: ver.file_name ?? null,
            mime_type: ver.mime_type ?? null,
            file_size: ver.file_size ?? null,
            storage_path: ver.storage_path ?? null,
          }
        : null,
    };
  });

  return (
    <ProjectClient
      project={
        project as {
          id: string;
          name: string;
          description: string | null;
          location: string | null;
          status: string;
          organizations: { name: string } | null;
        }
      }
      members={(memberRows ?? []) as unknown as Array<{
        user_id: string;
        role: string;
        profiles: { full_name: string | null; avatar_url: string | null } | null;
      }>}
      role={role}
      initialDocuments={documents}
      projectId={projectId}
    />
  );
}
