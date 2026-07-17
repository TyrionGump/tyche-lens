import { describe, expect, it } from "vitest";
import * as marketDomain from "./index.ts";

describe("market domain public API", () => {
  it("does not expose API transport or server-state hooks", () => {
    expect(marketDomain).not.toHaveProperty("useMarketQuotes");
    expect(marketDomain).not.toHaveProperty("useMarketHistory");
    expect(marketDomain).not.toHaveProperty("useMarketSymbolSearch");
    expect(marketDomain).not.toHaveProperty("fetchMarketQuotes");
    expect(marketDomain).not.toHaveProperty("fetchMarketHistory");
    expect(marketDomain).not.toHaveProperty("searchMarketSymbols");
    expect(marketDomain).not.toHaveProperty("marketQueryKeys");
  });

  it("does not leak internal-only helpers", () => {
    expect(marketDomain).not.toHaveProperty("generateSampleSeries");
  });
});
