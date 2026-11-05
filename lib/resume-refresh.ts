/**
 * Installed PWAs keep the mounted App Router tree when the phone resumes
 * them. pg_net revalidation only refreshes the server cache, so the open
 * page stays stale until something asks for it again.
 *
 * A soft `router.refresh()` pulls the current route without a document
 * reload, so filters, scroll, auth, and favourites survive. Playback and
 * in-progress forms are left untouched.
 */

export const MIN_BACKGROUND_MS = 3_000;
export const RESUME_DEDUPE_MS = 2_000;
/** Clock jump that means JS was suspended and the hide events were missed. */
export const SUSPEND_GAP_MS = 30_000;
export const RESUME_TICK_MS = 15_000;

export const RESUME_LOCK_PREFIXES = ["/admin", "/zaloguj", "/open-mic/dodaj"] as const;

/** Mounted while the YouTube dialog, iframe, and sleep timer are on screen. */
export const PLAYER_SESSION_SELECTOR = "[data-player-session]";
export const PLAYER_SESSION_END_EVENT = "parska:player-session-end";
export const RESUME_SAFE_FORM = "data-resume-safe";

export type ForegroundSource =
  | "visibility"
  | "pageshow"
  | "focus"
  | "resume"
  | "online"
  | "timer"
  | "player-idle";

export type ResumeSignal =
  | { type: "background"; now: number }
  | {
      type: "foreground";
      now: number;
      source: ForegroundSource;
      persisted?: boolean;
      gapMs?: number;
    };

export type ResumeState = {
  hiddenAt: number | null;
  lastRefreshAt: number | null;
  pendingOnline: boolean;
  pendingPlayer: boolean;
};

export type ResumeGuard = {
  onLine: boolean;
  visible: boolean;
  playerActive: boolean;
  formLocked: boolean;
};

export type ControlLike = {
  tagName: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  options?: ArrayLike<{ selected: boolean; defaultSelected: boolean }>;
  closest: (selector: string) => { hasAttribute: (name: string) => boolean } | null;
};

export type ResumeDocument = {
  visibilityState: "visible" | "hidden" | "prerender";
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  querySelector: (selector: string) => unknown;
  querySelectorAll: (selector: string) => Iterable<ControlLike>;
};

export type ResumeWindow = {
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  setInterval: (handler: () => void, timeout: number) => unknown;
  clearInterval: (id: unknown) => void;
};

export type ResumeHost = {
  document: ResumeDocument;
  window: ResumeWindow;
  navigator: { onLine: boolean };
  pathname: () => string;
  now: () => number;
  refresh: () => void;
};

const EXPLICIT_RETURN = new Set<ForegroundSource>(["visibility", "pageshow", "focus", "resume"]);

export function initialResumeState(): ResumeState {
  return { hiddenAt: null, lastRefreshAt: null, pendingOnline: false, pendingPlayer: false };
}

function normalizePath(pathname: string): string {
  const cut = pathname.split(/[?#]/, 1)[0] || "/";
  if (cut.length > 1 && cut.endsWith("/")) return cut.slice(0, -1);
  return cut;
}

export function isResumeLockedPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return RESUME_LOCK_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function playerSessionActive(doc: { querySelector: (selector: string) => unknown }): boolean {
  return doc.querySelector(PLAYER_SESSION_SELECTOR) != null;
}

export function controlIsDirty(control: ControlLike): boolean {
  const tag = control.tagName.toUpperCase();
  if (tag === "SELECT") {
    const options = control.options;
    if (!options) return false;
    for (let i = 0; i < options.length; i += 1) {
      if (options[i].selected !== options[i].defaultSelected) return true;
    }
    return false;
  }
  if (tag === "TEXTAREA") return (control.value ?? "") !== (control.defaultValue ?? "");
  if (tag !== "INPUT") return false;
  const type = (control.type || "text").toLowerCase();
  if (type === "hidden" || type === "submit" || type === "button" || type === "image" || type === "reset") {
    return false;
  }
  if (type === "checkbox" || type === "radio") return Boolean(control.checked) !== Boolean(control.defaultChecked);
  return (control.value ?? "") !== (control.defaultValue ?? "");
}

/** Admin, login, and the open-mic form are always locked. Other routes lock only while an unsafe form is dirty. */
export function formLocksRefresh(pathname: string, controls: readonly ControlLike[]): boolean {
  if (isResumeLockedPath(pathname)) return true;
  for (const control of controls) {
    const form = control.closest("form");
    if (!form || form.hasAttribute(RESUME_SAFE_FORM)) continue;
    if (controlIsDirty(control)) return true;
  }
  return false;
}

export function reduceResume(
  state: ResumeState,
  signal: ResumeSignal,
  guard: ResumeGuard,
): { refresh: boolean; state: ResumeState } {
  if (signal.type === "background") {
    if (state.hiddenAt != null) return { refresh: false, state };
    return { refresh: false, state: { ...state, hiddenAt: signal.now } };
  }

  const now = signal.now;
  if (state.lastRefreshAt != null && now - state.lastRefreshAt < RESUME_DEDUPE_MS) {
    return { refresh: false, state: { ...state, hiddenAt: null } };
  }

  const gap = signal.gapMs ?? 0;
  const refreshedDuringGap = state.lastRefreshAt != null && now - state.lastRefreshAt < gap;
  const gapArmed = gap >= SUSPEND_GAP_MS && !refreshedDuringGap;
  const persisted = signal.source === "pageshow" && signal.persisted === true;
  const explicit = EXPLICIT_RETURN.has(signal.source);

  let armed = false;
  if (signal.source === "online") armed = state.pendingOnline;
  if (signal.source === "player-idle") armed = state.pendingPlayer;
  if (persisted) armed = true;
  if (explicit && state.hiddenAt != null && now - state.hiddenAt >= MIN_BACKGROUND_MS) armed = true;
  if (explicit && state.pendingPlayer && !guard.playerActive) armed = true;
  if ((signal.source === "timer" || signal.source === "focus" || signal.source === "resume") && gapArmed) {
    armed = true;
  }

  if (!armed) {
    const shortReturn = explicit && state.hiddenAt != null && now - state.hiddenAt < MIN_BACKGROUND_MS;
    return {
      refresh: false,
      state: shortReturn ? { ...state, hiddenAt: null } : state,
    };
  }

  if (!guard.visible) return { refresh: false, state };

  const next: ResumeState = {
    hiddenAt: null,
    lastRefreshAt: state.lastRefreshAt,
    pendingOnline: false,
    pendingPlayer: false,
  };

  // The open player owns the YouTube iframe and the sleep timer. Defer until it closes.
  if (guard.playerActive) {
    return { refresh: false, state: { ...next, pendingPlayer: true } };
  }
  if (guard.formLocked) {
    return { refresh: false, state: next };
  }
  if (!guard.onLine) {
    return { refresh: false, state: { ...next, pendingOnline: true } };
  }

  return {
    refresh: true,
    state: { ...next, lastRefreshAt: now },
  };
}

function guardFrom(host: ResumeHost, persisted: boolean): ResumeGuard {
  return {
    onLine: host.navigator.onLine,
    visible: persisted || host.document.visibilityState === "visible",
    playerActive: playerSessionActive(host.document),
    formLocked: formLocksRefresh(host.pathname(), [...host.document.querySelectorAll("input, textarea, select")]),
  };
}

export function bindResumeRefresh(host: ResumeHost): () => void {
  let state = initialResumeState();
  let lastTick = host.now();

  const apply = (signal: ResumeSignal) => {
    const persisted = signal.type === "foreground" && signal.persisted === true;
    const decision = reduceResume(state, signal, guardFrom(host, persisted));
    state = decision.state;
    if (!decision.refresh) return;
    try {
      host.refresh();
    } catch {
      // Leave the mounted tree in place. A later resume can try again.
    }
  };

  const markTick = (now: number) => {
    lastTick = now;
  };

  const onVisibility: EventListener = () => {
    const now = host.now();
    markTick(now);
    if (host.document.visibilityState === "hidden") apply({ type: "background", now });
    else apply({ type: "foreground", now, source: "visibility" });
  };

  const onBackground: EventListener = () => {
    apply({ type: "background", now: host.now() });
  };

  const onPageShow: EventListener = (event) => {
    const persisted = (event as PageTransitionEvent).persisted === true;
    if (!persisted) return;
    const now = host.now();
    markTick(now);
    apply({ type: "foreground", now, source: "pageshow", persisted: true });
  };

  const onFocus: EventListener = () => {
    const now = host.now();
    const gapMs = now - lastTick;
    markTick(now);
    apply({ type: "foreground", now, source: "focus", gapMs });
  };

  const onResume: EventListener = () => {
    const now = host.now();
    const gapMs = now - lastTick;
    markTick(now);
    apply({ type: "foreground", now, source: "resume", gapMs });
  };

  const onOnline: EventListener = () => {
    apply({ type: "foreground", now: host.now(), source: "online" });
  };

  const onPlayerEnd: EventListener = () => {
    apply({ type: "foreground", now: host.now(), source: "player-idle" });
  };

  host.document.addEventListener("visibilitychange", onVisibility);
  host.document.addEventListener(PLAYER_SESSION_END_EVENT, onPlayerEnd);
  host.window.addEventListener("pagehide", onBackground);
  host.window.addEventListener("pageshow", onPageShow);
  host.window.addEventListener("freeze", onBackground);
  host.window.addEventListener("resume", onResume);
  host.window.addEventListener("focus", onFocus);
  host.window.addEventListener("online", onOnline);

  const intervalId = host.window.setInterval(() => {
    const now = host.now();
    const gapMs = now - lastTick;
    markTick(now);
    if (host.document.visibilityState !== "visible") return;
    apply({ type: "foreground", now, source: "timer", gapMs });
  }, RESUME_TICK_MS);

  return () => {
    host.window.clearInterval(intervalId);
    host.document.removeEventListener("visibilitychange", onVisibility);
    host.document.removeEventListener(PLAYER_SESSION_END_EVENT, onPlayerEnd);
    host.window.removeEventListener("pagehide", onBackground);
    host.window.removeEventListener("pageshow", onPageShow);
    host.window.removeEventListener("freeze", onBackground);
    host.window.removeEventListener("resume", onResume);
    host.window.removeEventListener("focus", onFocus);
    host.window.removeEventListener("online", onOnline);
  };
}
