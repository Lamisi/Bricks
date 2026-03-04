import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";

// ---------------------------------------------------------------------------
// POST /api/ai/compliance/dismiss
// Dismisses a compliance issue as a false positive.
// Body: { issueId: string, projectId: string, reason: string }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { issueId?: string; projectId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { issueId, projectId, reason } = body;
  if (!issueId || !projectId || !reason?.trim()) {
    return NextResponse.json(
      { error: "issueId, projectId, and reason are required" },
      { status: 400 },
    );
  }

  const role = await getUserProjectRole(supabase, projectId);
  if (!role || !["admin", "architect"].includes(role)) {
    return NextResponse.json(
      { error: "Only admins and architects can dismiss compliance issues" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("compliance_issues")
    .update({
      dismissed_at: new Date().toISOString(),
      dismissed_by: user.id,
      dismiss_reason: reason.trim(),
    })
    .eq("id", issueId);

  if (error) {
    console.error("Dismiss compliance issue error:", error);
    return NextResponse.json({ error: "Could not dismiss issue" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
