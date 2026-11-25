import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20261125233000_people_profile_images.sql", import.meta.url),
  "utf8",
);

const FACE = [
  ["1", "UCIXAK3v6fgWHu0_jN8HmOUg"],
  ["2", "UCG3mQRagegeLjQ6E2OBTZpQ"],
  ["4", "UCsUB9dfE87u64SNnoFbg8Zw"],
  ["7", "UC1KCdhvSqa3OLWql8sou3OA"],
  ["9", "UCL-0QvrJX5AZ3dXe5jJlV6Q"],
  ["11", "UCOVpkt7gBZGrcVrRXlOlVtQ"],
  ["13", "UC-LdFTRYOQKT-Mi7eyrxlaA"],
  ["15", "UCpuNyigzfdVjvvZbOgx_2RQ"],
  ["16", "UCedyiiOaSc5NEIf-DAvY9Sw"],
  ["18", "UCCS84tq6qv1Km2Jbj-L0p1w"],
  ["22", "UC-rZIa3NCQAzJ5YwU3IZ1mg"],
  ["23", "UCAW0vXKntCEAejoytc_RR9Q"],
  ["25", "UCx78LgIGldMLt73H1DfEHlQ"],
  ["27", "UCaXj-OScH7hL-N3S2CfhaPQ"],
  ["31", "UCs25Z4heq-0geKcxjIw8dHg"],
  ["34", "UCGxocJfdqNfo6djInYVN50Q"],
  ["42", "UC0kxyBBCEiYC6yrkprIjEjg"],
  ["50", "UCK_44aJIt-FD4eo-qJ9hWsA"],
  ["52", "UCmu-MBkpor06-a0Y1nifAdw"],
  ["56", "UCcUGXpH--EuzPEEVGCb1YIQ"],
  ["57", "UCW2f4bapVhKFkpYxRpbviXA"],
  ["58", "UCjVMKdmfoUrbOUt-pMf-OPw"],
  ["59", "UCmY0t__D6L_c7aq7W__u06w"],
  ["60", "UCF1l5B-HWo5ggC9pcSoAZdQ"],
  ["62", "UCaP8rHML0N0t-YOEfKYn7lg"],
  ["63", "UCFlcFC68BS4WE-u7zZMpe7g"],
  ["74", "UCCfv0DRfhqhXlw7r5bHR8xg"],
  ["84", "UC4NfWXJWOF6JXx5fNG524yg"],
  ["96", "UCPdW0f8H-AghPvLlCEVAICA"],
  ["104", "UCtCgJ0vtRLNPCE3nLKok3yQ"],
  ["112", "UC_R0iqDV5Jq3PV6J6-W-p_Q"],
  ["113", "UCIf7jvBkNmPB8kPFkbYAG0A"],
  ["115", "UCIoLx_11D7IxKaAKfvFnVFA"],
  ["118", "UC9MrWAIFgyucKNJa5eKxbOw"],
  ["127", "UCa5JuausbX258NxX8Gx9fsg"],
  ["152", "UCZYXzE44Mzbpo1LMurxpBWg"],
] as const;

const LINK_ONLY = [
  ["3", "UCEe12n7pL9Pl-i6qxBmpyeg"],
  ["19", "UCBIJOolC_Cypoka4i106Kvw"],
  ["69", "UCzaSARYYwTfDCHWXHWww-_A"],
] as const;

const REJECTED = [
  "UCvU5_wLhO1cMYVxlYdX5psQ",
  "UCTJvtYiwmSHgrYfKQYXwB3w",
  "UCVR5AZ6habc8LS3wZXRaysA",
  "UC0zEXcL8TaZvtxdozzp03qQ",
  "UC4zHhAs_pT7WhBgU-cLR2cA",
];

function jpegSize(buf: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset + 8 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1] ?? 0;
    const length = buf.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error("jpeg size not found");
}

test("the migration adds the profile columns and the source check", () => {
  assert.match(sql, /add column if not exists image_url text/);
  assert.match(sql, /add column if not exists image_source text/);
  assert.match(sql, /add column if not exists image_credit text/);
  assert.match(sql, /add column if not exists image_license text/);
  assert.match(sql, /add column if not exists image_license_url text/);
  assert.match(sql, /add column if not exists image_disabled boolean not null default false/);
  assert.match(sql, /add column if not exists image_fetched_at timestamptz/);
  assert.match(sql, /add column if not exists youtube_channel_id text/);
  assert.match(sql, /add column if not exists youtube_channel_url text/);
  assert.match(sql, /image_source in \('youtube', 'commons', 'own'\)/);
  assert.match(sql, /yt3\\\.ggpht\\\.com/);
  assert.match(sql, /yt3\\\.googleusercontent\\\.com/);
  assert.doesNotMatch(sql, /photo_url\s*=/);
});

test("table A is seeded and section B, section C, and Sikora are not", () => {
  assert.equal(FACE.length, 36);
  for (const [id, channel] of [...FACE, ...LINK_ONLY]) {
    assert.equal(channel.length, 24);
    assert.match(sql, new RegExp(`\\(${id}::bigint,.*${channel}`));
  }
  for (const channel of REJECTED) assert.equal(sql.includes(channel), false);
  assert.doesNotMatch(sql, /Czarek_Sikora/);
  assert.doesNotMatch(sql, /\(93::bigint/);
  assert.doesNotMatch(sql, /\(21::bigint/);
  assert.match(sql, /fetch_youtube_avatar = true\) <> 36/);
});

test("Commons assignments follow the review: Giza primary, Lotek primary, two backups", () => {
  assert.match(sql, /image_credit = 'Krzysztof Popławski'/);
  assert.match(sql, /image_license = 'CC BY 4\.0'/);
  assert.match(sql, /image_url = '\/standuperzy\/abelard-giza\.jpg'/);
  assert.match(sql, /where id = 3 and name = 'Abelard Giza'/);
  assert.match(sql, /fetch_youtube_avatar = false/);
  assert.match(sql, /image_url = '\/standuperzy\/lotek-lodkowski\.jpg'/);
  assert.match(sql, /image_credit = 'Serecki'/);
  assert.match(sql, /where id = 2 and name = 'Łukasz Lotek Lodkowski'/);
  assert.match(sql, /image_fallback_credit = 'Ralf Lotys \(Sicherlich\)'/);
  assert.match(sql, /where id = 50 and name = 'Kacper Ruciński'/);
  assert.match(sql, /image_fallback_credit = 'Gintek'/);
  assert.match(sql, /image_fallback_license = 'CC BY-SA 4\.0'/);
  assert.match(sql, /image_fallback_cropped = true/);
  assert.match(sql, /where id = 59 and name = 'Rafał Sumowski'/);
  assert.match(sql, /Olka Szczęśniak/);
  assert.match(sql, /Patryk Gosiński/);

  const files: Record<string, { width: number; height: number }> = {
    "abelard-giza.jpg": { width: 1280, height: 1920 },
    "lotek-lodkowski.jpg": { width: 485, height: 648 },
    "kacper-rucinski.jpg": { width: 1280, height: 1920 },
    "rafal-sumowski.jpg": { width: 1181, height: 1181 },
  };
  for (const [name, size] of Object.entries(files)) {
    const buf = readFileSync(new URL(`../public/standuperzy/${name}`, import.meta.url));
    assert.equal(buf[0], 0xff);
    assert.equal(buf[1], 0xd8);
    assert.deepEqual(jpegSize(buf), size);
    const at = sql.indexOf(`/standuperzy/${name}`);
    assert.ok(at > 0);
    const window = sql.slice(at, at + 500);
    assert.match(window, new RegExp(`= ${size.width}`));
    assert.match(window, new RegExp(`= ${size.height}`));
  }
});
