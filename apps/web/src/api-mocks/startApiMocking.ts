import { setupWorker } from "msw/browser";
import { createMarketMockHandlers } from "./market/handlers.ts";
import { parseMockScenario } from "./mockScenario.ts";

export async function startApiMocking(): Promise<void> {
  const scenario = parseMockScenario(window.location.search);
  const worker = setupWorker(...createMarketMockHandlers({ scenario }));

  await worker.start({
    serviceWorker: { url: "/mockServiceWorker.js" },
    onUnhandledRequest(request, print) {
      const { pathname } = new URL(request.url);
      if (pathname === "/v1" || pathname.startsWith("/v1/")) print.error();
    },
  });

  console.info(`[api-mocks] Running the "${scenario}" scenario.`);
}
