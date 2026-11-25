import assert from "node:assert/strict";
import { test } from "node:test";
import { iso8601Duration, specialPageGraph, specialVideoObject } from "./jsonld.ts";

const pageUrl = "https://parska.pl/specjale/abelard-giza-piniata-cale-nagranie-2020-stand-up";

test("duration is ISO-8601 and omitted when missing or not positive", () => {
  assert.equal(iso8601Duration(2857), "PT47M37S");
  assert.equal(iso8601Duration(3600), "PT1H0M0S");
  assert.equal(iso8601Duration(60), "PT1M0S");
  assert.equal(iso8601Duration(45), "PT45S");
  assert.equal(iso8601Duration(0), null);
  assert.equal(iso8601Duration(-5), null);
  assert.equal(iso8601Duration(null), null);
  assert.equal(iso8601Duration(Number.NaN), null);
});

test("a free YouTube special emits VideoObject and BreadcrumbList", () => {
  const graph = specialPageGraph({
    name: "Abelard Giza - Piniata",
    description: "Pełny program.",
    thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    publishedAt: "2020-05-01T12:00:00.000Z",
    durationSeconds: 2857,
    videoId: "abcdefghijk",
    isPaid: false,
    pageUrl,
    people: [{ name: "Abelard Giza", slug: "abelard-giza" }],
  });
  assert.equal(graph["@context"], "https://schema.org");
  const nodes = graph["@graph"] as Record<string, unknown>[];
  assert.equal(nodes.length, 2);
  assert.equal(nodes[0]?.["@type"], "BreadcrumbList");
  const crumbs = nodes[0]?.itemListElement as { position: number; name: string; item: string }[];
  assert.equal(crumbs[0]?.item, "https://parska.pl/");
  assert.equal(crumbs[1]?.item, "https://parska.pl/specjale");
  assert.equal(crumbs[2]?.name, "Abelard Giza - Piniata");
  assert.equal(crumbs[2]?.item, pageUrl);

  const video = nodes[1] ?? {};
  assert.equal(video["@type"], "VideoObject");
  assert.equal(video.name, "Abelard Giza - Piniata");
  assert.equal(video.description, "Pełny program.");
  assert.equal(video.thumbnailUrl, "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg");
  assert.equal(video.uploadDate, "2020-05-01T12:00:00.000Z");
  assert.equal(video.duration, "PT47M37S");
  assert.equal(video.embedUrl, "https://www.youtube.com/embed/abcdefghijk");
  assert.equal(video.contentUrl, "https://www.youtube.com/watch?v=abcdefghijk");
  assert.equal(video.url, pageUrl);
  assert.equal(video.inLanguage, "pl-PL");
  const author = video.author as { name: string; url: string }[];
  assert.equal(author[0]?.name, "Abelard Giza");
  assert.equal(author[0]?.url, "https://parska.pl/standuper/abelard-giza");
  assert.deepEqual(video.actor, video.author);
});

test("paid specials and missing runtime skip VideoObject or duration", () => {
  const paid = specialPageGraph({
    name: "Wentyl (2026)",
    description: "Płatny VOD.",
    thumbnailUrl: "https://abelardgiza.pl/wentyl.jpg",
    publishedAt: "2026-01-01T00:00:00.000Z",
    durationSeconds: 3600,
    videoId: null,
    isPaid: true,
    pageUrl: "https://parska.pl/specjale/abelard-giza-wentyl-2026",
    people: [{ name: "Abelard Giza", slug: "abelard-giza" }],
  });
  const paidNodes = paid["@graph"] as Record<string, unknown>[];
  assert.equal(paidNodes.length, 1);
  assert.equal(paidNodes[0]?.["@type"], "BreadcrumbList");
  assert.equal(specialVideoObject({
    name: "Wentyl (2026)",
    description: "Płatny VOD.",
    thumbnailUrl: null,
    publishedAt: null,
    durationSeconds: 3600,
    videoId: "abcdefghijk",
    isPaid: true,
    pageUrl: "https://parska.pl/specjale/abelard-giza-wentyl-2026",
    people: [],
  }), null);

  const undated = specialVideoObject({
    name: "Szur",
    description: "Program.",
    thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    publishedAt: "2024-01-01T00:00:00.000Z",
    durationSeconds: null,
    videoId: "abcdefghijk",
    isPaid: false,
    pageUrl: "https://parska.pl/specjale/szur",
    people: [],
  });
  assert.equal(undated?.duration, undefined);
  assert.equal("duration" in (undated ?? {}), false);
});
