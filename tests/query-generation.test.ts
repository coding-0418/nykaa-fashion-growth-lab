import { describe, expect, it } from "vitest";
import { generateSearchQueries } from "@/lib/retrieval/queries/generator";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";

describe("query generation", () => {
  it("is deterministic for the same config", () => {
    const a = generateSearchQueries(DEFAULT_RESEARCH_CONFIG, 8);
    const b = generateSearchQueries(DEFAULT_RESEARCH_CONFIG, 8);
    expect(a).toEqual(b);
  });

  it("includes the product and theme language", () => {
    const queries = generateSearchQueries(DEFAULT_RESEARCH_CONFIG, 20);
    const texts = queries.map((query) => query.text);
    expect(texts.some((text) => text.includes("Nykaa Fashion"))).toBe(true);
    expect(texts.some((text) => /wishlist/i.test(text))).toBe(true);
    expect(texts.some((text) => /Myntra|AJIO|fit|quality/i.test(text))).toBe(
      true,
    );
  });

  it("respects maxQueries", () => {
    const queries = generateSearchQueries(DEFAULT_RESEARCH_CONFIG, 3);
    expect(queries).toHaveLength(3);
  });

  it("can activate a theme family without freezing exact strings", () => {
    const queries = generateSearchQueries(
      {
        ...DEFAULT_RESEARCH_CONFIG,
        themes: ["fit_and_size_uncertainty"],
      },
      20,
    );
    expect(queries.some((query) => query.family === "fit_sizing")).toBe(true);
    expect(queries.some((query) => /size|fit/i.test(query.text))).toBe(true);
  });

  it("spreads a small query budget across multiple behavioural families instead of exhausting the first one or two", () => {
    const queries = generateSearchQueries(DEFAULT_RESEARCH_CONFIG, 6);
    const families = new Set(queries.map((query) => query.family));
    expect(families.size).toBeGreaterThanOrEqual(4);
  });

  it("includes fit/sizing and Reddit-targeted queries within a realistic default budget", () => {
    const queries = generateSearchQueries(DEFAULT_RESEARCH_CONFIG, 10);
    const families = queries.map((query) => query.family);
    expect(families).toContain("fit_sizing");
    expect(families).toContain("reddit_experiences");
  });
});
