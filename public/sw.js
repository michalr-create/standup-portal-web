/*
 * Push-only service worker.
 * There is no fetch handler and no cache. ResumeRefresh and the in-app Back
 * stack (the player history entry) stay in the page.
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

self.addEventListener("push", (event) => {
  const payload = payloadOf(event);
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : "parska";
  const body = typeof payload.body === "string" ? payload.body : "";
  const icon = typeof payload.icon === "string" && payload.icon.startsWith("/") ? payload.icon : "/favicon-192.png";
  const url = safeUrl(payload.url);
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(openOrFocus(target));
});

async function openOrFocus(target) {
  const absolute = new URL(target, self.location.origin).href;
  const sameOrigin = absolute.startsWith(self.location.origin);
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if (client.url === absolute && "focus" in client) return client.focus();
  }
  if (sameOrigin) {
    for (const client of windows) {
      if (typeof client.navigate === "function" && "focus" in client) {
        try {
          await client.focus();
          return await client.navigate(absolute);
        } catch {
          break;
        }
      }
    }
  }
  if (self.clients.openWindow) return self.clients.openWindow(absolute);
}
