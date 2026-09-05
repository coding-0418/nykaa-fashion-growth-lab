import { describe, expect, it } from "vitest";
import { confidenceForCluster, scoreCluster } from "@/lib/discovery/scoring";
import { rankOpportunities } from "@/lib/discovery/opportunities";
import type { EvidenceCluster } from "@/types/discovery";

function cluster(overrides: Partial<EvidenceCluster> = {}): EvidenceCluster {
  return {
    id: "cluster-fit",
    theme: "Fit & Size Uncertainty",
    barrierCategory: "fit",
    subcategories: [],
    behaviouralProblem: "checked Instagram before buying",
    evidenceIds: ["ev-1", "ev-2", "ev-3"],
    evidenceCount: 3,
    duplicatesCollapsed: 0,
    sourceDiversity: 2,
    journeyStages: ["wishlist"],
    outcomeCounts: { still_considering: 2, returned: 1 },
    workaroundPatterns: ["Instagram"],
    likelySegments: ["comparison_shopper"],
    representativeExcerpts: [
      {
        evidenceId: "ev-1",
        excerpt: "checked Instagram before buying",
        url: "https://example.com/a",
        platform: "web",
        evidenceStrength: 4,
        grounded: true,
      },
    ],
    strongestEvidence: null,
    observedCount: 3,
    inferredCount: 0,
    averageConfidence: 0.85,
    averageEvidenceStrength: 4,
    isMock: true,
    ...overrides,
  };
}

describe("scoreCluster", () => {
  it("returns four normalized [0,1] dimensions and a 0-100 composite", () => {
    const score = scoreCluster(cluster());
    for (const dim of [
      score.evidenceStrength,
      score.behaviouralImpact,
      score.actionability,
      score.productRelevance,
    ]) {
      expect(dim).toBeGreaterThanOrEqual(0);
      expect(dim).toBeLessThanOrEqual(1);
    }
    expect(score.score100).toBeGreaterThanOrEqual(0);
    expect(score.score100).toBeLessThanOrEqual(100);
  });

  it("scores a highly actionable fit cluster higher than a low-actionability price cluster with identical evidence shape", () => {
    const fit = scoreCluster(cluster({ barrierCategory: "fit" }));
    const price = scoreCluster(cluster({ barrierCategory: "price_value" }));
    expect(fit.actionability).toBeGreaterThan(price.actionability);
    expect(fit.score100).toBeGreaterThan(price.score100);
  });

  it("gives sparse, low-confidence, low-strength clusters a low confidence bucket", () => {
    const sparse = cluster({ evidenceCount: 1, averageConfidence: 0.3, averageEvidenceStrength: 1 });
    expect(confidenceForCluster(sparse)).toBe("low");
  });

  it("gives well-evidenced, high-confidence clusters a high confidence bucket", () => {
    const strong = cluster({ evidenceCount: 4, averageConfidence: 0.85 });
    expect(confidenceForCluster(strong)).toBe("high");
  });
});

describe("rankOpportunities", () => {
  it("sorts opportunities by score descending", () => {
    const strong = cluster({ id: "cluster-strong", barrierCategory: "fit" });
    const weak = cluster({
      id: "cluster-weak",
      barrierCategory: "price_value",
      evidenceCount: 1,
      workaroundPatterns: [],
      outcomeCounts: { unknown: 1 },
      averageConfidence: 0.3,
      averageEvidenceStrength: 1,
      observedCount: 0,
      inferredCount: 1,
    });

    const ranked = rankOpportunities([weak, strong]);
    expect(ranked[0]?.id).toBe("opp-cluster-strong");
    expect(ranked[0]!.opportunityScore.score100).toBeGreaterThanOrEqual(
      ranked[1]!.opportunityScore.score100,
    );
  });

  it("always includes a non-empty recommended next research question", () => {
    const [opportunity] = rankOpportunities([cluster()]);
    expect(opportunity?.recommendedNextResearchQuestion.length).toBeGreaterThan(0);
  });

  it("carries observed/inferred explanations through to the opportunity", () => {
    const [opportunity] = rankOpportunities([
      cluster({ observedCount: 2, inferredCount: 1, evidenceCount: 3 }),
    ]);
    expect(opportunity?.observed.join(" ")).toMatch(/2 of 3/);
    expect(opportunity?.inferred.join(" ")).toMatch(/1 of 3/);
  });
});
