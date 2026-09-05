import { describe, expect, it } from "vitest";
import { runPublicWebRetrieval } from "@/lib/retrieval/run";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import type { SearchProvider } from "@/lib/retrieval/search/provider";
import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";

function providerReturning(urls: string[]): SearchProvider {
  return {
    name: "stub",
    isMock: false,
    isConfigured: () => true,
    search: async () => ({
      status: "ok",
      hits: urls.map((url, index) => ({ title: `Title ${index}`, url })),
    }),
  };
}

describe("publicly fetchable Reddit URL", () => {
  it("fetches via old.reddit.com but cites the original reddit.com URL", async () => {
    const original = "https://www.reddit.com/r/IndianFashionAddicts/comments/1/nykaa-fit";
    const fetchImpl: FetchLike = async (url) => {
      const href = String(url);
      expect(href.startsWith("https://old.reddit.com/")).toBe(true);
      return new Response(
        `<html><head><title>Nykaa fit thread</title></head><body><article>I wasn't sure about the size so I checked Instagram before buying.</article></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    };

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: providerReturning([original]),
      fetchImpl,
      limits: { maxQueries: 1, maxResultsPerQuery: 1, maxPagesFetched: 5 },
    });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.url).toBe(original);
    expect(result.documents[0]?.sourceType).toBe("reddit");
    expect(result.documents[0]?.evidenceKind).toBe("content");
    expect(result.documents[0]?.content).toContain("checked Instagram");
  });
});

describe("publicly fetchable product review page", () => {
  it("classifies as product_reviews with content evidenceKind", async () => {
    const url = "https://www.trustpilot.com/review/nykaafashion.com";
    const fetchImpl: FetchLike = async () =>
      new Response(
        `<html><head><title>Reviews</title></head><body><article>Returned it because the fit was wrong compared to what I expected.</article></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: providerReturning([url]),
      fetchImpl,
      limits: { maxQueries: 1, maxResultsPerQuery: 1, maxPagesFetched: 5 },
    });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.sourceType).toBe("product_reviews");
    expect(result.documents[0]?.evidenceKind).toBe("content");
    expect(result.documents[0]?.content).toContain("Returned it");
  });
});

describe("app-store-like page", () => {
  it("classifies as app_store_reviews and is labelled metadata, not user evidence", async () => {
    const url = "https://apps.apple.com/us/app/nykaa-fashion-shopping-app/id1439872423";
    const fetchImpl: FetchLike = async () =>
      new Response(
        `<html><head><title>Nykaa Fashion on the App Store</title></head><body><article>Shop the latest fashion trends.</article></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: providerReturning([url]),
      fetchImpl,
      limits: { maxQueries: 1, maxResultsPerQuery: 1, maxPagesFetched: 5 },
    });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.sourceType).toBe("app_store_reviews");
    expect(result.documents[0]?.evidenceKind).toBe("metadata");
  });
});

describe("YouTube page with metadata only", () => {
  it("uses og:description metadata instead of pretending a transcript was analyzed", async () => {
    const url = "https://www.youtube.com/watch?v=abc123";
    const fetchImpl: FetchLike = async () =>
      new Response(
        `<html><head><title>Nykaa Fashion Haul</title><meta property="og:description" content="Trying on 5 dresses from Nykaa Fashion, sizing was inconsistent."></head><body><script>window.ytInitial={garbage:true}</script></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: providerReturning([url]),
      fetchImpl,
      limits: { maxQueries: 1, maxResultsPerQuery: 1, maxPagesFetched: 5 },
    });

    expect(result.documents).toHaveLength(1);
    const doc = result.documents[0]!;
    expect(doc.sourceType).toBe("youtube");
    expect(doc.evidenceKind).toBe("metadata");
    expect(doc.content).toContain("Video title:");
    expect(doc.content).toContain("Video description:");
    expect(doc.content).toContain("sizing was inconsistent");
    expect(doc.content).not.toContain("ytInitial");
  });
});

describe("login-gated social page", () => {
  it("marks a near-empty social fetch as unavailable rather than a thin document", async () => {
    const url = "https://www.instagram.com/reel/abc123";
    const fetchImpl: FetchLike = async () =>
      new Response(`<html><head><title>Instagram</title></head><body>Log in to see more</body></html>`, {
        status: 200,
        headers: { "content-type": "text/html" },
      });

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: providerReturning([url]),
      fetchImpl,
      limits: { maxQueries: 1, maxResultsPerQuery: 1, maxPagesFetched: 5 },
    });

    expect(result.documents).toHaveLength(0);
    expect(result.searchResults[0]?.contentStatus).toBe("unavailable");
    expect(
      result.errors.some((e) => e.stage === "fetch" && /login-gated/i.test(e.message)),
    ).toBe(true);
  });
});

describe("generic public web fallback for reddit/social/app-store URLs", () => {
  it("does not skip a URL purely because of its domain", async () => {
    const urls = [
      "https://www.reddit.com/r/x/comments/1/a",
      "https://apps.apple.com/us/app/x/id1",
    ];
    const fetchImpl: FetchLike = async () =>
      new Response(`<html><body><article>Some real public text here.</article></body></html>`, {
        status: 200,
        headers: { "content-type": "text/html" },
      });

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: providerReturning(urls),
      fetchImpl,
      limits: { maxQueries: 1, maxResultsPerQuery: 2, maxPagesFetched: 5 },
    });

    expect(result.documents).toHaveLength(2);
  });
});

describe("fetch cap prioritization and documentsSkipped", () => {
  it("prioritizes reddit/review URLs over social/app-store when the fetch cap is smaller than results found", async () => {
    const urls = [
      "https://www.instagram.com/p/social-first-in-list",
      "https://www.reddit.com/r/x/comments/1/lower-in-list",
    ];
    const fetchImpl: FetchLike = async (url) => {
      expect(String(url)).toContain("reddit");
      return new Response(`<html><body><article>Real text</article></body></html>`, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    };

    const result = await runPublicWebRetrieval(DEFAULT_RESEARCH_CONFIG, {
      searchProvider: providerReturning(urls),
      fetchImpl,
      limits: { maxQueries: 1, maxResultsPerQuery: 2, maxPagesFetched: 1 },
    });

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.sourceType).toBe("reddit");
    expect(result.stats.documentsSkipped).toBe(1);
    const skippedResult = result.searchResults.find((r) => r.sourceType === "social");
    expect(skippedResult?.contentStatus).toBe("skipped");
  });
});
