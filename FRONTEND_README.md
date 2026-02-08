# Frontend – File Reference

Next.js frontend for the Iran War joint-outcome prediction market. This doc lists each main file and what it does.

---

## Pages (`pages/`)

| File | Purpose |
|------|--------|
| **`_app.tsx`** | App shell: loads global CSS (globals, GooeyButton, Dock, ElectricBorder, GradientText, PillNav) and wraps all pages. |
| **`_document.tsx`** | Custom Document (HTML, fonts). |
| **`index.tsx`** | Landing page: hero, market cards, Galaxy background, GSAP animations, navigation to markets. |
| **`IranWar.tsx`** | Main market page: view state (1D/2D/3D/Odds), selected outcomes, volume; renders MarketHeader, Visualizations, OrderBook, MarketRules, TradeSidebar, SidebarFeed. |
| **`yellow.tsx`** | Alternate / test page. |
| **`api/hello.ts`** | Example API route. |

---

## Components (`components/`)

### Layout & navigation

| File | Purpose |
|------|--------|
| **`Navbar.tsx`** | Top nav: logo (Logo.png), links. |
| **`MarketHeader.tsx`** | View switcher (1D, 2D, 3D, Odds) for the Iran War page. |
| **`PillNav.tsx`** | Pill-style nav with optional logo, items (label + href), active state, GSAP hover. Supports `onItemClick` for tab-style use (no navigation). |
| **`PillNav.css`** | Styles for PillNav (import in `_app.tsx`). Includes `.pill-nav-container-inline` and `.sidebar-feed` overrides (transparent pills, glass active). |

### Market UI (Iran War)

| File | Purpose |
|------|--------|
| **`Visualizations.tsx`** | Main chart/views: 1D line chart, 2D heatmap, 3D (JointMarket3D), Odds table. Selected Odds card, volume, selected outcome IDs, `onToggleOutcome` / `onSelectionChange`. |
| **`JointMarket3D.tsx`** | 3D joint-outcome cube (Three.js): 8 outcome cells, axes for the three questions, selections, `onSelectionChange`. |
| **`OrderBook.tsx`** | Order book panel: asks/bids around mid (from `avgPriceCents`), depth bars, last/volume, simulated fills; collapsible. |
| **`MarketRules.tsx`** | Collapsible market rules / resolution details. |
| **`TradeSidebar.tsx`** | Trading panel: Yes/No/Any per question, Market vs Limit, amount/shares, To win, Avg. Price, Buy button. Uses `lib/selectedOdds` and optional `forTheWinPercent` for multi-select. |

### Sidebar feed (comments & activity)

| File | Purpose |
|------|--------|
| **`SidebarFeed.tsx`** | Right column under TradeSidebar: PillNav tabs (Comments, Top Holders, Activity), transparent card; switches between CommentSection, placeholder Top Holders, ActivityFeed. |
| **`CommentSection.tsx`** | Comment list + “Add a comment” input; supports `embedded` for use inside SidebarFeed tabs; simulated live comments. |
| **`ActivityFeed.tsx`** | Activity list: “bought X Yes/No for … at …” rows, avatars, timestamps, Live indicator; simulated live activity. |

### Shared UI primitives

| File | Purpose |
|------|--------|
| **`GooeyButton.tsx`** | Animated button (e.g. Buy). |
| **`GooeyButton.css`** | GooeyButton styles (import in `_app.tsx`). |
| **`CountUp.tsx`** | Animated number count-up. |
| **`GradientText.tsx`** | Text with gradient fill; optional border/blur. |
| **`GradientText.css`** | GradientText styles (import in `_app.tsx`). |
| **`ElectricBorder.tsx`** | Electric/border effect. |
| **`ElectricBorder.css`** | ElectricBorder styles (import in `_app.tsx`). |
| **`FuzzyText.tsx`** | Glitch/fuzzy text effect. |
| **`DecryptedText.tsx`** | Reveal/decrypt-style text animation. |
| **`PixelCard.tsx`** | Card component with pixel-style border. |
| **`LiquidChrome.tsx`** | Liquid/chrome visual effect. |

### Background & dock

| File | Purpose |
|------|--------|
| **`Galaxy.tsx`** | Starfield/galaxy background (WebGL/Three or canvas). |
| **`Galaxy.css`** | Galaxy layout/styles (import in `_app.tsx`). |
| **`Dock.tsx`** | Bottom dock (e.g. nav icons). |
| **`Dock.css`** | Dock styles (import in `_app.tsx`). |

### Other components

| File | Purpose |
|------|--------|
| **`MarketPillSelector.tsx`** | Pill selector for choosing markets (used in Visualizations 2D). |
| **`utils.ts`** | Shared helpers (e.g. `cn` for classnames). |
| **`ui/chart.tsx`** | Chart wrapper (Recharts); used by Visualizations 1D. |
| **`ui/hyper-text.tsx`** | HyperText / link-style text component. |

---

## Lib (`lib/`)

| File | Purpose |
|------|--------|
| **`selectedOdds.ts`** | Joint-outcome logic: `JOINT_OUTCOMES`, `doesOutcomeMatch`, `calculateSelectedMarketProbability`, `probabilitySumForOutcomeIds`, `outcomeIdToSelections`, `selectionsToOutcomeIds`, `selectedOutcomeIdsToSelections`. Used by Visualizations, TradeSidebar, OrderBook, IranWar. |
| **`utils.ts`** | App-level utilities. |

---

## Styles (`styles/`)

| File | Purpose |
|------|--------|
| **`globals.css`** | Tailwind setup, theme vars, global resets, scrollbar (e.g. `.scrollbar-transparent`, `.animate-live-blink`), other shared styles. |

---

## Public assets (`public/`)

- **`Logo.png`** – Navbar logo.
- **`money.gif`** – TradeSidebar “To win” icon.
- **`Khamenei.jpg`**, **`US Iran.jpg`**, **`israeliran.jpg`** – Question images (Odds table, TradeSidebar).
- **`Background.jpg`**, **`cards/`**, **`companies/`** – Landing and marketing assets.
- **`favicon.ico`**, **`next.svg`**, **`vercel.svg`** – Default Next/Vercel assets.

---

## Data flow (Iran War page)

1. **`IranWar.tsx`** holds `selectedOutcomeIds`, `volume`; derives `selections` and `avgPriceCents` via `lib/selectedOdds`.
2. **Visualizations** gets `selectedOutcomeIds`, `onToggleOutcome`, `onSelectionChange`, `selections`, `volume`; drives 1D/2D/3D/Odds and Selected Odds card.
3. **OrderBook** gets `avgPriceCents`, `volume` for mid and header volume.
4. **TradeSidebar** gets `selections`, `onSelectionChange`, `forTheWinPercent` (e.g. `avgPriceCents`); syncs Yes/No/Any with selected outcomes.
5. **SidebarFeed** is self-contained (tabs + Comments / Top Holders / Activity).

---

## Running the app

```bash
npm install
npm run dev
```

Open the Iran War market via the landing page or route to `/IranWar` (or the path you use for `IranWar.tsx`).
