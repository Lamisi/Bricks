import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const FROM = "Bricks <noreply@bricks.build>";

const IS_DEV = process.env.NODE_ENV === "development";

// ---------------------------------------------------------------------------
// Shared HTML template builder
// ---------------------------------------------------------------------------
function buildEmailHtml({
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0F2D5E;padding:24px 32px">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">Bricks</span>
      </div>
      <div style="padding:32px">
        <h1 style="font-size:22px;font-weight:600;margin:0 0 12px">${heading}</h1>
        <p style="color:#555;margin:0 0 24px">${body}</p>
        <a href="${ctaUrl}"
           style="display:inline-block;background:#C45C3A;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:6px;font-weight:600;font-size:15px">
          ${ctaLabel}
        </a>
      </div>
    </div>
  `;
}

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

// ---------------------------------------------------------------------------
// sendDocumentStatusEmail
// ---------------------------------------------------------------------------
export async function sendDocumentStatusEmail({
  to,
  actorName,
  docTitle,
  newStatus,
  docLink,
  note,
}: {
  to: string;
  actorName: string;
  docTitle: string;
  newStatus: "in_review" | "approved" | "changes_requested";
  docLink: string;
  note?: string;
}) {
  if (IS_DEV) {
    console.log("[DEV] Status email skipped:", { to, newStatus, docTitle });
    return;
  }

  const configs = {
    in_review: {
      subject: `"${docTitle}" is ready for review`,
      heading: `${docTitle} — ready for review`,
      body: `<strong>${actorName}</strong> submitted this document for review.`,
      ctaLabel: "Review document",
    },
    approved: {
      subject: `"${docTitle}" was approved`,
      heading: `${docTitle} — approved`,
      body: `<strong>${actorName}</strong> approved this document.`,
      ctaLabel: "View document",
    },
    changes_requested: {
      subject: `Changes requested on "${docTitle}"`,
      heading: `${docTitle} — changes requested`,
      body: `<strong>${actorName}</strong> requested changes.${note?.trim() ? `<br><br><em>${note.trim()}</em>` : ""}`,
      ctaLabel: "View feedback",
    },
  } as const;

  const cfg = configs[newStatus];
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: cfg.subject,
    html: buildEmailHtml({
      heading: cfg.heading,
      body: cfg.body,
      ctaLabel: cfg.ctaLabel,
      ctaUrl: `${APP_URL}${docLink}`,
    }),
  });

  if (error) {
    console.error("Resend status email error:", { to, newStatus }, error.message);
  }
}

// ---------------------------------------------------------------------------
// sendCommentEmail
// ---------------------------------------------------------------------------
export async function sendCommentEmail({
  to,
  authorName,
  docTitle,
  commentBody,
  docLink,
}: {
  to: string;
  authorName: string;
  docTitle: string;
  commentBody: string;
  docLink: string;
}) {
  if (IS_DEV) {
    console.log("[DEV] Comment email skipped:", { to, docTitle });
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `New comment on "${docTitle}"`,
    html: buildEmailHtml({
      heading: `New comment on ${docTitle}`,
      body: `<strong>${authorName}</strong> commented:<br><br><em>${commentBody}</em>`,
      ctaLabel: "View comment",
      ctaUrl: `${APP_URL}${docLink}`,
    }),
  });

  if (error) {
    console.error("Resend comment email error:", { to }, error.message);
  }
}

// ---------------------------------------------------------------------------
// sendMentionEmail
// ---------------------------------------------------------------------------
export async function sendMentionEmail({
  to,
  authorName,
  docTitle,
  commentBody,
  docLink,
}: {
  to: string;
  authorName: string;
  docTitle: string;
  commentBody: string;
  docLink: string;
}) {
  if (IS_DEV) {
    console.log("[DEV] Mention email skipped:", { to, docTitle });
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${authorName} mentioned you in "${docTitle}"`,
    html: buildEmailHtml({
      heading: `You were mentioned in ${docTitle}`,
      body: `<strong>${authorName}</strong> mentioned you in a comment:<br><br><em>${commentBody}</em>`,
      ctaLabel: "View comment",
      ctaUrl: `${APP_URL}${docLink}`,
    }),
  });

  if (error) {
    console.error("Resend mention email error:", { to }, error.message);
  }
}

// ---------------------------------------------------------------------------
// sendComplianceCompleteEmail
// ---------------------------------------------------------------------------
export async function sendComplianceCompleteEmail({
  to,
  docTitle,
  issueCount,
  docLink,
}: {
  to: string;
  docTitle: string;
  issueCount: number;
  docLink: string;
}) {
  if (IS_DEV) {
    console.log("[DEV] Compliance email skipped:", { to, docTitle, issueCount });
    return;
  }

  const hasIssues = issueCount > 0;
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Compliance check complete for "${docTitle}"`,
    html: buildEmailHtml({
      heading: "Compliance check complete",
      body: hasIssues
        ? `The compliance check for <strong>${docTitle}</strong> found <strong>${issueCount} issue${issueCount === 1 ? "" : "s"}</strong> that may require attention.`
        : `The compliance check for <strong>${docTitle}</strong> found no issues. The document appears fully compliant.`,
      ctaLabel: "View results",
      ctaUrl: `${APP_URL}${docLink}`,
    }),
  });

  if (error) {
    console.error("Resend compliance email error:", { to }, error.message);
  }
}
