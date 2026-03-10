import { describe, it, expect } from "vitest";
import { getPriceValue, formatPrice, priceLabel } from "./formatPrice";

describe("getPriceValue", () => {
  it("returns priceTtc in TTC mode", () => {
    expect(getPriceValue(10, 12, "ttc")).toBe(12);
  });

  it("returns priceHt in HT mode", () => {
    expect(getPriceValue(10, 12, "ht")).toBe(10);
  });

  it("falls back to priceHt when priceTtc is null in TTC mode", () => {
    expect(getPriceValue(10, null, "ttc")).toBe(10);
  });

  it("falls back to priceTtc when priceHt is null in HT mode", () => {
    expect(getPriceValue(null, 12, "ht")).toBe(12);
  });

  it("returns 0 when both prices are null", () => {
    expect(getPriceValue(null, null, "ttc")).toBe(0);
    expect(getPriceValue(null, null, "ht")).toBe(0);
  });
});

describe("formatPrice", () => {
  it("formats TTC price with suffix", () => {
    expect(formatPrice(10, 12, "ttc")).toBe("12.00 € TTC");
  });

  it("formats HT price with suffix", () => {
    expect(formatPrice(10, 12, "ht")).toBe("10.00 € HT");
  });

  it("formats with 2 decimal places", () => {
    expect(formatPrice(9.5, 11.4, "ttc")).toBe("11.40 € TTC");
  });

  it("handles null prices with fallback", () => {
    expect(formatPrice(null, null, "ttc")).toBe("0.00 € TTC");
  });
});

describe("priceLabel", () => {
  it("returns HT for ht mode", () => {
    expect(priceLabel("ht")).toBe("HT");
  });

  it("returns TTC for ttc mode", () => {
    expect(priceLabel("ttc")).toBe("TTC");
  });
});
