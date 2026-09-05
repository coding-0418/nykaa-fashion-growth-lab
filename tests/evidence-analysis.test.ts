import { describe, expect, it } from "vitest";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import { runEvidenceAnalysis } from "@/lib/discovery/analysis";
import { manualQaDocuments, MANUAL_QA_FIXTURES } from "@/lib/discovery/fixtures/manual-qa";
import { runDiscoveryPipeline } from "@/lib/discovery/pipeline";
import type { RawDocument } from "@/types/retrieval";
import type { RetrievalRunResult } from "@/types/retrieval";
import {
  extractionJson,
  relevanceJson,
  ScriptedAiProvider,
} from "./helpers/scripted-ai";

const limits = {
  ...DEFAULT_AI_LIMITS,
  maxDocumentsScreened: 8,
  maxDocumentsExtracted: 6,
  concurrency: 1,
};

function emptyRetrieval(documents: RawDocument[]): RetrievalRunResult {
  return {
    success: true,
    status: "success",
    pipelineImplemented: true,
    queries: [],
    searchResults: [],
    documents,
    stats: {
      queriesGenerated: 0,
      resultsFound: documents.length,
      documentsFetched: documents.length,
      documentsFailed: 0,
      duplicatesRemoved: 0,
      documentsSkipped: 0,
    },
    warnings: [],
    message: "mocked retrieval",
    mockMode: true,
    errors: [],
  };
}

describe("empty document", () => {
  it("skips AI calls and does not invent evidence", async () => {
    const ai = new ScriptedAiProvider([]);
    const empty: RawDocument = {
      id: "empty",
      source: "web",
      url: "https://example.com/mock-demo/empty",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      content: "   ",
      contentType: "text/plain",
      isMock: true,
    };

    const result = await runEvidenceAnalysis({
      config: DEFAULT_RESEARCH_CONFIG,
      documents: [empty],
      ai,
      limits,
      mockMode: true,
    });

    expect(ai.calls).toBe(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.documentProcessing[0]?.screeningStatus).toBe("skipped");
  });
});

describe("one AI failure while other documents succeed", () => {
  it("keeps the successful unit and records the failure", async () => {
    const docs = MANUAL_QA_FIXTURES.slice(0, 2).map((item) => item.document);
    const ai = new ScriptedAiProvider([
      relevanceJson({ journeyStages: ["wishlist"] }),
      new Error("provider timeout"),
      extractionJson({
        relevantExcerpt: "I do not plan to buy anytime soon",
        wishlistIntent: "bookmark",
        evidenceStrength: 3,
      }),
    ]);

    const result = await runEvidenceAnalysis({
      config: DEFAULT_RESEARCH_CONFIG,
      documents: docs,
      ai,
      limits: { ...limits, concurrency: 1 },
      mockMode: true,
    });

    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.source.url).toBe(docs[0]?.url);
    expect(
      result.documentProcessing.some((item) => item.screeningStatus === "failed"),
    ).toBe(true);
    expect(result.evidence[0]?.isMock).toBe(true);
  });
});

describe("API-style pipeline with multiple documents", () => {
  it("screens two documents, filters irrelevant, and preserves URLs", async () => {
    const docs = [MANUAL_QA_FIXTURES[1]!.document, MANUAL_QA_FIXTURES[4]!.document];
    const ai = new ScriptedAiProvider([
      relevanceJson({
        relevance: "relevant",
        reason: "Size uncertainty and an external check.",
      }),
      relevanceJson({
        relevance: "irrelevant",
        reason: "Generic delivery complaint with no purchase decision.",
        journeyStages: [],
        confidence: 0.92,
      }),
      extractionJson({
        journeyStage: "product_evaluation",
        wishlistIntent: "high_intent",
        barrier: { category: "fit", subcategory: "size" },
        informationNeeded: ["size", "fit"],
        workaround: ["Instagram"],
        relevantExcerpt: "I wasn't sure about the size so I checked Instagram",
        evidenceStrength: 4,
        confidence: 0.86,
      }),
    ]);

    const result = await runDiscoveryPipeline(DEFAULT_RESEARCH_CONFIG, {
      ai,
      aiLimits: { concurrency: 1, maxDocumentsExtracted: 6, maxDocumentsScreened: 8 },
      runRetrieval: async () => emptyRetrieval(docs),
    });

    expect(result.documents).toHaveLength(2);
    expect(result.stats.documentsScreened).toBe(2);
    expect(result.stats.relevantDocuments).toBe(1);
    expect(result.stats.irrelevantDocuments).toBe(1);
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]?.source.url).toBe(docs[0]?.url);
    expect(result.evidence[0]?.workaround).toEqual(["Instagram"]);
    expect(result.evidence[0]?.needsReview).toBe(false);
    expect(result.mockMode).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("MOCK"))).toBe(true);
  });
});

describe("mock mode fixtures A-F", () => {
  it("labels mock evidence and does not treat fixtures as Nykaa research", async () => {
    const docs = manualQaDocuments();
    const ai = new ScriptedAiProvider([
      relevanceJson({ relevance: "relevant" }),
      relevanceJson({ relevance: "relevant" }),
      relevanceJson({ relevance: "relevant" }),
      relevanceJson({ relevance: "relevant" }),
      relevanceJson({
        relevance: "irrelevant",
        reason: "Unrelated delivery complaint.",
      }),
      relevanceJson({ relevance: "relevant" }),
      extractionJson({
        relevantExcerpt: "I do not plan to buy anytime soon",
        wishlistIntent: "bookmark",
      }),
      extractionJson({
        relevantExcerpt: "I wasn't sure about the size so I checked Instagram",
        barrier: { category: "fit" },
        workaround: ["Instagram"],
      }),
      extractionJson({
        relevantExcerpt: "I found the same dress on Myntra",
        outcome: "purchased_elsewhere",
        alternatives: { sameProductElsewhere: ["Myntra"] },
      }),
      extractionJson({
        relevantExcerpt: "I returned it because the fit was wrong",
        outcome: "returned",
        barrier: { category: "fit" },
      }),
      extractionJson({
        relevantExcerpt: "I am still thinking about whether to buy it",
        wishlistIntent: "occasion_based",
        outcome: "still_considering",
      }),
    ]);

    const result = await runEvidenceAnalysis({
      config: DEFAULT_RESEARCH_CONFIG,
      documents: docs,
      ai,
      limits,
      mockMode: true,
    });

    expect(result.irrelevantDocuments).toBe(1);
    expect(result.evidence.length).toBe(5);
    expect(result.evidence.every((unit) => unit.isMock)).toBe(true);
    expect(result.evidence.every((unit) => unit.source.url.startsWith("https://example.com/mock-demo/"))).toBe(
      true,
    );
    expect(
      result.evidence.some((unit) =>
        unit.content.relevantExcerpt.includes("cheaper"),
      ),
    ).toBe(false);
  });
});

describe("malformed extraction after successful screening", () => {
  it("does not create a fabricated evidence unit", async () => {
    const ai = new ScriptedAiProvider([
      relevanceJson(),
      "this is not json",
    ]);

    const result = await runEvidenceAnalysis({
      config: DEFAULT_RESEARCH_CONFIG,
      documents: [MANUAL_QA_FIXTURES[0]!.document],
      ai,
      limits,
      mockMode: true,
    });

    expect(result.evidence).toHaveLength(0);
    expect(result.extractionFailed).toBe(1);
    expect(result.documentProcessing[0]?.extractionStatus).toBe("failed");
  });
});
