/*
 * Push-only service worker.
 * sw-version: 3
 * There is no fetch handler and no cache. ResumeRefresh and the in-app Back
 * stack (the player history entry) stay in the page.
 *
 * Android paints `badge` as a white alpha mask in the status bar. The colour
 * app icon stays on `icon` for the notification shade. A payload may override
 * either path; both must stay on this origin.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function payloadOf(event) {
  if (!event.data) return {};
  try {
    const parsed = event.data.json();
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { title: "parska", body: event.data.text() };
  }
}

function safeUrl(value) {
  if (typeof value !== "string" || !value) return "/ulubione";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.href;
  } catch {
    // Fall through to the in-app list.
  }
  return "/ulubione";
}

const DEFAULT_ICON = "/favicon-192.png";
const DEFAULT_BADGE = "/icons/badge-96.png";

function sameOriginPath(value, fallback) {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return fallback;
}

self.addEventListener("push", (event) => {
  const payload = payloadOf(event);
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : "parska";
  const body = typeof payload.body === "string" ? payload.body : "";
  const icon = sameOriginPath(payload.icon, DEFAULT_ICON);
  const badge = sameOriginPath(payload.badge, DEFAULT_BADGE);
  const url = safeUrl(payload.url);
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(openOrFocus(target));
});

function sameSite(url, origin) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

async function openOrFocus(target) {
  const origin = self.location.origin;
  let absolute;
  try {
    absolute = new URL(target, origin).href;
  } catch {
    return;
  }
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const parska = windows.filter((client) => sameSite(client.url, origin));
  for (const client of parska) {
    if (client.url === absolute && "focus" in client) return client.focus();
  }
  // Same-origin targets (including /?film=) reuse a parska window.
  // https YouTube URLs from notifications already delivered stay a new window.
  if (sameSite(absolute, origin)) {
    const focused = [];
    const rest = [];
    for (const client of parska) {
      if (client.focused) focused.push(client);
      else rest.push(client);
    }
    for (const client of focused.concat(rest)) {
      if (typeof client.navigate !== "function" || !("focus" in client)) continue;
      try {
        await client.focus();
        return await client.navigate(absolute);
      } catch {
        // This window refused. Try the next parska window, then a new one.
      }
    }
  }
  if (self.clients.openWindow) return self.clients.openWindow(absolute);
}
