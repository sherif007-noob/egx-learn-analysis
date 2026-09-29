-- Aggregate calibration view for the cross-session momentum regime detector.

create or replace view public.live_radar_regime_calibration_summary
with (security_invoker = true)
as
select
  e.regime_phase::text as regime_phase,
  e.regime_confidence,
  case
    when e.regime_score >= 90 then '90+'
    when e.regime_score >= 80 then '80-89'
    when e.regime_score >= 70 then '70-79'
    when e.regime_score >= 60 then '60-69'
    else '<60'
  end as regime_score_bucket,
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
where e.regime_phase <> 'NORMAL'
group by
  e.regime_phase,
  e.regime_confidence,
  case
    when e.regime_score >= 90 then '90+'
    when e.regime_score >= 80 then '80-89'
    when e.regime_score >= 70 then '70-79'
    when e.regime_score >= 60 then '60-69'
    else '<60'
  end,
  o.horizon_minutes;
