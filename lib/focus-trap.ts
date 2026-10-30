/**
 * Shared dialog keyboard containment.
 * MobileDrawer and VideoModal both use this so Tab wraps the same way.
 * VideoModal also redirects Tab when focus sits on something the selector
 * skips (the YouTube iframe) so the key cannot leave the dialog.
 */

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CLOSE_BUTTON_SELECTOR = 'button[aria-label="Zamknij"]';

export function isFocusableVisible(el: HTMLElement): boolean {
  if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return false;
  if (el.closest("[hidden]")) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  // A control inside a display:none ancestor still reports its own display
  // (the player bar buttons are inline-flex while the bar is hidden).
  // No box means it cannot take focus.
  return el.getClientRects().length > 0;
}

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isFocusableVisible);
}

export type TabTarget = "first" | "last" | "root";

/**
 * Drawer rule: wrap at the ends, and pull focus back when it is on the
 * dialog root or outside the panel. Tab between middle controls stays native.
 * `unmanaged` is an element inside the panel that is not in the focusable
 * list (iframe). Tab must not follow the browser into it.
 */
export function tabContainment(input: {
  shiftKey: boolean;
  count: number;
  inside: boolean;
  activeIsFirst: boolean;
  activeIsLast: boolean;
  unmanaged: boolean;
}): { prevent: boolean; target: TabTarget | null } {
  if (input.count === 0) return { prevent: true, target: "root" };
  if (input.unmanaged) {
    return { prevent: true, target: input.shiftKey ? "last" : "first" };
  }
  if (input.shiftKey) {
    if (input.activeIsFirst || !input.inside) return { prevent: true, target: "last" };
    return { prevent: false, target: null };
  }
  if (input.activeIsLast || !input.inside) return { prevent: true, target: "first" };
  return { prevent: false, target: null };
}

export function containTab(
  event: KeyboardEvent,
  root: HTMLElement,
  options?: { redirectUnmanaged?: boolean },
): void {
  if (event.key !== "Tab") return;

  const items = focusableIn(root);
  const active = document.activeElement;
  const inside = active instanceof Node && root.contains(active) && active !== root;
  const unmanaged =
    !!options?.redirectUnmanaged &&
    inside &&
    (!(active instanceof HTMLElement) || !items.includes(active));
  const decision = tabContainment({
    shiftKey: event.shiftKey,
    count: items.length,
    inside,
    activeIsFirst: items.length > 0 && active === items[0],
    activeIsLast: items.length > 0 && active === items[items.length - 1],
    unmanaged,
  });
  if (!decision.prevent || !decision.target) return;

  event.preventDefault();
  if (decision.target === "root") {
    root.focus({ preventScroll: true });
    return;
  }
  const el = decision.target === "first" ? items[0] : items[items.length - 1];
  el?.focus();
}

/** Show the ring for a focus move we performed, including after a pointer open. */
export function focusWithRing(el: HTMLElement): void {
  const options = { preventScroll: true, focusVisible: true };
  el.focus(options);
}

/** First visible match in DOM order. Player-bar controls precede the meta sheet. */
export function focusFirstVisible(root: HTMLElement, selector: string): boolean {
  const match = Array.from(root.querySelectorAll<HTMLElement>(selector)).find(isFocusableVisible);
  if (!match) return false;
  focusWithRing(match);
  return true;
}

/** Visible Zamknij: meta sheet on the portrait/desktop layout, player bar when that sheet is hidden. */
export function focusVisibleClose(root: HTMLElement): boolean {
  return focusFirstVisible(root, CLOSE_BUTTON_SELECTOR);
}

/**
 * Escape inside VideoModal. Hint ("Dlaczego?") and Więcej dismiss themselves;
 * the dialog must not close on the same key. Timer menu wins over Więcej.
 * Cover exits before the dialog closes. Matches the UX-07 order.
 */
export type EscapeLayer = "hint" | "more" | "timer" | "cover" | "dialog";

export function escapeLayer(input: {
  hintOpen: boolean;
  moreOpen: boolean;
  timerOpen: boolean;
  cover: boolean;
}): EscapeLayer {
  if (input.hintOpen) return "hint";
  if (input.moreOpen && !input.timerOpen) return "more";
  if (input.timerOpen) return "timer";
  if (input.cover) return "cover";
  return "dialog";
}
