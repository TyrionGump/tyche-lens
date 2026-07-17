# Tyche UI architecture

This document defines the durable module boundaries and development conventions for Tyche UI. Design and implementation plans explain how the code reached this structure; this guide describes the structure contributors should preserve.

## Dependency direction

Production code has one-way dependencies, while `api-mocks` is development/test-only:

```text
app       -> features, api, domain, shared
app       -dev-only-> api-mocks
features  -> api, domain, shared
api       -> domain, shared
domain    -> shared
api-mocks -> api/generated, domain, shared
shared    -> other shared modules and third-party packages
```

The diagram is shorthand for these rules:

| Layer       | May import                                                                                               | Must not import                                    |
| ----------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `app`       | `features`, `api`, `domain`, `shared`, third-party packages, and the development `api-mocks` entry point | —                                                  |
| `features`  | its own feature, `api`, `domain`, `shared`, and third-party packages                                     | `app`, `api-mocks`, or another feature             |
| `api`       | `domain`, `shared`, generated transport code, and third-party code                                       | `app`, `features`, or `api-mocks`                  |
| `domain`    | its own domain module, `shared`, and third-party packages                                                | `app`, `features`, `api`, or `api-mocks`           |
| `api-mocks` | `api/generated`, `domain`, `shared`, and third-party packages                                            | `app` or `features`                                |
| `shared`    | other `shared` modules and third-party packages                                                          | `app`, `features`, `api`, `domain`, or `api-mocks` |

`app/enableApiMocking.ts` is the sole exception to the production graph: in development mock mode it dynamically imports `api-mocks/startApiMocking.ts`. No production feature statically imports the API-mocking layer, so production builds can remove it. Features coordinate API and domain capabilities but never become dependencies of either. Shared code is application-agnostic and does not know which feature consumes it.

## Folder responsibilities

- `src/app` owns startup composition, providers, routing, route-level error handling, and the application shell. It contains no dashboard or watchlist business logic.
- `src/api` owns application-side HTTP transport, generated DTOs and validators, DTO-to-domain adapters, and server-state queries. It is used in both backend and mocked modes.
- `src/features` owns user-facing capabilities. A feature may contain its page, focused components, state hooks, interaction hooks, pure models, persistence parsing, and a narrow public API.
- `src/domain` owns business types, calculations, and explicit prototype fixtures. It contains no HTTP, TanStack Query, or mock-server code. Domain values remain presentation-neutral.
- `src/api-mocks` owns all development and test API mocking: generated Faker factories, curated response construction, request handlers, scenarios, and browser-worker startup. Handlers contain behavior; response builders contain data construction.
- `src/shared` owns reusable UI, browser hooks, styles, and utilities that have independent consumers. It is not a catch-all for code that has not found an owner.

Tests are colocated with the behavior they protect. Do not introduce generic `helpers`, `common`, or catch-all `utils` folders. Extract shared code only after at least two independent consumers need the same concept.

## Public module APIs

Application, feature, API, and domain modules expose deliberate public entry points:

- `app/shell/index.ts` exports `AppShell`. Its components and hooks are internal implementation details.
- `features/dashboard/index.ts` exports `DashboardPage`.
- `features/watchlist/index.ts` exports `WatchlistPage`.
- `api/market/index.ts` exports the market server-state hooks and their public result type. It does not export low-level Fetch functions, query keys, or generated DTOs.
- `domain/market/index.ts` exports market domain types, calculations, and explicitly named prototype fixtures. It does not export transport or mock concerns.

The API-mocking module intentionally has no broad barrel. `app/enableApiMocking.ts` imports only its development entry point; tests import the specific handler or response module they exercise.

Consumers outside a module import from that public entry point. Files inside the same module use relative imports.

```ts
// app/router.tsx
import { AppShell } from "@/app/shell";
import { DashboardPage } from "@/features/dashboard";

// features/watchlist/WatchlistPage.tsx
import { useMarketQuotes } from "@/api/market";
import type { MarketQuote } from "@/domain/market";

// features/dashboard/components/grid/DashboardGrid.tsx
import { useGridPointerInteractions } from "../../hooks/useGridPointerInteractions.ts";
```

Do not add an export to `index.ts` merely to shorten an internal import. Generated OpenAPI types remain private to `api`; the adapter is the boundary between transport types and application types.

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
OpenAPI -> api/generated client + DTOs + request/response validators
       \-> api-mocks/generated Faker response factories
                                      |
domain fixtures -> mock responses -> handwritten handlers -> browser worker / Node tests
                                      |
generated DTO -> api/market adapter -> numeric MarketQuote -> TanStack Query -> feature
```

Orval generates `api/generated/` and `api-mocks/generated/` from the sibling API's OpenAPI contract. `api/market/marketApiClient.ts` wraps the generated Fetch functions, normalizes errors, and maps quote DTOs through `mapApiQuoteToMarketQuote`. Features consume domain models and API query hooks, never generated DTOs.

`api-mocks/market/handlers.ts` is the only authority for mocked HTTP behavior. It validates raw URL parameters with generated Zod schemas before applying domain normalization, then owns stable endpoint semantics and named product scenarios. `api-mocks/market/responses.ts` builds responses through deterministically seeded generated Faker factories; generated response validators verify those payloads in tests. Both browser development and Node integration tests use the same handwritten handlers. There is no generated MSW fallback layer that can silently answer a missing route.

Stable identity and market values come from the explicit domain fixtures because those values are also rendered directly by prototype dashboard sections. They are data, not server behavior. Mock-only generation, scenarios, handlers, and runtime startup stay under `api-mocks`. Handwritten responses spread deliberate overrides over a generated contract-complete object, so newly required fields receive generated values without a parallel manual fixture edit. Removed, renamed, or semantically meaningful fields still fail TypeScript or contract tests and require an intentional decision. Generated outputs are reproducible, ignored by Git, created before a consuming command runs, and never edited directly.

`main.tsx` awaits API-mocking setup before rendering React. `enableApiMocking.ts` dynamically imports `api-mocks/startApiMocking.ts` only in development mock mode. `pnpm dev` creates `msw-public/mockServiceWorker.js` before Vite serves it; `api` mode uses the Go proxy without creating the worker, and every production build includes neither the worker asset nor mock runtime code.

`src/api-mocks` owns application-specific scenarios, handlers, responses, and startup. The generated, Git-ignored project-root `msw-public` directory contains the unbundled MSW transport that intercepts browser requests at the root scope. The separate names distinguish project-owned mock behavior from the tool-owned public transport, while the separate directories preserve the boundary between bundled source and Vite-served assets.

Market capitalization, volume, prices, and percentages remain numbers through the domain and feature layers. Formatting occurs only in the component that presents a value. TanStack Query owns request caching, retries, and request status. Explicit fixtures use the same domain types for dashboard sections without backend endpoints; they are not presented as live API data.

## Persistence

Feature state stored in `localStorage` uses versioned envelopes and runtime parsing.

```ts
// tyche.dashboard
{
  schemaVersion: 1,
  density,
  widgets
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
msw-public/  # generated on demand
  mockServiceWorker.js

src/
  README.md
  main.tsx
  app/
    App.tsx
    enableApiMocking.ts
    router.tsx
    RouteErrorPage.tsx
    providers/
      AppProviders.tsx
    shell/
      index.ts
      AppShell.tsx
      ApplicationHeader.tsx
      SidebarNavigation.tsx
      AppearanceSettingsPanel.tsx
      hooks/
        useAppearanceSettings.ts
        useSidebarPreference.ts
        useThemePreference.ts

  api/
    generated/  # generated on demand
      client.ts
      validation.ts
      models/
    market/
      index.ts
      mapApiQuoteToMarketQuote.ts
      marketApiClient.ts
      marketQueries.ts

  api-mocks/
    startApiMocking.ts
    mockScenario.ts
    generated/  # generated on demand
      client.faker.ts
    market/
      catalog.ts
      handlers.ts
      responses.ts

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
      fixtures/
        marketIndexFixtures.ts
        marketNewsFixtures.ts
        marketQuoteFixtures.ts
        portfolioPositionFixtures.ts
      model/
        calculatePortfolio.ts
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
      generateSampleSeries.ts
      mergeClassNames.ts
      numberFormatters.ts
```

## Development commands

The project README is the canonical package-script reference. Run the smallest relevant focused
command while working, then the complete gate before handoff.

The expected final gate is:

```bash
pnpm check
pnpm build
```
