/**
 * Published 27 listopada 2026.
 *
 * The page modules also refuse to render a body that still contains
 * `[DO UZUPEŁNIENIA`, so the flag alone cannot publish placeholder text.
 * Footer, the mobile drawer, the consent banner, and /zaloguj read this helper.
 */
export const PUBLISH_LEGAL_PAGES = true;

/** Every draft placeholder starts with this marker, including `[DO UZUPEŁNIENIA: …]`. */
export const LEGAL_PLACEHOLDER_MARKER = "[DO UZUPEŁNIENIA";

export function legalPagesAreReady(): boolean {
  return PUBLISH_LEGAL_PAGES;
}

export function draftHasPlaceholder(body: string): boolean {
  return body.includes(LEGAL_PLACEHOLDER_MARKER);
}
