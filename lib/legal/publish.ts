/**
 * Flip to true only after Michał fills every `[DO UZUPEŁNIENIA]`
 * and a lawyer has reviewed the three drafts.
 *
 * The page modules also refuse to render a body that still contains that
 * marker, so the flag alone cannot publish placeholder text.
 * Footer, the mobile drawer, and /zaloguj read this helper.
 */
export const PUBLISH_LEGAL_PAGES = false;

/** Every draft placeholder starts with this marker, including `[DO UZUPEŁNIENIA: …]`. */
export const LEGAL_PLACEHOLDER_MARKER = "[DO UZUPEŁNIENIA";

export function legalPagesAreReady(): boolean {
  return PUBLISH_LEGAL_PAGES;
}

export function draftHasPlaceholder(body: string): boolean {
  return body.includes(LEGAL_PLACEHOLDER_MARKER);
}
