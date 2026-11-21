import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { badgeFromAppIcon, decodePng } from "../scripts/generate-notification-badge.mjs";

/**
 * The badge is produced by scripts/generate-notification-badge.mjs:
 * public/favicon-192.png is the colour app icon (paper "p" and coral dot on
 * a #0B0B0B tile). Pixels near that background become transparent; the glyph
 * is painted white and box-filtered to 96×96. Re-run the script after the
 * app icon changes, then commit public/icons/badge-96.png.
 */
test("badge-96 is a white p. mask, not a filled square", () => {
  const note = readFileSync(new URL("../scripts/generate-notification-badge.mjs", import.meta.url), "utf8");
  assert.match(note, /favicon-192\.png/);
  assert.match(note, /#0B0B0B/);
  assert.match(note, /badge-96\.png/);

  const source = decodePng(readFileSync(new URL("../public/favicon-192.png", import.meta.url)));
  const generated = badgeFromAppIcon(source, 96);
  const committed = decodePng(readFileSync(new URL("../public/icons/badge-96.png", import.meta.url)));
  assert.equal(committed.width, 96);
  assert.equal(committed.height, 96);
  assert.equal(Buffer.compare(committed.pixels, generated.pixels), 0);

  let visible = 0;
  for (let i = 0; i < committed.pixels.length; i += 4) {
    const alpha = committed.pixels[i + 3];
    if (alpha === 0) continue;
    visible += 1;
    assert.equal(committed.pixels[i], 255);
    assert.equal(committed.pixels[i + 1], 255);
    assert.equal(committed.pixels[i + 2], 255);
  }
  const total = 96 * 96;
  assert.ok(visible > total * 0.08 && visible < total * 0.45, `visible pixels ${visible}`);

  const alphaAt = (x: number, y: number) => committed.pixels[(y * 96 + x) * 4 + 3];
  assert.equal(alphaAt(0, 0), 0);
  assert.equal(alphaAt(95, 95), 0);
  assert.equal(alphaAt(48, 8), 0);
  assert.equal(alphaAt(30, 40), 255);
  assert.equal(alphaAt(48, 48), 255);
  assert.equal(alphaAt(70, 66), 255);
});
