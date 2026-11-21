import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { iosNeedsHomeScreen, subscribeForPush, urlBase64ToUint8Array } from "./push-client.ts";

test("iOS outside the installed app must add parska to the home screen before push", () => {
  const iphone = {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
    platform: "iPhone",
    maxTouchPoints: 5,
    displayStandalone: false,
    navigatorStandalone: false,
  };
  assert.equal(iosNeedsHomeScreen(iphone), true);
  assert.equal(iosNeedsHomeScreen({ ...iphone, displayStandalone: true }), false);
  assert.equal(iosNeedsHomeScreen({ ...iphone, navigatorStandalone: true }), false);
  assert.equal(
    iosNeedsHomeScreen({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      platform: "MacIntel",
      maxTouchPoints: 5,
      displayStandalone: false,
      navigatorStandalone: false,
    }),
    true,
  );
  assert.equal(
    iosNeedsHomeScreen({
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      platform: "Linux x86_64",
      maxTouchPoints: 0,
      displayStandalone: false,
      navigatorStandalone: false,
    }),
    false,
  );
});

test("permission is requested by the click helper and a denial does not subscribe", async () => {
  let subscribed = false;
  const denied = await subscribeForPush({
    vapidPublicKey: "test-public-key",
    requestPermission: async () => "denied",
    registerWorker: async () => {
      subscribed = true;
      return { subscribe: async () => null };
    },
  });
  assert.deepEqual(denied, { ok: false, error: "denied" });
  assert.equal(subscribed, false);

  const missing = await subscribeForPush({
    vapidPublicKey: "  ",
    requestPermission: async () => "granted",
    registerWorker: async () => {
      throw new Error("should not register");
    },
  });
  assert.deepEqual(missing, { ok: false, error: "missing_key" });
  assert.deepEqual(Array.from(urlBase64ToUint8Array("AQID")), [1, 2, 3]);
});

test("the favorites page asks for permission only from the enable button", () => {
  const source = readFileSync(new URL("../app/ulubione/PushNotifications.tsx", import.meta.url), "utf8");
  const loaderStart = source.indexOf("async function loadPushSettings");
  const enableStart = source.indexOf("async function enableOnThisDevice");
  assert.ok(loaderStart > 0 && enableStart > loaderStart);
  const loader = source.slice(loaderStart, enableStart);
  const enable = source.slice(enableStart);
  assert.doesNotMatch(loader, /requestPermission/);
  assert.match(enable, /requestPermission\(\)/);
  assert.ok(enable.indexOf("iosBlocked") < enable.indexOf("requestPermission"));
  assert.match(source, /onClick=\{\(\) => void enableOnThisDevice\(\)\}/);
  assert.match(source, /Wyślij testowe/);
  assert.match(source, /ekranu początkowego/);
  assert.match(source, /label: "Shorty"/);
  assert.match(source, /notifyShorts: body\.notifyShorts === true/);
  assert.match(source, /DEFAULT_PUSH_PREFS/);
  assert.doesNotMatch(source, /notifyShorts:\s*true/);

  const page = readFileSync(new URL("../app/ulubione/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<PushNotifications \/>/);
  const places = readFileSync(new URL("../app/ulubione/AccountPlaces.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(places, /dojdą później/);

  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /<ResumeRefresh \/>/);
  assert.doesNotMatch(layout, /serviceWorker/);
});

test("the service worker shows the payload and opens or focuses the url without taking fetches", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(sw, /addEventListener\("push"/);
  assert.match(sw, /showNotification/);
  assert.match(sw, /payload\.title/);
  assert.match(sw, /payload\.body/);
  assert.match(sw, /payload\.icon/);
  assert.match(sw, /payload\.badge/);
  assert.match(sw, /\/favicon-192\.png/);
  assert.match(sw, /\/icons\/badge-96\.png/);
  assert.match(sw, /sw-version: 2/);
  assert.doesNotMatch(sw, /badge:\s*icon/);
  assert.match(sw, /payload\.url/);
  assert.match(sw, /addEventListener\("notificationclick"/);
  assert.match(sw, /client\.focus\(\)/);
  assert.match(sw, /clients\.openWindow/);
  assert.match(sw, /ResumeRefresh/);
  assert.doesNotMatch(sw, /addEventListener\(\s*["']fetch["']/);
  assert.doesNotMatch(sw, /caches\./);
});

test("the cron doc reads push_dispatch_secret from the vault every 15 minutes", () => {
  const doc = readFileSync(new URL("../docs/push-cron.md", import.meta.url), "utf8");
  assert.match(doc, /push_dispatch_secret/);
  assert.match(doc, /vault\.decrypted_secrets/);
  assert.match(doc, /x-push-dispatch-secret/);
  assert.match(doc, /pg_cron/);
  assert.match(doc, /pg_net/);
  assert.match(doc, /\/15 \* \* \* \*/);
  assert.match(doc, /npx web-push generate-vapid-keys/);
  assert.match(doc, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
  assert.match(doc, /VAPID_PRIVATE_KEY/);
  assert.match(doc, /VAPID_SUBJECT/);
  assert.match(doc, /PUSH_DISPATCH_SECRET/);
  assert.match(doc, /SUPABASE_SERVICE_KEY/);
  assert.match(doc, /20261121210000_notification_prefs_notify_shorts\.sql/);
  assert.match(doc, /notify_shorts/);
});
