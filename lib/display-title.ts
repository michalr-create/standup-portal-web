/**
 * Readable title for H1, document title, VideoObject.name, and special cards.
 * The stored `title` (and therefore the slug) stays raw.
 */

const HASHTAG = /#[^\s#]+/g;

const FUNCTION_WORDS = new Set([
  "a",
  "ale",
  "albo",
  "bez",
  "bo",
  "by",
  "co",
  "czy",
  "dla",
  "do",
  "i",
  "jak",
  "ku",
  "lub",
  "na",
  "nad",
  "nie",
  "od",
  "oraz",
  "po",
  "pod",
  "przy",
  "sie",
  "się",
  "tez",
  "też",
  "to",
  "u",
  "w",
  "we",
  "wiec",
  "więc",
  "z",
  "za",
  "ze",
  "że",
]);

function coreToken(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function lettersOf(word: string): string {
  return [...word].filter((char) => /\p{L}/u.test(char)).join("");
}

function isYearToken(word: string): boolean {
  return /^(?:19|20)\d{2}[.,]?$/.test(word);
}

function isStandupToken(word: string): boolean {
  return /^(?:stand[\s-]*up|standup)$/i.test(coreToken(word));
}

function isProgramHead(word: string): boolean {
  return /^(?:cały|całe|caly|cale)$/i.test(coreToken(word));
}

function isProgramTail(word: string): boolean {
  return /^(?:program|progam|nagranie)$/i.test(coreToken(word));
}

function isSeparatorToken(word: string): boolean {
  return /^[|\u00b7\u2022:–—-]+$/.test(word);
}

/** A pipe segment that is only a YouTube tail: stand-up, a program phrase, a year, or separators. */
function isNoiseSegment(segment: string): boolean {
  const words = segment.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.every((word) =>
    isSeparatorToken(word) || isYearToken(word) || isStandupToken(word) || isProgramHead(word) || isProgramTail(word),
  );
}

function stripPipeTail(text: string): string {
  const parts = text.split("|").map((part) => part.trim());
  while (parts.length > 1 && isNoiseSegment(parts[parts.length - 1] ?? "")) parts.pop();
  return parts.join(" | ").trim();
}

function stripTrailingTail(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  let removedNoise = false;
  while (words.length > 0) {
    const last = words[words.length - 1] ?? "";
    const prev = words[words.length - 2];
    if (isSeparatorToken(last) || isStandupToken(last)) {
      words.pop();
      removedNoise = true;
      continue;
    }
    if (prev && isProgramHead(prev) && isProgramTail(last)) {
      words.pop();
      words.pop();
      removedNoise = true;
      continue;
    }
    if (
      isYearToken(last) &&
      prev &&
      isProgramTail(prev) &&
      words.length >= 3 &&
      isProgramHead(words[words.length - 3] ?? "")
    ) {
      words.pop();
      removedNoise = true;
      continue;
    }
    if (isYearToken(last) && removedNoise) {
      words.pop();
      continue;
    }
    break;
  }
  return words.join(" ");
}

function softenWord(word: string, isFirst: boolean): string {
  const letters = lettersOf(word);
  if (!letters) return word;
  const lowerLetters = letters.toLowerCase();
  if (!isFirst && FUNCTION_WORDS.has(lowerLetters)) return word.toLowerCase();
  const shout = letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
  if (!shout) return word;
  const lower = word.toLowerCase();
  const index = [...lower].findIndex((char) => /\p{L}/u.test(char));
  if (index < 0) return lower;
  return lower.slice(0, index) + lower.charAt(index).toUpperCase() + lower.slice(index + 1);
}

function softenCaps(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part, index, parts) => {
      if (/^\s+$/.test(part)) return part;
      const wordIndex = parts.slice(0, index).filter((item) => item.trim().length > 0).length;
      return softenWord(part, wordIndex === 0);
    })
    .join("");
}

function tidy(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^(?:[\s|·•:–—-])+/, "")
    .replace(/(?:[\s|·•:–—-])+$/, "")
    .trim();
}

/** Conservative v1 cleaner. Returns the raw title when cleaning would erase it. */
export function displayTitle(raw: string): string {
  const original = raw.replace(/\s+/g, " ").trim();
  if (!original) return "";
  const withoutTags = tidy(stripPipeTail(original.replace(HASHTAG, " ")));
  const stripped = tidy(stripTrailingTail(withoutTags));
  const softened = tidy(softenCaps(stripped));
  return softened || original;
}

/** Cards and the modal use the cleaned title only once a public special slug exists. */
export function itemDisplayTitle(item: { title: string; slug?: string | null }): string {
  if (!item.slug) return item.title;
  return displayTitle(item.title);
}
