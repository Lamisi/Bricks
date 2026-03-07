import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const FROM = "Bricks <noreply@bricks.build>";

const IS_DEV = process.env.NODE_ENV === "development";

export async function sendProjectInviteEmail({
  to,
  inviterName,
  projectName,
  role,
  token,
}: {
  to: string;
  inviterName: string;
  projectName: string;
  role: string;
  token: string;
}) {
  const joinUrl = `${APP_URL}/app/projects/join?token=${token}`;
  const roleLabel = role.replace(/_/g, " ");

  // In local development Resend's domain verification is not available, so
  // we skip the actual send and print the join URL to the server console.
  if (IS_DEV) {
    console.log(
      "[DEV] Invite email skipped — open this URL to accept the invitation:",
      joinUrl,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join "${projectName}" on Bricks`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="background:#0F2D5E;padding:24px 32px">
          <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">Bricks</span>
        </div>
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px">
            You've been invited to join a project
          </h1>
          <p style="color:#555;margin:0 0 24px">
            <strong>${inviterName}</strong> has invited you to join
            <strong>${projectName}</strong> as a <strong>${roleLabel}</strong>.
          </p>
          <a href="${joinUrl}"
             style="display:inline-block;background:#C45C3A;color:#fff;text-decoration:none;
                    padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px">
            Accept invitation
          </a>
          <p style="color:#888;font-size:13px;margin:24px 0 0">
            This invitation expires in 7 days. If you don't have a Bricks account,
            you'll be asked to create one first.
          </p>
          <p style="color:#bbb;font-size:12px;margin:8px 0 0">
            Or copy this link: ${joinUrl}
          </p>
        </div>
      </div>
    `,
  });

  if (error) {
    console.error("Resend email error:", { to }, error.message);
    throw new Error(`Failed to send invite email: ${error.message}`);
  }
}
