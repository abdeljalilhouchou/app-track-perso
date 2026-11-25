import { VAPID_PUBLIC_KEY } from "@/lib/push-key";

/** ok: can subscribe; install: an iPhone browser tab, the app must be opened from the home screen first. */
export type PushSupport = "ok" | "install" | "denied" | "unsupported";

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isInstalled()) return "install";
  if (!capable) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (pushSupport() === "unsupported" || pushSupport() === "install") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Asks for permission (must follow a tap on iPhone) and subscribes this device. */
export async function subscribePush(): Promise<{ subscription: PushSubscriptionJSON } | { error: "denied" | "unsupported" | "error" }> {
  const support = pushSupport();
  if (support !== "ok") return { error: support === "denied" ? "denied" : "unsupported" };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { error: "denied" };
    const reg = await registration();
    const existing = await reg.pushManager.getSubscription();
    const subscription = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
    return { subscription: subscription.toJSON() };
  } catch {
    return { error: "error" };
  }
}

/** Unsubscribes this device; returns the endpoint to forget on the server. */
export async function unsubscribePush() {
  const subscription = await currentSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => false);
  return endpoint;
}

export const deviceTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
