import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { notificationPayload, pushTtlSeconds, type PushMessage } from "./push-dispatch.ts";

export type PushEndpoint = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** VAPID contact (mailto:) is required by the push protocol. It does not send mail. */
export function configureVapid(): void {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:kontakt@parska.pl";
  if (!publicKey || !privateKey) {
    throw new Error("missing_vapid");
  }
  setVapidDetails(subject, publicKey, privateKey);
}

export async function deliverPush(
  subscription: PushEndpoint,
  message: PushMessage,
): Promise<{ statusCode: number | null }> {
  try {
    const result = await sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(notificationPayload(message)),
      { TTL: pushTtlSeconds(message.kind), timeout: 8_000 },
    );
    return { statusCode: result.statusCode };
  } catch (error) {
    if (error instanceof WebPushError) return { statusCode: error.statusCode };
    const statusCode =
      typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : null;
    return { statusCode: statusCode != null && Number.isFinite(statusCode) ? statusCode : null };
  }
}
