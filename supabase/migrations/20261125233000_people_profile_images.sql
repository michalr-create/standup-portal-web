-- Apply BEFORE the deploy that reads these columns. The profile page falls
-- back to the old select if image_url is missing, so an earlier deploy keeps
-- rendering, just without photos.
--
-- Do not apply this from the app. It is here for review.
--
-- YouTube avatars are hotlinked (yt3.ggpht.com / yt3.googleusercontent.com).
-- The file is not stored. fetch_youtube_avatar marks rows whose URL the
-- refresh job may replace from channels.list, at most every 30 days
-- (YouTube Developer Policies III.E.4). image_fetched_at is that timestamp.
-- The site hides a YouTube URL once that timestamp is older than 30 days.
--
-- Seed is table A only: 36 confirmed channels whose avatar is a face, plus
-- 3 confirmed channels with no avatar (Giza, Szczęśniak, Gosiński — link
-- only). Section B and section C are not included. Czarek Sikora's Commons
-- file is not included.
--
-- Commons files live in public/standuperzy/ (proportional Wikimedia
-- thumbnails, except Sumowski, which is a square crop — "przycięte" —
-- still CC BY-SA 4.0). Giza and Lotek show that file. Ruciński and Sumowski
-- show YouTube; the Commons file is the backup after a refresh finds no
-- usable avatar. Lotek's og:image uses the YouTube avatar once it has been
-- refreshed, because the Commons file is 485×648.
-- photo_url is left untouched.

alter table public.people
  add column if not exists image_url text,
  add column if not exists image_source text,
  add column if not exists image_credit text,
  add column if not exists image_license text,
  add column if not exists image_license_url text,
  add column if not exists image_source_url text,
  add column if not exists image_width integer,
  add column if not exists image_height integer,
  add column if not exists image_disabled boolean not null default false,
  add column if not exists image_fetched_at timestamptz,
  add column if not exists youtube_channel_id text,
  add column if not exists youtube_channel_url text,
  add column if not exists youtube_image_url text,
  add column if not exists youtube_image_width integer,
  add column if not exists youtube_image_height integer,
  add column if not exists fetch_youtube_avatar boolean not null default false,
  add column if not exists image_fallback_url text,
  add column if not exists image_fallback_credit text,
  add column if not exists image_fallback_license text,
  add column if not exists image_fallback_license_url text,
  add column if not exists image_fallback_source_url text,
  add column if not exists image_fallback_width integer,
  add column if not exists image_fallback_height integer,
  add column if not exists image_fallback_cropped boolean not null default false;

comment on column public.people.image_url is
  'Profile photo URL. YouTube rows get the channels.list thumbnail (https, unmodified). Commons and own photos are files we host.';
comment on column public.people.image_source is
  'youtube, commons, or own. Null means no profile photo.';
comment on column public.people.image_credit is
  'Photographer or rights holder shown next to a Commons or own photo.';
comment on column public.people.image_license is
  'Short license name, for example CC BY 4.0.';
comment on column public.people.image_license_url is
  'https link to the license.';
comment on column public.people.image_source_url is
  'Commons file page, or the page the own photo came from.';
comment on column public.people.image_disabled is
  'Takedown. When true the site omits the photo from the profile, og:image, and JSON-LD.';
comment on column public.people.image_fetched_at is
  'When the YouTube thumbnail URL was last refreshed. Older than 30 days means do not show it.';
comment on column public.people.youtube_channel_id is
  'Official channel id (UC…). Not guessed from video tags.';
comment on column public.people.youtube_channel_url is
  'Official channel URL. Linked from the YouTube icon and Person.sameAs.';
comment on column public.people.youtube_image_url is
  'Hotlinked avatar URL from snippet.thumbnails. Not a stored image. Also the og:image for Lotek.';
comment on column public.people.fetch_youtube_avatar is
  'Refresh job may call channels.list for this row. False for Giza, Szczęśniak, and Gosiński.';
comment on column public.people.image_fallback_url is
  'Commons file used only after a YouTube refresh left no showable avatar.';
comment on column public.people.image_fallback_cropped is
  'True when the fallback file is a crop. The caption then says przycięte.';

-- kind: yt = face avatar may be fetched; link = channel only, no avatar.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      (1::bigint, 'Rafał Pacześ', 'UCIXAK3v6fgWHu0_jN8HmOUg', 'https://www.youtube.com/@RafalPaczes', 'yt'),
      (2::bigint, 'Łukasz Lotek Lodkowski', 'UCG3mQRagegeLjQ6E2OBTZpQ', 'https://www.youtube.com/@LukaszLotekLodkowski', 'yt'),
      (3::bigint, 'Abelard Giza', 'UCEe12n7pL9Pl-i6qxBmpyeg', 'https://www.youtube.com/@abelardgiza', 'link'),
      (4::bigint, 'Piotr Szumowski', 'UCsUB9dfE87u64SNnoFbg8Zw', 'https://www.youtube.com/@PiotrekSzumowski', 'yt'),
      (7::bigint, 'Mateusz Socha', 'UC1KCdhvSqa3OLWql8sou3OA', 'https://www.youtube.com/@MateuszBSocha', 'yt'),
      (9::bigint, 'Tomasz Boras', 'UCL-0QvrJX5AZ3dXe5jJlV6Q', 'https://www.youtube.com/@tomaszboras', 'yt'),
      (11::bigint, 'Sebastian Rejent', 'UCOVpkt7gBZGrcVrRXlOlVtQ', 'https://www.youtube.com/@sebastian.rejent', 'yt'),
      (13::bigint, 'Jacek Stramik', 'UC-LdFTRYOQKT-Mi7eyrxlaA', 'https://www.youtube.com/@jacekstramik', 'yt'),
      (15::bigint, 'Paweł Chałupka', 'UCpuNyigzfdVjvvZbOgx_2RQ', 'https://www.youtube.com/@PaweChaupka', 'yt'),
      (16::bigint, 'Antoni Syrek-Dąbrowski', 'UCedyiiOaSc5NEIf-DAvY9Sw', 'https://www.youtube.com/@AntoniSyrek-Dabrowski', 'yt'),
      (18::bigint, 'Adam Van Bendler', 'UCCS84tq6qv1Km2Jbj-L0p1w', 'https://www.youtube.com/@VanBendler', 'yt'),
      (19::bigint, 'Olka Szczęśniak', 'UCBIJOolC_Cypoka4i106Kvw', 'https://www.youtube.com/@olkaszczesniak', 'link'),
      (22::bigint, 'Piotr Zola Szulowski', 'UC-rZIa3NCQAzJ5YwU3IZ1mg', 'https://www.youtube.com/@PiotrZolaSzulowski', 'yt'),
      (23::bigint, 'Wiolka Walaszczyk', 'UCAW0vXKntCEAejoytc_RR9Q', 'https://www.youtube.com/@WiolkaWalaszczyk', 'yt'),
      (25::bigint, 'Michał Kutek', 'UCx78LgIGldMLt73H1DfEHlQ', 'https://www.youtube.com/@kutekmichal', 'yt'),
      (27::bigint, 'Rafał Rutkowski', 'UCaXj-OScH7hL-N3S2CfhaPQ', 'https://www.youtube.com/@rafalrutkowski', 'yt'),
      (31::bigint, 'Ewa Błachnio', 'UCs25Z4heq-0geKcxjIw8dHg', 'https://www.youtube.com/@ewkablachnio', 'yt'),
      (34::bigint, 'Kuba Śliwka', 'UCGxocJfdqNfo6djInYVN50Q', 'https://www.youtube.com/@Kuba%C5%9Aliwka', 'yt'),
      (42::bigint, 'Darek Gadowski', 'UC0kxyBBCEiYC6yrkprIjEjg', 'https://www.youtube.com/@DarekGadowski', 'yt'),
      (50::bigint, 'Kacper Ruciński', 'UCK_44aJIt-FD4eo-qJ9hWsA', 'https://www.youtube.com/@KacperRucinskiStandUp', 'yt'),
      (52::bigint, 'Paulina Potocka', 'UCmu-MBkpor06-a0Y1nifAdw', 'https://www.youtube.com/@PaulinaPotocka', 'yt'),
      (56::bigint, 'Magda Kubicka', 'UCcUGXpH--EuzPEEVGCb1YIQ', 'https://www.youtube.com/@magdakubicka.standup', 'yt'),
      (57::bigint, 'Grzegorz Dolniak', 'UCW2f4bapVhKFkpYxRpbviXA', 'https://www.youtube.com/@GrzegorzDolniakYT', 'yt'),
      (58::bigint, 'Michał Leja', 'UCjVMKdmfoUrbOUt-pMf-OPw', 'https://www.youtube.com/@michallejaofficial', 'yt'),
      (59::bigint, 'Rafał Sumowski', 'UCmY0t__D6L_c7aq7W__u06w', 'https://www.youtube.com/@Rafa%C5%82Sumowski', 'yt'),
      (60::bigint, 'Ewa Stasiewicz', 'UCF1l5B-HWo5ggC9pcSoAZdQ', 'https://www.youtube.com/@EwaStasiewicz', 'yt'),
      (62::bigint, 'Wojtek Fiedorczuk', 'UCaP8rHML0N0t-YOEfKYn7lg', 'https://www.youtube.com/@fiodorex', 'yt'),
      (63::bigint, 'Daniel Midas', 'UCFlcFC68BS4WE-u7zZMpe7g', 'https://www.youtube.com/@tendanielmidas', 'yt'),
      (69::bigint, 'Patryk Gosiński', 'UCzaSARYYwTfDCHWXHWww-_A', 'https://www.youtube.com/@patrykgosinski', 'link'),
      (74::bigint, 'Tomek Machnicki', 'UCCfv0DRfhqhXlw7r5bHR8xg', 'https://www.youtube.com/@TomekMachnicki', 'yt'),
      (84::bigint, 'Tomek Skrzypek', 'UC4NfWXJWOF6JXx5fNG524yg', 'https://www.youtube.com/@TomekSkrzypek', 'yt'),
      (96::bigint, 'Wojtek Pięta', 'UCPdW0f8H-AghPvLlCEVAICA', 'https://www.youtube.com/@pietawebshow', 'yt'),
      (104::bigint, 'Janusz Pietruszka', 'UCtCgJ0vtRLNPCE3nLKok3yQ', 'https://www.youtube.com/@januszpietruszkaYT', 'yt'),
      (112::bigint, 'Marcin Zbigniew Wojciech', 'UC_R0iqDV5Jq3PV6J6-W-p_Q', 'https://www.youtube.com/@MarcinZbigniewWojciech', 'yt'),
      (113::bigint, 'Igor Kwiatkowski', 'UCIf7jvBkNmPB8kPFkbYAG0A', 'https://www.youtube.com/@igorkwiatkowski_official', 'yt'),
      (115::bigint, 'Krzysztof Jahns', 'UCIoLx_11D7IxKaAKfvFnVFA', 'https://www.youtube.com/@KrzysztofJahns', 'yt'),
      (118::bigint, 'Damian Viking Usewicz', 'UC9MrWAIFgyucKNJa5eKxbOw', 'https://www.youtube.com/@DamianVikingUsewicz', 'yt'),
      (127::bigint, 'Paweł Reszela', 'UCa5JuausbX258NxX8Gx9fsg', 'https://www.youtube.com/@Pawe%C5%82Reszela', 'yt'),
      (152::bigint, 'Waldek Nowak', 'UCZYXzE44Mzbpo1LMurxpBWg', 'https://www.youtube.com/@waldeknowak3580', 'yt')
    ) as v(id, name, channel_id, channel_url, kind)
  loop
    update public.people
    set
      youtube_channel_id = rec.channel_id,
      youtube_channel_url = rec.channel_url,
      image_source = case when rec.kind = 'yt' then 'youtube' else null end,
      fetch_youtube_avatar = rec.kind = 'yt'
    where id = rec.id and name = rec.name;
    if not found then
      raise exception 'people id % (%) was not updated', rec.id, rec.name;
    end if;
  end loop;
end $$;

-- Giza: Commons portrait is the profile photo. Do not fetch the channel avatar.
update public.people
set
  image_source = 'commons',
  image_url = '/standuperzy/abelard-giza.jpg',
  image_credit = 'Krzysztof Popławski',
  image_license = 'CC BY 4.0',
  image_license_url = 'https://creativecommons.org/licenses/by/4.0/',
  image_source_url = 'https://commons.wikimedia.org/wiki/File:Abelard_Giza,_28_Targi_Książki_w_Krakowie,_2025,_KsP_0991.jpg',
  image_width = 1280,
  image_height = 1920,
  fetch_youtube_avatar = false
where id = 3 and name = 'Abelard Giza';

-- Lotek: Commons on the profile. The refresh still stores the avatar for og:image.
update public.people
set
  image_source = 'commons',
  image_url = '/standuperzy/lotek-lodkowski.jpg',
  image_credit = 'Serecki',
  image_license = 'CC BY 4.0',
  image_license_url = 'https://creativecommons.org/licenses/by/4.0/',
  image_source_url = 'https://commons.wikimedia.org/wiki/File:Łukasz_%22Lotek%22_Lodkowski_(2026).jpg',
  image_width = 485,
  image_height = 648,
  fetch_youtube_avatar = true
where id = 2 and name = 'Łukasz Lotek Lodkowski';

-- Ruciński: YouTube avatar by default. Commons is the backup.
update public.people
set
  image_fallback_url = '/standuperzy/kacper-rucinski.jpg',
  image_fallback_credit = 'Ralf Lotys (Sicherlich)',
  image_fallback_license = 'CC BY 4.0',
  image_fallback_license_url = 'https://creativecommons.org/licenses/by/4.0/',
  image_fallback_source_url = 'https://commons.wikimedia.org/wiki/File:2015_Woodstock_099_Kacper_Ruciński.jpg',
  image_fallback_width = 1280,
  image_fallback_height = 1920,
  image_fallback_cropped = false
where id = 50 and name = 'Kacper Ruciński';

-- Sumowski: YouTube avatar by default. Backup is a square crop ("przycięte"), still CC BY-SA 4.0.
update public.people
set
  image_fallback_url = '/standuperzy/rafal-sumowski.jpg',
  image_fallback_credit = 'Gintek',
  image_fallback_license = 'CC BY-SA 4.0',
  image_fallback_license_url = 'https://creativecommons.org/licenses/by-sa/4.0/',
  image_fallback_source_url = 'https://commons.wikimedia.org/wiki/File:Rafał_Sumowski_-_polish_stand-uper_2021.jpg',
  image_fallback_width = 1181,
  image_fallback_height = 1181,
  image_fallback_cropped = true
where id = 59 and name = 'Rafał Sumowski';

do $$
begin
  if (select count(*) from public.people where id = 3 and name = 'Abelard Giza' and image_source = 'commons' and fetch_youtube_avatar = false) <> 1 then
    raise exception 'Giza Commons photo was not saved';
  end if;
  if (select count(*) from public.people where id = 2 and name = 'Łukasz Lotek Lodkowski' and image_source = 'commons' and fetch_youtube_avatar = true) <> 1 then
    raise exception 'Lotek Commons photo was not saved';
  end if;
  if (select count(*) from public.people where id = 50 and image_source = 'youtube' and image_fallback_url is not null) <> 1 then
    raise exception 'Ruciński Commons backup was not saved';
  end if;
  if (select count(*) from public.people where id = 59 and image_source = 'youtube' and image_fallback_cropped = true) <> 1 then
    raise exception 'Sumowski cropped backup was not saved';
  end if;
  if (select count(*) from public.people where id in (19, 69) and youtube_channel_id is not null and image_source is null and fetch_youtube_avatar = false) <> 2 then
    raise exception 'link-only channels were not saved';
  end if;
  if (select count(*) from public.people where fetch_youtube_avatar = true) <> 36 then
    raise exception 'expected 36 YouTube avatars to refresh';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'people_image_source_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_image_source_check
      check (image_source is null or image_source in ('youtube', 'commons', 'own'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_image_url_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_image_url_check
      check (
        image_url is null
        or image_url ~ '^https://'
        or image_url ~ '^/standuperzy/[a-z0-9][a-z0-9.-]*\.(jpg|jpeg|png|webp)$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_image_source_requires_url_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_image_source_requires_url_check
      check (
        image_source is null
        or image_source = 'youtube'
        or image_url is not null
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_youtube_channel_id_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_youtube_channel_id_check
      check (
        youtube_channel_id is null
        or youtube_channel_id ~ '^UC[A-Za-z0-9_-]{22}$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_youtube_channel_url_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_youtube_channel_url_check
      check (
        youtube_channel_url is null
        or youtube_channel_url ~ '^https://www\.youtube\.com/(@[A-Za-z0-9._%-]+|channel/UC[A-Za-z0-9_-]{22})$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_youtube_image_url_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_youtube_image_url_check
      check (
        youtube_image_url is null
        or youtube_image_url ~ '^https://yt3\.ggpht\.com/'
        or youtube_image_url ~ '^https://yt3\.googleusercontent\.com/'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_image_size_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_image_size_check
      check (
        (image_width is null and image_height is null)
        or (image_width > 0 and image_height > 0 and image_width <= 20000 and image_height <= 20000)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_youtube_image_size_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_youtube_image_size_check
      check (
        (youtube_image_width is null and youtube_image_height is null)
        or (
          youtube_image_width > 0 and youtube_image_height > 0
          and youtube_image_width <= 20000 and youtube_image_height <= 20000
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_fallback_size_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_fallback_size_check
      check (
        (image_fallback_width is null and image_fallback_height is null)
        or (
          image_fallback_width > 0 and image_fallback_height > 0
          and image_fallback_width <= 20000 and image_fallback_height <= 20000
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_fallback_url_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_fallback_url_check
      check (
        image_fallback_url is null
        or image_fallback_url ~ '^https://'
        or image_fallback_url ~ '^/standuperzy/[a-z0-9][a-z0-9.-]*\.(jpg|jpeg|png|webp)$'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_license_url_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_license_url_check
      check (
        (image_license_url is null or image_license_url ~ '^https://')
        and (image_source_url is null or image_source_url ~ '^https://')
        and (image_fallback_license_url is null or image_fallback_license_url ~ '^https://')
        and (image_fallback_source_url is null or image_fallback_source_url ~ '^https://')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_fetch_youtube_avatar_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_fetch_youtube_avatar_check
      check (fetch_youtube_avatar = false or youtube_channel_id is not null);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'people_fallback_cropped_check'
      and conrelid = 'public.people'::regclass
  ) then
    alter table public.people
      add constraint people_fallback_cropped_check
      check (image_fallback_cropped = false or image_fallback_url is not null);
  end if;
end $$;
