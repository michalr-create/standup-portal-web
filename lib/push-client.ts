export function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * iPhone and iPad only expose Web Push from an installed home-screen app.
 * The check matches the install hint: iPadOS reports a desktop Mac user agent.
 */
export function iosNeedsHomeScreen(env: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  displayStandalone: boolean;
  navigatorStandalone: boolean;
}): boolean {
  if (env.displayStandalone || env.navigatorStandalone) return false;
  if (/iPad|iPhone|iPod/.test(env.userAgent)) return true;
  return env.platform === "MacIntel" && env.maxTouchPoints > 1;
}

export async function subscribeForPush(input: {
  vapidPublicKey: string;
  requestPermission: () => Promise<NotificationPermission>;
  registerWorker: () => Promise<{
    subscribe: (applicationServerKey: BufferSource) => Promise<{
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    } | null>;
  }>;
}): Promise<
  | { ok: true; endpoint: string; p256dh: string; auth: string }
  | { ok: false; error: "missing_key" | "denied" | "no_subscription" }
> {
  if (!input.vapidPublicKey.trim()) return { ok: false, error: "missing_key" };
  const permission = await input.requestPermission();
  if (permission !== "granted") return { ok: false, error: "denied" };
  const registration = await input.registerWorker();
  const subscription = await registration.subscribe(urlBase64ToUint8Array(input.vapidPublicKey) as BufferSource);
  const endpoint = subscription?.endpoint ?? "";
  const p256dh = subscription?.keys?.p256dh ?? "";
  const auth = subscription?.keys?.auth ?? "";
  if (!endpoint || !p256dh || !auth) return { ok: false, error: "no_subscription" };
  return { ok: true, endpoint, p256dh, auth };
}
