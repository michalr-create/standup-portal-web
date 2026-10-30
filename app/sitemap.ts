import type { MetadataRoute } from "next";

const BASE = "https://parska.pl";

const PATHS = [
  "/",
  "/standup",
  "/formaty",
  "/wywiady",
  "/shorts",
  "/kulisy",
  "/roast",
  "/standuperzy",
  "/ulubione",
  "/trasy",
  "/specjale",
  "/open-mic",
  "/open-mic/dodaj",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: path === "/" ? `${BASE}/` : `${BASE}${path}`,
    changeFrequency: path === "/" || path === "/open-mic" || path === "/trasy" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/open-mic" ? 0.8 : 0.6,
  }));
}
