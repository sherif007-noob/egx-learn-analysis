# Plans

> Dated execution plans. These are working plans, not predictions.
> Each plan should specify what evidence would confirm it and what would invalidate it.

## 2026-09-27 — Weekend Portfolio & Trading Plan

### Phase 1 — Finish diagnosis
- [x] Portfolio-level reconstruction
- [x] TALM
- [x] MASR
- [x] ORHD
- [x] ACTF
- [x] ETEL
- [x] ORAS
- [x] KORA opportunity analysis
- [ ] Final cross-position comparison

### Phase 2 — Portfolio architecture
Draft buckets:
- **Core / medium-term candidates:** ETEL, ORHD
- **Needs structure repair before adding:** TALM, MASR
- **Speculative / active trading:** ACTF
- **Tracking / immaterial:** ORAS
- **Active watchlist / day-swing candidate:** KORA
- **Cash reserve:** maintain a protected reserve instead of fully redeploying all available cash

Final percentages will be set only after the full risk-budget work.

### Phase 3 — Risk framework
To define:
- Risk per trade in EGP and % of equity
- Position size = max EGP risk / distance from entry to invalidation
- Maximum daily loss
- Maximum simultaneous active trades
- Maximum portfolio concentration per active name
- Rules for slippage and thin order books
- No revenge trades
- No moving stops lower to avoid taking a loss

### Phase 4 — Entry framework
Before every buy:
1. Market regime
2. Relative strength
3. Setup type
4. Exact trigger
5. Invalidation
6. Position size
7. First partial target
8. Runner plan

### Phase 5 — Exit framework
- Hard invalidation
- First partial near 1R or meaningful resistance
- Runner with structural/trailing stop
- Re-entry allowed only on a new setup

### Phase 6 — KORA playbook
Current pre-session map:
- Official reference close: 6.70
- Immediate decision zone: 6.60–6.70
- Upside confirmation sequence: 6.70 hold/reclaim → 7.00 → 7.20–7.45 → 7.66–7.87
- Pullback support sequence: 6.15–6.25 → 5.75–5.90 → 5.60–5.65
- Avoid blind chasing if it gaps sharply above 6.70.
- Preferred day-trade trigger: first controlled pullback that holds a meaningful level, followed by reclaim with tape/price confirmation.
- Preferred swing trigger: hold above 6.70 or constructive pullback into support followed by higher low/reclaim.
- Pilot first; add only after proof.
- Before live entry, inspect current depth + trades/tape.
- Account for the approved rights issue; do not interpret eventual ex-rights price adjustment as an ordinary crash.

### Phase 7 — Data quality
Review EGX-Portfolio:
- stale positions cleanup
- official close vs intraday last-bar reconciliation
- use transaction ledger as source of truth for holdings
- continue 1m history coverage for forensic review
- KORA Sep 24 intraday history is incomplete after ~12:35 and misses the late rally to the official 6.70 close; backfill/fix required
