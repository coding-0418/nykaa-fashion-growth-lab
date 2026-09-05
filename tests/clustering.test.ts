import { describe, expect, it } from "vitest";
import { buildEvidenceClusters, dedupeEvidenceUnits } from "@/lib/discovery/clustering";
import type { EvidenceUnit } from "@/types/discovery";

const DEFAULT_SOURCE = {
  platform: "web",
  url: "https://example.com/mock-demo/a",
  discoveredAt: "2026-01-01T00:00:00.000Z",
};
const DEFAULT_CONTENT = {
  originalText: "I wasn't sure about the size so I checked Instagram.",
  relevantExcerpt: "I wasn't sure about the size so I checked Instagram",
};
const DEFAULT_BARRIER = { category: "fit" };
const DEFAULT_SEGMENT = { name: "comparison_shopper" };

function unit(overrides: Partial<EvidenceUnit> = {}): EvidenceUnit {
  return {
    id: "ev-1",
    journeyStage: "wishlist",
    wishlistIntent: "high_intent",
    informationNeeded: ["size"],
    alternatives: {},
    workaround: ["Instagram"],
    outcome: "still_considering",
    evidenceStrength: 3,
    relevance: "relevant",
    confidence: 0.8,
    needsReview: false,
    isMock: true,
    groundedExcerpt: true,
    uncertain: false,
    ...overrides,
    source: { ...DEFAULT_SOURCE, ...overrides.source },
    content: { ...DEFAULT_CONTENT, ...overrides.content },
    barrier: { ...DEFAULT_BARRIER, ...overrides.barrier },
    segment: { ...DEFAULT_SEGMENT, ...overrides.segment },
  };
}

describe("dedupeEvidenceUnits", () => {
  it("collapses two units with the same url and excerpt", () => {
    const a = unit({ id: "ev-1" });
    const b = unit({ id: "ev-2" });
    const { deduped, duplicatesRemoved } = dedupeEvidenceUnits([a, b]);
    expect(deduped).toHaveLength(1);
    expect(duplicatesRemoved).toBe(1);
  });

  it("keeps units with different excerpts", () => {
    const a = unit({ id: "ev-1" });
    const b = unit({
      id: "ev-2",
      content: { originalText: "different", relevantExcerpt: "a totally different statement" },
    });
    const { deduped, duplicatesRemoved } = dedupeEvidenceUnits([a, b]);
    expect(deduped).toHaveLength(2);
    expect(duplicatesRemoved).toBe(0);
  });
});

describe("buildEvidenceClusters", () => {
  it("works with a single sparse evidence unit", () => {
    const clusters = buildEvidenceClusters([unit()]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.evidenceCount).toBe(1);
    expect(clusters[0]?.sourceDiversity).toBe(1);
    expect(clusters[0]?.observedCount).toBe(1);
    expect(clusters[0]?.inferredCount).toBe(0);
  });

  it("groups evidence by barrier category into named themes", () => {
    const fit1 = unit({ id: "ev-1" });
    const fit2 = unit({
      id: "ev-2",
      source: { platform: "reddit", url: "https://reddit.com/r/x/1", discoveredAt: "2026-01-01T00:00:00.000Z" },
      content: { originalText: "returned for fit", relevantExcerpt: "returned for fit" },
      outcome: "returned",
    });
    const price = unit({
      id: "ev-3",
      barrier: { category: "price_value" },
      content: { originalText: "too expensive", relevantExcerpt: "too expensive" },
    });

    const clusters = buildEvidenceClusters([fit1, fit2, price]);
    expect(clusters).toHaveLength(2);
    const fitCluster = clusters.find((c) => c.barrierCategory === "fit");
    expect(fitCluster?.evidenceCount).toBe(2);
    expect(fitCluster?.sourceDiversity).toBe(2);
    expect(fitCluster?.theme).toContain("Fit");
  });

  it("distinguishes observed (grounded) from inferred evidence", () => {
    const grounded = unit({ id: "ev-1", groundedExcerpt: true, uncertain: false });
    const inferred = unit({
      id: "ev-2",
      groundedExcerpt: false,
      uncertain: true,
      content: { originalText: "maybe implied", relevantExcerpt: "maybe implied fit concern" },
    });
    const clusters = buildEvidenceClusters([grounded, inferred]);
    expect(clusters[0]?.observedCount).toBe(1);
    expect(clusters[0]?.inferredCount).toBe(1);
  });

  it("does not force 'other' evidence into the fixed taxonomy and surfaces subcategory as a theme", () => {
    const other = unit({
      id: "ev-1",
      barrier: { category: "other", subcategory: "gifting_uncertainty" },
      content: { originalText: "not sure if she'd like it as a gift", relevantExcerpt: "not sure if she'd like it as a gift" },
    });
    const clusters = buildEvidenceClusters([other]);
    expect(clusters[0]?.theme).toContain("gifting_uncertainty");
  });
});
