# Tyche UI architecture

This document defines the durable module boundaries and development conventions for Tyche UI. Design and implementation plans explain how the code reached this structure; this guide describes the structure contributors should preserve.

## Dependency direction

The application has four layers with one-way dependencies:

```text
app      -> features, domain, shared
features -> domain, shared
domain   -> shared
shared   -> other shared modules and third-party packages
```

The diagram is shorthand for these rules:

| Layer      | May import                                                    | Must not import                |
| ---------- | ------------------------------------------------------------- | ------------------------------ |
| `app`      | `features`, `domain`, `shared`, and third-party packages      | —                              |
| `features` | its own feature, `domain`, `shared`, and third-party packages | `app` or another feature       |
| `domain`   | its own domain module, `shared`, and third-party packages     | `app` or `features`            |
| `shared`   | other `shared` modules and third-party packages               | `app`, `features`, or `domain` |

Dependencies must not point upward. Features coordinate domain capabilities but do not become dependencies of the domain model. Shared code is application-agnostic and does not know which feature consumes it.

## Folder responsibilities

- `src/app` owns startup composition, providers, routing, route-level error handling, and the application shell. It contains no dashboard or watchlist business logic.
- `src/features` owns user-facing capabilities. A feature may contain its page, focused components, state hooks, interaction hooks, pure models, persistence parsing, and a narrow public API.
- `src/domain` owns business types, calculations, API adapters, server-state queries, and explicit fixtures. Domain values remain presentation-neutral.
- `src/shared` owns reusable UI, browser hooks, styles, and utilities that have independent consumers. It is not a catch-all for code that has not found an owner.

Tests are colocated with the behavior they protect. Do not introduce generic `helpers`, `common`, or catch-all `utils` folders. Extract shared code only after at least two independent consumers need the same concept.

## Public module APIs

Feature and domain modules expose deliberate public APIs through their root `index.ts` files:

- `features/dashboard/index.ts` exports `DashboardPage`.
- `features/watchlist/index.ts` exports `WatchlistPage`.
- `domain/market/index.ts` exports market domain types, query hooks, calculations, and explicitly named fixtures. It does not export generated DTOs.

Consumers outside a feature or domain module import from that public entry point. Files inside the same module use relative imports.

```ts
// app/router.tsx
import { DashboardPage } from "@/features/dashboard";

// features/watchlist/WatchlistPage.tsx
import { useMarketQuotes } from "@/domain/market";

// features/dashboard/components/grid/DashboardGrid.tsx
import { useGridPointerInteractions } from "../../hooks/useGridPointerInteractions.ts";
```

Do not add an export to `index.ts` merely to shorten an internal import. Generated OpenAPI types remain private to `domain/market/api`; the adapter is the boundary between transport types and application types.

Shared code uses the smallest focused public surface. A component may be imported from its explicit file, while cohesive collections such as `shared/components/charts` and `shared/components/settings` expose local barrels. There is intentionally no global shared barrel.

## Naming

Names should convey domain meaning without requiring repository history:

- Route components end in `Page`, such as `DashboardPage` and `WatchlistPage`.
- Application-frame components use names such as `AppShell`, `ApplicationHeader`, and `SidebarNavigation`.
- Components describe what they render: `DashboardGrid`, `WatchlistTable`, and `PercentChangeBadge`.
- Hooks describe the state or behavior they own: `useDashboardLayout`, `useWatchlistState`, and `useRowReordering`.
- Event props begin with `on`; local event handlers begin with `handle`.
- Boolean names begin with `is`, `has`, `can`, or `should`.
- Constants use complete domain names, such as `DASHBOARD_COLUMN_COUNT`, rather than abbreviations such as `COLS`.
- Dashboard geometry uses `column`, `row`, `columnSpan`, and `rowSpan`, not `x`, `y`, `w`, and `h`.
- Market models use names such as `lastPrice`, `changePercent`, and `marketCapitalization`. Generated DTO fields keep their contract-defined names and are translated by an adapter.

A file should have one clear responsibility and normally one primary exported concept. Conventional short loop indexes are acceptable only in a small local calculation where their meaning is obvious.

## Comments and development tracking

Comments explain why a constraint exists when the code cannot make it clear. Keep comments for:

- generated-file warnings;
- grid interaction invariants and non-obvious geometry;
- browser, CSS, or accessibility workarounds;
- intentional persistence fallbacks;
- filtering or ordering whose reason is not visible from the code.

Do not use comments to restate syntax, divide a file with decorative banners, preserve prototype history, speculate about future work, or track unfinished tasks. Git history, issues, design documents, and architecture records track development work.

## Application and market data flow

Application composition flows from the entry point into providers and routes:

```text
main.tsx -> App -> AppProviders + RouterProvider -> AppShell -> feature page
```

Market data crosses an explicit boundary:

```text
generated DTO -> market API adapter -> numeric MarketQuote -> TanStack Query -> feature -> component formatter
```

The sibling API contract generates `domain/market/api/generated/openapi.ts`. `marketApiClient.ts` uses those transport types, normalizes errors, and maps quote DTOs through `mapApiQuoteToMarketQuote`. Features consume `MarketQuote` and query hooks, never generated DTOs.

Market capitalization, volume, prices, and percentages remain numbers through the domain and feature layers. Formatting occurs only in the component that presents a value. TanStack Query owns request caching, retries, and request status. Explicit fixtures use the same domain types for dashboard sections without backend endpoints; they are not presented as live API data.

## Persistence

Feature state stored in `localStorage` uses versioned envelopes and runtime parsing.

```ts
// tyche.dashboard
{
  schemaVersion: 1,
  density,
  widgets,
}

// tyche.watchlists
{
  schemaVersion: 1,
  lists,
  activeListId,
  selectedSymbolsByListId,
  visibleMetricIdsByListId,
}
```

Parsers validate the schema version and every field needed by the feature. Invalid, stale, malformed, or unavailable storage returns `null`, and the owning hook creates a default state. Storage failures are intentionally non-fatal and retain a short explanatory comment.

The prototype does not migrate the old `tyche.dash.v1` or `tyche.watchlists.v2` payloads. Existing local dashboard and watchlist preferences may reset once; this is deliberate.

## Intended directory tree

Directories are created only when they contain real files. Test files are colocated with their implementation and omitted from this tree for clarity.

```text
src/
  main.tsx
  app/
    App.tsx
    router.tsx
    RouteErrorPage.tsx
    providers/
      AppProviders.tsx
    shell/
      AppShell.tsx
      ApplicationHeader.tsx
      SidebarNavigation.tsx
      AppearanceSettingsPanel.tsx
      hooks/
        useAppearanceSettings.ts
        useSidebarPreference.ts
        useThemePreference.ts

  features/
    dashboard/
      DashboardPage.tsx
      index.ts
      components/
        DashboardToolbar.tsx
        grid/
          DashboardGrid.tsx
          DashboardWidgetCard.tsx
          DashboardGridOverlay.tsx
          DashboardGrid.module.css
      hooks/
        useDashboardLayout.ts
        useGridPositionAnimations.ts
        useGridPointerInteractions.ts
      model/
        dashboardTypes.ts
        dashboardDefaults.ts
        dashboardStorage.ts
        gridLayout.ts
        resizeLayout.ts
      widgets/
        widgetCatalog.ts
        widgetRenderers.tsx
        components/
          DashboardWatchlistQuoteRow.tsx
          DashboardWatchlistWidget.tsx
          MarketIndicesWidget.tsx
          MarketNewsWidget.tsx
          PortfolioAllocationWidget.tsx
          PortfolioValueWidget.tsx
          PriceChartWidget.tsx
          StockQuoteWidget.tsx
          SymbolSelector.tsx
          TopMoversWidget.tsx
          WidgetMenuIcon.tsx

    watchlist/
      WatchlistPage.tsx
      index.ts
      components/
        AddTickerSearch.tsx
        ComparedSymbolChip.tsx
        CompareTray.tsx
        PriceRangeBar.tsx
        StatColumnPicker.tsx
        StockComparisonDialog.tsx
        StockComparisonDialog.module.css
        StockDetailPanel.tsx
        WatchlistTable.tsx
        WatchlistTable.module.css
      hooks/
        useClickOutside.ts
        useColumnReordering.ts
        useRowReordering.ts
        useWatchlistState.ts
      model/
        reorderItems.ts
        stockMetrics.ts
        watchlistDefaults.ts
        watchlistStorage.ts
        watchlistTypes.ts

  domain/
    market/
      index.ts
      api/
        generated/
          openapi.ts
        mapApiQuoteToMarketQuote.ts
        marketApiClient.ts
        marketQueries.ts
      fixtures/
        marketIndexFixtures.ts
        marketNewsFixtures.ts
        marketQuoteFixtures.ts
        portfolioPositionFixtures.ts
      model/
        calculatePortfolio.ts
        generateSampleSeries.ts
        marketTypes.ts

  shared/
    components/
      PercentChangeBadge.tsx
      charts/
        AreaChart.tsx
        SparklineChart.tsx
        index.ts
      layout/
        PageHeader.tsx
      settings/
        SettingsColorPicker.tsx
        SettingsPanel.tsx
        SettingsSection.tsx
        SettingsSlider.tsx
        SettingsToggle.tsx
        index.ts
        settings.module.css
    hooks/
      usePortalContainer.ts
    styles/
      index.css
    utilities/
      chartPaths.ts
      clampNumber.ts
      mergeClassNames.ts
      numberFormatters.ts
```

## Development commands

Run the smallest relevant check while working, then the complete gate before handoff.

| Command             | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `pnpm dev`          | Start the Vite development server                                 |
| `pnpm generate:api` | Regenerate typed API DTOs from the sibling API's OpenAPI contract |
| `pnpm test`         | Run the targeted Vitest suite once                                |
| `pnpm test:watch`   | Run Vitest in watch mode during development                       |
| `pnpm lint`         | Run oxlint                                                        |
| `pnpm typecheck`    | Run the TypeScript project build without application output       |
| `pnpm format`       | Format supported files with oxfmt                                 |
| `pnpm format:check` | Verify formatting without modifying files                         |
| `pnpm check`        | Run formatting, lint, type-checking, and tests                    |
| `pnpm build`        | Type-check and create the production Vite bundle in `dist/`       |

The expected final gate is:

```bash
pnpm check
pnpm build
```
