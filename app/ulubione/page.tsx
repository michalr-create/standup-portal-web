"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import HeartButton from "@/app/components/HeartButton";
import SignOutButton from "@/app/components/SignOutButton";
import VideoModal from "@/app/components/VideoModal";
import CardByline from "@/app/components/CardByline";
import ScrollRow from "@/app/components/ScrollRow";
import SectionHead from "@/app/components/SectionHead";
import { useLibrary } from "@/app/components/LibraryProvider";
import WatchLaterButton from "@/app/components/WatchLaterButton";
import AdminMaterialActions from "@/app/components/AdminMaterialActions";
import { resolveContentOpen } from "@/lib/youtube";
import type { Item } from "@/lib/data";
import ContentCardAction from "@/app/components/ContentCardAction";
import SpecialProgramLink from "@/app/components/SpecialProgramLink";
import { itemDisplayTitle } from "@/lib/display-title";
import PaidBadge from "@/app/components/PaidBadge";
import ThumbDuration from "@/app/components/ThumbDuration";
import ReportForm from "@/app/zglos/ReportForm";
import AccountPlaces from "./AccountPlaces";
import FavoriteTours from "./FavoriteTours";
import PushNotifications from "./PushNotifications";
import { eventsForFavoritePeople, selectAccountUpcoming, type FavoriteUpcomingEvent } from "@/lib/events";
import { FAVORITE_FEED_MAX } from "@/lib/favorite-feed";
import { MISSING_REPORT_KINDS } from "@/lib/content-report";

const logoutClass =
  "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]";

type FavDetail = { slug: string; name: string };
type ApiResponse = {
  items: Item[];
  people: FavDetail[];
  shows: FavDetail[];
  upcoming_events: FavoriteUpcomingEvent[];
  city_events: FavoriteUpcomingEvent[];
};

export default function UlubionePage() {
  const library = useLibrary();
  const personSlugs = library.people;
  const showSlugs = library.shows;
  const personKey = personSlugs.join("\n");
  const showKey = showSlugs.join("\n");
  const laterKey = library.later.join(",");
  const [homeCity, setHomeCity] = useState("");
  const [cityKnown, setCityKnown] = useState(false);
  const [eventsCity, setEventsCity] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse>({ items: [], people: [], shows: [], upcoming_events: [], city_events: [] });
  const [laterItems, setLaterItems] = useState<Item[]>([]);
  const [laterLoadedKey, setLaterLoadedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ item: Item; videoId: string } | null>(null);
  const slugKeyRef = useRef<string | null>(null);

  const handleClick = (item: Item) => {
    const target = resolveContentOpen(item);
    if (target?.type === "modal") {
      setModal({ item, videoId: target.videoId });
    } else if (target?.type === "external") {
      window.open(target.url, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    if (!library.ready) return;
    const ps = personKey ? personKey.split("\n") : [];
    const ss = showKey ? showKey.split("\n") : [];

    const slugsChanged = slugKeyRef.current !== `${personKey}\n${showKey}`;
    slugKeyRef.current = `${personKey}\n${showKey}`;
    const requestedCity = homeCity;

    if (ps.length === 0 && ss.length === 0 && !requestedCity) {
      setData({ items: [], people: [], shows: [], upcoming_events: [], city_events: [] });
      setEventsCity("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    if (slugsChanged) setLoading(true);
    fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_slugs: ps, show_slugs: ss, city: requestedCity, limit: FAVORITE_FEED_MAX }),
    })
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        if (cancelled) return;
        setData({
          items: d?.items ?? [],
          people: d?.people ?? [],
          shows: d?.shows ?? [],
          upcoming_events: Array.isArray(d?.upcoming_events) ? d.upcoming_events : [],
          city_events: Array.isArray(d?.city_events) ? d.city_events : [],
        });
        setEventsCity(requestedCity);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEventsCity(requestedCity);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [library.ready, personKey, showKey, homeCity]);

  useEffect(() => {
    if (!library.ready) return;
    const ids = laterKey ? laterKey.split(",").map((value) => Number(value)).filter((id) => id > 0) : [];
    if (ids.length === 0) {
      setLaterItems([]);
      setLaterLoadedKey(laterKey);
      return;
    }
    let cancelled = false;
    fetch("/api/library-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((body: { items?: Item[] }) => {
        if (cancelled) return;
        setLaterItems(Array.isArray(body?.items) ? body.items : []);
        setLaterLoadedKey(laterKey);
      })
      .catch(() => {
        if (cancelled) return;
        setLaterItems([]);
        setLaterLoadedKey(laterKey);
      });
    return () => {
      cancelled = true;
    };
  }, [library.ready, laterKey]);

  const hasAny = personSlugs.length > 0 || showSlugs.length > 0;
  const hasLater = library.later.length > 0;
  const favoriteEvents = eventsForFavoritePeople(data.upcoming_events, personSlugs);
  const upcomingEvents = selectAccountUpcoming(data.city_events, favoriteEvents, homeCity);
  const toursLoading = homeCity !== "" && eventsCity !== homeCity;

  return (
    <>
    <div className="band">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <div className="mono text-xs uppercase mb-3" style={{ color: "var(--paper-mute)", letterSpacing: ".16em" }}>
              {!library.ready ? "Ulubione" : library.signedIn ? "Na koncie" : "Lokalnie w przeglądarce"}
            </div>
            <h1 className="font-black m-0 leading-none mb-2" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-.025em" }}>
              Ulubione<span className="dot-accent">.</span>
            </h1>
            <p className="m-0" style={{ color: "var(--paper-dim)", fontSize: "15px" }}>
              {!library.ready ? (
                "Ładowanie…"
              ) : library.signedIn ? (
                "Zapisane na koncie. Te same listy na każdym urządzeniu."
              ) : (
                <>
                  Zapisane w tej przeglądarce.{" "}
                  <Link href="/zaloguj?next=/ulubione" className="font-bold" style={{ color: "var(--coral)" }}>
                    Zaloguj się
                  </Link>
                  , żeby mieć ulubione i listę „Do obejrzenia” też na innych urządzeniach.
                </>
              )}
            </p>
          </div>
          {library.signedIn && (
            <SignOutButton
              className={logoutClass}
              style={{ color: "var(--paper)", background: "transparent", border: "1px solid var(--line-2)" }}
            />
          )}
        </header>

        <AccountPlaces
          onCityChange={(city) => {
            setHomeCity(city);
            setCityKnown(true);
          }}
        />
        <PushNotifications />

        {library.ready && (hasAny || hasLater) && (
          <div className="mb-8 flex flex-wrap gap-3">
            <Link href="/standuperzy" className="chip">Dodaj standupera</Link>
            <Link href="/formaty" className="chip">Dodaj format</Link>
          </div>
        )}

        {hasLater && (
          <section className="mb-10 scroll-mt-28" aria-labelledby="do-obejrzenia">
            <h2 id="do-obejrzenia" className="font-black mb-4" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
              Do obejrzenia
              <span className="mono text-xs font-normal ml-3" style={{ color: "var(--paper-mute)", letterSpacing: ".1em" }}>
                {library.later.length}
              </span>
            </h2>
            {laterLoadedKey !== laterKey ? (
              <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>Ładowanie…</p>
            ) : laterItems.length === 0 ? (
              <p className="m-0 text-sm" style={{ color: "var(--paper-mute)" }}>Te materiały nie są już dostępne.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {laterItems.map((item) => {
                  const title = itemDisplayTitle(item);
                  return (
                    <article key={item.id} className="group vcard relative text-left w-full min-w-0">
                      <ContentCardAction isPaid={item.is_paid} url={item.url} slug={item.slug} onOpen={() => handleClick(item)}>
                        <div
                          className="overflow-hidden relative"
                          style={{ aspectRatio: "16/10", borderRadius: "14px", border: "1px solid var(--line)", background: "var(--ink-3)" }}
                        >
                          {item.thumbnail_url && (
                            <img
                              src={item.thumbnail_url}
                              alt={title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          <ThumbDuration seconds={item.duration_seconds} isPaid={item.is_paid} />
                          {item.is_paid && <PaidBadge url={item.url} />}
                        </div>
                        <div className="pt-3 px-0.5">
                          <h3 className="font-extrabold leading-tight line-clamp-2" style={{ fontSize: "16px", letterSpacing: "-.01em" }}>
                            {title}
                          </h3>
                        </div>
                      </ContentCardAction>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <WatchLaterButton itemId={item.id} title={title} />
                        {item.is_paid && item.slug ? <SpecialProgramLink slug={item.slug} /> : null}
                        <AdminMaterialActions itemId={item.id} inline />
                      </div>
                      <CardByline item={item} />
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!hasAny && Boolean(homeCity) && (
          <FavoriteTours
            loading={toursLoading || loading}
            events={toursLoading ? [] : upcomingEvents}
            city={homeCity}
            cityKnown={cityKnown}
          />
        )}

        {!hasAny && !hasLater && !loading && library.ready && (
          <div className="text-center py-20" style={{ color: "var(--paper-mute)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>{"♡"}</div>
            <p className="text-lg">Nie masz jeszcze żadnych ulubionych.</p>
            <p className="mt-2 text-sm">
              Dodaj ulubione klikając serduszko na profilu standupera lub formatu.
            </p>
            <div className="flex gap-4 justify-center mt-6">
              <Link href="/standuperzy" className="chip">Standuperzy</Link>
              <Link href="/formaty" className="chip">Formaty</Link>
            </div>
          </div>
        )}

        {hasAny && (
          <>
            {/* Obserwowane osoby */}
            {(personSlugs.length > 0 || data.people.length > 0) && (
              <section className="mb-10">
                <h2 className="font-black mb-4" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
                  Obserwowane osoby
                  <span className="mono text-xs font-normal ml-3" style={{ color: "var(--paper-mute)", letterSpacing: ".1em" }}>
                    {personSlugs.length}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.people.map((p) => (
                    <div
                      key={p.slug}
                      className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--line-2)" }}
                    >
                      <Link
                        href={`/standuper/${p.slug}`}
                        className="text-sm font-semibold hover:text-white transition-colors"
                        style={{ color: "var(--paper-dim)" }}
                      >
                        {p.name}
                      </Link>
                      <HeartButton type="person" slug={p.slug} name={p.name} />
                    </div>
                  ))}
                  {loading && personSlugs.map((s) => (
                    <div
                      key={s}
                      className="flex items-center px-3 py-1 rounded-full"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--line-2)", color: "var(--paper-mute)", fontSize: "13px" }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(personSlugs.length > 0 || homeCity) && (
              <FavoriteTours
                loading={toursLoading || loading}
                events={toursLoading ? [] : upcomingEvents}
                city={homeCity}
                cityKnown={cityKnown}
              />
            )}

            {/* Obserwowane formaty */}
            {(showSlugs.length > 0 || data.shows.length > 0) && (
              <section className="mb-10">
                <h2 className="font-black mb-4" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
                  Obserwowane formaty
                  <span className="mono text-xs font-normal ml-3" style={{ color: "var(--paper-mute)", letterSpacing: ".1em" }}>
                    {showSlugs.length}
                  </span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.shows.map((s) => (
                    <div
                      key={s.slug}
                      className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full"
                      style={{ background: "var(--ink-3)", border: "1px solid var(--line-2)" }}
                    >
                      <Link
                        href={`/format/${s.slug}`}
                        className="text-sm font-semibold hover:text-white transition-colors"
                        style={{ color: "var(--paper-dim)" }}
                      >
                        {s.name}
                      </Link>
                      <HeartButton type="show" slug={s.slug} name={s.name} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="najnowsze-ulubione">
              <SectionHead
                titleId="najnowsze-ulubione"
                title="Najnowsze treści w Ulubione"
                linkHref="/ulubione/tresci"
                linkText={"Pokaż wszystkie \u2192"}
              />
              {loading ? (
                <div className="text-sm" style={{ color: "var(--paper-mute)" }}>
                  Ładowanie…
                </div>
              ) : data.items.length === 0 ? (
                <p style={{ color: "var(--paper-mute)", fontSize: "14px" }}>
                  Brak treści dla wybranych ulubionych.
                </p>
              ) : (
                <ScrollRow items={data.items} />
              )}
            </section>
          </>
        )}

        <section className="mt-14" aria-labelledby="zglos-brakujace">
          <h2 id="zglos-brakujace" className="font-black mb-2" style={{ fontSize: "18px", letterSpacing: "-.01em" }}>
            Zgłoś brakujące
            <span className="dot-accent">.</span>
          </h2>
          <p className="mb-4 max-w-xl text-sm" style={{ color: "var(--paper-dim)" }}>
            Filmu, występu, open micu albo standupera nie ma na portalu. Wybierz rodzaj i podaj link albo krótki opis.
          </p>
          <ReportForm
            kinds={MISSING_REPORT_KINDS}
            initialKind="missing_video"
            contentItemId={null}
            returnPath="/ulubione"
          />
        </section>
      </div>
    </div>
    {modal && (
      <VideoModal
        item={modal.item}
        videoId={modal.videoId}
        onClose={() => setModal(null)}
      />
    )}
    </>
  );
}
