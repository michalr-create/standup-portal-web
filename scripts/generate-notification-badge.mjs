/**
 * Android notification badge for parska.
 *
 * Chrome on Android paints the notification `badge` as a white alpha mask in
 * the status bar. The PWA icon (`public/favicon-192.png`) is an opaque rounded
 * square — near-black #0B0B0B with a paper "p" and a coral dot — so using it
 * as the badge renders as a plain white square.
 *
 * This script keeps the glyph and drops the tile:
 *   1. Decode public/favicon-192.png (the manifest / notification icon).
 *   2. Treat pixels within RGB distance 48 of #0B0B0B as background. That
 *      covers the tile and the anti-aliased rim where it meets transparency.
 *      The paper stem and the coral dot sit far above that cutoff.
 *   3. Paint every foreground pixel white and box-filter 2×2 down to 96×96
 *      so the edge stays smooth. Fully transparent pixels stay transparent.
 *
 * Run from the repo root:
 *   node scripts/generate-notification-badge.mjs
 *   node scripts/generate-notification-badge.mjs --preview /tmp/badge-on-dark.png
 */
import { deflateSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "public/favicon-192.png");
const OUTPUT = resolve(ROOT, "public/icons/badge-96.png");
const SIZE = 96;
const BACKGROUND = [11, 11, 11];
/** Gap in the source histogram: tile rim ≤ ~37, glyph edge ≥ ~77. */
const BACKGROUND_DISTANCE = 48;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

export function decodePng(buf) {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("not a png");
  }
  const chunks = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    offset += 4;
    const type = buf.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = buf.subarray(offset, offset + length);
    offset += length + 4;
    chunks.push({ type, data });
    if (type === "IEND") break;
  }
  const ihdr = chunks.find((item) => item.type === "IHDR");
  if (!ihdr) throw new Error("missing IHDR");
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported png ${colorType}/${bitDepth}`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const inflated = inflateSync(Buffer.concat(chunks.filter((item) => item.type === "IDAT").map((item) => item.data)));
  const stride = width * bpp;
  const raw = Buffer.alloc(height * stride);
  let index = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[index++];
    const row = inflated.subarray(index, index + stride);
    index += stride;
    const prev = y > 0 ? raw.subarray((y - 1) * stride, y * stride) : null;
    const dest = raw.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? dest[x - bpp] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= bpp ? prev[x - bpp] : 0;
      let value = row[x];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const paeth = left + up - upLeft;
        const da = Math.abs(paeth - left);
        const db = Math.abs(paeth - up);
        const dc = Math.abs(paeth - upLeft);
        const predictor = da <= db && da <= dc ? left : db <= dc ? up : upLeft;
        value = (value + predictor) & 255;
      } else if (filter !== 0) {
        throw new Error(`unsupported filter ${filter}`);
      }
      dest[x] = value;
    }
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = raw[i * bpp];
    pixels[i * 4 + 1] = raw[i * bpp + 1];
    pixels[i * 4 + 2] = raw[i * bpp + 2];
    pixels[i * 4 + 3] = bpp === 4 ? raw[i * bpp + 3] : 255;
  }
  return { width, height, pixels };
}

export function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** White silhouette. Background (the #0B0B0B tile) becomes fully transparent. */
export function badgeFromAppIcon(source, size = SIZE) {
  if (source.width % size !== 0 || source.height % size !== 0 || source.width !== source.height) {
    throw new Error(`expected a square icon divisible by ${size}`);
  }
  const scale = source.width / size;
  const pixels = Buffer.alloc(size * size * 4);
  let opaque = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      const samples = scale * scale;
      for (let oy = 0; oy < scale; oy++) {
        for (let ox = 0; ox < scale; ox++) {
          const index = ((y * scale + oy) * source.width + (x * scale + ox)) * 4;
          const red = source.pixels[index];
          const green = source.pixels[index + 1];
          const blue = source.pixels[index + 2];
          const alpha = source.pixels[index + 3];
          const distance = Math.hypot(red - BACKGROUND[0], green - BACKGROUND[1], blue - BACKGROUND[2]);
          if (distance > BACKGROUND_DISTANCE) sum += alpha / 255;
        }
      }
      const alpha = Math.round((sum / samples) * 255);
      const offset = (y * size + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = alpha;
      if (alpha > 16) opaque++;
    }
  }
  const coverage = opaque / (size * size);
  if (coverage < 0.08 || coverage > 0.45) {
    throw new Error(`badge coverage ${coverage.toFixed(3)} is not a glyph (filled square or empty)`);
  }
  return { width: size, height: size, pixels };
}

/** Nearest-neighbour scale composited on a solid dark background, for review. */
export function previewOnDark(badge, scale, background = [11, 11, 11]) {
  const canvas = badge.width * scale;
  const pixels = Buffer.alloc(canvas * canvas * 4);
  for (let y = 0; y < canvas; y++) {
    for (let x = 0; x < canvas; x++) {
      const sx = Math.floor(x / scale);
      const sy = Math.floor(y / scale);
      const alpha = badge.pixels[(sy * badge.width + sx) * 4 + 3] / 255;
      const offset = (y * canvas + x) * 4;
      pixels[offset] = Math.round(255 * alpha + background[0] * (1 - alpha));
      pixels[offset + 1] = Math.round(255 * alpha + background[1] * (1 - alpha));
      pixels[offset + 2] = Math.round(255 * alpha + background[2] * (1 - alpha));
      pixels[offset + 3] = 255;
    }
  }
  return { width: canvas, height: canvas, pixels };
}

function writePng(path, image) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePng(image.width, image.height, image.pixels));
}

function isDirectRun() {
  const entry = process.argv[1] ? resolve(process.argv[1]) : "";
  return entry === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  const source = decodePng(readFileSync(SOURCE));
  const badge = badgeFromAppIcon(source, SIZE);
  writePng(OUTPUT, badge);
  const previewFlag = process.argv.indexOf("--preview");
  if (previewFlag !== -1) {
    const previewPath = process.argv[previewFlag + 1];
    if (!previewPath) throw new Error("--preview needs a path");
    const preview = previewOnDark(badge, 4);
    writePng(resolve(previewPath), preview);
    console.log(`preview ${preview.width}x${preview.height} ${previewPath}`);
  }
  console.log(`wrote ${SIZE}x${SIZE} ${OUTPUT}`);
}
