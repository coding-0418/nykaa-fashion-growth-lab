import { describe, expect, it } from "vitest";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import { generateHypotheses } from "@/lib/discovery/hypothesis";
import type { RankedOpportunity } from "@/types/discovery";
import { ScriptedAiProvider } from "./helpers/scripted-ai";

function opportunity(overrides: Partial<RankedOpportunity> = {}): RankedOpportunity {
  return {
    id: "opp-1",
    theme: "Fit & Size Uncertainty",
    behaviouralProblem: "checked Instagram before buying",
    barrierCategory: "fit",
    evidenceCount: 2,
    sourceDiversity: 2,
    strongestEvidence: null,
    representativeExcerpts: [
      {
        evidenceId: "ev-1",
        excerpt: "I wasn't sure about the size so I checked Instagram",
        url: "https://example.com/mock-demo/a",
        platform: "web",
        evidenceStrength: 4,
        grounded: true,
      },
    ],
    workaroundPatterns: ["Instagram"],
    likelySegments: ["comparison_shopper"],
    opportunityScore: {
      evidenceStrength: 0.7,
      behaviouralImpact: 0.6,
      actionability: 0.9,
      productRelevance: 1,
      compositeScore: 0.378,
      score100: 38,
    },
    confidence: "medium",
    observed: ["1 of 2 evidence unit(s) are directly grounded in retrieved source text."],
    inferred: [],
    recommendedNextResearchQuestion: "What fit signal would resolve this fastest?",
    isMock: true,
    ...overrides,
  };
}

function hypothesisJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    hypothesis: "Shoppers delay because they cannot confirm fit before buying.",
    targetBehaviour: "Wishlist item not purchased within 30 days.",
    suspectedRootCause: "No body-specific fit signal is available at decision time.",
    evidenceSupporting: ["I wasn't sure about the size so I checked Instagram"],
    evidenceWeakening: ["Only two documents in this run."],
    validation: "Survey Decision-Stuck Shoppers about fit confidence.",
    falsification: "If a Fit Check pilot shows no conversion change, this is not supported.",
    productIntervention: "Personalised Fit Check.",
    expectedUserValue: "Faster, more confident decisions.",
    expectedBusinessValue: "Directional lift in wishlist-to-purchase conversion.",
    ...overrides,
  });
}

describe("generateHypotheses without a configured AI provider", () => {
  it("falls back to template hypotheses and still works in demo mode", async () => {
    const ai = new ScriptedAiProvider([], false);
    const result = await generateHypotheses({
      opportunities: [opportunity()],
      config: DEFAULT_RESEARCH_CONFIG,
      ai,
      limits: DEFAULT_AI_LIMITS,
      mockMode: true,
    });

    expect(result.hypotheses).toHaveLength(1);
    expect(result.hypotheses[0]?.source).toBe("template_generated");
    expect(result.warnings.some((w) => w.includes("not configured"))).toBe(true);
    expect(ai.calls).toBe(0);
  });
});

describe("generateHypotheses with sparse evidence (no opportunities)", () => {
  it("returns an empty list without error", async () => {
    const ai = new ScriptedAiProvider([]);
    const result = await generateHypotheses({
      opportunities: [],
      config: DEFAULT_RESEARCH_CONFIG,
      ai,
      limits: DEFAULT_AI_LIMITS,
      mockMode: true,
    });
    expect(result.hypotheses).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe("generateHypotheses with a configured AI provider", () => {
  it("produces an AI-generated hypothesis grounded in the opportunity's excerpts", async () => {
    const ai = new ScriptedAiProvider([hypothesisJson()]);
    const result = await generateHypotheses({
      opportunities: [opportunity()],
      config: DEFAULT_RESEARCH_CONFIG,
      ai,
      limits: DEFAULT_AI_LIMITS,
      mockMode: true,
    });

    expect(result.hypotheses).toHaveLength(1);
    expect(result.hypotheses[0]?.source).toBe("ai_generated");
    expect(result.hypotheses[0]?.evidenceSupporting).toEqual([
      "I wasn't sure about the size so I checked Instagram",
    ]);
  });

  it("does not keep a fabricated supporting-evidence claim not present in the opportunity's excerpts", async () => {
    const ai = new ScriptedAiProvider([
      hypothesisJson({ evidenceSupporting: ["Users reported a 40% drop in returns after Fit Check"] }),
    ]);
    const result = await generateHypotheses({
      opportunities: [opportunity()],
      config: DEFAULT_RESEARCH_CONFIG,
      ai,
      limits: DEFAULT_AI_LIMITS,
      mockMode: true,
    });

    const supporting = result.hypotheses[0]?.evidenceSupporting ?? [];
    expect(supporting.join(" ")).not.toMatch(/40%/);
    expect(supporting).toEqual(["I wasn't sure about the size so I checked Instagram"]);
  });

  it("falls back to a template hypothesis when the model returns malformed JSON", async () => {
    const ai = new ScriptedAiProvider(["not json at all"]);
    const result = await generateHypotheses({
      opportunities: [opportunity()],
      config: DEFAULT_RESEARCH_CONFIG,
      ai,
      limits: DEFAULT_AI_LIMITS,
      mockMode: true,
    });

    expect(result.hypotheses).toHaveLength(1);
    expect(result.hypotheses[0]?.source).toBe("template_generated");
    expect(result.errors.some((e) => e.stage === "hypothesis")).toBe(true);
  });

  it("never claims a hypothesis is validated fact", async () => {
    const ai = new ScriptedAiProvider([hypothesisJson()]);
    const result = await generateHypotheses({
      opportunities: [opportunity()],
      config: DEFAULT_RESEARCH_CONFIG,
      ai,
      limits: DEFAULT_AI_LIMITS,
      mockMode: true,
    });
    expect(result.warnings.some((w) => w.toLowerCase().includes("not validated"))).toBe(true);
  });
});
