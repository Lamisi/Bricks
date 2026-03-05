import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    resend = new Resend(key);
  }
  return resend;
}

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Bricks <notifications@bricks.app>";

export type NotificationType =
  | "status_change"
  | "mention"
  | "comment_reply"
  | "compliance_complete";

interface EmailPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
}

/**
 * Sends a notification email to a user if they have not opted out of that type.
 * Fails silently — in-app notification is the source of truth.
 */
export async function sendNotificationEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // Email not configured — skip silently

  const admin = createAdminClient();

  // Fetch user email + preferences in one query
  const { data: profile } = await (admin as any)
    .from("profiles")
    .select("email_prefs, auth_users:id(email)")
    .eq("id", payload.userId)
    .single();

  // Check opt-out preference
  const prefs: Record<string, boolean> = profile?.email_prefs ?? {};
  if (prefs[payload.type] === false) return;

  // Get user email from auth.users via admin API
  const {
    data: { user },
  } = await admin.auth.admin.getUserById(payload.userId);
  const email = user?.email;
  if (!email) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://bricks.app";
  const linkUrl = payload.link ? `${appUrl}${payload.link}` : appUrl;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  <p style="font-size:1.1em;font-weight:600;margin-bottom:8px">${escapeHtml(payload.title)}</p>
  ${payload.body ? `<p style="color:#555;margin-bottom:16px">${escapeHtml(payload.body)}</p>` : ""}
  <a href="${linkUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:0.9em">
    View in Bricks
  </a>
  <p style="color:#999;font-size:0.8em;margin-top:24px">
    You can manage your email notification preferences in your profile settings.
  </p>
</body>
</html>`;

  try {
    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: payload.title,
      html,
    });
    if (error) {
      console.error("Email send failed:", { userId: payload.userId, type: payload.type }, error);
    }
  } catch (err) {
    console.error("Email send error:", { userId: payload.userId, type: payload.type }, err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
