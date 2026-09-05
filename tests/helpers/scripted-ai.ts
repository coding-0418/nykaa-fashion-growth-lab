import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from "@/lib/ai/provider";

export class ScriptedAiProvider implements AiProvider {
  readonly name = "gemini" as const;
  calls = 0;

  constructor(
    private readonly script: Array<string | Error>,
    private readonly configured = true,
  ) {}

  isConfigured(): boolean {
    return this.configured;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    return this.completeStructured(request);
  }

  async completeStructured(
    request: AiCompletionRequest,
  ): Promise<AiCompletionResult> {
    void request;
    this.calls += 1;
    const next = this.script.shift();
    if (next === undefined) {
      throw new Error("Scripted AI provider has no remaining responses.");
    }
    if (next instanceof Error) {
      throw next;
    }
    return { text: next, provider: "gemini", model: "scripted-test" };
  }
}

export function relevanceJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    relevance: "relevant",
    reason: "Specific shopping behaviour is described.",
    journeyStages: ["wishlist"],
    confidence: 0.9,
    ...overrides,
  });
}

export function extractionJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    journeyStage: "wishlist",
    wishlistIntent: "unknown",
    barrier: { category: "other", subcategory: null },
    informationNeeded: [],
    alternatives: {
      sameProductElsewhere: [],
      similarProducts: [],
      otherPlatforms: [],
    },
    workaround: [],
    outcome: "unknown",
    segment: { name: "unknown", reasoning: "" },
    evidenceStrength: 3,
    confidence: 0.8,
    relevantExcerpt: "I saved the dress",
    uncertain: false,
    multipleBarriersPlausible: false,
    ...overrides,
  });
}
