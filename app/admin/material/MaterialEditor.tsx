"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OptionCombobox from "@/app/components/OptionCombobox";
import { updateMaterial } from "./actions";
import {
  MATERIAL_DESCRIPTION_MAX,
  MATERIAL_SLUG_MAX,
  MATERIAL_TITLE_MAX,
  tagOptionLabel,
  type MaterialEditorData,
  type NamedId,
} from "@/lib/material-edit";
import { EXCLUDED_SPECIAL_ITEM_ID, isPublicContentSlug } from "@/lib/slugify";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const fieldClass = `w-full min-h-11 rounded-[10px] px-3 py-2 text-sm outline-none ${focusRing}`;

const fieldStyle = {
  color: "var(--paper)",
  background: "rgba(239, 232, 220, .10)",
  border: "1px solid rgba(239, 232, 220, .42)",
};

function idValue(id: number | null): string {
  return id == null ? "" : String(id);
}

function valueId(value: string): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function Chips({
  items,
  onRemove,
}: {
  items: NamedId[];
  onRemove: (id: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="m-0 mb-2 flex list-none flex-wrap gap-2 p-0">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold ${focusRing}`}
            style={{ color: "var(--ink)", background: "var(--paper)" }}
            aria-label={`Usuń ${item.name}`}
            onClick={() => onRemove(item.id)}
          >
            {item.name}
            <span aria-hidden="true">×</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddCombobox({
  inputId,
  allLabel,
  listLabel,
  clearLabel,
  items,
  resetKey,
  onAdd,
}: {
  inputId: string;
  allLabel: string;
  listLabel: string;
  clearLabel: string;
  items: NamedId[];
  resetKey: string;
  onAdd: (id: number) => void;
}) {
  const options = useMemo(
    () => items.map((item) => ({ value: String(item.id), label: item.name })),
    [items],
  );
  return (
    <OptionCombobox
      key={resetKey}
      items={options}
      selectedValue=""
      onSelect={(value) => {
        const id = valueId(value);
        if (id != null) onAdd(id);
      }}
      inputId={inputId}
      allLabel={allLabel}
      searchPlaceholder="Szukaj…"
      clearLabel={clearLabel}
      listLabel={listLabel}
    />
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Oczekuje",
  approved: "Zatwierdzony",
  rejected: "Odrzucony",
};

export default function MaterialEditor({ data }: { data: MaterialEditorData }) {
  const router = useRouter();
  const [title, setTitle] = useState(data.item.title);
  const [description, setDescription] = useState(data.item.description);
  const [categoryId, setCategoryId] = useState<number | null>(data.item.categoryId);
  const [showId, setShowId] = useState<number | null>(data.item.showId);
  const [personIds, setPersonIds] = useState<number[]>(data.personIds);
  const [tagIds, setTagIds] = useState<number[]>(data.tagIds);
  const [slug, setSlug] = useState(data.item.slug);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const peopleById = useMemo(() => new Map(data.people.map((person) => [person.id, person])), [data.people]);
  const tagsById = useMemo(() => new Map(data.tags.map((tag) => [tag.id, tag])), [data.tags]);
  const selectedPeople = personIds.map((id) => peopleById.get(id)).filter((person): person is NamedId => person != null);
  const selectedTags = tagIds
    .map((id) => tagsById.get(id))
    .filter((tag): tag is MaterialEditorData["tags"][number] => tag != null)
    .map((tag) => ({ id: tag.id, name: tagOptionLabel(tag) }));

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const result = await updateMaterial(data.item.id, {
          title,
          description,
          categoryId,
          showId,
          personIds,
          tagIds,
          slug,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Nie udało się zapisać.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="m-0 mb-4">
        <Link href="/admin" className={`text-sm font-bold ${focusRing}`} style={{ color: "var(--coral)" }}>
          {"← Moderacja"}
        </Link>
      </p>
      <h1 className="m-0 font-black" style={{ fontSize: "28px", letterSpacing: "-.03em" }}>
        Edycja materiału
      </h1>
      <p className="mono mt-2 text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
        {STATUS_LABELS[data.item.status] ?? data.item.status}
        {data.item.url ? (
          <>
            {" · "}
            <a href={data.item.url} target="_blank" rel="noopener noreferrer" className={focusRing} style={{ color: "var(--paper-dim)" }}>
              Otwórz źródło
            </a>
          </>
        ) : null}
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label className="block text-sm font-bold" htmlFor="material-title">
          Tytuł
          <input
            id="material-title"
            value={title}
            maxLength={MATERIAL_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            className={`mt-2 ${fieldClass}`}
            style={fieldStyle}
            required
          />
        </label>

        <label className="block text-sm font-bold" htmlFor="material-slug">
          Slug strony specjalu
          <input
            id="material-slug"
            value={slug}
            maxLength={MATERIAL_SLUG_MAX}
            spellCheck={false}
            disabled={data.item.id === EXCLUDED_SPECIAL_ITEM_ID}
            onChange={(event) => setSlug(event.target.value)}
            className={`mono mt-2 ${fieldClass}`}
            style={fieldStyle}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <span className="mt-2 block text-xs font-normal" style={{ color: "var(--paper-mute)" }}>
            {data.item.id === EXCLUDED_SPECIAL_ITEM_ID
              ? "Ten duplikat nie dostaje publicznej strony. Scal go z rekordem kanonicznym."
              : "Adres /specjale/… dla zatwierdzonego specjalu. Puste pole układa slug z surowego tytułu. Nie zmieniaj go po publikacji bez potrzeby — nie ma jeszcze przekierowania ze starego adresu."}
          </span>
          {isPublicContentSlug(slug.trim().toLowerCase()) ? (
            <a
              href={`/specjale/${slug.trim().toLowerCase()}`}
              className={`mt-2 inline-block text-xs font-bold ${focusRing}`}
              style={{ color: "var(--coral)" }}
            >
              {`Podgląd /specjale/${slug.trim().toLowerCase()}`}
            </a>
          ) : null}
        </label>

        <label className="block text-sm font-bold" htmlFor="material-description">
          Opis
          <textarea
            id="material-description"
            value={description}
            maxLength={MATERIAL_DESCRIPTION_MAX}
            rows={5}
            onChange={(event) => setDescription(event.target.value)}
            className={`mt-2 ${fieldClass}`}
            style={fieldStyle}
          />
        </label>

        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="material-category">
            Kategoria
          </label>
          <OptionCombobox
            items={data.categories.map((category) => ({ value: String(category.id), label: category.name }))}
            selectedValue={idValue(categoryId)}
            onSelect={(value) => setCategoryId(valueId(value))}
            inputId="material-category"
            allLabel="Brak"
            searchPlaceholder="Szukaj kategorii…"
            clearLabel="Wyczyść kategorię"
            listLabel="Kategorie"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="material-show">
            Format
          </label>
          <OptionCombobox
            items={data.shows.map((show) => ({ value: String(show.id), label: show.name }))}
            selectedValue={idValue(showId)}
            onSelect={(value) => setShowId(valueId(value))}
            inputId="material-show"
            allLabel="Brak"
            searchPlaceholder="Szukaj formatu…"
            clearLabel="Wyczyść format"
            listLabel="Formaty"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="material-people">
            Standuperzy
          </label>
          <Chips
            items={selectedPeople}
            onRemove={(id) => setPersonIds((current) => current.filter((personId) => personId !== id))}
          />
          <AddCombobox
            inputId="material-people"
            allLabel="Dodaj standupera"
            listLabel="Standuperzy"
            clearLabel="Wyczyść standupera"
            items={data.people.filter((person) => !personIds.includes(person.id))}
            resetKey={personIds.join(",")}
            onAdd={(id) => setPersonIds((current) => (current.includes(id) ? current : [...current, id]))}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold" htmlFor="material-tags">
            Tagi
          </label>
          <Chips
            items={selectedTags}
            onRemove={(id) => setTagIds((current) => current.filter((tagId) => tagId !== id))}
          />
          <AddCombobox
            inputId="material-tags"
            allLabel="Dodaj tag"
            listLabel="Tagi"
            clearLabel="Wyczyść tag"
            items={data.tags
              .filter((tag) => !tagIds.includes(tag.id))
              .map((tag) => ({ id: tag.id, name: tagOptionLabel(tag) }))}
            resetKey={tagIds.join(",")}
            onAdd={(id) => setTagIds((current) => (current.includes(id) ? current : [...current, id]))}
          />
        </div>

        {error ? (
          <p role="alert" className="m-0 text-sm font-bold" style={{ color: "var(--coral)" }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="m-0 text-sm font-bold" style={{ color: "var(--paper)" }}>
            Zapisano.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold ${focusRing}`}
          style={{ background: "var(--coral)", color: "var(--ink)" }}
        >
          {pending ? "Zapisywanie…" : "Zapisz"}
        </button>
      </form>
    </div>
  );
}
