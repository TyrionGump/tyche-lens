import { describe, expect, it } from "vitest";
import * as marketDomain from "./index.ts";

describe("market domain public API", () => {
  it("exposes query hooks without leaking transport functions or cache keys", () => {
    expect(marketDomain).toHaveProperty("useMarketQuotes");
    expect(marketDomain).not.toHaveProperty("fetchMarketQuotes");
    expect(marketDomain).not.toHaveProperty("fetchMarketHistory");
    expect(marketDomain).not.toHaveProperty("searchMarketSymbols");
    expect(marketDomain).not.toHaveProperty("marketQueryKeys");
  });

  it("does not leak internal-only helpers", () => {
    expect(marketDomain).not.toHaveProperty("generateSampleSeries");
  });
});
