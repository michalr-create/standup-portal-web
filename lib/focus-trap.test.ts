import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { escapeLayer, tabContainment } from "./focus-trap.ts";

const middle = {
  count: 4,
  inside: true,
  activeIsFirst: false,
  activeIsLast: false,
  unmanaged: false,
};

test("tab wraps only at the ends, same as the drawer", () => {
  assert.deepEqual(tabContainment({ ...middle, shiftKey: false }), { prevent: false, target: null });
  assert.deepEqual(tabContainment({ ...middle, shiftKey: true }), { prevent: false, target: null });
  assert.deepEqual(
    tabContainment({ ...middle, shiftKey: false, activeIsLast: true }),
    { prevent: true, target: "first" },
  );
  assert.deepEqual(
    tabContainment({ ...middle, shiftKey: true, activeIsFirst: true }),
    { prevent: true, target: "last" },
  );
});

test("tab outside the panel or on the dialog root is pulled back in", () => {
  assert.deepEqual(
    tabContainment({ ...middle, shiftKey: false, inside: false }),
    { prevent: true, target: "first" },
  );
  assert.deepEqual(
    tabContainment({ ...middle, shiftKey: true, inside: false }),
    { prevent: true, target: "last" },
  );
});

test("tab with nothing focusable stays on the dialog root", () => {
  assert.deepEqual(
    tabContainment({
      shiftKey: false,
      count: 0,
      inside: false,
      activeIsFirst: false,
      activeIsLast: false,
      unmanaged: false,
    }),
    { prevent: true, target: "root" },
  );
});

test("tab on an unmanaged control such as the player iframe stays in the dialog", () => {
  assert.deepEqual(
    tabContainment({ ...middle, shiftKey: false, unmanaged: true }),
    { prevent: true, target: "first" },
  );
  assert.deepEqual(
    tabContainment({ ...middle, shiftKey: true, unmanaged: true }),
    { prevent: true, target: "last" },
  );
});

test("escape dismisses the top layer before closing the player", () => {
  assert.equal(escapeLayer({ hintOpen: true, moreOpen: true, timerOpen: true, cover: true }), "hint");
  assert.equal(escapeLayer({ hintOpen: false, moreOpen: true, timerOpen: false, cover: true }), "more");
  assert.equal(escapeLayer({ hintOpen: false, moreOpen: true, timerOpen: true, cover: true }), "timer");
  assert.equal(escapeLayer({ hintOpen: false, moreOpen: false, timerOpen: false, cover: true }), "cover");
  assert.equal(escapeLayer({ hintOpen: false, moreOpen: false, timerOpen: false, cover: false }), "dialog");
});

test("VideoModal traps focus, starts on Zamknij, and restores the trigger", () => {
  const modal = readFileSync(new URL("../app/components/VideoModal.tsx", import.meta.url), "utf8");
  assert.match(modal, /containTab\(event, root, \{ redirectUnmanaged: true \}\)/);
  assert.match(modal, /focusVisibleClose\(root\)/);
  assert.match(modal, /addEventListener\("keydown", onKeyDown, true\)/);
  assert.match(modal, /previouslyFocused\?\.isConnected/);
  assert.match(modal, /tabIndex=\{-1\}/);
  assert.match(modal, /escapeLayer\(/);
});

test("MobileDrawer keeps the shared trap and its capture listener", () => {
  const drawer = readFileSync(new URL("../app/components/MobileDrawer.tsx", import.meta.url), "utf8");
  assert.match(drawer, /containTab\(event, panel\)/);
  assert.match(drawer, /addEventListener\("keydown", onKeyDown, true\)/);
  assert.match(drawer, /previouslyFocused \?\? triggerRef\.current/);
  assert.doesNotMatch(drawer, /function focusableIn/);
});
