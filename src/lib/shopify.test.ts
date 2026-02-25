import { describe, it, expect } from "vitest";
import { formatPrice } from "./shopify";

describe("formatPrice", () => {
  it("formats EUR price correctly in French locale", () => {
    const result = formatPrice("12.50", "EUR");
    // French locale uses non-breaking space and comma
    expect(result).toMatch(/12[,.]50/);
    expect(result).toContain("€");
  });

  it("formats zero price", () => {
    const result = formatPrice("0", "EUR");
    expect(result).toMatch(/0[,.]00/);
    expect(result).toContain("€");
  });

  it("formats large price", () => {
    const result = formatPrice("1234.99", "EUR");
    expect(result).toMatch(/1[\s\u00a0.]?234[,.]99/);
  });

  it("handles string with leading zeros", () => {
    const result = formatPrice("09.90", "EUR");
    expect(result).toMatch(/9[,.]90/);
  });

  it("defaults to EUR when no currency specified", () => {
    const result = formatPrice("10.00");
    expect(result).toContain("€");
  });

  it("formats USD price", () => {
    const result = formatPrice("29.99", "USD");
    expect(result).toContain("$");
  });

  it("handles decimal-less amount", () => {
    const result = formatPrice("100", "EUR");
    expect(result).toMatch(/100[,.]00/);
  });
});
