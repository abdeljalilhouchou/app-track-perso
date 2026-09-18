-- Per-user appearance choice: light, dark, or follow the device.
alter table public.profiles
  add column if not exists theme text not null default 'system'
  check (theme in ('light', 'dark', 'system'));
