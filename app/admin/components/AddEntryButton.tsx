"use client";

import { useState } from "react";
import ManualEntryForm from "./ManualEntryForm";

type Props = {
  categories: { id: number; name: string }[];
  shows: { id: number; name: string }[];
  personTags: { id: number; name: string }[];
};

export default function AddEntryButton({ categories, shows, personTags }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-1.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200"
      >
        + Dodaj wpis
      </button>

      {open && (
        <ManualEntryForm
          categories={categories}
          shows={shows}
          personTags={personTags}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
