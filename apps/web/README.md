# Tyche UI

Tyche UI is a React and TypeScript market dashboard prototype. The codebase uses feature-first boundaries, a generated OpenAPI client, and targeted tests to practice maintainable frontend development.

## Tech stack

- **React 19** and strict **TypeScript**
- **React Router** for application routing
- **TanStack Query** for server state
- **openapi-typescript** and **openapi-fetch** for the API boundary
- **Vite 8** and **Tailwind CSS 4**
- **Vitest**, **oxlint**, and **oxfmt** for validation

## Prerequisites

- **Node.js 22 or newer.** The supported major version is selected in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  nvm use
  ```

- **pnpm.** Use Corepack so the exact version pinned in `package.json` is selected:

  ```bash
  corepack enable
  ```

- **The Tyche API app (`apps/api`).** The UI generates its client types from the API app's contract at `../api/api/openapi.yaml` (relative to `apps/web`). During local development the API is expected at `http://127.0.0.1:8081`; Vite proxies UI requests under `/v1` to that address.

## Getting started

From `apps/web`:

```bash
pnpm install
pnpm generate:api
pnpm dev
```

The development server is available at `http://localhost:5173` by default. For live market requests, start the sibling API in another terminal:

```bash
cd ../api
go run ./cmd/tyche-api
```

The generated API file is committed, so the UI can still be built without regenerating it. Run `pnpm generate:api` whenever the OpenAPI contract changes.

## Scripts

| Command             | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `pnpm dev`          | Start the Vite development server with HMR                    |
| `pnpm generate:api` | Generate TypeScript DTOs from `../api/api/openapi.yaml` |
| `pnpm test`         | Run the targeted Vitest suite once                            |
| `pnpm test:watch`   | Run Vitest in watch mode                                      |
| `pnpm check`        | Check formatting, lint, TypeScript, and tests                 |
| `pnpm build`        | Type-check and build the production bundle into `dist/`       |
| `pnpm typecheck`    | Run the TypeScript project build                              |
| `pnpm lint`         | Lint with oxlint                                              |
| `pnpm lint:fix`     | Lint and apply safe fixes                                     |
| `pnpm format`       | Format supported files with oxfmt                             |
| `pnpm format:check` | Check formatting without modifying files                      |
| `pnpm preview`      | Serve the production build locally                            |

`generate:api` runs `openapi-typescript` through `pnpm dlx` with a pinned TypeScript 5: the codegen needs the TypeScript 5 compiler API, which the app's own TypeScript 7 (native) toolchain no longer ships. Bump the pinned versions in the script when upgrading.

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
