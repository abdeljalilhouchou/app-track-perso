-- Per-user app language: French, English or Arabic (Arabic renders right-to-left).
alter table public.profiles
  add column if not exists language text not null default 'fr'
  check (language in ('fr', 'en', 'ar'));
