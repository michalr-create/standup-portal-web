# parska.pl — Agregator Polskiego Stand-upu

## O projekcie

parska.pl to portal agregujący treści stand-upowe z YouTube, podcastów i stron własnych komików. Inspiracja: Chortle.co.uk (UK comedy guide). Właściciel: michalr-create (GitHub). Domena: parska.pl (podpięta do Vercela).

## Stack technologiczny

- **Baza danych:** Supabase (PostgreSQL, darmowy plan, region Frankfurt EU)
- **Worker:** Python na GitHub Actions (repo: `michalr-create/standup-portal-worker`)
- **Portal:** Next.js 15.5 na Vercelu (to repo: `michalr-create/standup-portal-web`)
- **Auth:** Supabase Auth (email + hasło)
- **PWA:** manifest.json, ikony, przycisk instalacji
- **YouTube Data API v3:** do pełnego importu filmów i pobierania duration
- **Design system:** Nunito (UI), JetBrains Mono (meta/mono), Fraunces (italic akcenty)
- **Paleta:** --ink #0B0B0B, --paper #EFE8DC, --coral #E8594A

## Architektura bazy danych

### Tabele

- **`people`** — standuperzy/podcasterzy. Pola: name, slug (UNIQUE), bio, photo_url, role, is_active.
- **`categories`** — Standup, Formaty, Wywiady, Shorts. Pole display_order.
- **`shows`** — programy/formaty (Wahanie, Dżin z Komikiem). Powiązane z category. Pola: youtube_channel_url, spotify_show_url, apple_podcasts_url, website_url, description, is_active.
- **`sources`** — kanały YT, podcasty RSS, Manual entry. Pola: type (youtube/podcast/manual/website), feed_url, show_id, is_watch_source, is_active.
- **`source_default_people`** — junction: które osoby auto-tagowane przy nowych wpisach z danego source.
- **`tags`** — typ: person (auto-sync z people), topic, format, event. UNIQUE(slug, tag_type).
- **`content_tags`** — junction: wpis ↔ tagi (many-to-many).
- **`content_items`** — główna tabela wpisów. Pola: source_id, external_id, title, description, url, thumbnail_url, published_at, status (pending/approved/rejected), content_type (video/short/podcast_episode/special), category_id, show_id, episode_group_id, is_manual, possible_duplicate_of, merged_into_id, is_featured, duration_seconds.

### RLS
- anon może czytać approved items, sources, people, categories, shows, tags, content_tags
- service_role ma pełny dostęp

## Zmienne środowiskowe

### Vercel (portal)
- `NEXT_PUBLIC_SUPABASE_URL` — URL Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — klucz anon
- `SUPABASE_SERVICE_KEY` — klucz service_role (tajny, server-only)
- `YOUTUBE_API_KEY` — YouTube Data API v3

### GitHub Actions (worker repo)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `YOUTUBE_API_KEY`

## Struktura plików portalu

```
app/
  layout.tsx              — główny layout z nav, footer, mobile drawer
  page.tsx                — strona główna (Nowe, Polecane, Specjale, Formaty)
  globals.css             — design system (CSS variables, utility classes)
  standup/page.tsx         — kategoria Standup
  formaty/page.tsx         — lista formatów (jasne tło)
  format/[slug]/page.tsx   — strona formatu
  standuper/[slug]/page.tsx — profil standupera
  standuperzy/page.tsx     — lista standuperów z wyszukiwarką
  shorts/page.tsx          — kategoria Shorts
  wywiady/page.tsx         — kategoria Wywiady
  specjale/page.tsx        — strona specjali (przez tag)
  komik/[slug]/page.tsx    — redirect do /standuper/[slug]
  admin/
    login/page.tsx         — logowanie (email + hasło)
    layout.tsx             — chroniony layout admina
    page.tsx               — moderacja (zakładki: Pending/Zatwierdzone/Wyróżnione/Odrzucone)
    actions.ts             — server actions (approve, reject, revert, toggleFeatured, setItemTags, itp.)
    actions-sources.ts     — server actions (CRUD sources, people, shows, tags, manual entries)
    actions-fetch.ts       — server actions (quickFetch RSS, fullFetch API, backfillDurations)
    standuperzy/page.tsx   — CRUD standuperów
    formaty/page.tsx       — CRUD formatów/shows
    zrodla/page.tsx        — CRUD źródeł + pobieranie
    components/
      ModerationCard.tsx   — kafelek moderacji z tagami, kategoriami, akcjami
      StatusTabs.tsx       — zakładki statusu
      AddEntryButton.tsx   — przycisk dodawania wpisu ręcznie
      ManualEntryForm.tsx  — modal dodawania wpisu z auto-metadanymi
      LogoutButton.tsx     — przycisk wylogowania
  components/
    ItemsBrowser.tsx       — siatka kafelków video (portal publiczny)
    ScrollRow.tsx          — Netflix-style przewijany pasek ze strzałkami
    MobileDrawer.tsx       — hamburger menu mobilne
    StanduperzyList.tsx    — lista standuperów z wyszukiwarką
    InstallButton.tsx      — przycisk instalacji PWA
lib/
  data.ts                 — zapytania do Supabase (getAllItems, getRecentItems, getFeaturedItems, getItemsByTagSlug, getLatestPerShow, hydrateItems, itp.)
  supabase.ts             — klient anon
  supabase-server.ts      — klient serwerowy z cookies (auth)
  supabase-browser.ts     — klient przeglądarkowy (auth)
  supabase-admin.ts       — klient service_role
middleware.ts             — dodaje x-pathname header (fix pętli auth)
```

## Kluczowe decyzje architektoniczne

- Portal jako PWA, nie natywna apka
- Kategorie (sztywne, 1 per wpis) + tagi (elastyczne, wiele per wpis) — dwa osobne mechanizmy
- Shows jako osobna encja (nie podkategoria)
- Source default people — auto-tagowanie per źródło
- Ręczne dodawanie wpisów z auto-pobieraniem metadanych (YouTube oEmbed, OpenGraph fallback)
- Worker auto-wykrywa shorty po URL `/shorts/` i duration ≤60s
- Nazewnictwo: "standuper" zamiast "komik" w UI i URL-ach
- Sekcja Formaty na stronie głównej ma jasne tło (--paper), reszta ciemne (--ink)

## Znane problemy techniczne

- Tag `<a` znika przy renderowaniu kodu w czacie Claude — rozwiązanie: używać `<Link>` z Next.js, `<button>` z `window.open()`, lub wyciągać do osobnych komponentów
- Supabase JS SDK: `maybeSingle()` (camelCase), Python SDK: `maybe_single()` (snake_case)
- YouTube RSS zwraca max 15 filmów — pełny import wymaga YouTube Data API v3
- Duration tylko dla filmów pobranych przez API — przycisk "Uzupełnij czas" do backfillu
- Długie className w JSX mogą się ucinać przy wklejaniu — wyciągać do zmiennych

## Co jest zrobione ✅

- Krok 1: Refaktor bazy (people, categories, shows, tags, content_tags, source_default_people)
- Krok 2: Worker v2 (YouTube RSS + podcast RSS, auto-tagowanie, duplikaty)
- Krok 3: Nowy layout portalu (sticky nav z blur, hero, sekcje, footer, mobile drawer)
- Krok 4a: Panel admina — autoryzacja (email + hasło)
- Krok 4b: Moderacja (pending/zatwierdzone/odrzucone/wyróżnione, edycja, tagi, merge)
- Krok 4c: CRUD standuperów (dodawanie z dedykowanej strony i "w locie")
- Krok 4d: CRUD shows/formatów (dodawanie, edycja, linki platform)
- Krok 4e: CRUD źródeł + ręczne dodawanie wpisów + YouTube API full import + backfill duration
- Shorts jako osobna kategoria z auto-detekcją
- Strona startowa z sekcjami: Nowe (bez shortów), Polecane (ScrollRow), Specjale (ScrollRow), Formaty (jasne tło)
- System tagów (person + content tags: topic, format, event) z dodawaniem inline w moderacji
- Duration na kafelkach portalu i panelu moderacji
- is_featured + zakładka Wyróżnione w panelu + sekcja Polecane na stronie głównej
- Pełny redesign z paletą ink/paper/coral, fontami Nunito/JetBrains Mono/Fraunces
- Strona /standuperzy z wyszukiwarką i kafelkami z avatarami
- Strona /specjale (wpisy otagowane tagiem "specjal")
- Favicony (pixel-perfect "p." z koralową kropką)

## Co jest do zrobienia 🟡

### Priorytet wysoki
- Krok 6: Seedowanie kontentu (dodanie 10-20 standuperów, 5-10 shows, 100+ treści przez panel admin)
- Krok 4c rozszerzony: Edycja standuperów (bio, zdjęcia, linki social)
- Scraper stron standuperów (abelardgiza.pl — plan gotowy, struktura HTML przeanalizowana)

### Priorytet średni
- Krok 5: Watch sources worker (skanowanie obcych podcastów pod kątem nazwisk standuperów)
- Trasy koncertowe (tabele tours/events, wyszukiwarka po mieście/dacie, scrapowanie Going.pl)
- Open-mic (nisza-killer, sekcja na portalu)
- Łączenie odcinków YT↔Spotify (episode_group_id, merge suggestions w moderacji)

### Priorytet niski
- Newsletter (Buttondown, tygodniowy digest)
- SEO (sitemap, structured data, Open Graph per strona)
- Profesjonalne logo (pliki designu Logo.html w posiadaniu właściciela)

## Kontekst scrapera stron (plan do implementacji)

Strona abelardgiza.pl/stand-up/ ma trzy sekcje:
1. "Aktualnie" — info o aktualnym programie (Wentyl)
2. "Kalendarz" — pełna lista tras z datami, miastami, linkami do biletów
3. "Programy" — lista specjali z rokiem, tytułem, plakatem i linkiem YouTube

Plan: Worker parsuje HTML (BeautifulSoup), wyciąga sekcję "Programy", porównuje z bazą, nowe wpisuje jako pending. Jeden parser per standuper (nie universal). Source type = 'website'.

## Konwencje kodowania

- Next.js App Router (React Server Components domyślnie, "use client" tylko gdy potrzebne)
- Server Actions w `app/admin/actions*.ts` z `"use server"` na górze
- Supabase queries w `lib/data.ts` (portal publiczny, anon key)
- Admin operations w `actions*.ts` (service_role key)
- Tailwind CSS + CSS variables z design systemu
- Polskie UI (nazwy kategorii, przyciski, komunikaty)
- Unicode znaki (→, ·, ę, ą) przez escape sequences w JSX gdy dosłowne znaki mogą być problematyczne
