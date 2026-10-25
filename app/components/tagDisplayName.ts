/**
 * Label for a tag chip.
 * Machine names (`pelny_program`, `open-mic`) become a short phrase.
 * Names that already read as text (spaces, capitals, no underscores) stay as stored.
 */
export function tagDisplayName(name: string): string {
  if (!shouldHumanizeTagName(name)) return name;

  const trimmed = name.trim();
  const spaced = trimmed.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) return name;

  const allLower = trimmed === trimmed.toLocaleLowerCase("pl");
  const base = allLower ? spaced.toLocaleLowerCase("pl") : spaced;
  const chars = Array.from(base);
  return chars[0].toLocaleUpperCase("pl") + chars.slice(1).join("");
}

function shouldHumanizeTagName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.includes("_")) return true;
  if (/\s/.test(trimmed)) return false;
  if (trimmed !== trimmed.toLocaleLowerCase("pl")) return false;
  return /^[\p{Ll}\p{N}]+(?:-[\p{Ll}\p{N}]+)+$/u.test(trimmed);
}
