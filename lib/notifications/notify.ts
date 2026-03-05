import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail, type NotificationType } from "./email";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}

/**
 * Creates an in-app notification row and fires an email asynchronously.
 * Always resolves — email failure never blocks the caller.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  });

  if (error) {
    console.error("Failed to insert notification:", error);
    return;
  }

  // Non-blocking email
  void sendNotificationEmail({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  }).catch((err) => {
    console.error("Notification email error:", err);
  });
}

/**
 * Notifies multiple users at once. All rows are inserted in a single call;
 * emails are fired concurrently but non-blocking.
 */
export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const admin = createAdminClient();

  const { error } = await admin.from("notifications").insert(
    inputs.map((n) => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    })),
  );

  if (error) {
    console.error("Failed to insert notifications:", error);
    return;
  }

  void Promise.allSettled(
    inputs.map((n) =>
      sendNotificationEmail({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        link: n.link ?? null,
      }),
    ),
  ).catch((err) => {
    console.error("Batch notification email error:", err);
  });
}
