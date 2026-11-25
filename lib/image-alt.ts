/**
 * Accessible names and intrinsic boxes for content images.
 * Width and height match the CSS frame (16/10, 16/9, 4/3, …).
 * The painted size still comes from the existing classes, so the picture
 * does not move: `w-full h-full`, `object-cover`, or an absolute inset.
 */

const EM = "\u2014";

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Every billed name, in card order. */
export function standuperLabel(people: readonly { name: string }[] | null | undefined): string {
  const names: string[] = [];
  for (const person of people ?? []) {
    const name = clean(person.name);
    if (name) names.push(name);
  }
  return names.join(", ");
}

/**
 * Content thumbnail: "{tytuł} — {standuper}".
 * No standuper: the title alone.
 * Empty title: the standuper, otherwise the format name.
 */
export function contentThumbnailAlt(input: {
  title?: string | null;
  people?: readonly { name: string }[] | null;
  showName?: string | null;
}): string {
  const title = clean(input.title);
  const standuper = standuperLabel(input.people);
  const format = clean(input.showName);
  if (title && standuper) return `${title} ${EM} ${standuper}`;
  if (title) return title;
  return standuper || format;
}

export const IMAGE_SIZE = {
  /** Landscape card, aspect 16/10. */
  thumbLandscape: { width: 320, height: 200 },
  /** Shorts card, aspect 9/16. */
  thumbPortrait: { width: 180, height: 320 },
  /** Special hero, aspect 16/9. */
  thumbWide: { width: 1280, height: 720 },
  /** Event poster slot, aspect 4/3. */
  poster: { width: 800, height: 600 },
  /** Person avatar. */
  avatar: { width: 48, height: 48 },
  /** Program row cover, matching h-16 w-28. */
  programCover: { width: 112, height: 64 },
  /** YouTube hqdefault.jpg. */
  youtubePoster: { width: 480, height: 360 },
  /** Admin preview, 16/9. */
  preview: { width: 320, height: 180 },
} as const;
