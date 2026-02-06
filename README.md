# Unified Liquidity Multi-Dimensional Prediction Market (Joint-Outcome AMM)

**One-liner:** A combined prediction market that pools liquidity across multiple correlated Yes/No questions by pricing them through a single joint-outcome (“world table”) AMM, while still letting users trade simple binary markets and “partial” multi-event slices.

---

## TL;DR

Prediction markets often fragment liquidity across many correlated questions (e.g., related geopolitics events), causing wide spreads and inconsistent probabilities.  
This project proposes a **single shared market-making engine** over the **joint outcomes** of multiple binary events, so:

- One liquidity pool supports *all* correlated questions.
- Prices remain coherent (no contradictory implied probabilities).
- Users can trade:
  - **Simple binary bets** (e.g., “Event A = Yes”)
  - **Partial multi-event bets** (e.g., “A = Yes AND B = Yes, regardless of C”)
  - **Exact scenario bets** (e.g., “A=Yes, B=Yes, C=No”)

All contracts still resolve to **$1 per share** if they win, **$0** otherwise. “Bigger upside” comes from buying more shares at lower prices (more specific scenarios are cheaper).

---

## Problem

### Liquidity Fragmentation
In typical prediction markets, each question is its own market / book:

- Market A: P(A=Yes)
- Market B: P(B=Yes)
- Market C: P(C=Yes)

Even if these events are strongly correlated, liquidity is split across separate pools/orderbooks, leading to:
- Wider spreads (less depth per market)
- Slower price discovery
- Incoherence (prices don’t move together unless arbitrage traders manually sync them)

### Incoherent Odds Across Correlated Events
Separate markets can imply contradictory “stories of the world.”
Example: “Israel strike” jumps to 70%, but “US strike” stays flat even if historically/structurally correlated.

---

## Solution: One Shared “World Table” (Joint Distribution)

Instead of 3 separate markets, run **one unified source of truth** under the hood:

### The World Table
For **N binary events**, there are **2^N joint outcomes** (“world states”).

For N=3 events A, B, C → 8 worlds:

| World (A,B,C) | Meaning |
|---|---|
| 000 | A no, B no, C no |
| 001 | A no, B no, C yes |
| 010 | A no, B yes, C no |
| 011 | A no, B yes, C yes |
| 100 | A yes, B no, C no |
| 101 | A yes, B no, C yes |
| 110 | A yes, B yes, C no |
| 111 | A yes, B yes, C yes |

The engine maintains probabilities/prices for each world:
- `p000, p001, ... p111`
- All non-negative
- Sum to 1 (probability simplex)

This world table is the **single “source of truth.”**

### Deriving Displayed Odds (Marginals / Slices)
User-facing odds for individual questions are **derived** from the world table.

Example:
- `P(A=Yes) = p100 + p101 + p110 + p111`
- `P(B=Yes) = p010 + p011 + p110 + p111`
- `P(C=Yes) = p001 + p011 + p101 + p111`

So users still see familiar Yes/No markets, but those are *views* of the one joint model.

---

## Betting Types (User-Facing Contracts)

All contracts pay **$1 per share if the contract condition is satisfied**, else $0.

### 1) Marginal (Single Event) — “Normal” Binary Bet
> **A=Yes regardless of B,C**

This is a 1D slice: it groups all worlds where A=1:
- {100,101,110,111}

Payout:
- $1 per share if A resolves Yes
- $0 otherwise

Price:
- `price(A=Yes) = P(A=Yes)` (derived from world table)

### 2) Slice (Partial Multi-Event Bet) — “Ignore One Dimension”
> **A=Yes AND B=Yes, regardless of C**

This is a 2D slice: it groups:
- {110,111}

Payout:
- $1 per share if (A=Yes AND B=Yes)
- $0 otherwise

Price:
- `price(A=Yes,B=Yes) = p110 + p111`

Intuition:
- Slice is easier to win than an exact scenario (more worlds included),
- so it typically costs more per share.

### 3) Corner (Exact Scenario / Absolute Bet)
> **A=Yes, B=Yes, C=No** (world 110)

This is the most specific bet: one exact world.

Payout:
- $1 per share if the final world is exactly 110
- $0 otherwise

Price:
- `price(110) = p110`

Intuition:
- Corner is harder to win (one exact outcome),
- so it’s usually cheaper per share.

---

## Why “More Specific = Bigger Upside” (Without Changing Payout Rules)

Payout is always **$1 per share**.  
Your total payout depends on how many shares you bought.

If you spend `$1 USDC`:

- Shares bought = `1 / price`

Example:
- Corner price = $0.10 → you buy 10 shares → win pays $10
- Slice price = $0.20 → you buy 5 shares → win pays $5

So:
- **Corner**: cheaper → more shares → bigger payout if right, but lower hit-rate  
- **Slice**: more expensive → fewer shares → smaller payout, but higher hit-rate

This naturally matches user intuition: precision = higher risk/higher reward.

---

## Why Not Use “1/n payout”?

Scaling payouts by 1/n (e.g., each event pays $1/3) mostly just changes units:
- users will buy 3x shares to get the same exposure
- it does **not** merge liquidity across markets

Liquidity pooling comes from **one shared joint engine**, not from payout scaling.

---

## AMM Design: Active vAMM + LS-LMSR on CLOB

We replace the passive pool model with an **Active Virtual AMM (vAMM)** that acts as a "Robot Market Maker" on a **Central Limit Order Book (CLOB)**.

### 1. The Engine: LS-LMSR (Liquidity-Sensitive)

Standard LMSR has a "static liquidity" bug. We upgrade to **LS-LMSR**:

| Feature | Description |
|---------|-------------|
| **Dynamic Depth** | The liquidity parameter `b` grows with market volume: `b = α × Volume` |
| **Benefit** | The market deepens automatically. "Whales" can trade with lower slippage as the market matures |

### 2. Execution: vAMM vs. User Limit Orders

The vAMM calculates a **"Fair Price"** and places **Limit Orders**. Users can undercut this price. The CLOB always fills the **Best Price First**.

**Example: Trading "Event A"** (vAMM fair value = $0.60)

| Rank | Price | Seller | Status (Who gets filled?) |
|------|-------|--------|---------------------------|
| 1st | $0.58 | User Steve | **Executed First.** (Best Price for Buyer) |
| 2nd | $0.60 | vAMM (Robot) | Executed Second. (Only if Steve runs out) |
| 3rd | $0.65 | User Alice | Executed Third. (Worst Price) |

- **Buying:** Lowest Price wins (User Steve > vAMM)
- **Selling:** Highest Price wins (vAMM > Lowballers)

### 3. Step-Ladder Liquidity (The Iceberg)

The vAMM does **not** place one order for "Infinity Shares." It places a **Ladder of orders** to represent slippage visually:

```
Order 1: 500 shares @ $0.60
Order 2: 500 shares @ $0.61
Order 3: 500 shares @ $0.62
...
```

This allows the CLOB to function normally while accessing the vAMM's infinite depth.

### 4. Just-In-Time (JIT) Minting

When a user trades against the vAMM:

1. User sends USDC
2. vAMM adds its own subsidy (if needed) to complete the $1.00 collateral
3. Gnosis CTF mints the **Full Set** (Outcomes A-H)
4. vAMM gives the User their share (A) and keeps the rest (B-H) in its inventory

### 5. Safety Mechanisms (LP Protection)

To prevent the vAMM from being drained in extreme conditions, we implement three defenses:

#### 5a. Volatility Expansion Spread (Panic Mode)

If the price moves too fast (e.g., jumps from $0.20 to $0.80 in minutes), the vAMM interprets this as "Uninformed/Toxic Flow."

- **Action:** Automatically widens the spread (e.g., Buy @ $0.30, Sell @ $0.70)
- **Result:** Traders must pay a higher fee to trade during panic, compensating LPs for the risk

#### 5b. Inventory Skewing

If the vAMM holds too much of one outcome (e.g., Short "Yes", Long "No"):

- **Action:** Shifts prices to discourage buying Yes and encourage selling Yes
- **Result:** The market naturally re-balances the vAMM's inventory

#### 5c. The Vault Cap (Not Share Cap)

We do **not** cap the number of shares. We cap the **USDC Risk**.

- **Limit:** The vAMM can only mint new shares as long as the LP Vault has funds to pay the subsidy
- **Effect:** If the vault hits $0, the vAMM stops quoting. This guarantees LPs cannot lose more than they deposited

### How Trading a Marginal/Slice Works (Basket Trades)

Users typically trade marginals/slices, not raw corners.

Example: user buys **C=Yes**
- This corresponds to buying a **basket** of world outcomes where C=1:
  - {001,011,101,111}

The vAMM processes this as a multi-outcome trade and updates prices across **all 8 worlds**.
Because the world prices changed, the derived markets (A, B, slices) update too.

---

## Initial Funding / Bootstrapping

### Liquidity Provider (LP) / Market Maker Funding
The LP seeds the market by depositing collateral (e.g., USDC) to back payouts and provide depth.

- LP deposits collateral into the AMM pool (e.g., $10,000 USDC).
- The AMM starts with an initial world-table prior (often uniform or mildly informed).
- As users trade, the AMM updates prices.

The LP does **not** need to “buy all tokens.”
Collateral + AMM mechanics are enough to quote and settle.

---

## World Table Calculation Example (Concrete)

### Start: One World Table
Assume N=3. We maintain 8 probabilities that sum to 1:

| World | Prob |
|---|---:|
| 000 | 0.20 |
| 001 | 0.05 |
| 010 | 0.15 |
| 011 | 0.10 |
| 100 | 0.10 |
| 101 | 0.05 |
| 110 | 0.25 |
| 111 | 0.10 |
Sum = 1.00

### Derived Odds (User UI)
- `P(A=Yes) = 100+101+110+111 = 0.10+0.05+0.25+0.10 = 0.50`
- `P(B=Yes) = 010+011+110+111 = 0.15+0.10+0.25+0.10 = 0.60`
- `P(C=Yes) = 001+011+101+111 = 0.05+0.10+0.05+0.10 = 0.30`

### Corner vs Slice Pricing
- Corner (110) price = 0.25  
- Slice (A=Yes,B=Yes regardless of C) price = 110+111 = 0.25+0.10 = 0.35

### $1 Bet Payouts (Per Share $1)
If user spends $1:
- Corner shares = 1/0.25 = 4 → payout $4 if 110 happens
- Slice shares = 1/0.35 ≈ 2.857 → payout ≈ $2.857 if 110 or 111 happens

---

## Benefits

### For Users
- Trade familiar Yes/No markets with deeper liquidity
- Express richer views (scenarios, partial bets) with fewer steps
- Better pricing (tighter spreads, less slippage) due to pooled liquidity
- Coherent cross-market movement (related markets update together)

### For Market Makers / LPs
- One inventory/risk surface instead of fragmented books
- Cleaner hedging via mergeable/splittable exposures (corner ↔ slice ↔ marginal)
- Higher capital efficiency when quoting correlated markets

### For the Platform
- Reduced incoherence and exploitable contradictions across correlated markets
- A scalable framework: N events → 2^N worlds (manageable with small N and can be extended with structured factor models later)

---


## Summary

This design turns multiple correlated prediction markets into a single **multi-dimensional joint-outcome market**, where:
- **the world table is the source of truth**
- **marginals/slices/corners are just different views/contracts**
- **an LMSR AMM updates all prices coherently**
- **liquidity is pooled instead of fragmented**

The result is a market that is simpler for users, more capital-efficient for liquidity providers, and more consistent overall.

---

## Partner Track Integrations (HackMoney 2026)

This project integrates three hackathon partner tracks to create a complete prediction market experience.

### Architecture Overview

![Multi-Dimensional Prediction Market Architecture](public/architecture.png)

---

### 1) Uniswap V4 — VAMM for Outcome Token Trading

**What It Does:**
Uniswap v4 Hooks power the core VAMM (Virtual AMM) that prices and trades outcome tokens for the prediction market.

**How We Use It:**

| Component | How It Works |
|-----------|--------------|
| **LS-LMSR AMM Engine** | Custom Hook implements our pricing logic inside v4's swap lifecycle |
| **World Table Updates** | Hook's `beforeSwap`/`afterSwap` callbacks recalculate all 8 corner prices on every trade |
| **Basket Trades** | When user trades a marginal (e.g., "A=Yes"), the Hook updates all affected corners in one tx |
| **JIT Minting** | Hook mints outcome tokens on-demand when users buy positions |

**Why Uniswap v4:**
- **Hooks** allow custom pricing logic (LS-LMSR) within v4's swap lifecycle
- **Singleton architecture** reduces gas for multi-outcome updates
- **Flash accounting** enables basket trades (marginals/slices) in one tx

---

### 2) Yellow Network — Gasless State Channel Payments

**What It Does:**
Yellow Network handles high-frequency betting through state channels, enabling instant, gasless transactions during a betting session.

**How We Use It:**

| Phase | How It Works |
|-------|--------------|
| **Session Start** | User connects wallet, Yellow SDK opens a state channel with USDC deposit |
| **Placing Bets** | Each bet is an off-chain signed message — no gas, instant confirmation |
| **Live Updates** | Yellow nodes sync balances in real-time across all parties |
| **Session End** | One on-chain tx settles final state with Uniswap v4 VAMM |

**Why Yellow Network:**
- **Gas efficiency**: 100 bets = 1 on-chain tx (only at session end)
- **Instant UX**: Bets feel like Web2 (no waiting for block confirmation)
- **Session logic**: Natural fit for "betting sessions" (sit down, bet, cash out)

---

### 3) ENS — Usernames & Market Names

**What It Does:**
ENS provides human-readable identity for both **users** (like Polymarket usernames) and **markets** (enabling direct token purchases via Metamask).

**How We Use It:**

#### A) User Profiles (Polymarket-Style Usernames)

| Feature | How It Works |
|---------|--------------|
| **Username Display** | Show `vitalik.eth` instead of `0xd8dA...` throughout the UI |
| **Leaderboards** | Rankings display ENS names — builds reputation and trust |
| **Avatars** | Pull user's ENS avatar record for profile pictures |
| **Betting History** | Associate trade history with ENS name, not raw address |

#### B) Market Names (ENS Subdomains)

We register a parent domain (e.g., `pm.eth`) and create **subdomains for each market**:

| Market | ENS Subdomain | Resolves To |
|--------|---------------|-------------|
| "Trump wins 2024" | `trump2024.pm.eth` | Market contract address |
| "ETH > $10k by Dec" | `eth10k-dec.pm.eth` | Market contract address |
| "Fed rate cut Q1" | `fedcut-q1.pm.eth` | Market contract address |

**User Benefit — Buy Tokens Directly from Metamask:**

Instead of navigating through our UI, users can:
1. Open Metamask
2. Send USDC to `trump2024-yes.pm.eth`
3. Automatically receive YES outcome tokens

This works because:
- ENS subdomain resolves to the market's swap router
- The router detects incoming USDC and mints the default outcome token (YES)
- User receives tokens at their ENS-resolved address

#### C) ENS Text Records for Market Metadata

Each market subdomain stores metadata in ENS text records:

| Record Key | Example Value |
|------------|---------------|
| `description` | "Will Donald Trump win the 2024 US Presidential Election?" |
| `resolution-date` | "2024-11-06" |
| `oracle` | "uma.eth" |
| `yes-token` | "0x123..." |
| `no-token` | "0x456..." |

**Why ENS:**
- **Trust**: Users see `vitalik.eth` not hex — recognizable identity
- **Discoverability**: Markets have memorable names, not contract addresses
- **Wallet-Native UX**: Buy tokens by sending to ENS name (no dApp required)
- **Composability**: Any wallet/dApp can resolve market info from ENS records

---

### Integration Flow: Placing a Bet

**Step 1: User "vitalik.eth" opens betting session**
- ENS resolves `vitalik.eth` → wallet address
- Yellow SDK creates state channel
- User deposits 100 USDC into channel

**Step 2: User places bets (gasless via Yellow)**
- Bets on "A=Yes", "B=No", corner (1,1,0)
- All off-chain signed messages — no gas fees
- UI shows "vitalik.eth betting..."

**Step 3: User ends session**
- Yellow aggregates all bets into one settlement tx
- Uniswap v4 Hook processes basket trades via LS-LMSR
- Outcome tokens minted to `vitalik.eth`

**Step 4: Market Resolution**
- Oracle resolves events A, B, C
- Winning corner identified
- `vitalik.eth` redeems winning tokens for USDC

---

### Summary: Why These Three Tracks?

| Track | Role | Benefit |
|-------|------|---------|
| **Uniswap v4** | Core trading engine (VAMM + Hooks) | Coherent multi-outcome pricing, shared liquidity |
| **Yellow Network** | Payment layer (State Channels) | Gasless betting, instant UX, session-based logic |
| **ENS** | Identity + Market Names | Usernames, market discovery, wallet-native buying |

Together, they create a prediction market that:
- ✅ Trades like Web2 (instant, gasless via Yellow)
- ✅ Settles on DeFi rails (Uniswap v4 liquidity)
- ✅ Feels human (ENS names for users and markets)
- ✅ Works from any wallet (send to `market-yes.pm.eth` to buy)

---

## Implementation Details

### 1) Market Clustering Criteria

We combine markets when they share most of:
- **Same domain/driver** (same geopolitical conflict, same company, same macro theme)
- **Similar time window** (or clearly modelable time structure)
- **Non-contradicting resolution sources** (same oracle / same definitions)
- **Expected correlation is strong enough** that shared liquidity helps more than it confuses

#### Context Pipeline (MVP Approach)

For each market question, we extract a structured "context card":

| Field | Examples |
|-------|----------|
| Entities | United States, China, Donald Trump |
| Event type | strike / resignation / sanction / election |
| Region | Middle East, Europe |
| Time window | by [date] |
| Causal theme | escalation / regime change / conflict |

We then compute similarity and group:

**Step A: Similarity Score**
- Text embedding similarity (semantic)
- Overlap in entities
- Overlap in event type
- Overlap in time window

**Step B: Cluster**
- If similarity > threshold → same "cluster"
- Cap cluster size for MVP (3–5 markets)

**Step C: Human/Rules Guardrails**
- Don't combine if time windows differ too much
- Don't combine if resolution criteria differ ("strike" definitions)

This produces market clusters (e.g., "combine these 3 markets") without heavy statistical modeling.

---

### 1b) Initializing Correlation via Naive Bayes

We derive the world table by assuming a **latent "driver" variable** (e.g., `E = escalation level`) that captures the correlation structure.

#### Example Setup

```
E = 0  →  calm
E = 1  →  high escalation

P(E=1) = 0.30

P(A=Yes | E=1) = 0.70,  P(A=Yes | E=0) = 0.10
P(B=Yes | E=1) = 0.60,  P(B=Yes | E=0) = 0.05
P(C=Yes | E=1) = 0.80,  P(C=Yes | E=0) = 0.10
```

#### Naive Bayes Formula (Conditionally Independent Given E)

```
P(A,B,C) = Σₑ P(E=e) · P(A|e) · P(B|e) · P(C|e)
```

This automatically creates a coherent 8-world table that:
- Makes A/B/C **positively correlated** via E
- Provides a reasonable starting "shape"
- Market trades then override and reshape this prior

#### Source of E
- **Context clustering** — markets in the same escalation cluster share the same latent driver
- **Historical learning** — optionally refined over time from market data

> This is a compelling story: we start with a structured prior, then traders move it.

---

### 2) Ensuring Slice Pricing Consistency

We use a single AMM over corners only.

The AMM lives on the **8 corners** (000…111). Marginals and slices are **not separate markets** — they are **basket trades of corners**.

#### Pricing Rules

| Contract Type | Price Formula |
|---------------|---------------|
| Slice (A=1, B=1 regardless of C) | `p₁₁₀ + p₁₁₁` |
| Marginal (C=Yes) | `p₀₀₁ + p₀₁₁ + p₁₀₁ + p₁₁₁` |
| Corner (exact world) | `pᵢⱼₖ` directly |

Users can "trade slices/marginals" in the UI, but the **backend executes as a basket of corner trades** at AMM prices.

**Benefits:**
- ✅ No price mismatch possible
- ✅ No need for merge/split arbitrage logic
- ✅ Much simpler implementation

#### Alternative: Tradeable Slice Tokens (More Complex)

If slices traded directly as separate tokens, merge/split conversion would be required:
- **Merge:** `110 + 111 → slice(AB)`
- **Split:** `slice(AB) → 110 + 111`

If the slice token got overpriced vs corners, arbitrage would sell slice and buy corners.
We avoid this complexity by using corners-only AMM + basket UI.

---

### 3) Position Accounting in Corner-Space

We represent every position internally as **exposure over the 8 corners**.
Cancellation happens automatically by normal addition/subtraction.

#### Internal Accounting Model

We store a portfolio vector `x[000..111]` = how many $1-per-share claims owned on each corner.

| Action | Effect |
|--------|--------|
| Buy corner 110 | `x[110] += 1` |
| Buy slice AB (110+111) | `x[110] += 1, x[111] += 1` |
| Sell corner 111 | `x[111] -= 1` |

#### Example: Automatic Netting

```
User buys slice AB = (110 + 111)
  → x[110] = 1, x[111] = 1

User sells corner 111
  → x[111] -= 1

Net result:
  → x[110] = 1, x[111] = 0
```

The "regardless of C" exposure is **gone** — now it's a pure corner bet on (1,1,0).

Positions are always stored in corner-space, so netting is exact — no manual cancellation needed.

#### UI Display (Merged Positions)

After netting, we compress the display for users:
- If `x[110]` and `x[111]` are both 5 → show **"5 shares of slice(AB)"**
- If only one exists → show corner

This feels magical for users, but it's just algebra on the corner vector.

---

### 4) AMM Scalability

Updating 8 markets per trade is trivial for the machine.

- We run **one AMM** that outputs 8 corner prices
- Marginals/slices are **derived** (sums of corner prices)
- The UI shows a small set; all 8 corners are only shown in "advanced mode"

**Why We Use LMSR:**
- Naturally supports **many outcomes**
- Always produces a **coherent probability distribution** (sums to 1)
- Single update formula handles any basket trade

```
User trades marginal A=Yes
  → AMM updates corners {100, 101, 110, 111}
  → All 8 prices recalculate via softmax
  → All derived marginals/slices update automatically
```

The computational cost is O(2^N) per trade, which is trivial for N ≤ 5 (32 outcomes).

---

### 5) TEE-Based Privacy for Informed Traders

Multi-dimensional markets amplify a known problem: **informed traders (insiders) are easier to identify**.

In traditional prediction markets, sophisticated observers can fingerprint traders by their betting patterns. In multi-dimensional markets, this becomes even easier — betting on specific corners or unusual slices creates a unique signature. Once identified, insiders face:
- **Copy-trading** — their edge disappears as others follow their bets
- **Social/legal exposure** — being linked back to real identity

This discourages informed traders from participating, which **hurts price discovery for everyone**.

#### Our Solution: TEE-Shielded Betting

We run the AMM inside a **Trusted Execution Environment (TEE)**. Individual bets remain encrypted and hidden; only the aggregated world table is published on-chain.

TEE provides:
- **Hardware-backed isolation** — computation runs in secure enclaves
- **Attestation proofs** — verifiable evidence that the TEE ran the correct LMSR code

```
User bet (encrypted) → TEE enclave
                        ├── Validates bet
                        ├── Updates internal world table (LMSR)
                        └── Publishes ONLY: new world prices

Public sees: p₀₀₀, p₀₀₁, ... p₁₁₁ (corner prices + derived marginals)
Public does NOT see: who bet what, individual position sizes
```

#### What This Achieves

| Property | Benefit |
|----------|---------|
| **Bet privacy** | Individual positions are never revealed on-chain |
| **Price transparency** | Full world table and all derived odds are public |
| **Computation integrity** | TEE attestation proves the AMM ran correctly |
| **Insider protection** | Informed traders can bet without fear of exposure |

#### Why This Matters for Multi-Dimensional Markets

The more dimensions, the more specific a bet can be — and the easier it is to identify *who* would know that specific combination of outcomes. TEE privacy is not just nice-to-have; it's **essential** to attract the informed capital that makes these markets accurate.

> We hide individual bets unlike Polymarket, but publish the full world table so anyone can see coherent, aggregated probabilities across all correlated events.