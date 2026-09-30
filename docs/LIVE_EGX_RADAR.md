# EGX Live Radar — Cloudflare Worker

> Production deployment branch: `feature/cloudflare-live-radar`.

## Goal

Run a live intraday market radar during the EGX session, scan the full TradingView Egypt universe repeatedly, shortlist unusual momentum, and send Telegram alerts before a stock becomes an obvious top gainer.

The alert is a **watch signal**, not an automatic buy command. Final execution still uses live price depth and trades.

## Architecture

```text
TradingView Egypt scanner (~296 symbols)
        |
        v
Cloudflare Durable Object: RadarCoordinator
        |
        +-- 20-second polling alarm during 10:00–14:30 Cairo
        |
        +-- persistent previous snapshot
        |
        +-- interval price/volume/turnover deltas
        |
        +-- momentum score
        |
        +-- WATCH / TRIGGERING / BREAKOUT
        |
        +-- cooldown + deduplication
        |
        v
Telegram alert
        |
        v
Manual Depth + Trades confirmation
```

A normal Cloudflare Cron Trigger wakes the coordinator once per minute. Once the market is open, the Durable Object keeps itself alive with an alarm every `POLL_SECONDS` (default: 20 seconds). The local Cairo-session gate prevents off-session scanning, so the wide UTC cron window remains safe across Cairo DST changes.

## What the radar measures

For each eligible stock, every interval it calculates:

- interval price change,
- interval added volume,
- interval traded value,
- volume pace versus the stock's normal 10-day average minute,
- distance from High of Day,
- new High-of-Day detection,
- current close location inside the day's range,
- TradingView 10-day relative volume,
- total daily turnover and liquidity.

### Liquidity gates

Defaults:

- minimum daily turnover: EGP 8m,
- minimum daily volume: 100k shares,
- minimum normalized one-minute turnover: EGP 120k.

For a 20-second poll, the turnover gate is automatically scaled to one third of the one-minute threshold.

## Signal stages

### WATCH

A stock is liquid, trading in the stronger part of its daily range, and has enough live price/volume activity to enter the shortlist.

### TRIGGERING

A stronger live setup near High of Day with accelerating volume and positive short-interval price velocity.

### BREAKOUT

The stock makes a fresh High of Day while volume pace is materially above normal.

These are deliberately separate from an execution decision.

## Scoring

The live score is 0–100 and currently weights:

- executable daily liquidity,
- short-interval price velocity,
- short-interval volume pace,
- close location in the daily range,
- proximity to High of Day,
- positive daily momentum,
- RVOL10,
- fresh High-of-Day bonus.

Negative short-interval price velocity is penalized.

## Telegram alert example

```text
🚨 ADRI — BREAKOUT  score 88.4
Price 13.140 · Day +5.12%
20s Δ +0.31% · Vol 84,000 · EGP 1.10m
Pace 3.7x · HOD gap 0.00%
volume pace 3.7x · velocity +0.93%/min · new HOD
راقبه على الـDepth والـTrades — دي إشارة متابعة مش أمر شراء.
```

The alert engine suppresses repeated messages. A stock alerts again when:

- it upgrades stage, or
- the cooldown expires and its score improves by at least 4 points.

## HTTP endpoints

### `GET /health`

Public health/state summary.

### `GET /api/latest`

Latest signals and internal snapshot state.

If `ADMIN_TOKEN` is configured, send:

```http
Authorization: Bearer <ADMIN_TOKEN>
```

### `POST /api/scan?force=1`

Manual scan. `force=1` allows testing outside market hours.

First execution primes the previous snapshot; the next execution produces interval deltas.

### `POST /api/reset`

Deletes Durable Object state and alarms.

## Cloudflare deployment

### 1. Install

```bash
npm install
```

### 2. Authenticate Wrangler

```bash
npx wrangler login
```

### 3. Add Telegram secrets

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put ADMIN_TOKEN
```

`ADMIN_TOKEN` is strongly recommended because the manual scan/reset endpoints can otherwise be called publicly.

### 4. Deploy

```bash
npm run radar:deploy
```

The Durable Object namespace is created by the Wrangler migration; no KV namespace is required.

### 5. Verify

```bash
curl https://<worker>.workers.dev/health
```

Then prime and test outside market hours:

```bash
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://<worker>.workers.dev/api/scan?force=1"

sleep 20

curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://<worker>.workers.dev/api/scan?force=1"
```

Inspect:

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://<worker>.workers.dev/api/latest"
```

### 6. Logs

```bash
npm run radar:tail
```

Observability is enabled in `wrangler.jsonc`.

## Cloudflare scheduling behavior

Cloudflare Cron Triggers run in UTC. The configured cron is intentionally broad:

```cron
* 6-13 * * SUN-THU
```

The Worker itself checks `Africa/Cairo` and only scans during `10:00–14:30`. This avoids hard-coding the current UTC offset.

During the live session, the Durable Object alarm polls every 20 seconds by default. `POLL_SECONDS` is clamped between 10 and 60 seconds.

## Environment tuning

Set in `wrangler.jsonc`:

| Variable | Default | Meaning |
|---|---:|---|
| `POLL_SECONDS` | 20 | Scanner interval during session |
| `MIN_SCORE` | 70 | WATCH floor |
| `TRIGGER_SCORE` | 83 | TRIGGERING/BREAKOUT floor |
| `ALERT_COOLDOWN_MINUTES` | 8 | Same-stock alert cooldown |
| `MAX_CANDIDATES` | 15 | Number of live signals kept |
| `MIN_DAILY_TURNOVER_EGP` | 8,000,000 | Liquidity gate |
| `MIN_MINUTE_TURNOVER_EGP` | 120,000 | Normalized flow gate |
| `MIN_VOLUME_SHARES` | 100,000 | Daily volume gate |


## RapidAPI EGX shadow feed — validation infrastructure

The production radar still uses the TradingView Egypt scanner while the new feed is validated. RapidAPI is intentionally wired in **shadow mode** first so a bad or delayed third-party feed cannot silently replace the production input.

The current EGX Live RapidAPI listing documents:

- real-time quote: `/api/price/{symbol}`
- 5-level depth: `/api/depth_5/{symbol}`
- 40-level depth: `/api/depth_40/{symbol}`
- market breadth: `/api/summary`
- movers: `/api/movers`
- symbol directory: `/api/symbols`
- provider health: `/health`

The public listing does **not** currently document a time-and-sales / individual trades endpoint, so this phase can validate real-time price, cumulative volume, best bid/ask, Level II depth, breadth, and movers, but it does not yet complete the Trades side of the intended order-flow layer.

### Cloudflare runtime settings

Normal vars:

```text
RAPIDAPI_ENABLED=true
RAPIDAPI_HOST=<copy the exact X-RapidAPI-Host value from the RapidAPI code sample>
RAPIDAPI_TIMEOUT_MS=5000
```

Secret:

```text
RAPIDAPI_KEY=<your X-RapidAPI-Key>
```

Do not commit the API key. `RAPIDAPI_BASE_URL` is also supported as an optional override. If it is omitted, the Worker calls `https://<RAPIDAPI_HOST>`.

### Protected validation endpoints

All endpoints below are behind the existing `ADMIN_TOKEN` protection.

```http
GET /api/feed/status
GET /api/feed/probe
GET /api/feed/quote?symbol=BIOC
GET /api/feed/depth?symbol=BIOC&levels=5
GET /api/feed/depth?symbol=BIOC&levels=40
GET /api/feed/summary
GET /api/feed/movers?limit=10
GET /api/feed/symbols
GET /api/feed/sample?symbol=BIOC&levels=5
GET /api/feed/compare?symbol=BIOC
```

`/api/feed/sample` returns quote + depth + breadth together and derives the current spread. It is intended for side-by-side checking against a trusted live screen during the session.

`/api/feed/compare` compares RapidAPI's current quote against the existing TradingView scanner snapshot and reports the RapidAPI data age from the provider timestamp. This is useful for proving the current 15-minute TradingView-delay problem quantitatively.

### Provider docs/runtime mismatch observed

On 2026-09-30 the RapidAPI product page advertised API v2 and documented `GET /api/stock/{symbol}` as a unified quote + 5-depth + 40-depth endpoint, but the subscribed RapidAPI gateway returned HTTP 404 for `/api/stock/AFMC` with "Endpoint ... does not exist".

The validation path therefore does not depend on the composite endpoint. `/feedtest` uses the independently documented `/api/price/{symbol}` and `/api/depth_5/{symbol}` routes, serialized with a short spacing to avoid the free-tier burst 429 previously observed. Market breadth is omitted from the feed test to conserve quota.

This is intentionally treated as a provider docs/runtime mismatch until live-session behavior proves otherwise.

### Validation rule before promotion

Do not switch the automatic radar to RapidAPI merely because requests return 200.

During a live EGX session verify:

1. provider `updated_at` is within seconds of wall-clock time,
2. last price matches the trusted live screen,
3. best bid / ask and top depth levels match,
4. session cumulative volume is consistent,
5. updates continue under fast price movement,
6. rate-limit headroom is enough for the intended polling architecture.

Only after that should the source adapter be promoted from shadow validation into the live radar path.

### Command architecture

RapidAPI is a **data source**, not a scanning strategy, so it is not being dumped into `/scan`. The existing convention remains:

- `/live` — intraday momentum strategy
- `/regime` — cross-session regime strategy
- `/scan` — combined overview only

Any genuinely new scanning strategy gets its own command and detection lane. Feed diagnostics stay separate from strategy commands.


## Current limitation: Depth / Trades

Version 1 uses TradingView scanner data for market-wide discovery. It does **not** scrape Thndr's private UI or assume that displayed order-book walls are real support/resistance.

The intended workflow is:

1. radar detects unusual price/volume behavior,
2. Telegram identifies the name and reason,
3. open the stock's live Depth + Trades,
4. confirm whether offers are actually being consumed, bids are replenishing, price is accepting above the trigger, or the move is failing.

A later phase can add an order-flow provider if we have a documented/reliable feed.

## Next implementation phases

### Phase 2 — deep shortlist watcher

Take the top 10–15 live names and maintain a richer intraday state:

- VWAP,
- 1m/3m/5m velocity,
- higher-low / compression structure,
- opening-range breakout,
- pullback-and-reclaim,
- relative strength versus EGX70/EGX100,
- time-of-day normalized volume.

### Phase 3 — adaptive calibration

Persist radar outcomes and measure:

- maximum favorable excursion after each alert,
- maximum adverse excursion,
- hit rate by stage,
- score bucket performance,
- false breakout rate,
- best thresholds by time of day.

The score should then be calibrated from actual EGX behavior rather than intuition alone.

### Phase 5 — order flow

If a reliable depth/trades feed becomes available:

- ask depletion,
- bid replenishment,
- queue imbalance change,
- cancelled-wall detection,
- sweep detection,
- executed volume versus visible liquidity,
- absorption/rejection confirmation.

That layer should confirm or reject radar signals; it should not replace the market-wide scanner.


## Phase 2 — implemented: rolling deep watcher

The Cloudflare Durable Object now keeps a short rolling history for every resolvable EGX symbol and enriches each live signal with:

- **1-minute velocity**
- **3-minute velocity**
- **relative strength versus the median EGX stock**
- **market breadth** (advancers / decliners)
- automatic **RISK_ON / MIXED / RISK_OFF** regime
- number of positive recent intervals
- micro **higher-low** detection
- 2-minute price compression
- stronger scoring for stocks holding up while the broad tape is weak

This is intentionally derived from repeated market snapshots, so it remains Cloudflare-compatible and does not require a permanent Node/WebSocket process.

## Supabase persistence — implemented

The live radar now writes research data into the existing EGX Portfolio Supabase project.

Tables:

- `live_radar_runs` — one row per scan, including breadth/regime
- `live_radar_signals` — historical WATCH/TRIGGERING/BREAKOUT observations
- `live_radar_latest` — upserted latest state per signaled ticker

RLS is enabled; the Worker writes with a server-side service-role secret.

The migration is committed at:

`supabase/migrations/20260929094500_live_radar.sql`

and has already been applied to the project.

### Required Cloudflare secret

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_URL` is already configured as a normal Worker variable because the project URL is not a credential.

This database history is the basis for the next calibration phase: measuring which alerts actually produced useful forward movement instead of guessing score weights forever.


## Phase 3 — implemented: outcome calibration

Every Telegram-selected alert is now assigned a unique event ID and, when enough market time remains, is tracked at:

- **5 minutes**
- **10 minutes**
- **20 minutes**
- **30 minutes**

The tracker updates approximately every live radar poll and records:

- forward return from the alert price,
- maximum favorable excursion (**MFE**),
- maximum adverse excursion (**MAE**),
- whether the move reached +0.5%, +1%, or +2%,
- whether it suffered -0.5% or -1% drawdown first/within the measured window.

Alerts too close to the 14:30 close only receive horizons that can actually finish during the same EGX session. This prevents overnight price moves from contaminating the intraday calibration.

### New Supabase tables

- `live_radar_alert_events` — the exact feature snapshot at alert time
- `live_radar_alert_outcomes` — 5/10/20/30-minute forward outcomes

New aggregate view:

- `live_radar_calibration_summary`

The view groups outcomes by:

- signal stage,
- time-of-day bucket,
- market regime,
- score bucket,
- forward horizon.

It calculates sample count, average/median forward return, MFE/MAE, positive rate, +0.5/+1/+2 hit rates, and -0.5/-1 drawdown rates.

The schema is committed at:

`supabase/migrations/20260929100500_live_radar_calibration.sql`

and has already been applied to the configured Supabase project.

### Calibration API

```http
GET /api/calibration
Authorization: Bearer <ADMIN_TOKEN>
```

The endpoint returns the aggregated calibration rows from Supabase.

Do **not** auto-tune thresholds from a handful of observations. The intended workflow is:

1. collect several full EGX sessions,
2. require a meaningful sample size per score/stage/time bucket,
3. compare MFE against MAE and false-breakout rate,
4. then adjust `MIN_SCORE`, `TRIGGER_SCORE`, cooldown, and time-of-day rules.

Until enough samples exist, the live score remains a discovery heuristic rather than a statistically calibrated probability.


## Phase 4 — implemented: cross-session momentum regime detector

The radar now has a second, slower layer whose job is different from the 20-second execution scanner:

> detect when a stock stops behaving like a normal EGX name and enters a self-reinforcing momentum regime.

It does **not** predict a final target such as BIOC 609 or TYCN 41.40. It detects the transition early enough to put the name on the screen before the late-stage move becomes obvious.

### Regime phases

Each stock is classified independently as:

- **NORMAL** — no meaningful multi-session anomaly.
- **ABNORMAL** — first ignition / unusual volume-price behavior.
- **ACCELERATING** — abnormal behavior is compounding across sessions.
- **SELF_REINFORCING** — repeated strong closes, explosive sessions, or multi-session compounding indicate a feedback-loop regime.

The execution signal remains separate (`WATCH / TRIGGERING / BREAKOUT`). A stock can therefore be in a high momentum regime while the current 20-second tape is not an attractive entry.

### Cross-session memory

The Durable Object keeps up to 12 session snapshots per ticker across trading days. The memory is not cleared at the daily session rollover.

For each ticker the detector measures:

- 3-session return,
- 5-session return,
- 10-session return,
- price multiple versus the rolling 10-session low,
- number of >=15% explosive days in the latest 5 sessions,
- number of >=18.5% limit-up-like days in the latest 5 sessions,
- number of >=8% strong days in the latest 10 sessions,
- consecutive strong / limit-up-like closes,
- fresh 10-session high,
- TradingView RVOL10,
- current relative strength versus the market,
- current close location in the daily range.

A one-day ignition followed by a healthy consolidation is deliberately held in `ABNORMAL` rather than immediately forgotten. This is designed for the common pattern: ignition -> pause/pullback -> second acceleration.

### Historical regression fixtures

The detector is regression-tested against actual TradingView daily history previously pulled for BIOC and TYCN.

**BIOC**

- remained `NORMAL` through 2026-07-14,
- switched to `ACCELERATING` on **2026-07-15 at 88.09**,
- switched to `SELF_REINFORCING` on **2026-07-16 at 105.70**,
- later reached an intraday high of 609 on 2026-08-11.

The detector therefore identified the abnormal regime near the first true ignition, not after the several-hundred-percent move had already happened.

**TYCN**

- switched to `ABNORMAL` on **2026-06-07 at 15.70**,
- stayed on the radar through the 2026-06-08 consolidation,
- switched to `ACCELERATING` on **2026-06-09 at 18.62**,
- switched to `SELF_REINFORCING` on **2026-06-14 at 23.96**,
- later reached 41.40 on 2026-06-17.

Regression command:

```bash
npm run radar:regime-check
```

CI runs this alongside TypeScript checking and the Cloudflare dry build.

### Alert behavior

All normal live signals are decorated with regime context. If the fast scanner is quiet but the cross-session detector sees an abnormal regime, a dedicated discovery lane can still emit a `WATCH`.

Telegram displays:

- regime phase,
- regime score,
- history confidence (`BOOTSTRAP / PARTIAL / MATURE`),
- 5-session return when available,
- explosive-day count,
- consecutive strong closes,
- 10-session price multiple when material.

A regime upgrade bypasses the normal score-improvement cooldown so an `ABNORMAL -> ACCELERATING -> SELF_REINFORCING` transition can generate a fresh alert.

### Persistence and calibration

Queryable regime fields were added to:

- `live_radar_signals`
- `live_radar_latest`
- `live_radar_alert_events`

The aggregate view:

- `live_radar_regime_calibration_summary`

groups forward outcomes by regime phase, regime-score bucket, confidence level, and 5/10/20/30-minute horizon.

Migrations:

- `supabase/migrations/20260929210000_live_radar_regime_detector.sql`
- `supabase/migrations/20260929211500_live_radar_regime_calibration_view.sql`

Both migrations have been applied to the configured EGX Portfolio Supabase project.

### Important interpretation

`SELF_REINFORCING` means **the behavior is statistically/structurally abnormal**, not "buy now" and not "this will become the next BIOC".

The intended workflow is:

1. regime detector discovers the abnormal multi-session transition,
2. live scanner watches current price/volume acceleration,
3. Telegram surfaces the name early,
4. live Depth + Trades confirms or rejects the execution setup,
5. outcome calibration tells us later which regime patterns actually had edge.


## Telegram command architecture

Manual Telegram scans are split by strategy instead of putting every detector behind one command.

- `/live` — intraday momentum scan. Shows the fast 20-second lane plus session-leader discovery. It excludes candidates that exist only because of the cross-session regime detector.
- `/regime` — cross-session momentum-regime scan. Shows only tickers currently classified as `ABNORMAL`, `ACCELERATING`, or `SELF_REINFORCING`.
- `/scan` — combined overview across all scan lanes. This remains a convenience command, not the home of a specific strategy.
- `/status` — current radar state.
- `/help` — command directory.

Signals now carry a `detectionLane` value:

- `LIVE` — fast interval momentum.
- `SESSION` — broader strong-session discovery.
- `REGIME` — cross-session regime-only discovery.

This is the command convention for future expansion: every new scan strategy gets its own explicit Telegram command and lane identifier; `/scan` only aggregates them.

Manual scans call the coordinator with `notify=0`, so checking `/live`, `/regime`, or `/scan` does not consume automatic alert cooldowns or create duplicate alert events.


## Beginner workflow commands

These commands are deliberately separate from scan strategies.

- `/inspect TICKER` — inspect one EGX ticker in plain language. Shows current price, day move, HOD gap, volume/turnover, RVOL, relative strength, active radar signal, short momentum, and regime context when available.
- `/why TICKER` — explain why a ticker is currently a radar signal, or which broad conditions are missing if it is not.
- `/leaders` — current liquid leaders from the session-discovery ranking.
- `/session` — explain breadth, median stock move, risk regime, and current signal count.
- `/watch TICKER` — persist a ticker in the personal Durable Object watchlist.
- `/unwatch TICKER` — remove it.
- `/watchlist` — show the persistent personal watchlist and current radar stage when a watched ticker has an active signal.
- `/recap` — read the session's persisted alert events and available 5/10/20/30-minute outcomes from Supabase, including MFE/MAE.
- `/terms` — beginner glossary for HOD, RVOL, RS, breadth, signal stages, MFE/MAE, and regime terminology.

The watchlist survives daily radar-session rollover. It is currently a persistent focus list; dedicated watchlist-only transition/loss-of-momentum notifications should be added separately rather than overloading the global alert cooldown logic.

Until the real-time feed is validated, `/inspect`, `/leaders`, and `/session` still inherit the TradingView scanner's data limitations. The command UX is source-agnostic so the underlying feed can later be swapped without changing the user-facing workflow.
