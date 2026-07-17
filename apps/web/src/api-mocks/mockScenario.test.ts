import { describe, expect, it } from "vitest";
import { MOCK_SCENARIOS, parseMockScenario } from "./mockScenario.ts";

describe("parseMockScenario", () => {
  it.each(["", "?other=value", "?mockScenario="])("defaults to normal for %s", (search) => {
    expect(parseMockScenario(search)).toBe("normal");
  });

  it.each(MOCK_SCENARIOS)("accepts the %s scenario", (scenario) => {
    expect(parseMockScenario(`?mockScenario=${scenario}`)).toBe(scenario);
  });

  it("rejects unknown scenarios with actionable context", () => {
    expect(() => parseMockScenario("?mockScenario=offline")).toThrowError(
      'Unknown mock scenario "offline". Expected one of: normal, empty, error, slow.',
    );
  });
});
