import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";

export type CommentRow = {
  id: string;
  body: string;
  created_by: string;
  created_at: string;
  parent_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  authorName: string;
  resolverName: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");
  const projectId = searchParams.get("projectId");

  if (!versionId || !projectId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return NextResponse.json({ error: "Not a project member" }, { status: 403 });

  const admin = createAdminClient();
  const { data: comments, error } = await admin
    .from("comments")
    .select("id, body, created_by, created_at, parent_id, resolved_at, resolved_by")
    .eq("document_version_id", versionId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load comments" }, { status: 500 });

  // Resolve display names for all authors and resolvers
  const userIds = Array.from(
    new Set([
      ...(comments ?? []).map((c) => c.created_by),
      ...(comments ?? []).filter((c) => c.resolved_by).map((c) => c.resolved_by!),
    ]),
  );

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const nameMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? "Unknown"]),
  );

  const result: CommentRow[] = (comments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    created_by: c.created_by,
    created_at: c.created_at,
    parent_id: c.parent_id,
    resolved_at: c.resolved_at,
    resolved_by: c.resolved_by,
    authorName: nameMap[c.created_by] ?? "Unknown",
    resolverName: c.resolved_by ? (nameMap[c.resolved_by] ?? "Unknown") : null,
  }));

  return NextResponse.json(result);
}
