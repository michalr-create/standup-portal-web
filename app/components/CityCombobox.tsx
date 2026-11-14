"use client";

import { useMemo } from "react";
import OptionCombobox from "@/app/components/OptionCombobox";

export default function CityCombobox({
  cities,
  selectedCity,
  onSelect,
  inputId,
  minHeightClass,
}: {
  cities: readonly string[];
  selectedCity: string;
  onSelect: (city: string) => void;
  inputId: string;
  minHeightClass?: string;
}) {
  const items = useMemo(
    () => cities.map((city) => ({ value: city, label: city })),
    [cities],
  );
  return (
    <OptionCombobox
      items={items}
      selectedValue={selectedCity}
      onSelect={onSelect}
      inputId={inputId}
      allLabel="Wszystkie"
      searchPlaceholder={"Szukaj miasta\u2026"}
      clearLabel="Wyczyść miasto"
      listLabel="Miasta"
      minHeightClass={minHeightClass}
    />
  );
}
