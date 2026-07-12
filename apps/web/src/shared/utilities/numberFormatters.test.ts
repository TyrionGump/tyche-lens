import { describe, expect, it } from "vitest";
import {
  formatCompactNumber,
  formatCurrency,
  formatSignedNumber,
  formatSignedPercent,
} from "./numberFormatters.ts";

describe("number formatters", () => {
  it("formats currency with a stable US display", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("adds a sign to percentage and numeric changes", () => {
    expect(formatSignedPercent(1.24)).toBe("+1.24%");
    expect(formatSignedPercent(-2.07)).toBe("-2.07%");
    expect(formatSignedNumber(2.63)).toBe("+2.63");
  });

  it("formats large raw values without changing the domain model", () => {
    expect(formatCompactNumber(3_280_000_000_000)).toBe("3.3T");
    expect(formatCompactNumber(48_200_000)).toBe("48.2M");
  });
});
