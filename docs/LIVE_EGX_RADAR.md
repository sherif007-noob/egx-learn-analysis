# EGX Live Radar — Cloudflare Worker

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

### Phase 4 — order flow

If a reliable depth/trades feed becomes available:

- ask depletion,
- bid replenishment,
- queue imbalance change,
- cancelled-wall detection,
- sweep detection,
- executed volume versus visible liquidity,
- absorption/rejection confirmation.

That layer should confirm or reject radar signals; it should not replace the market-wide scanner.
