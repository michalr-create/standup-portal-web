"use client";

import { useMemo } from "react";
import OptionCombobox from "@/app/components/OptionCombobox";

type Person = { slug: string; name: string };

export default function PersonCombobox({
  people,
  selectedSlug,
  onSelect,
  inputId = "trasy-osoba",
}: {
  people: readonly Person[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  /** Defaults to the /trasy field id so its label stays attached. */
  inputId?: string;
}) {
  const items = useMemo(
    () => people.map((person) => ({ value: person.slug, label: person.name })),
    [people],
  );
  return (
    <OptionCombobox
      items={items}
      selectedValue={selectedSlug}
      onSelect={onSelect}
      inputId={inputId}
      allLabel="Wszyscy"
      searchPlaceholder={"Szukaj standupera\u2026"}
      clearLabel="Wyczyść standupera"
      listLabel="Standuperzy"
    />
  );
}
