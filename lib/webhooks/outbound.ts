import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, sha256Hex } from "./crypto";
import { signPayload } from "./signing";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

interface WebhookPayload {
  event: string;
  project_id: string;
  document_id: string;
  document_title: string;
  from_status: string;
  to_status: string;
  actor_id: string;
  timestamp: string;
}

/**
 * Fires all active outbound webhooks for a project after a status transition.
 * Each delivery is logged in integrations_log. Retries up to MAX_ATTEMPTS with
 * exponential backoff. All failures are swallowed — this must be called non-blocking.
 */
export async function fireOutboundWebhooks(payload: WebhookPayload): Promise<void> {
  const admin = createAdminClient();

  const { data: integrations } = await admin
    .from("integrations")
    .select("id, webhook_url, webhook_secret_enc")
    .eq("project_id", payload.project_id)
    .eq("type", "webhook_outbound")
    .eq("status", "active");

  if (!integrations?.length) return;

  const body = JSON.stringify(payload);
  const payloadHash = sha256Hex(body);

  await Promise.allSettled(
    integrations.map((integration) =>
      deliverWithRetry(admin, integration, body, payloadHash, payload),
    ),
  );
}

async function deliverWithRetry(
  admin: ReturnType<typeof createAdminClient>,
  integration: { id: string; webhook_url: string; webhook_secret_enc: string },
  body: string,
  payloadHash: string,
  payload: WebhookPayload,
): Promise<void> {
  let secret: string;
  try {
    secret = decryptSecret(integration.webhook_secret_enc);
  } catch (err) {
    console.error("Failed to decrypt webhook secret:", { integrationId: integration.id }, err);
    return;
  }

  let lastError: string | null = null;
  let httpStatus: number | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 2));
    }

    const timestamp = Date.now();
    const signature = signPayload(secret, timestamp, body);

    try {
      const response = await fetch(integration.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bricks-Signature": signature,
          "X-Bricks-Timestamp": String(timestamp),
          "X-Bricks-Event": payload.event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      httpStatus = response.status;

      if (response.ok) {
        await logDelivery(admin, {
          integrationId: integration.id,
          projectId: payload.project_id,
          eventType: payload.event,
          status: "success",
          httpStatusCode: httpStatus,
          destinationUrl: integration.webhook_url,
          payloadHash,
          attempt,
          error: null,
        });
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error";
      httpStatus = null;
    }
  }

  // All attempts exhausted
  await logDelivery(admin, {
    integrationId: integration.id,
    projectId: payload.project_id,
    eventType: payload.event,
    status: "failed",
    httpStatusCode: httpStatus,
    destinationUrl: integration.webhook_url,
    payloadHash,
    attempt: MAX_ATTEMPTS,
    error: lastError,
  });
}

async function logDelivery(
  admin: ReturnType<typeof createAdminClient>,
  entry: {
    integrationId: string;
    projectId: string;
    eventType: string;
    status: "success" | "failed" | "rejected";
    httpStatusCode: number | null;
    destinationUrl: string;
    payloadHash: string;
    attempt: number;
    error: string | null;
  },
): Promise<void> {
  const { error } = await (admin as any)
    .from("integrations_log")
    .insert({
      integration_id: entry.integrationId,
      project_id: entry.projectId,
      direction: "outbound",
      event_type: entry.eventType,
      status: entry.status,
      http_status_code: entry.httpStatusCode,
      destination_url: entry.destinationUrl,
      payload_hash: entry.payloadHash,
      attempt: entry.attempt,
      error: entry.error,
    });

  if (error) {
    console.error("Failed to write integration log:", error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
