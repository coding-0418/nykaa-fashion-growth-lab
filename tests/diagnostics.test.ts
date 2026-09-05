import { describe, expect, it } from "vitest";
import { buildSkipReasons, buildSourceBreakdown } from "@/lib/discovery/diagnostics";
import type { DocumentProcessingStatus, EvidenceUnit } from "@/types/discovery";
import type { RawDocument, SearchResult } from "@/types/retrieval";

function searchResult(overrides: Partial<SearchResult>): SearchResult {
  return {
    id: overrides.id ?? "sr-1",
    source: "web",
    title: "T",
    url: "https://example.com/a",
    discoveredAt: "2026-01-01T00:00:00.000Z",
    searchQuery: "q",
    searchQueries: ["q"],
    contentStatus: "fetched",
    ...overrides,
  };
}

function document(overrides: Partial<RawDocument>): RawDocument {
  return {
    id: overrides.id ?? "doc-1",
    source: "web",
    url: "https://example.com/a",
    retrievedAt: "2026-01-01T00:00:00.000Z",
    content: "text",
    contentType: "text/html",
    ...overrides,
  };
}

describe("buildSourceBreakdown", () => {
  it("buckets results, fetches, screening, and evidence by classified source type", () => {
    const searchResults: SearchResult[] = [
      searchResult({ id: "sr-1", url: "https://www.reddit.com/r/x/1", contentStatus: "fetched" }),
      searchResult({ id: "sr-2", url: "https://www.instagram.com/p/2", contentStatus: "failed" }),
    ];
    const documents: RawDocument[] = [
      document({ id: "doc-1", url: "https://www.reddit.com/r/x/1", sourceType: "reddit" }),
    ];
    const processing: DocumentProcessingStatus[] = [
      {
        documentId: "doc-1",
        url: "https://www.reddit.com/r/x/1",
        screeningStatus: "success",
        extractionStatus: "success",
        relevance: "relevant",
      },
    ];
    const evidence: EvidenceUnit[] = [
      {
        id: "ev-1",
        source: { platform: "reddit", url: "https://www.reddit.com/r/x/1", discoveredAt: "2026-01-01T00:00:00.000Z" },
        content: { originalText: "x", relevantExcerpt: "x" },
        journeyStage: "wishlist",
        wishlistIntent: "unknown",
        barrier: { category: "fit" },
        informationNeeded: [],
        alternatives: {},
        workaround: [],
        outcome: "unknown",
        segment: { name: "unknown" },
        evidenceStrength: 3,
        relevance: "relevant",
        confidence: 0.8,
        needsReview: false,
      },
    ];

    const breakdown = buildSourceBreakdown(searchResults, documents, processing, evidence);
    const reddit = breakdown.find((row) => row.sourceType === "reddit");
    const social = breakdown.find((row) => row.sourceType === "social");

    expect(reddit).toMatchObject({
      resultsFound: 1,
      documentsFetched: 1,
      documentsScreened: 1,
      relevantDocuments: 1,
      evidenceExtracted: 1,
    });
    expect(social).toMatchObject({ resultsFound: 1, documentsFailed: 1 });
  });

  it("omits source types with zero results found", () => {
    const breakdown = buildSourceBreakdown([], [], [], []);
    expect(breakdown).toHaveLength(0);
  });
});

describe("buildSkipReasons", () => {
  it("buckets fetch and screening errors into stable reason categories", () => {
    const errors = [
      { stage: "fetch", message: "https://a.com: Response exceeds max content size." },
      { stage: "fetch", message: "https://b.com: HTTP 403: page is not publicly retrievable." },
      { stage: "screening", message: "https://c.com: AI HTTP 404" },
    ];
    const counts = buildSkipReasons(errors, []);
    const reasons = counts.map((c) => c.reason);
    expect(reasons).toContain("content_too_large");
    expect(reasons).toContain("not_publicly_accessible");
    expect(reasons).toContain("ai_provider_http_error");
  });

  it("counts documents never attempted due to the fetch cap", () => {
    const searchResults: SearchResult[] = [
      searchResult({ id: "sr-1", contentStatus: "skipped" }),
      searchResult({ id: "sr-2", contentStatus: "skipped" }),
      searchResult({ id: "sr-3", contentStatus: "fetched" }),
    ];
    const counts = buildSkipReasons([], searchResults);
    const capReason = counts.find((c) => c.reason === "not_attempted_fetch_cap_reached");
    expect(capReason?.count).toBe(2);
  });

  it("returns no reasons when nothing failed or was skipped", () => {
    expect(buildSkipReasons([], [])).toHaveLength(0);
  });
});
