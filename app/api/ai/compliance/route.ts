import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { runComplianceCheck } from "@/lib/ai/compliance";

// ---------------------------------------------------------------------------
// GET /api/ai/compliance?versionId=...&projectId=...
// Returns current compliance check status + issues for a document version.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");
  const projectId = searchParams.get("projectId");

  if (!versionId || !projectId) {
    return NextResponse.json({ error: "versionId and projectId are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return NextResponse.json({ error: "Not a project member" }, { status: 403 });

  const admin = createAdminClient();
  const { data: check } = await admin
    .from("compliance_checks")
    .select("id, status, model, duration_ms, error, created_at, updated_at")
    .eq("document_version_id", versionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!check) return NextResponse.json({ check: null, issues: [] });

  const { data: issues } = await admin
    .from("compliance_issues")
    .select("id, severity, description, source_reference, dismissed_at, dismiss_reason")
    .eq("compliance_check_id", check.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ check, issues: issues ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/ai/compliance
// Starts (or retries) a compliance check for a document version.
// Body: { versionId: string, projectId: string }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { versionId?: string; projectId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { versionId, projectId } = body;
  if (!versionId || !projectId) {
    return NextResponse.json({ error: "versionId and projectId are required" }, { status: 400 });
  }

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return NextResponse.json({ error: "Not a project member" }, { status: 403 });

  // Get user's preferred language for AI responses
  const { data: profile } = await supabase
    .from("profiles")
    .select("language")
    .eq("id", user.id)
    .single();
  const language = profile?.language === "en" ? "en" : "no";

  const admin = createAdminClient();

  // Check if an active check already exists (pending or running)
  const { data: existing } = await admin
    .from("compliance_checks")
    .select("id, status")
    .eq("document_version_id", versionId)
    .in("status", ["pending", "running"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ checkId: existing.id, status: existing.status });
  }

  // Create a new compliance_check record
  const { data: check, error: insertError } = await admin
    .from("compliance_checks")
    .insert({ document_version_id: versionId, status: "pending" })
    .select("id")
    .single();

  if (insertError || !check) {
    console.error("Compliance check insert error:", insertError);
    return NextResponse.json({ error: "Could not start compliance check" }, { status: 500 });
  }

  // Run the check synchronously — Vercel Pro timeout is 60s which covers typical docs.
  // The client shows a loading state and polls if needed.
  await runComplianceCheck(check.id, language);

  // Return final state
  const { data: finalCheck } = await admin
    .from("compliance_checks")
    .select("id, status, error")
    .eq("id", check.id)
    .single();

  const { data: issues } = await admin
    .from("compliance_issues")
    .select("id, severity, description, source_reference, dismissed_at, dismiss_reason")
    .eq("compliance_check_id", check.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    checkId: check.id,
    status: finalCheck?.status ?? "failed",
    issues: issues ?? [],
    error: finalCheck?.error,
  });
}
