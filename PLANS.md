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
- [x] Final cross-position comparison

### Phase 2 — Transitional portfolio architecture

Current reconstructed equity: approximately **EGP 66,044**.
Current cash: approximately **EGP 15,156 (22.95%)**.

Current weights:
- ETEL: 18.53%
- ORHD: 18.47%
- MASR: 16.92%
- ACTF: 12.00%
- TALM: 9.88%
- ORAS: 1.25%
- Cash: 22.95%

Transitional buckets:
- **Core / medium-term:** ETEL + ORHD ≈ 37%
- **Repair / legacy positions:** MASR + TALM ≈ 26.8%
- **Speculative / active:** ACTF ≈ 12%
- **Tracking:** ORAS ≈ 1.25%
- **Cash:** ≈ 23%
- **KORA:** active day/swing watchlist

Target while learning:
- Protected cash reserve: **15% minimum** ≈ EGP 9,900
- Active/speculative exposure: **20% maximum** initially
- Single active position: **12% maximum notional** after confirmation
- Initial pilot: roughly **6–8% of equity** maximum notional
- Core single-name exposure: avoid materially exceeding **20%** without a fresh thesis
- Repair bucket should decline over time rather than become a permanent category

Implication:
- With ~23% cash today, only about **EGP 5.2k** is freely deployable before touching the 15% protected reserve.
- ACTF already occupies 12% of equity, so a KORA pilot around 7–8% would bring active/speculative exposure close to the 20% ceiling.
- Do not fund a new momentum trade by consuming the protected reserve.

### Phase 3 — Risk framework

Define **1R = 0.50% of current equity**.

At EGP 66,044:
- **1R ≈ EGP 330**
- **0.5R pilot risk ≈ EGP 165**
- **Maximum daily loss = 2R ≈ EGP 660**
- After two full-risk failed attempts, stop new active trading for the session.
- Maximum total open active-trade risk: **2R** until a larger sample proves positive expectancy.

Position sizing:
shares = max allowed EGP risk / (entry - invalidation + slippage cushion)

Then apply a second cap:
shares <= active-position notional cap / entry

Use the smaller result.

Rules:
- Invalidation is chosen from market structure first; position size adapts to the stop.
- Never choose a wider stop just to fit a desired position size.
- Limit orders preferred in thin names.
- Allow a slippage cushion when calculating risk.
- No revenge trades.
- No moving stops lower to avoid taking a loss.
- No averaging down into an unconfirmed downtrend.
- Re-entry is allowed only after a new setup forms.

### Phase 4 — Entry framework
Before every buy:
1. Market regime
2. Relative strength
3. Setup type
4. Exact trigger
5. Invalidation
6. Risk/share
7. Position size
8. First partial target
9. Runner plan

### Phase 5 — Exit framework
- Hard invalidation
- First partial near 1R or meaningful resistance
- Runner only while structure supports continuation
- Re-entry allowed only on a new setup
- A winner approaching major resistance should trigger a deliberate partial-vs-runner decision

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

Example sizing only:
- If trigger ≈ 6.70 and structural invalidation ≈ 6.50, risk/share ≈ 0.20.
- 1R sizing alone would permit ~1,650 shares, but that exceeds the current active notional cap.
- A pilot around 600–750 shares would use roughly EGP 4.0k–5.0k notional and risk about EGP 120–150 before slippage.
- An add is allowed only if price confirms continuation and the total active bucket remains within limits.

### Phase 7 — Current-position rules

**ETEL**
- Core candidate.
- No add needed now.
- Protect 130–131 as the key nearby structural support.
- 138–140 remains the major resistance/reclaim area.

**ORHD**
- Core/medium-term candidate.
- No add before structure improves.
- 39.10–39.70 is the key nearby defense zone.
- Bonus shares are not a reason by themselves to ignore invalidation.

**MASR**
- Repair position, not an automatic core holding.
- No averaging down.
- 7.24–7.30 is the key defense area.
- Recovery requires reclaiming 7.50–7.60, then 7.68–7.80.

**TALM**
- Repair/event position.
- No averaging down while the short-term trend is weak.
- 19.70–20.00 and then 19.45 are the nearby defense zones.
- Recovery requires reclaiming 20.8–21.2 and then higher zones.

**ACTF**
- Active/speculative position already using ~12% of equity.
- No add while structure remains broken.
- 2.77–2.80 is the current defense zone.
- Improvement sequence: 2.85 → 2.92 → 2.99–3.00 → 3.10–3.17.

**ORAS**
- Tracking/learning position only at current size.

### Phase 8 — Data quality
Review EGX-Portfolio:
- stale positions cleanup
- official close vs intraday last-bar reconciliation
- use transaction ledger as source of truth for holdings
- continue 1m history coverage for forensic review
- KORA Sep 24 intraday history is incomplete after ~12:35 and misses the late rally to the official 6.70 close; backfill/fix required
