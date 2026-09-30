-- Live radar adaptive-calibration tables.
-- Applied to Supabase project jhubsrbfiqjxdgngnwaq on 2026-09-29.

create table if not exists public.live_radar_alert_events (
  event_id uuid primary key,
  observed_at timestamptz not null,
  session_date date not null,
  ticker text not null,
  name text,
  sector text,
  stage text not null check (stage in ('WATCH','TRIGGERING','BREAKOUT')),
  score numeric(8,3) not null,
  entry_price numeric(18,6) not null,
  change_pct numeric(12,6),
  volume_pace numeric(12,6),
  rvol10 numeric(12,6),
  close_location numeric(12,8),
  hod_distance_pct numeric(12,6),
  new_hod boolean not null default false,
  velocity_1m_pct numeric(12,6),
  velocity_3m_pct numeric(12,6),
  relative_strength_pct numeric(12,6),
  positive_intervals_5 integer,
  higher_low boolean,
  compression_pct numeric(12,6),
  market_breadth_ratio numeric(12,8),
  market_median_change_pct numeric(12,6),
  market_regime text,
  time_bucket text not null,
  reasons jsonb not null default '[]'::jsonb,
  notification_selected boolean not null default true,
  source text not null default 'tradingview',
  created_at timestamptz not null default now()
);

create index if not exists live_radar_alert_events_session_time_idx
  on public.live_radar_alert_events (session_date, observed_at desc);
create index if not exists live_radar_alert_events_ticker_time_idx
  on public.live_radar_alert_events (ticker, observed_at desc);
create index if not exists live_radar_alert_events_stage_score_idx
  on public.live_radar_alert_events (stage, score desc, observed_at desc);

create table if not exists public.live_radar_alert_outcomes (
  event_id uuid not null references public.live_radar_alert_events(event_id) on delete cascade,
  horizon_minutes smallint not null check (horizon_minutes in (5,10,20,30)),
  evaluated_at timestamptz not null,
  price numeric(18,6) not null,
  forward_return_pct numeric(12,6) not null,
  max_price numeric(18,6) not null,
  min_price numeric(18,6) not null,
  mfe_pct numeric(12,6) not null,
  mae_pct numeric(12,6) not null,
  hit_0_5_pct boolean not null default false,
  hit_1_pct boolean not null default false,
  hit_2_pct boolean not null default false,
  drawdown_0_5_pct boolean not null default false,
  drawdown_1_pct boolean not null default false,
  source text not null default 'tradingview',
  created_at timestamptz not null default now(),
  primary key (event_id, horizon_minutes)
);

create index if not exists live_radar_alert_outcomes_horizon_idx
  on public.live_radar_alert_outcomes (horizon_minutes, evaluated_at desc);

alter table public.live_radar_alert_events enable row level security;
alter table public.live_radar_alert_outcomes enable row level security;

drop view if exists public.live_radar_calibration_summary;

create view public.live_radar_calibration_summary
with (security_invoker = true)
as
select
  e.stage,
  e.time_bucket,
  coalesce(e.market_regime, 'UNKNOWN') as market_regime,
  case
    when e.score >= 90 then '90+'
    when e.score >= 85 then '85-89'
    when e.score >= 80 then '80-84'
    when e.score >= 75 then '75-79'
    else '70-74'
  end as score_bucket,
  o.horizon_minutes,
  count(*)::bigint as samples,
  round(avg(o.forward_return_pct)::numeric, 4) as avg_forward_return_pct,
  round(percentile_cont(0.5) within group (order by o.forward_return_pct)::numeric, 4) as median_forward_return_pct,
  round(avg(o.mfe_pct)::numeric, 4) as avg_mfe_pct,
  round(avg(o.mae_pct)::numeric, 4) as avg_mae_pct,
  round((avg((o.forward_return_pct > 0)::int) * 100)::numeric, 2) as positive_rate_pct,
  round((avg(o.hit_0_5_pct::int) * 100)::numeric, 2) as hit_0_5_rate_pct,
  round((avg(o.hit_1_pct::int) * 100)::numeric, 2) as hit_1_rate_pct,
  round((avg(o.hit_2_pct::int) * 100)::numeric, 2) as hit_2_rate_pct,
  round((avg(o.drawdown_0_5_pct::int) * 100)::numeric, 2) as drawdown_0_5_rate_pct,
  round((avg(o.drawdown_1_pct::int) * 100)::numeric, 2) as drawdown_1_rate_pct
from public.live_radar_alert_events e
join public.live_radar_alert_outcomes o using (event_id)
group by
  e.stage,
  e.time_bucket,
  coalesce(e.market_regime, 'UNKNOWN'),
  case
    when e.score >= 90 then '90+'
    when e.score >= 85 then '85-89'
    when e.score >= 80 then '80-84'
    when e.score >= 75 then '75-79'
    else '70-74'
  end,
  o.horizon_minutes;
