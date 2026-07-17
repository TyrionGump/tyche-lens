# Tyche UI

Tyche UI is a React and TypeScript market dashboard prototype. The codebase uses feature-first boundaries, a contract-generated API boundary, and targeted tests to practice maintainable frontend development. Its default development mode runs without a backend.

## Tech stack

- **React 19** and strict **TypeScript**
- **React Router** for application routing
- **TanStack Query** for server state
- **Orval** for generated Fetch clients, DTOs, Zod validators, and Faker response factories
- **Zod 4** for contract-derived request and response validation
- **Mock Service Worker (MSW)** for browser and Node API mocking
- **Vite 8** and **Tailwind CSS 4**
- **Vitest**, **oxlint**, and **oxfmt** for validation

## Prerequisites

- **Node.js 22.22.1 or newer.** The supported major version is selected in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  nvm use
  ```

- **pnpm.** Use Corepack so the exact version pinned in `package.json` is selected:

  ```bash
  corepack enable
  ```

- The OpenAPI contract at `../api/api/openapi.yaml`. The Go API does not need to run unless you deliberately use real-API mode.

## Getting started

From `apps/web`:

```bash
pnpm install
pnpm dev
```

The development server is available at `http://localhost:5173` by default. `pnpm dev` regenerates the transport layer, starts MSW before React renders, and serves deterministic local responses for every current API request.

To develop against the real Go API, start it in one terminal:

```bash
cd ../api
go run ./cmd/tyche-api
```

Then start the web app in another terminal:

```bash
pnpm dev:api
```

`dev:api` enables Vite's `/v1` proxy to `http://127.0.0.1:8081` and does not serve the MSW worker.

## Mock scenarios

Use the `mockScenario` query parameter to exercise stable UI states without changing code:

| URL                     | Behavior                                        |
| ----------------------- | ----------------------------------------------- |
| `/?mockScenario=normal` | Deterministic success data; this is the default |
| `/?mockScenario=empty`  | Contract-valid empty collections                |
| `/?mockScenario=error`  | Documented API failure responses                |
| `/?mockScenario=slow`   | Normal data after a 1.5 second delay            |

An unknown scenario stops startup with a visible error instead of silently falling back. Unhandled `/v1` requests also fail loudly. Requests outside `/v1` are left alone.

## Contract generation

OpenAPI is the transport source of truth. `pnpm generate:api` uses `orval.config.ts` to replace the generated parts of `src/api/` and `src/api-mocks/` with:

- Fetch client functions and DTO models in `src/api/generated/`;
- Zod request and response schemas plus constraint constants in `src/api/generated/`;
- Faker response factories in `src/api-mocks/generated/`.

`pnpm generate:msw-worker` separately creates the version-matched worker in `msw-public/mockServiceWorker.js`. Mock development runs both generators before Vite starts; real-API development, tests, type-checking, and production builds generate the contract-derived TypeScript without creating the browser worker.

`src/api-mocks/market/handlers.ts` is the single authority for mocked HTTP behavior. It validates requests with the generated Zod schemas and delegates payload construction to seeded Faker factories composed with stable domain fixtures. Newly required response fields therefore receive contract-valid, deterministic generated values without a parallel fixture edit; deliberate product values and scenarios stay stable. Renamed or semantically important fields still fail TypeScript or contract tests so they receive an explicit review.

`src/api-mocks/` owns application-specific mock behavior. The project-root `msw-public/` directory contains MSW's generated, unbundled browser worker and is served by Vite only in mock development mode.

Generated outputs are reproducible, ignored by Git, and never edited by hand. Commands that consume them generate them first, so a clean checkout can run development, checks, or builds without a separate preparation step.

## Scripts

Most development uses four commands:

| Command        | Description                                                          |
| -------------- | -------------------------------------------------------------------- |
| `pnpm dev`     | Generate API and worker artifacts, then start backend-free mock mode |
| `pnpm dev:api` | Generate the API layer and start real-API proxy mode                 |
| `pnpm check`   | Generate, then check formatting, lint, TypeScript, and tests         |
| `pnpm build`   | Regenerate, type-check, and build the production bundle into `dist/` |

Focused commands remain available when working on one concern:

| Command                    | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `pnpm generate:api`        | Refresh contract code, validators, and Faker factories    |
| `pnpm generate:msw-worker` | Refresh the browser worker used by mock development       |
| `pnpm test`                | Generate the API layer and run the Vitest suite once      |
| `pnpm test:watch`          | Generate the API layer and run Vitest in watch mode       |
| `pnpm typecheck`           | Generate the API layer and run the TypeScript build       |
| `pnpm lint`                | Lint handwritten source with oxlint                       |
| `pnpm lint:fix`            | Lint handwritten source and apply safe fixes              |
| `pnpm format`              | Format supported handwritten files with oxfmt             |
| `pnpm format:check`        | Check handwritten-file formatting without modifying files |
| `pnpm preview`             | Serve the production build locally                        |

Run `pnpm run` to list the complete command surface, including lifecycle hooks.

Before handing off a change, run:

```bash
pnpm check
pnpm build
```

## Architecture

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before introducing a new top-level folder, public module export, persistence shape, or cross-layer dependency.

## Editor setup (WebStorm / IntelliJ)

Oxc is not bundled with the IDE. Install the **Oxc** plugin for inline lint diagnostics and oxfmt formatting:

1. **Settings → Plugins → Marketplace**, search **"Oxc"**, install, and restart.
2. Enable **format on save** in the plugin settings.
3. Disable the built-in **ESLint** and **Prettier** integrations so they do not conflict (Settings → Languages & Frameworks → JavaScript → Code Quality Tools).

For VS Code, install the **"Oxc"** extension instead.
