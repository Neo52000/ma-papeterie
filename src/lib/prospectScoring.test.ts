import { describe, it, expect } from "vitest";
import { computeProspectScore } from "./prospectScoring";
import { nafToSegment, segmentLabel } from "./nafToSegment";

describe("nafToSegment", () => {
  it("maps education NAF codes to 'educational'", () => {
    expect(nafToSegment("85.10Z")).toBe("educational");
    expect(nafToSegment("85.20Z")).toBe("educational");
    expect(nafToSegment("85.59A")).toBe("educational");
    expect(nafToSegment("88.91A")).toBe("educational");
  });

  it("maps public administration NAF codes to 'public'", () => {
    expect(nafToSegment("84.11Z")).toBe("public");
    expect(nafToSegment("87.10A")).toBe("public");
  });

  it("maps liberal professions to 'liberal'", () => {
    expect(nafToSegment("69.20Z")).toBe("liberal"); // experts-comptables
    expect(nafToSegment("86.21Z")).toBe("liberal"); // médecins
    expect(nafToSegment("71.11Z")).toBe("liberal"); // architectes
  });

  it("falls back to division prefix match", () => {
    // Code exact non listé mais division 86 → liberal
    expect(nafToSegment("86.99Z")).toBe("liberal");
  });

  it("falls back to 'pme' for unknown codes", () => {
    expect(nafToSegment("47.11D")).toBe("pme"); // supermarchés
    expect(nafToSegment("10.13B")).toBe("pme"); // charcuterie
  });

  it("handles null/undefined gracefully", () => {
    expect(nafToSegment(null)).toBe("pme");
    expect(nafToSegment(undefined)).toBe("pme");
    expect(nafToSegment("")).toBe("pme");
  });

  it("normalizes casing", () => {
    expect(nafToSegment("85.10z")).toBe("educational");
    expect(nafToSegment(" 85.10Z ")).toBe("educational");
  });
});

describe("segmentLabel", () => {
  it("returns human-readable labels", () => {
    expect(segmentLabel("educational")).toContain("Éducation");
    expect(segmentLabel("public")).toContain("Collectivités");
    expect(segmentLabel("liberal")).toContain("libérales");
    expect(segmentLabel("pme")).toContain("PME");
  });
});

describe("computeProspectScore", () => {
  it("scores a Haute-Marne school highly", () => {
    const result = computeProspectScore({
      nafCode: "85.20Z",        // école primaire → educational (40)
      employeeRange: "12",      // 20-49 → 20
      foundedDate: "2000-09-01", // > 5 ans → 15
      dept: "52",               // Haute-Marne → 15
    });
    expect(result.segment).toBe("educational");
    expect(result.score).toBe(90);
    expect(result.breakdown).toEqual({
      segment: 40,
      employee: 20,
      seniority: 15,
      geography: 15,
    });
  });

  it("scores a small PME far from 52 low", () => {
    // On utilise une date relative pour éviter un test fragile au temps.
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const result = computeProspectScore({
      nafCode: "47.11D",
      employeeRange: "01",                     // 1-2 → 5
      foundedDate: twoMonthsAgo.toISOString().slice(0, 10), // < 6 mois → 2
      dept: "75",                              // Paris → 2
    });
    expect(result.segment).toBe("pme");
    // 15 (pme) + 5 (effectif) + 2 (seniority <6mois) + 2 (dept hors zone) = 24
    expect(result.score).toBe(24);
  });

  it("handles missing data without crashing", () => {
    const result = computeProspectScore({
      nafCode: null,
      employeeRange: null,
      foundedDate: null,
      dept: null,
    });
    // pme (15) + 0 + 0 + 0
    expect(result.score).toBe(15);
    expect(result.segment).toBe("pme");
  });

  it("caps score at 100", () => {
    const result = computeProspectScore({
      nafCode: "85.20Z",
      employeeRange: "53",      // 10000+ → 30
      foundedDate: "1950-01-01",
      dept: "52",
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("recognizes employee range labels as fallback", () => {
    const result = computeProspectScore({
      nafCode: "84.11Z",
      employeeRange: "50 à 99",
      foundedDate: null,
      dept: null,
    });
    expect(result.breakdown.employee).toBe(24);
  });

  it("penalizes very young companies", () => {
    const veryYoung = new Date();
    veryYoung.setMonth(veryYoung.getMonth() - 2);
    const result = computeProspectScore({
      nafCode: "85.20Z",
      employeeRange: null,
      foundedDate: veryYoung.toISOString().slice(0, 10),
      dept: "52",
    });
    // < 6 mois → 2 points
    expect(result.breakdown.seniority).toBe(2);
  });

  it("rewards established companies (>5 years)", () => {
    const result = computeProspectScore({
      nafCode: "85.20Z",
      employeeRange: null,
      foundedDate: "2015-01-01",
      dept: "52",
    });
    expect(result.breakdown.seniority).toBe(15);
  });
});
