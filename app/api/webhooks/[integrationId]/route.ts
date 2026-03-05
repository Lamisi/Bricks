import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, sha256Hex } from "@/lib/webhooks/crypto";
import { verifySignature } from "@/lib/webhooks/signing";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> },
): Promise<NextResponse> {
  const { integrationId } = await params;
  const body = await request.text();

  const signature = request.headers.get("x-bricks-signature");
  const timestampHeader = request.headers.get("x-bricks-timestamp");
  const sourceIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const admin = createAdminClient();

  const { data: integration } = await (admin as any)
    .from("integrations")
    .select("id, project_id, webhook_secret_enc, status")
    .eq("id", integrationId)
    .single();

  if (!integration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (integration.status !== "active") {
    return NextResponse.json({ error: "Integration is inactive" }, { status: 403 });
  }

  let secret: string;
  try {
    secret = decryptSecret(integration.webhook_secret_enc);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  let eventType = "inbound";
  try {
    verifySignature(secret, signature, timestampHeader, body);
    const parsed = JSON.parse(body);
    if (typeof parsed?.event === "string") eventType = parsed.event;
  } catch (err) {
    await logInbound(admin, {
      integrationId,
      projectId: integration.project_id,
      eventType,
      status: "rejected",
      sourceIp,
      payloadHash: sha256Hex(body),
      error: err instanceof Error ? err.message : "Signature verification failed",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await logInbound(admin, {
    integrationId,
    projectId: integration.project_id,
    eventType,
    status: "success",
    sourceIp,
    payloadHash: sha256Hex(body),
    error: null,
  });

  return NextResponse.json({ received: true });
}

async function logInbound(
  admin: ReturnType<typeof createAdminClient>,
  entry: {
    integrationId: string;
    projectId: string;
    eventType: string;
    status: "success" | "failed" | "rejected";
    sourceIp: string;
    payloadHash: string;
    error: string | null;
  },
): Promise<void> {
  const { error } = await (admin as any).from("integrations_log").insert({
    integration_id: entry.integrationId,
    project_id: entry.projectId,
    direction: "inbound",
    event_type: entry.eventType,
    status: entry.status,
    source_ip: entry.sourceIp,
    payload_hash: entry.payloadHash,
    attempt: 1,
    error: entry.error,
  });

  if (error) {
    console.error("Failed to write integration log:", error);
  }
}
