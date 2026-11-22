-- Running GPS: the route of a run tracked with the phone's GPS, its kilometre splits
-- and the time spent paused. Additive only: runs logged by hand keep these columns
-- empty. The app saves a run without its route until this is applied, so it can be
-- reviewed and applied manually at any time.
--
-- gps_route: [[latitude, longitude, moving_seconds], ...], at most 6000 points.
-- km_splits: seconds spent on each completed kilometre, at most 1000.

begin;

alter table public.running_sessions
  add column if not exists gps_route jsonb,
  add column if not exists km_splits jsonb,
  add column if not exists pause_seconds integer;

alter table public.running_sessions drop constraint if exists running_sessions_gps_route_check;
alter table public.running_sessions add constraint running_sessions_gps_route_check check (
  gps_route is null or (jsonb_typeof(gps_route) = 'array' and jsonb_array_length(gps_route) between 2 and 6000)
);

alter table public.running_sessions drop constraint if exists running_sessions_km_splits_check;
alter table public.running_sessions add constraint running_sessions_km_splits_check check (
  km_splits is null or (jsonb_typeof(km_splits) = 'array' and jsonb_array_length(km_splits) <= 1000)
);

alter table public.running_sessions drop constraint if exists running_sessions_pause_seconds_check;
alter table public.running_sessions add constraint running_sessions_pause_seconds_check check (
  pause_seconds is null or pause_seconds between 0 and 604800
);

commit;
