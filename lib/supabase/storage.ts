import { createAdminClient } from "./admin";

const BUCKET = "documents";
const VIEW_EXPIRY_SECONDS = 60;
const DOWNLOAD_EXPIRY_SECONDS = 300;

/**
 * Returns a short-lived signed URL for in-browser viewing (60 s).
 * Must be called server-side only (uses the service role key).
 */
export async function getSignedViewUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, VIEW_EXPIRY_SECONDS);

  if (error || !data) {
    throw new Error(`Could not generate view URL: ${error?.message}`);
  }
  return data.signedUrl;
}

/**
 * Returns a short-lived signed URL that triggers a file download (5 min).
 * Must be called server-side only (uses the service role key).
 */
export async function getSignedDownloadUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, DOWNLOAD_EXPIRY_SECONDS, { download: true });

  if (error || !data) {
    throw new Error(`Could not generate download URL: ${error?.message}`);
  }
  return data.signedUrl;
}
