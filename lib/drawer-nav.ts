export type DrawerLink = { href: string; label: string };

/** Burger menu, above the divider. Ulubione opens the favourites feed, not the account. */
export const DRAWER_PRIMARY_LINKS: readonly DrawerLink[] = [
  { href: "/ulubione/tresci", label: "Ulubione" },
  { href: "/specjale", label: "Specjale" },
  { href: "/formaty", label: "Formaty" },
  { href: "/trasy", label: "Trasy" },
  { href: "/open-mic", label: "Open mic" },
  { href: "/standuperzy", label: "Standuperzy" },
];

/** Burger menu, below the divider. */
export const DRAWER_SECONDARY_LINKS: readonly DrawerLink[] = [
  { href: "/nostalgia", label: "Nostalgia" },
  { href: "/rankingi", label: "Rankingi" },
  { href: "/wywiady", label: "Wywiady" },
  { href: "/kulisy", label: "Kulisy" },
  { href: "/standup", label: "Standup (kr\u00f3tsze materia\u0142y)" },
  { href: "/roast", label: "Roast" },
  { href: "/shorts", label: "Shorts" },
];
