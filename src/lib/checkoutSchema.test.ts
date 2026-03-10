import { describe, it, expect } from "vitest";
import { checkoutStep1Schema, checkoutStep2Schema } from "./checkoutSchema";

const validAddress = {
  street: "123 rue de la Paix",
  city: "Paris",
  postal_code: "75001",
  country: "France",
};

describe("checkoutStep1Schema", () => {
  it("accepts valid step 1 data", () => {
    const result = checkoutStep1Schema.safeParse({
      customer_email: "test@example.com",
      customer_phone: "0123456789",
      shipping_address: validAddress,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = checkoutStep1Schema.safeParse({
      customer_email: "not-an-email",
      shipping_address: validAddress,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.path.includes("customer_email"))).toBe(true);
    }
  });

  it("rejects postal code with 4 digits", () => {
    const result = checkoutStep1Schema.safeParse({
      customer_email: "test@example.com",
      shipping_address: { ...validAddress, postal_code: "7500" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects postal code with letters", () => {
    const result = checkoutStep1Schema.safeParse({
      customer_email: "test@example.com",
      shipping_address: { ...validAddress, postal_code: "ABCDE" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects street shorter than 3 chars", () => {
    const result = checkoutStep1Schema.safeParse({
      customer_email: "test@example.com",
      shipping_address: { ...validAddress, street: "AB" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts without phone (optional)", () => {
    const result = checkoutStep1Schema.safeParse({
      customer_email: "test@example.com",
      shipping_address: validAddress,
    });
    expect(result.success).toBe(true);
  });
});

describe("checkoutStep2Schema", () => {
  it("accepts same_billing=true with empty billing", () => {
    const result = checkoutStep2Schema.safeParse({
      same_billing: true,
      billing_address: { street: "", city: "", postal_code: "", country: "France" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects same_billing=false with empty billing address", () => {
    const result = checkoutStep2Schema.safeParse({
      same_billing: false,
      billing_address: { street: "", city: "", postal_code: "", country: "France" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts same_billing=false with valid billing address", () => {
    const result = checkoutStep2Schema.safeParse({
      same_billing: false,
      billing_address: validAddress,
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes longer than 1000 chars", () => {
    const result = checkoutStep2Schema.safeParse({
      same_billing: true,
      billing_address: { street: "", city: "", postal_code: "", country: "France" },
      notes: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts notes up to 1000 chars", () => {
    const result = checkoutStep2Schema.safeParse({
      same_billing: true,
      billing_address: { street: "", city: "", postal_code: "", country: "France" },
      notes: "x".repeat(1000),
    });
    expect(result.success).toBe(true);
  });
});
