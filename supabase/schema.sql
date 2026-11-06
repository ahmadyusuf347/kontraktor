
> kontraktor-website@1.0.0 db:schema
> node scripts/schema-sql.js

-- Skema Kontraktor (dibuat otomatis oleh: npm run db:schema)
-- Aman dijalankan berulang kali.

create table if not exists public."slides" (
  "id" text primary key,
  "title" text,
  "text" text,
  "media" text,
  "media_type" text,
  "duration" double precision,
  "sort_order" double precision,
  "created_at" timestamptz not null default now()
);
alter table public."slides" enable row level security;

create table if not exists public."stats" (
  "id" text primary key,
  "value" double precision,
  "suffix" text,
  "label" text,
  "sort_order" double precision,
  "created_at" timestamptz not null default now()
);
alter table public."stats" enable row level security;

create table if not exists public."services" (
  "id" text primary key,
  "title" text,
  "icon" text,
  "description" text,
  "image" text,
  "sort_order" double precision,
  "created_at" timestamptz not null default now()
);
alter table public."services" enable row level security;

create table if not exists public."projects" (
  "id" text primary key,
  "title" text,
  "category" text,
  "location" text,
  "year" text,
  "description" text,
  "image" text,
  "published" boolean,
  "sort_order" double precision,
  "slug" text unique,
  "created_at" timestamptz not null default now()
);
alter table public."projects" enable row level security;

create table if not exists public."news" (
  "id" text primary key,
  "title" text,
  "date" date,
  "excerpt" text,
  "content" text,
  "image" text,
  "g1" text,
  "g2" text,
  "g3" text,
  "published" boolean,
  "slug" text unique,
  "created_at" timestamptz not null default now()
);
alter table public."news" enable row level security;

create table if not exists public."team" (
  "id" text primary key,
  "name" text,
  "role" text,
  "photo" text,
  "sort_order" double precision,
  "created_at" timestamptz not null default now()
);
alter table public."team" enable row level security;

create table if not exists public."timeline" (
  "id" text primary key,
  "year" text,
  "label" text,
  "sort_order" double precision,
  "created_at" timestamptz not null default now()
);
alter table public."timeline" enable row level security;

create table if not exists public."whyus" (
  "id" text primary key,
  "title" text,
  "text" text,
  "sort_order" double precision,
  "created_at" timestamptz not null default now()
);
alter table public."whyus" enable row level security;

create table if not exists public."messages" (
  "id" text primary key,
  "name" text,
  "email" text,
  "phone" text,
  "message" text,
  "date" timestamptz,
  "read" boolean,
  "created_at" timestamptz not null default now()
);
alter table public."messages" enable row level security;

-- Pengaturan website, halaman About, dan akun admin (jsonb)
create table if not exists public."site_settings" (
  "key" text primary key,
  "data" jsonb not null default '{}'::jsonb
);
alter table public."site_settings" enable row level security;

-- RLS aktif TANPA policy: kunci "anon" Supabase tidak bisa membaca/menulis tabel ini.
-- Aplikasi mengakses lewat koneksi server (DATABASE_URL) yang tidak terikat RLS.
