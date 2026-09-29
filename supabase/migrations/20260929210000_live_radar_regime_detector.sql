-- Cross-session momentum regime detector features.
-- Adds queryable fields so BIOC/TYCN-style transitions can be calibrated.

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'live_radar_regime_phase'
  ) then
    create type public.live_radar_regime_phase as enum (
      'NORMAL',
      'ABNORMAL',
      'ACCELERATING',
      'SELF_REINFORCING'
    );
  end if;
end $$;

alter table public.live_radar_signals
  add column if not exists regime_phase public.live_radar_regime_phase not null default 'NORMAL',
  add column if not exists regime_score numeric(8,3) not null default 0,
  add column if not exists regime_confidence text not null default 'BOOTSTRAP',
  add column if not exists regime_prior_sessions integer not null default 0,
  add column if not exists regime_return_3d_pct numeric(12,6),
  add column if not exists regime_return_5d_pct numeric(12,6),
  add column if not exists regime_return_10d_pct numeric(12,6),
  add column if not exists regime_price_multiple_10d numeric(12,6),
  add column if not exists regime_explosive_days_5 integer not null default 0,
  add column if not exists regime_limit_up_like_days_5 integer not null default 0,
  add column if not exists regime_consecutive_strong_days integer not null default 0,
  add column if not exists regime_fresh_10d_high boolean not null default false;

alter table public.live_radar_latest
  add column if not exists regime_phase public.live_radar_regime_phase not null default 'NORMAL',
  add column if not exists regime_score numeric(8,3) not null default 0,
  add column if not exists regime_confidence text not null default 'BOOTSTRAP',
  add column if not exists regime_prior_sessions integer not null default 0,
  add column if not exists regime_return_3d_pct numeric(12,6),
  add column if not exists regime_return_5d_pct numeric(12,6),
  add column if not exists regime_return_10d_pct numeric(12,6),
  add column if not exists regime_price_multiple_10d numeric(12,6),
  add column if not exists regime_explosive_days_5 integer not null default 0,
  add column if not exists regime_limit_up_like_days_5 integer not null default 0,
  add column if not exists regime_consecutive_strong_days integer not null default 0,
  add column if not exists regime_fresh_10d_high boolean not null default false;

alter table public.live_radar_alert_events
  add column if not exists regime_phase public.live_radar_regime_phase not null default 'NORMAL',
  add column if not exists regime_score numeric(8,3) not null default 0,
  add column if not exists regime_confidence text not null default 'BOOTSTRAP',
  add column if not exists regime_prior_sessions integer not null default 0,
  add column if not exists regime_return_3d_pct numeric(12,6),
  add column if not exists regime_return_5d_pct numeric(12,6),
  add column if not exists regime_return_10d_pct numeric(12,6),
  add column if not exists regime_price_multiple_10d numeric(12,6),
  add column if not exists regime_explosive_days_5 integer not null default 0,
  add column if not exists regime_limit_up_like_days_5 integer not null default 0,
  add column if not exists regime_consecutive_strong_days integer not null default 0,
  add column if not exists regime_fresh_10d_high boolean not null default false;

create index if not exists live_radar_signals_regime_idx
  on public.live_radar_signals (regime_phase, regime_score desc, observed_at desc);

create index if not exists live_radar_latest_regime_idx
  on public.live_radar_latest (regime_phase, regime_score desc, updated_at desc);

create index if not exists live_radar_alert_events_regime_idx
  on public.live_radar_alert_events (regime_phase, regime_score desc, observed_at desc);
