import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "@/lib/retrieval/urls";
import { dedupeSearchResults } from "@/lib/retrieval/dedupe";
import type { SearchResult } from "@/types/retrieval";

function result(url: string, query: string): SearchResult {
  return {
    id: url,
    source: "web",
    title: "T",
    url,
    discoveredAt: "2026-01-01T00:00:00.000Z",
    searchQuery: query,
    searchQueries: [query],
    contentStatus: "skipped",
  };
}

describe("URL normalization", () => {
  it("drops tracking params, hashes, and trailing slashes", () => {
    const canonical = canonicalizeUrl(
      "https://WWW.Example.com/path/?utm_source=x&b=2&a=1#section",
    );
    expect(canonical).toBe("https://www.example.com/path?a=1&b=2");
  });

  it("rejects non-http URLs", () => {
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("duplicate removal", () => {
  it("collapses the same page found by multiple queries", () => {
    const { results, duplicatesRemoved } = dedupeSearchResults([
      result("https://example.com/item?utm_campaign=ad", "query one"),
      result("https://example.com/item/", "query two"),
    ]);

    expect(duplicatesRemoved).toBe(1);
    expect(results).toHaveLength(1);
    expect(results[0]?.url).toBe("https://example.com/item");
    expect(results[0]?.searchQueries).toEqual(["query one", "query two"]);
  });
});
