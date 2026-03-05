import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_VERSION = "v1";
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Creates an HMAC-SHA256 signature for an outbound webhook payload.
 * Format: v1=<hex digest>
 * The signed string is: "<timestamp>.<body>"
 */
export function signPayload(secret: string, timestamp: number, body: string): string {
  const mac = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `${SIGNATURE_VERSION}=${mac}`;
}

/**
 * Verifies an inbound webhook signature.
 * Throws if the signature is missing, malformed, expired, or invalid.
 */
export function verifySignature(
  secret: string,
  signature: string | null,
  timestampHeader: string | null,
  body: string,
): void {
  if (!signature || !timestampHeader) {
    throw new Error("Missing signature or timestamp header");
  }

  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    throw new Error("Invalid timestamp header");
  }

  const age = Date.now() - timestamp;
  if (age > TIMESTAMP_TOLERANCE_MS || age < -TIMESTAMP_TOLERANCE_MS) {
    throw new Error("Webhook timestamp is too old or too far in the future");
  }

  const expected = signPayload(secret, timestamp, body);
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signature, "utf8");

  if (
    expectedBuf.length !== receivedBuf.length ||
    !timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    throw new Error("Webhook signature mismatch");
  }
}
