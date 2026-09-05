import { describe, expect, it } from "vitest";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import { runDiscoveryPipeline } from "@/lib/discovery/pipeline";
import type { RawDocument, RetrievalRunResult } from "@/types/retrieval";
import { extractionJson, relevanceJson, ScriptedAiProvider } from "./helpers/scripted-ai";

function retrievalWith(documents: RawDocument[]): RetrievalRunResult {
  return {
    success: true,
    status: "success",
    pipelineImplemented: true,
    queries: [],
    searchResults: documents.map((doc) => ({
      id: `sr-${doc.id}`,
      source: doc.source,
      title: doc.title ?? "T",
      url: doc.url,
      discoveredAt: doc.retrievedAt,
      searchQuery: "q",
      searchQueries: ["q"],
      contentStatus: "fetched" as const,
      sourceType: doc.sourceType,
    })),
    documents,
    stats: {
      queriesGenerated: 1,
      resultsFound: documents.length,
      documentsFetched: documents.length,
      documentsFailed: 0,
      duplicatesRemoved: 0,
      documentsSkipped: 0,
    },
    warnings: [],
    message: "stub retrieval",
    mockMode: true,
    errors: [],
  };
}

describe("source status no longer claims full unsupported for fallback-eligible sources", () => {
  it("reports 'fallback' with an honest reason instead of 'unsupported'", async () => {
    const ai = new ScriptedAiProvider([]);
    const result = await runDiscoveryPipeline(
      { ...DEFAULT_RESEARCH_CONFIG, sourceTypes: ["web", "reddit", "social"] },
      { ai, runRetrieval: async () => retrievalWith([]) },
    );

    const reddit = result.sourceStatuses.find((s) => s.sourceType === "reddit");
    expect(reddit?.status).toBe("fallback");
    expect(reddit?.reason).toMatch(/generic public-web path|fetched and analyzed/i);
    expect(result.sourceStatuses.some((s) => s.status === "unsupported")).toBe(false);
  });
});

describe("sourceBreakdown and skipReasons are wired through the full pipeline", () => {
  it("reflects fetched/screened/relevant/extracted counts per source type", async () => {
    const doc: RawDocument = {
      id: "doc-1",
      source: "reddit",
      url: "https://www.reddit.com/r/x/1",
      retrievedAt: "2026-01-01T00:00:00.000Z",
      content: "I wasn't sure about the size so I checked Instagram.",
      contentType: "text/html",
      sourceType: "reddit",
      evidenceKind: "content",
    };

    const ai = new ScriptedAiProvider([
      relevanceJson({ relevance: "relevant" }),
      extractionJson({ relevantExcerpt: "I wasn't sure about the size so I checked Instagram" }),
    ]);

    const result = await runDiscoveryPipeline(DEFAULT_RESEARCH_CONFIG, {
      ai,
      aiLimits: { concurrency: 1 },
      runRetrieval: async () => retrievalWith([doc]),
    });

    const redditRow = result.sourceBreakdown.find((row) => row.sourceType === "reddit");
    expect(redditRow).toMatchObject({
      resultsFound: 1,
      documentsFetched: 1,
      documentsScreened: 1,
      relevantDocuments: 1,
      evidenceExtracted: 1,
    });
    expect(result.evidence).toHaveLength(1);
  });
});
