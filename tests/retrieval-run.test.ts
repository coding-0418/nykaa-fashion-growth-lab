import { describe, expect, it } from "vitest";
import { BraveSearchProvider } from "@/lib/retrieval/search/brave";
import { MockSearchProvider, MOCK_DEMO_NOTICE } from "@/lib/retrieval/search/mock";
import { runPublicWebRetrieval } from "@/lib/retrieval/run";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import type { SearchProvider } from "@/lib/retrieval/search/provider";
import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";

const query = {
  id: "q1",
  family: "test",
  text: `"Nykaa Fashion" wishlist purchase`,
};

describe("search provider unavailable", () => {
  it("does not invent Brave results when the key is missing", async () => {
    const provider = new BraveSearchProvider(() => undefined);
    expect(provider.isConfigured()).toBe(false);

    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("unavailable");
    if (outcome.status !== "unavailable") {
      throw new Error("expected unavailable");
    }
    expect(outcome.reason).toMatch(/BRAVE_SEARCH_API_KEY/);
  });

  it("returns structured unavailable from the retrieval run", async () => {
    const provider: SearchProvider = {
      name: "brave",
      isMock: false,
      isConfigured: () => false,
      search: async () => ({ status: "unavailable", reason: "missing key" }),
    };

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: provider,
      limits: { maxQueries: 2, maxResultsPerQuery: 2, maxPagesFetched: 2 },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("unavailable");
    expect(result.searchResults).toEqual([]);
    expect(result.documents).toEqual([]);
  });
});

describe("empty result state", () => {
  it("returns success with zero hits and no fabricated pages", async () => {
    const provider: SearchProvider = {
      name: "stub",
      isMock: false,
      isConfigured: () => true,
      search: async () => ({ status: "ok", hits: [] }),
    };

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: provider,
      limits: { maxQueries: 2, maxPagesFetched: 2 },
    });

    expect(result.status).toBe("success");
    expect(result.stats.resultsFound).toBe(0);
    expect(result.documents).toHaveLength(0);
    expect(result.searchResults).toHaveLength(0);
  });
});

describe("successful retrieval with mocked search data", () => {
  it("dedupes hits and fetches labelled mock HTML", async () => {
    const provider: SearchProvider = {
      name: "stub",
      isMock: false,
      isConfigured: () => true,
      search: async ({ query: current }) => ({
        status: "ok",
        hits: [
          {
            title: "Thread A",
            url: "https://example.com/research/a?utm_source=x",
            snippet: "snippet",
          },
          {
            title: "Thread A copy",
            url: "https://example.com/research/a/",
            snippet: "snippet 2",
          },
          {
            title: "Thread B",
            url: "https://example.com/research/b",
            snippet: current.text,
          },
        ],
      }),
    };

    const fetchImpl: FetchLike = async (url) => {
      const href = String(url);
      return new Response(
        `<html><head><title>${href}</title></head><body><article>Public text for ${href}</article></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    };

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: provider,
      fetchImpl,
      limits: {
        maxQueries: 1,
        maxResultsPerQuery: 5,
        maxPagesFetched: 5,
        timeoutMs: 1000,
      },
      now: () => "2026-01-01T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
    expect(result.stats.duplicatesRemoved).toBeGreaterThan(0);
    expect(result.searchResults).toHaveLength(2);
    expect(result.documents.length).toBe(2);
    expect(result.documents[0]?.content).toMatch(/Public text/);
    expect(result.searchResults.every((row) => row.contentStatus === "fetched")).toBe(
      true,
    );
  });

  it("labels mock provider output as MOCK/DEMO", async () => {
    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: new MockSearchProvider(),
      limits: { maxQueries: 2, maxResultsPerQuery: 3, maxPagesFetched: 3 },
    });

    expect(result.mockMode).toBe(true);
    expect(result.searchResults.every((row) => row.isMock)).toBe(true);
    expect(result.documents.some((doc) => doc.content.includes(MOCK_DEMO_NOTICE))).toBe(
      true,
    );
    expect(result.warnings.some((warning) => warning.includes("MOCK/DEMO"))).toBe(
      true,
    );
  });
});
