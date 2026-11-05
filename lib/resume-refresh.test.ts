import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MIN_BACKGROUND_MS,
  PLAYER_SESSION_END_EVENT,
  PLAYER_SESSION_SELECTOR,
  RESUME_DEDUPE_MS,
  RESUME_SAFE_FORM,
  RESUME_TICK_MS,
  SUSPEND_GAP_MS,
  bindResumeRefresh,
  controlIsDirty,
  formLocksRefresh,
  initialResumeState,
  isResumeLockedPath,
  reduceResume,
  type ControlLike,
  type ResumeDocument,
  type ResumeGuard,
  type ResumeHost,
  type ResumeWindow,
} from "./resume-refresh.ts";

const openGuard = (): ResumeGuard => ({
  onLine: true,
  visible: true,
  playerActive: false,
  formLocked: false,
});

class Emitter {
  private listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event = new Event(type)) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }
}

function harness(options?: {
  pathname?: string;
  onLine?: boolean;
  player?: boolean;
  controls?: ControlLike[];
}) {
  let now = 10_000;
  let refreshes = 0;
  let pathname = options?.pathname ?? "/";
  let onLine = options?.onLine ?? true;
  let player = options?.player ?? false;
  const controls = options?.controls ?? [];
  const docEmitter = new Emitter();
  const winEmitter = new Emitter();
  let visibilityState: ResumeDocument["visibilityState"] = "visible";
  let timer: (() => void) | null = null;
  let intervalMs = 0;

  const doc: ResumeDocument = {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: (type, listener) => docEmitter.addEventListener(type, listener),
    removeEventListener: (type, listener) => docEmitter.removeEventListener(type, listener),
    querySelector: (selector) => (player && selector === PLAYER_SESSION_SELECTOR ? {} : null),
    querySelectorAll: () => controls,
  };
  const win: ResumeWindow = {
    addEventListener: (type, listener) => winEmitter.addEventListener(type, listener),
    removeEventListener: (type, listener) => winEmitter.removeEventListener(type, listener),
    setInterval: (handler, timeout) => {
      timer = handler;
      intervalMs = timeout;
      return 1;
    },
    clearInterval: () => {
      timer = null;
    },
  };
  const host: ResumeHost = {
    document: doc,
    window: win,
    navigator: {
      get onLine() {
        return onLine;
      },
    },
    pathname: () => pathname,
    now: () => now,
    refresh: () => {
      refreshes += 1;
    },
  };
  const stop = bindResumeRefresh(host);

  return {
    stop,
    get refreshes() {
      return refreshes;
    },
    get intervalMs() {
      return intervalMs;
    },
    setPath(next: string) {
      pathname = next;
    },
    setOnline(next: boolean) {
      onLine = next;
    },
    setPlayer(next: boolean) {
      player = next;
    },
    advance(ms: number) {
      now += ms;
    },
    hide() {
      visibilityState = "hidden";
      docEmitter.emit("visibilitychange");
    },
    show() {
      visibilityState = "visible";
      docEmitter.emit("visibilitychange");
    },
    focus() {
      winEmitter.emit("focus");
    },
    pageshow(persisted: boolean) {
      const event = new Event("pageshow");
      Object.defineProperty(event, "persisted", { value: persisted });
      winEmitter.emit("pageshow", event);
    },
    resume() {
      winEmitter.emit("resume");
    },
    freeze() {
      winEmitter.emit("freeze");
    },
    online() {
      winEmitter.emit("online");
    },
    playerEnd() {
      docEmitter.emit(PLAYER_SESSION_END_EVENT);
    },
    tick() {
      timer?.();
    },
  };
}

test("returning from the background refreshes the mounted route once", () => {
  const app = harness();
  assert.equal(app.refreshes, 0);
  app.hide();
  app.advance(MIN_BACKGROUND_MS);
  app.show();
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("visibility, focus, pageshow, and resume from one return share a single refresh", () => {
  const app = harness();
  app.hide();
  app.advance(MIN_BACKGROUND_MS + 1_000);
  app.show();
  app.focus();
  app.pageshow(true);
  app.resume();
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("a short hide, a bare focus, and the first pageshow do not refresh", () => {
  const app = harness();
  app.hide();
  app.advance(MIN_BACKGROUND_MS - 1);
  app.show();
  app.focus();
  app.pageshow(false);
  assert.equal(app.refreshes, 0);
  app.stop();
});

test("a later return after the dedupe window refreshes again", () => {
  const app = harness();
  app.hide();
  app.advance(MIN_BACKGROUND_MS);
  app.show();
  app.hide();
  app.advance(RESUME_DEDUPE_MS + MIN_BACKGROUND_MS);
  app.show();
  assert.equal(app.refreshes, 2);
  app.stop();
});

test("bfcache restore refreshes even when the hide event was missed", () => {
  const app = harness();
  app.pageshow(true);
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("a suspended clock refreshes once when visibility events never fired", () => {
  const app = harness();
  assert.equal(app.intervalMs, RESUME_TICK_MS);
  app.advance(SUSPEND_GAP_MS);
  app.tick();
  app.focus();
  app.resume();
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("a timer gap after a visibility refresh does not request again", () => {
  const app = harness();
  app.hide();
  app.advance(SUSPEND_GAP_MS);
  app.tick();
  app.show();
  app.advance(RESUME_TICK_MS);
  app.tick();
  app.focus();
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("offline resume keeps the current page and refreshes once the network returns", () => {
  const app = harness({ onLine: false });
  app.hide();
  app.advance(MIN_BACKGROUND_MS);
  app.show();
  app.focus();
  assert.equal(app.refreshes, 0);
  app.online();
  assert.equal(app.refreshes, 0);
  app.setOnline(true);
  app.online();
  app.online();
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("an ordinary online flap does not refresh", () => {
  const app = harness();
  app.online();
  app.tick();
  assert.equal(app.refreshes, 0);
  app.stop();
});

test("screen wake while the player or sleep timer is open does not refresh until the player closes", () => {
  const app = harness({ player: true });
  app.hide();
  app.advance(SUSPEND_GAP_MS);
  app.show();
  app.focus();
  app.pageshow(true);
  app.resume();
  app.tick();
  assert.equal(app.refreshes, 0);
  app.playerEnd();
  assert.equal(app.refreshes, 0, "iframe still mounted");
  app.setPlayer(false);
  app.playerEnd();
  app.playerEnd();
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("closing the player during normal playback does not refresh", () => {
  const app = harness({ player: true });
  app.setPlayer(false);
  app.playerEnd();
  assert.equal(app.refreshes, 0);
  app.stop();
});

test("offline playback defers the refresh until the player is gone and the network is back", () => {
  const app = harness({ player: true, onLine: false });
  app.hide();
  app.advance(MIN_BACKGROUND_MS);
  app.show();
  app.setPlayer(false);
  app.playerEnd();
  assert.equal(app.refreshes, 0);
  app.setOnline(true);
  app.online();
  assert.equal(app.refreshes, 1);
  app.stop();
});

test("admin, login, and the open-mic form stay put across resume", () => {
  for (const pathname of ["/admin", "/admin/zrodla", "/zaloguj", "/open-mic/dodaj"]) {
    const app = harness({ pathname });
    app.hide();
    app.advance(MIN_BACKGROUND_MS);
    app.show();
    app.pageshow(true);
    assert.equal(app.refreshes, 0, pathname);
    app.stop();
  }
});

test("a dirty public form is kept and a resume-safe search field is not a lock", () => {
  const dirty: ControlLike = {
    tagName: "INPUT",
    type: "search",
    value: "nowy szkic",
    defaultValue: "",
    closest: () => ({ hasAttribute: () => false }),
  };
  const safe: ControlLike = {
    ...dirty,
    closest: () => ({ hasAttribute: (name) => name === RESUME_SAFE_FORM }),
  };
  const blocked = harness({ controls: [dirty] });
  blocked.hide();
  blocked.advance(MIN_BACKGROUND_MS);
  blocked.show();
  assert.equal(blocked.refreshes, 0);
  blocked.stop();

  const allowed = harness({ controls: [safe] });
  allowed.hide();
  allowed.advance(MIN_BACKGROUND_MS);
  allowed.show();
  assert.equal(allowed.refreshes, 1);
  allowed.stop();
});

test("cleanup ignores later resume signals", () => {
  const app = harness();
  app.stop();
  app.hide();
  app.advance(MIN_BACKGROUND_MS);
  app.show();
  app.tick();
  assert.equal(app.refreshes, 0);
});

test("form locks are route and field specific", () => {
  assert.equal(isResumeLockedPath("/admin"), true);
  assert.equal(isResumeLockedPath("/admin/login?next=/"), true);
  assert.equal(isResumeLockedPath("/open-mic/dodaj/"), true);
  assert.equal(isResumeLockedPath("/open-mic"), false);
  assert.equal(isResumeLockedPath("/zaloguj"), true);
  assert.equal(isResumeLockedPath("/standup"), false);
  assert.equal(isResumeLockedPath("/administrator"), false);

  const text: ControlLike = {
    tagName: "INPUT",
    type: "text",
    value: "a",
    defaultValue: "a",
    closest: () => ({ hasAttribute: () => false }),
  };
  assert.equal(controlIsDirty(text), false);
  assert.equal(controlIsDirty({ ...text, value: "b" }), true);
  assert.equal(controlIsDirty({ ...text, type: "hidden", value: "secret", defaultValue: "" }), false);
  assert.equal(
    controlIsDirty({
      tagName: "SELECT",
      closest: () => null,
      options: [{ selected: true, defaultSelected: false }],
    }),
    true,
  );
  assert.equal(formLocksRefresh("/standup", [{ ...text, closest: () => null }]), false);
  assert.equal(formLocksRefresh("/", []), false);
});

test("the background timestamp is the start of the hide, not a later freeze", () => {
  let state = initialResumeState();
  const guard = openGuard();
  state = reduceResume(state, { type: "background", now: 0 }, guard).state;
  state = reduceResume(state, { type: "background", now: 2_500 }, guard).state;
  const decision = reduceResume(state, { type: "foreground", now: MIN_BACKGROUND_MS, source: "visibility" }, guard);
  assert.equal(decision.refresh, true);
});

test("the root layout soft-refreshes and the player session is marked", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const component = readFileSync(new URL("../app/components/ResumeRefresh.tsx", import.meta.url), "utf8");
  const modal = readFileSync(new URL("../app/components/VideoModal.tsx", import.meta.url), "utf8");
  const nav = readFileSync(new URL("../app/components/NavSearch.tsx", import.meta.url), "utf8");
  const drawer = readFileSync(new URL("../app/components/MobileDrawer.tsx", import.meta.url), "utf8");
  const logic = readFileSync(new URL("./resume-refresh.ts", import.meta.url), "utf8");

  assert.match(layout, /<ResumeRefresh \/>/);
  assert.match(component, /startTransition/);
  assert.match(component, /routerRef\.current\.refresh\(\)/);
  assert.match(component, /bindResumeRefresh/);
  assert.doesNotMatch(component, /location\.reload|location\.assign/);
  assert.doesNotMatch(logic, /location\.reload|location\.assign/);
  assert.match(logic, /visibilitychange/);
  assert.match(logic, /pageshow/);
  assert.match(logic, /pagehide/);
  assert.match(logic, /"freeze"/);
  assert.match(logic, /"resume"/);
  assert.match(logic, /"online"/);
  assert.match(modal, /data-player-session=""/);
  assert.match(modal, /PLAYER_SESSION_END_EVENT/);
  assert.match(nav, /data-resume-safe=""/);
  assert.match(drawer, /data-resume-safe=""/);
});
