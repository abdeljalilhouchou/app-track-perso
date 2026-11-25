// Server only: imported by server actions and the cron route, never by client components.
import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "@/lib/push-key";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured = false;

/** False until VAPID_PRIVATE_KEY is set on the server. */
export function pushReady() {
  const key = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!key) return false;
  if (!configured) {
    webpush.setVapidDetails("https://app-track-perso.vercel.app", VAPID_PUBLIC_KEY, key);
    configured = true;
  }
  return true;
}

/**
 * Sends one notification to one device. "gone" means the device unsubscribed or the
 * subscription expired: the caller removes it.
 */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  if (!pushReady()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: 4 * 3600, urgency: "normal", topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined },
    );
    return "ok";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "error";
  }
}
