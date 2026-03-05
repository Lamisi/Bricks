import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const projectId = request.nextUrl.searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserProjectRole(supabase, projectId);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await (admin as any)
    .from("integrations")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: "Could not delete integration" }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
