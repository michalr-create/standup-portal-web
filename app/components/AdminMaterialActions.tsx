"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleFeatured } from "@/app/admin/actions";
import { EDIT_MATERIAL_LABEL, featuredActionLabel, materialEditPath } from "@/lib/admin-surface";
import { useAdminMode } from "./AdminMode";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

const chip = "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold";

export default function AdminMaterialActions({
  itemId,
  inline = false,
}: {
  itemId: number;
  /** Sit in the parent flex row (player) instead of starting a new line. */
  inline?: boolean;
}) {
  const { isAdmin, featuredIds, featuredReady, featuredError, refreshFeatured } = useAdminMode();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) return null;

  const featured = featuredIds.includes(itemId);
  const onFeature = () => {
    setError(null);
    startTransition(async () => {
      try {
        await toggleFeatured(itemId, !featured);
        await refreshFeatured();
        router.refresh();
      } catch {
        setError("Nie udało się zapisać polecanych.");
      }
    });
  };

  return (
    <div
      className={inline ? "contents" : "mt-2 flex flex-wrap items-center gap-2"}
      data-admin-material-actions=""
    >
      {featuredReady && (
        <button
          type="button"
          className={`${chip} ${focusRing}`}
          style={
            featured
              ? { color: "var(--ink)", background: "var(--coral)" }
              : { color: "var(--paper)", background: "transparent", border: "1px solid var(--line-2)" }
          }
          aria-pressed={featured}
          disabled={pending}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onFeature();
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {featuredActionLabel(featured)}
        </button>
      )}
      <Link
        href={materialEditPath(itemId)}
        className={`${chip} ${focusRing}`}
        style={{ color: "var(--paper)", border: "1px solid var(--line-2)" }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {EDIT_MATERIAL_LABEL}
      </Link>
      {error || (featuredError && !featuredReady) ? (
        <span role="alert" className="text-sm" style={{ color: "var(--coral)" }}>
          {error ?? featuredError}
        </span>
      ) : null}
    </div>
  );
}
