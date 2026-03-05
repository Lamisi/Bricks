import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KnowledgeSourceManager } from "@/components/knowledge-source-manager";

export default async function KnowledgePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect({ href: "/sign-in" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect({ href: "/app" });

  const admin = createAdminClient();
  const { data: sources } = await admin
    .from("knowledge_sources")
    .select(
      "id, title, description, language, status, chunk_count, source_type, created_at",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Knowledge Sources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload legal documents and city codes to power AI compliance checking.
        </p>
      </div>
      <KnowledgeSourceManager initialSources={sources ?? []} />
    </div>
  );
}
