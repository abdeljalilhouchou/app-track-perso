-- Per-user sugar limit and weekly sport goal, plus a public storage bucket for profile photos.
alter table public.profiles add column if not exists sugar_limit_g int not null default 50;
alter table public.profiles add column if not exists sport_weekly_goal int not null default 3;

-- Profile photos: one file per user under avatars/<user_id>/. Anyone can read (public URL),
-- but a user can only write inside their own folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
