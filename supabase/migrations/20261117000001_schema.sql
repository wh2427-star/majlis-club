-- Majlis Club v1 schema. Row-level security is enabled on every table in the next migration.
-- Days of week: 0 = Monday ... 6 = Sunday.

create type public.area_status as enum ('live', 'coming_soon');
create type public.club_type as enum ('academy', 'community');
create type public.club_status as enum ('pending', 'approved', 'rejected');
create type public.member_role as enum ('owner', 'admin');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.photo_status as enum ('visible', 'under_review', 'removed');
create type public.report_reason as enum ('child_named_in_caption', 'no_consent', 'inappropriate', 'other');
create type public.report_status as enum ('open', 'upheld', 'dismissed');
create type public.user_role as enum ('parent', 'club', 'admin');
create type public.enquiry_status as enum ('sent', 'seen', 'replied', 'closed');
create type public.club_event_kind as enum ('view', 'enquiry');
create type public.promotion_kind as enum ('featured', 'trial_offer');

-- Geography ---------------------------------------------------------------

create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort smallint not null default 0,
  status public.area_status not null default 'coming_soon',
  -- clubs we know exist in this cluster (counted by hand), for the coverage metric
  identified_clubs integer not null default 0 check (identified_clubs >= 0)
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.clusters(id),
  slug text not null unique,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  status public.area_status not null default 'coming_soon',
  sort smallint not null default 0
);

-- Categories and sports (a table, so hobby/holiday clubs are new rows, not a migration)

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  slug text not null unique,
  name text not null,
  sort smallint not null default 0
);

-- Users -------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'parent',
  created_at timestamptz not null default now()
);

create table public.parents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  phone text check (phone is null or char_length(phone) <= 30),
  area_id uuid references public.areas(id),
  updated_at timestamptz not null default now()
);

-- Minimum data about children: a nickname and a birth year. Nothing else.
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  birth_year smallint not null check (birth_year between 2000 and 2100),
  created_at timestamptz not null default now()
);

-- Clubs -------------------------------------------------------------------

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 80),
  -- data only: never affects ranking, features or terms
  club_type public.club_type not null,
  area_id uuid not null references public.areas(id),
  lat double precision not null,
  lng double precision not null,
  description text not null default '' check (char_length(description) <= 1500),
  typical_reply_days smallint not null default 3 check (typical_reply_days between 1 and 14),
  status public.club_status not null default 'pending',
  reject_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clubs_area_idx on public.clubs(area_id);

create table public.club_sports (
  club_id uuid not null references public.clubs(id) on delete cascade,
  sport_id uuid not null references public.sports(id),
  primary key (club_id, sport_id)
);

create table public.club_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sport_id uuid not null references public.sports(id),
  day smallint not null check (day between 0 and 6),
  start_time time not null,
  end_time time not null,
  age_min smallint not null check (age_min between 2 and 18),
  age_max smallint not null check (age_max between 2 and 18),
  price_aed numeric(8, 2) not null check (price_aed >= 0),
  check (end_time > start_time),
  check (age_max >= age_min)
);
create index club_sessions_club_idx on public.club_sessions(club_id);

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index club_members_user_idx on public.club_members(user_id);

-- A request to manage an existing listing; an admin approves it.
create table public.club_claims (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text check (char_length(note) <= 500),
  status public.review_status not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table public.licences (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  number text not null check (char_length(number) between 1 and 60),
  -- free text on purpose: which authority applies to which club type is [CONFIRM]
  issuing_authority text not null check (char_length(issuing_authority) between 1 and 120),
  expires_on date not null,
  document_path text,
  status public.review_status not null default 'pending',
  reject_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index licences_club_idx on public.licences(club_id);

create table public.club_photos (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null check (char_length(btrim(alt_text)) between 3 and 200),
  caption text check (caption is null or char_length(caption) <= 140),
  -- the uploader confirmed the club holds parental consent for this photo
  consent_confirmed_at timestamptz not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  status public.photo_status not null default 'visible',
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);
create index club_photos_club_idx on public.club_photos(club_id);

create table public.photo_reports (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.club_photos(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason public.report_reason not null,
  note text check (note is null or char_length(note) <= 500),
  status public.report_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Families ----------------------------------------------------------------

create table public.saved_clubs (
  parent_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, club_id)
);

-- Enquiries keep a snapshot of what the club received, so the club never reads parent tables.
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  contact_name text not null check (char_length(contact_name) between 1 and 80),
  contact_email text not null check (char_length(contact_email) between 3 and 254),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 30),
  child_nickname text check (child_nickname is null or char_length(child_nickname) <= 30),
  child_birth_year smallint,
  sport_id uuid references public.sports(id),
  message text not null default '' check (char_length(message) <= 1000),
  -- explicit consent that the club will see these contact details
  contact_consent_at timestamptz not null,
  status public.enquiry_status not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_club_idx on public.enquiries(club_id, created_at);
create index enquiries_parent_idx on public.enquiries(parent_id);

-- Demand -------------------------------------------------------------------

-- No parent identity is stored on events.
create table public.club_events (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  kind public.club_event_kind not null,
  created_at timestamptz not null default now()
);
create index club_events_club_idx on public.club_events(club_id, kind, created_at);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id),
  email text not null check (char_length(email) between 3 and 254),
  created_at timestamptz not null default now(),
  unique (area_id, email)
);

-- Suggestions from parents for clubs we have not listed yet.
create table public.club_suggestions (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id),
  club_name text not null check (char_length(club_name) between 2 and 80),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

-- Paid layer stub: Featured slot and offers. Never read by the organic ranking.
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  kind public.promotion_kind not null,
  area_id uuid references public.areas(id),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index promotions_club_idx on public.promotions(club_id);
