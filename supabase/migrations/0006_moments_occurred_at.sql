-- Precise date+time for moments (was date-only), used to compute duration
-- automatically from a start/end pair instead of a manually typed number.

alter table public.moments add column if not exists occurred_at timestamptz not null default now();
