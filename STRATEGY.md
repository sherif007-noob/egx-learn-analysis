# Strategy

> Living trading system. Version changes only when supported by repeated evidence from our own trades and review.

## Version 0.2 — 2026-09-27

### Core principle
We are not trying to predict every move.
We are building a process that lets us act early enough when evidence is good, while defining risk before entry.

## Market-reading hierarchy
1. **Context:** trend, range, catalyst, market regime
2. **Price:** structure and response at important levels
3. **Volume:** confirms participation
4. **Trades/tape:** what actually executed
5. **Depth:** visible intent only

Rule: **Depth is intent, Trades are execution, Price response is the verdict.**

## Setup A — Momentum continuation
Use when a liquid EGX stock shows exceptional relative strength and volume.

Requirements:
- Strong prior move or fresh breakout
- Liquidity sufficient for planned size
- Pullback does not destroy structure
- First valid reclaim / higher low can justify a small pilot
- Add only if price proves continuation

Avoid:
- Buying the first vertical spike
- Entering solely because a stock is in top gainers
- Waiting for impossible “perfect confirmation” after the move is already gone

## Setup B — Pullback + reclaim
Preferred pattern from ETEL-type entries:
- Strong move
- Controlled pullback
- Support/previous breakout holds
- Reclaim with price response and acceptable volume
- Invalidation below the relevant structure

## Setup C — Range trade
Candidate use case: EGCH if a stable repeated range is confirmed.
- Buy near lower range only after defense/rejection
- Trim into upper range
- Exit if the range breaks against the position
- Do not assume a range will persist forever

## Setup D — Failed breakdown / absorption
- Aggressive selling hits a level
- Price fails to continue lower
- Bid replenishes or selling loses impact
- Confirmation requires subsequent reclaim/higher low
- A large visible bid alone is not absorption

## Risk system

### 1R
Initial baseline:
- **1R = 0.50% of total equity**
- Pilot risk = **0.5R**
- Maximum daily loss = **2R**
- Maximum total open active-trade risk = **2R**

These values may change only after a meaningful sample of reviewed trades.

### Position sizing
1. Define entry and structural invalidation.
2. Calculate risk/share.
3. Add a realistic slippage cushion.
4. Calculate shares from EGP risk.
5. Apply the notional-position cap.
6. Use the smaller size.

Formula:
shares = min(max_EGP_risk / risk_per_share, max_notional / entry)

### Exposure caps while learning
- Protected cash: minimum 15% of equity
- Active/speculative bucket: maximum 20% of equity
- Single confirmed active position: maximum 12% notional
- Pilot position: generally 6–8% notional maximum
- Core single-name position: avoid materially exceeding 20% without a fresh thesis

### Hard rules
- Every trade must have an invalidation before Buy is pressed.
- Position sizing is based on EGP risk, not desired profit.
- Never widen a stop merely to avoid realizing a loss.
- Limit orders preferred in thin names.
- No averaging down into an unconfirmed downtrend.
- No revenge trades.
- A stopped stock is not “dead”; re-entry is allowed only after a new setup.
- A winner should not be allowed to become a large loser without a new thesis.
- A failed swing/momentum trade must not silently become an investment.

## Profit-taking
- Consider a first partial near 1R or major resistance.
- Keep a runner only while structure supports continuation.
- Major resistance + outsized MFE should trigger a deliberate partial/runner decision.
- A partial is not mandatory if structure is exceptionally strong; the choice must still be made deliberately before entry.

## Review loop
After each trade record:
- Setup
- Entry trigger
- Invalidation
- Planned risk in EGP and R
- Actual size
- MFE
- MAE
- Exit reason
- Whether the original setup actually occurred
- Tape/depth observations
- Emotional mistakes
- What rule should change, if any

Do not change the strategy from one anecdote. Promote a rule only after repeated evidence.
