# Analysis Log

> Dated record of portfolio and stock analysis. New entries are appended under the relevant date.
> Distinguish: **data**, **inference**, and **scenario**.

## 2026-09-27 — Portfolio reset

### Portfolio
- Reconstructed equity from transaction ledger: approximately EGP 66k.
- Cash after EGCH exit: approximately EGP 15.2k, around 23% of equity.
- Realized closed-trade P&L was slightly positive while open positions carried the larger losses.
- Key behavioral issue identified: losers have tended to remain open longer while closed trades were cut faster.
- Current architecture goal: core + active trading + protected cash reserve.

### TALM
- Position: 320 shares around 24.99 average.
- Entry occurred after the previous session's +20% move and in the same minute that printed the 25.70 session high.
- Short-term structure: bearish after the climax; recovery from 19.70 is not yet a confirmed reversal.
- Important zones: 19.70–20.00 support, then 19.45; reclaim zones 20.8–21.2, 21.5–22.0, 22.5–22.9.
- Rule learned: do not use the first spike after a prior +20% day as an automatic trigger.

### MASR
- Position: 1,500 shares around 8.69 average.
- Entry was a positive-news gap-up near the 52-week high.
- Post-entry pattern developed lower highs and lower lows.
- Important zones: 7.24–7.30 support; reclaim 7.50–7.60; stronger improvement 7.68–7.80 and 8.00–8.05.
- Fundamentals remain mixed-positive operationally, but price has not confirmed recovery.
- Rule learned: positive news is context, not a buy signal.

### ORHD
- Position: 300 shares around 43.10.
- Entry was a reclaim attempt rather than a pure chase.
- Short-term structure weakened after the 44 area into lower highs/lower lows.
- 39.10–39.70 is the main nearby support zone.
- Reclaim sequence: 41 → 41.5–42 → 42.2–42.4 → 43.3–44.
- Corporate action: bonus-share distribution in early October; this does not create free economic value.
- Candidate for core/medium-term bucket, subject to price structure.

### ACTF
- Position: 2,800 shares around 3.15.
- The Sep 20 move was a massive-volume momentum event; the continuation setup later failed.
- Sep 24 showed possible absorption around 2.83, but this is not confirmed until the next session's price response.
- Important zones: 2.77–2.80 defense; 2.85 first reclaim; 2.92 important; 2.99–3.00; then 3.10–3.17.
- Treat as speculative/momentum, not core.
- Rule learned: failed momentum setups need tighter invalidation and must not become accidental investments.

### ETEL
- Position: 90 shares around 128.95.
- Entry was closer to the desired pattern: opening spike → pullback → reclaim.
- Larger structure remained stronger than the other reviewed positions.
- Important zones: 133–135 nearby support, 130–131 major short-term support, 138 then 140 resistance.
- Candidate for core/medium-term bucket.
- Rule learned: protect winners; a partial-profit framework near major resistance can reduce round-tripping.
- Data-quality correction: ETEL Sep 24 close of 135.99 in EGX-Portfolio matches current external historical data. A prior 134.50-close mismatch was a false alarm; do not treat ETEL as an identified close-reconciliation bug.

### ORAS
- Position: 1 share around 861; portfolio impact is immaterial.
- Sep 17 entry was around 861 during a high-volume session that later closed 879.
- Subsequent sessions faded to 824 by Sep 24.
- H1 2026 fundamentals remain strong: large backlog, strong EBITDA, and active infrastructure/data-center pipeline.
- The proposed OCI Global combination remains an event catalyst/risk into Q4 2026.
- Because the position is one share, treat it primarily as a tracking/learning position rather than a portfolio-allocation decision.

### KORA — fresh opportunity review
- Official Sep 24 close: 6.70, +8.24%, at the session high; official range 5.88–6.70 and volume about 53.4m.
- The app's KORA 5m history is incomplete on Sep 24 and stops around 12:35, so the late-session rally is missing from intraday history. Use official daily close as source of truth until KORA 1m/5m backfill is fixed.
- Price moved from the ~3.3–3.6 August base to a 7.87 September high in a very short period; volatility is extreme and the stock remains a momentum/event name.
- Recent structure: 5.80 close on Sep 20 → 6.55 → 6.79 → 6.19 → 6.70. The rebound is strong but still inside the broader 5.75–7.87 volatile range.
- Important support zones: 6.15–6.25, then 5.75–5.90, then 5.60–5.65.
- Important resistance zones: 6.70, 7.00, 7.20–7.45, then 7.66–7.87.
- Rights issue approved: EGP 405m capital increase, 0.90 new share per old share at EGP 0.20 par + EGP 0.005 issuance expense; rights will trade separately.
- If 6.70 were the cum-rights price at detachment, theoretical ex-rights price is roughly 3.62 before market movement. This is mechanical dilution/rights value, not a collapse in economic value by itself.
- Business fundamentals are not empty: H1 2026 revenue about EGP 3.24bn, gross profit EGP 665m, new awards around EGP 5bn, backlog around EGP 15.7bn. Reported net profit was around EGP 139m, while company-adjusted net income excluding FX effects was around EGP 146m.
- Style fit: strongest current fit is day/swing trading. It can become an investment candidate only after a deeper valuation, balance-sheet, cash-flow, backlog-conversion, and post-rights analysis.
- Rule learned: a strong close at the high after a violent intraday reversal is actionable context, but the next entry still needs an early trigger and defined invalidation rather than chasing the opening spike.


## 2026-09-27 — Day-trade candidate review: CRST & NAPR

### Data tooling
- Added a standalone TradingView 1-minute fetcher to this repo, adapted from the EGX-Portfolio TradingView ingestion approach.
- Files:
  - `scripts/fetchIntraday.ts`
  - `.github/workflows/fetch-intraday.yml`
  - `data/intraday/CRST-1m.csv|json`
  - `data/intraday/NAPR-1m.csv|json`
- The first run successfully fetched 5,000 1m bars for each ticker.
- CRST resolves directly as `CRST`.
- NAPR resolves through ISIN `EGS370O1C013`.

### CRST — Creast Mark

**Sep 24 data**
- Close 3.72, +3.91%.
- Intraday range 3.59–3.75.
- Volume about 51.60m.
- The close finished in the upper ~81% of the day's range.
- Screenshot average volume: 86.47m, so Sep 24 volume was only about 0.60x that reference average.

**1m structure**
- Early push 3.61 → 3.67, followed by a fade to the session low around 3.59.
- Rebuilt toward 3.70 during the morning.
- 12:12 Cairo: a high-volume probe reached 3.75 but failed to hold; immediate rejection back toward 3.70.
- 13:00 area sold down toward 3.60, then 13:02 reclaimed 3.66 on heavy volume.
- 13:14–13:16 produced another strong rejection from the 3.60 area.
- 14:14 printed a large-volume jump from the low 3.60s to 3.70.
- Closing auction/last minutes printed very heavy volume at 3.72.

**Depth/tape**
- Best bid/ask screenshot: 3.71 / 3.73, spread 0.02 (~0.54%).
- Aggregate visible depth: ~21.6% bid / 78.4% ask.
- Important visible supply: 3.79, 3.88–3.90, and especially 3.98–4.10.
- Visible bids exist around 3.70, 3.60, 3.55 and 3.50, but these are intent only.
- Closing trades at 3.72 included several large green-classified prints; price response next session is still required.

**Map**
- Immediate pivot: 3.70–3.75.
- Breakout trigger zone: 3.73/3.75 only if supply is actually absorbed.
- Upside zones: 3.79–3.80 → 3.88–3.90 → 3.98–4.10.
- Downside zones: 3.66 → 3.59–3.60 → 3.55 → 3.50.
- 4.09 is the recent/52-week high area.

**News/disclosures**
- Sep 21: disclosure concerning a post-execution disclosure form.
- Sep 16: EGM minutes (before certification).
- Sep 13: EGM resolutions (second meeting; meeting held Sep 10).
- Aug 12: EGX Listing Committee imposed EGP 25k + EGP 25k penalties for listing-rule violations.
- The indexed disclosure pages confirm the events but do not expose enough of the Sep EGM attachment contents to build a catalyst thesis from them.

Sources:
- https://numbstr.com/market/CRST/disclosures
- https://www.sigma-cap.com/main/news_page_exact?newsId=46062987&newsType=MIST
- https://stockanalysis.com/quote/egx/CRST/history/

**Social-media check**
- Publicly indexed Facebook/X/YouTube searches did not return reliable recent CRST trader discussions.
- Therefore no social-sentiment label is assigned. Do not substitute unrelated hashtag hits or automated-score sites for actual sentiment evidence.

**Current use**
- Strong candidate for day trading because the close was strong and the 1m structure gives clear levels.
- Not automatically a swing entry yet because 3.75 failed once and there is heavy overhead supply toward 3.79–4.10.

### NAPR — National Printing

**Sep 24 data**
- Close 52.17, +3.31%.
- Range 50.50–57.80.
- Volume 2.52m versus screenshot average 375.5k: roughly 6.7x.
- The close was only around the lower 23% of the day's range despite the positive daily return: a major intraday round-trip.

**1m structure**
- Opened 53.60 and sold quickly into 50.50.
- First strong rebound accelerated through 54–55 and reached ~55.85 around 10:20.
- A second major momentum leg around noon reached 57.80 at 12:30.
- The 57.80 breakout failed immediately; 12:31 closed near 56 and price later faded materially.
- Afternoon bounces repeatedly failed to restore the high.
- Late session traded mostly near 51.3–52.4 and closed at 52.17.

**Depth/tape**
- Post-close screenshot showed 52.17 best bid versus 55.92 best ask: a 6.7% spread. This is a closed/sparse book and must not be treated as the expected live spread Sunday.
- Aggregate visible book showed ~66% bids, but that does not offset the large post-close spread or Thursday's failed 57.80 move.
- Closing trades were concentrated at 52.17 with mixed tick-color classification.

**Map**
- Main support/decision zone: 50.50–52.00.
- Mid pivot/supply: 53.5–54.0.
- First major upside zone: 55.0–56.5.
- Major breakout level: 57.80.
- If 50.50 fails and cannot reclaim, next historical reference is roughly 48–49.2.

**Fundamentals/news**
- H1 2026 consolidated profit attributable to shareholders: about EGP 179.7m, down 11.3% YoY.
- H1 sales: about EGP 3.358bn vs EGP 3.548bn.
- Standalone H1 shifted to a small loss.
- In Jan 2026 the company submitted documents to list a capital increase from EGP 211.71m to EGP 215.34m, issued for the acquisition of shares in Al Shorouk Modern Printing & Packaging.
- No recent company disclosure found in the indexed search clearly explains the Sep 13–24 price explosion.

Sources:
- https://www.arabfinance.com/en/news/newdetails/National-Printing-consolidated-profits-in-h1-2026
- https://www.3way-finance.com/etrade/News/NewsDetails.aspx?NewsID=2118231
- https://stockanalysis.com/quote/egx/NAPR/history/

**Social-media check**
- Publicly indexed Facebook/X/YouTube searches returned no reliable recent NAPR trader discussions.
- So social sentiment is unverified. The extreme jump in volume proves attention/liquidity, but volume is not the same thing as social-media sentiment.

**Current use**
- Day-trade candidate first, not a clean swing candidate at this point.
- Reason: huge volatility and attention, but the Sep 24 57.80 breakout failed and the stock closed far below its intraday high.
- Any long setup should require a fresh price/tape trigger rather than assuming the recent +70% run must continue.



## 2026-09-27 — Four-candidate day-trade comparison

### Data refresh
The standalone TradingView fetcher now covers **CRST, NAPR, KORA, RKAZ** and successfully pulled 5,000 one-minute bars for each.

### RKAZ
- Sep 24 intraday source data: open 5.15, high 5.60, low 5.06, last 1m print 5.48, volume ~611.98k.
- External daily feeds disagree on the formal Sep 24 close (some show 5.26 while the app/TradingView last prints show 5.48). Treat the close field cautiously until reconciled.
- The 1m tape is extremely sparse: many minutes have no trade, and many printed bars contain only 1–100 shares.
- This is the key issue for day trading: the percentage range looks attractive, but actual liquidity is poor and price can jump between levels with tiny prints.
- Post-close depth was crossed/sparse and therefore not a usable live spread reference.
- Current conclusion: **watchlist only, not a preferred beginner day-trade vehicle.**

### Candidate selection for next session
Primary focus:
1. **CRST** — cleaner structure, strong close near the day high, narrow normal spread, and clear nearby trigger/invalidation zones.
2. **KORA** — highest-quality liquidity/momentum combination, very strong close at the session high, but more volatile and prone to fast reversals.

Secondary:
- **NAPR** — excellent attention and turnover, but Sep 24 produced a major failed move from 57.80 back to 52.17; use only if a fresh reclaim setup appears.
- **RKAZ** — percentage volatility is attractive but the tape is too sparse for a beginner; slippage/gapping between prints is the main problem.

Selection principle:
**For day trading, prefer tradable liquidity + readable structure over the stock with the largest percentage range.**


## 2026-09-27 — Deep dive after whole-market scan: TAQA & MAAL

### TAQA — Taqa Arabia

**Scanner**
- Sep 24 close: 17.12 (+2.51%)
- Range: 16.35–17.30 (~5.55%)
- Volume: ~14.13m shares
- Scanner RVOL10: ~2.77x
- Approx turnover: ~EGP 242m
- Close location: ~81% of the daily range
- Scanner RSI: ~64

**1m structure**
- Opened 16.55 and tested 16.35 at 10:03, then recovered.
- First 30 minutes: 16.35–16.80.
- Major momentum ignition around 11:12: ~839.6k shares in one minute while price pushed 16.89 → 17.05.
- Session high 17.30 at 11:57.
- Midday pullback eventually reached ~16.45 around 13:16.
- Important late-session feature: the stock rebuilt from the 16.45–16.55 area and climbed back toward 17.20 around 14:11.
- Closed 17.12, above approximate session VWAP ~16.90.
- Previous day (Sep 23): +11.33%, ~32.61m shares, close at 16.70.

**Interpretation**
- This is a cleaner combination of liquidity, relative volume, readable intraday structure, and strong closing recovery than most scanner names.
- The move is already extended across two sessions, so the setup is not “buy because momentum exists.” The trade requires a controlled hold/reclaim and nearby invalidation.
- A 16m-share treasury-stock sale was executed on Sep 23. That contributed material supply/turnover, yet the stock still closed +11.33% that day and followed with another positive session. This is evidence that the market absorbed a large amount of supply while price stayed strong, but it is not proof that the treasury sale itself was bullish.
- Earlier September catalyst: a ~$14.8m Jordan gas-pipeline contract was disclosed.

**Map for Sep 28**
- Decision/support: 16.90–17.10
- Breakout trigger area: 17.20–17.30
- First upside: 17.49–17.50
- Next: ~17.80
- Major prior high: 18.30
- Lower supports: 16.70, then 16.45–16.55, then 16.35

**Use**
- Promoted to **primary day-trade screen**.

### MAAL — Marseilia Egyptian Gulf Real Estate Investment

**Scanner**
- Sep 24 close: 10.70 (+4.39%)
- Range: 9.99–11.24 (~11.68%)
- Volume: ~7.96m
- Scanner RVOL10: ~4.92x
- Approx turnover: ~EGP 85m
- Close location: ~57%
- Scanner RSI: ~71.8

**1m structure**
- Very volatile open: 10.22 → 9.99 low at 10:01, then a sharp push to 11.00 by ~10:08.
- Session high 11.24 at 11:27.
- The breakout did not hold; price faded progressively and reached ~10.31 around 13:10–13:18.
- A very large minute around 12:39 (~697.9k shares) printed near 10.70–10.75, followed by continued weakness toward the 10.3s.
- Late session stabilized around 10.50–10.73 and closed 10.70.
- Approx session VWAP ~10.79, so the close finished slightly below VWAP.
- The stock had already risen strongly for several sessions: 8.66 close Sep 21 → 9.14 Sep 22 → 10.25 Sep 23 → 10.70 Sep 24.

**Event risk**
- GAFI called an ordinary general meeting for Sep 26 to discuss an inspection report concerning actions of some board members and resulting consequences.
- As of the Sep 27 search, no reliable indexed source was found confirming the outcome of that meeting. If quorum was not reached, the invitation stated a second meeting would be Oct 3.
- Because this can materially change sentiment, MAAL should not be promoted to a primary trade until the newest disclosure is checked before the open.

**Map for Sep 28**
- Immediate pivot: 10.65–10.75
- First reclaim: 10.85–11.00
- Major resistance/high: 11.14–11.24
- Supports: 10.50–10.55, then 10.31–10.40, then 9.99–10.05

**Use**
- **Event-risk backup only** until the Sep 26 meeting outcome is known.
- If no adverse disclosure appears and live price reclaims 10.85–11.00 with real price progress, it can become a day-trade candidate.
