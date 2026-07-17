# Source layout

The application API boundary and its development API mocks are separate:

```text
features -> api -> HTTP request
                    |-> backend handles it in API and production modes
                    \-> api-mocks intercept requests in mock mode and Node tests
```

| Path        | Responsibility                                                                | Runtime use            |
| ----------- | ----------------------------------------------------------------------------- | ---------------------- |
| `api`       | Generated transport contracts, handwritten adapters, and server-state queries | Every application mode |
| `api-mocks` | Generated Faker factories, response builders, handlers, and mocking startup   | Development and tests  |
| `domain`    | Business types, calculations, and explicit prototype fixtures                 | Every application mode |
| `features`  | User-facing dashboard and watchlist behavior                                  | Every application mode |

`api` is always the consumer. `api-mocks` does not replace it; MSW supplies responses to the
same requests that reach the backend in API and production modes. Production features never
import `api-mocks`. The application bootstrap dynamically imports its entry point only in mock
mode.

Mock development generates the browser worker into the project-root `../msw-public` directory
before Vite starts. It remains outside `src` because Vite serves it as an unbundled root asset
only in mock development mode.

Within both API-related boundaries, `generated` is machine-owned contract output and `market`
is handwritten market-specific integration. Handwritten modules may depend on generated code;
generated code must not depend on handwritten market modules. Generated directories are
recreated on demand and ignored by Git.

See [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the complete dependency rules.
