export type ComboboxOption = { value: string; label: string };

/** Case- and diacritic-insensitive key. "Łódź" and "lodz" share one. */
export function foldComboboxQuery(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const ALL_CITIES_OPTION: ComboboxOption = { value: "", label: "Wszystkie" };

/**
 * Full option list for a text combobox.
 * The empty-value option (Wszyscy / Wszystkie) stays available when the query matches it.
 * Item order is preserved; nothing here rewrites the committed value.
 */
export function comboboxOptions(
  items: readonly ComboboxOption[],
  query: string,
  allOption: ComboboxOption,
): ComboboxOption[] {
  const needle = foldComboboxQuery(query);
  const matches = needle
    ? items.filter((item) => foldComboboxQuery(item.label).includes(needle))
    : [...items];
  if (!query.trim()) return [allOption, ...matches];
  return foldComboboxQuery(allOption.label).includes(needle) ? [allOption, ...matches] : matches;
}

/** City suggestions. The selected value stays the original city name for the URL. */
export function cityComboboxOptions(cities: readonly string[], query: string): ComboboxOption[] {
  return comboboxOptions(
    cities.map((city) => ({ value: city, label: city })),
    query,
    ALL_CITIES_OPTION,
  );
}

/** Highlight the current value when the query is empty, otherwise the first real match. */
export function comboboxActiveIndex(
  options: readonly { value: string }[],
  query: string,
  selectedValue: string,
): number {
  if (options.length === 0) return -1;
  if (query.trim()) {
    const firstReal = options.findIndex((option) => option.value !== "");
    return firstReal >= 0 ? firstReal : 0;
  }
  const selected = options.findIndex((option) => option.value === selectedValue);
  return selected >= 0 ? selected : 0;
}

/**
 * If focus has not yet cleared the committed label, a keystroke can land on the
 * end of that label. Keep only the characters added past it.
 */
export function comboboxTypedValue(raw: string, selectedLabel: string, replacePending: boolean): string {
  if (!replacePending || selectedLabel.length === 0) return raw;
  if (raw.startsWith(selectedLabel) && raw.length > selectedLabel.length) {
    return raw.slice(selectedLabel.length);
  }
  return raw;
}
