import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/app/components/JsonLd";
import ScrollRow from "@/app/components/ScrollRow";
import SectionHead from "@/app/components/SectionHead";
import SpecialPageActions from "@/app/components/SpecialPageActions";
import { getAllSpecialSlugs, getRelatedSpecials, getSpecialBySlug } from "@/lib/data";
import { displayTitle } from "@/lib/display-title";
import { IMAGE_SIZE, contentThumbnailAlt } from "@/lib/image-alt";
import SizedImage from "@/app/components/SizedImage";
import { formatDuration } from "@/lib/format";
import { specialPageGraph } from "@/lib/jsonld";
import {
  absoluteUrl,
  contentMetadata,
  specialDocumentTitle,
  specialFallbackDescription,
  specialPath,
} from "@/lib/seo";
import { externalHostLabel, getYouTubeId, paidExternalUrl } from "@/lib/youtube";

export const revalidate = 120;

type Props = {
  params: Promise<{ slug: string }>;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

function formatPublished(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Warsaw",
  }).format(date);
}

export async function generateStaticParams() {
  try {
    const rows = await getAllSpecialSlugs();
    return rows.map((row) => ({ slug: row.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const special = await getSpecialBySlug(slug);
  if (!special) notFound();
  const pathname = specialPath(special.slug);
  if (!pathname) notFound();
  const title = displayTitle(special.title);
  const videoId = special.is_paid ? null : getYouTubeId(special.url);
  return contentMetadata({
    title: specialDocumentTitle(title, special.people),
    description: special.description,
    fallbackDescription: specialFallbackDescription(special.people, special.is_paid),
    pathname,
    openGraphType: special.is_paid || !videoId ? "website" : "video.other",
    image: special.thumbnail_url,
  });
}

export default async function SpecialPage({ params }: Props) {
  const { slug } = await params;
  const special = await getSpecialBySlug(slug);
  if (!special) notFound();
  const pathname = specialPath(special.slug);
  if (!pathname) notFound();

  const title = displayTitle(special.title);
  const videoId = special.is_paid ? null : getYouTubeId(special.url);
  const shopUrl = special.is_paid ? paidExternalUrl(special.url) : null;
  const shopHost = shopUrl ? externalHostLabel(shopUrl) : null;
  const fallback = specialFallbackDescription(special.people, special.is_paid);
  const jsonLdDescription = special.description?.trim() ? special.description.trim() : fallback;
  const pageUrl = absoluteUrl(pathname);
  const description = special.description?.trim() ?? "";
  const published = formatPublished(special.published_at);
  const duration = formatDuration(special.duration_seconds);
  const topicTags = special.tags.filter((tag) => tag.tag_type !== "person" && tag.slug !== "special");
  const primary = special.people[0] ?? null;
  const related = await getRelatedSpecials(primary?.slug ?? null, special.id, 6);
  const relatedTitle = primary ? `Więcej od ${primary.name}` : "Podobne specjale";
  const relatedHref = primary ? `/specjale?osoba=${encodeURIComponent(primary.slug)}` : "/specjale";

  return (
    <>
      <JsonLd
        data={specialPageGraph({
          name: title,
          description: jsonLdDescription,
          thumbnailUrl: special.thumbnail_url,
          publishedAt: special.published_at,
          durationSeconds: special.duration_seconds,
          videoId,
          isPaid: special.is_paid,
          pageUrl,
          people: special.people,
        })}
      />
      <div className="band">
        <div className="max-w-6xl mx-auto">
          <nav
            aria-label="Okruszki"
            className="mono mb-5 text-xs uppercase"
            style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}
          >
            <Link href="/" className={`hover:text-white ${focusRing}`}>
              Start
            </Link>
            <span aria-hidden="true">{" / "}</span>
            <Link href="/specjale" className={`hover:text-white ${focusRing}`}>
              Specjale
            </Link>
            <span aria-hidden="true">{" / "}</span>
            <span aria-current="page" style={{ color: "var(--paper-dim)" }}>
              {title}
            </span>
          </nav>

          <div className="max-w-4xl">
            {videoId ? (
              <div
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "16/9",
                  borderRadius: "14px",
                  border: "1px solid var(--line)",
                  background: "var(--ink-3)",
                }}
              >
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={title}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : special.is_paid ? (
              <div>
                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "16/9",
                    borderRadius: "14px",
                    border: "1px solid var(--line)",
                    background: "var(--ink-3)",
                  }}
                >
                  {special.thumbnail_url ? (
                    <SizedImage
                      src={special.thumbnail_url}
                      alt={contentThumbnailAlt({
                        title,
                        people: special.people,
                        showName: special.showName,
                      })}
                      width={IMAGE_SIZE.thumbWide.width}
                      height={IMAGE_SIZE.thumbWide.height}
                      priority
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <span
                    className="absolute left-3 top-3 inline-flex items-center rounded-md px-2 py-1 font-extrabold"
                    style={{ background: "var(--coral)", color: "var(--ink)", fontSize: "13px" }}
                  >
                    Płatne
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-sm" style={{ color: "var(--paper-dim)" }}>
                  To płatny program VOD. Obejrzenie jest na stronie sprzedawcy.
                </p>
                {shopUrl && shopHost ? (
                  <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-black hover:bg-[var(--coral-hi)] ${focusRing}`}
                    style={{ background: "var(--coral)", color: "var(--ink)" }}
                  >
                    {`Obejrzyj na ${shopHost}`}
                    <span aria-hidden="true">↗</span>
                    <span className="sr-only">, otwiera się w nowej karcie</span>
                  </a>
                ) : (
                  <p className="mt-3 text-sm font-bold" style={{ color: "var(--paper)" }}>
                    Niedostępne
                  </p>
                )}
              </div>
            ) : (
              <p className="max-w-2xl text-sm" style={{ color: "var(--paper-dim)" }}>
                To nagranie nie ma odtwarzacza na parska.
              </p>
            )}
          </div>

          <h1
            className="mt-6 max-w-4xl font-black leading-tight"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}
          >
            {title}
          </h1>

          {special.people.length > 0 ? (
            <p className="mt-3 text-base" style={{ color: "var(--paper-dim)" }}>
              {special.people.map((person, index) => (
                <span key={person.slug}>
                  {index > 0 ? " · " : null}
                  <Link href={`/standuper/${person.slug}`} className={`font-bold hover:text-white ${focusRing}`}>
                    {person.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}

          {(published || duration || special.is_paid || special.showSlug) && (
            <p className="mono mt-3 text-xs uppercase" style={{ color: "var(--paper-mute)", letterSpacing: ".14em" }}>
              {published}
              {published && duration ? " · " : null}
              {duration || null}
              {(published || duration) && special.is_paid ? " · " : null}
              {special.is_paid ? "Płatne" : null}
              {(published || duration || special.is_paid) && special.showSlug && special.showName ? " · " : null}
              {special.showSlug && special.showName ? (
                <Link href={`/format/${special.showSlug}`} className={`hover:text-white ${focusRing}`}>
                  {special.showName}
                </Link>
              ) : null}
            </p>
          )}

          <SpecialPageActions
            itemId={special.id}
            title={title}
            videoId={videoId}
            people={special.people}
          />

          {description ? (
            <div
              className="mt-6 max-w-2xl whitespace-pre-line"
              style={{ color: "var(--paper-dim)", fontSize: "17px", lineHeight: "1.55" }}
            >
              {description}
            </div>
          ) : null}

          {topicTags.length > 0 ? (
            <ul className="mt-6 flex list-none flex-wrap gap-2 p-0">
              {topicTags.map((tag) => (
                <li key={tag.slug}>
                  <Link href={`/specjale?tag=${encodeURIComponent(tag.slug)}`} className="chip">
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="band">
          <div className="max-w-6xl mx-auto">
            <SectionHead title={relatedTitle} linkHref={relatedHref} linkText="Pokaż wszystkie →" />
            <ScrollRow items={related} />
          </div>
        </section>
      ) : null}
    </>
  );
}
