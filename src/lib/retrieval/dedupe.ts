import type { SearchResult } from "@/types/retrieval";
import { canonicalizeUrl } from "@/lib/retrieval/urls";

export interface DedupeOutcome {
  results: SearchResult[];
  duplicatesRemoved: number;
}

export function dedupeSearchResults(results: SearchResult[]): DedupeOutcome {
  const byCanonical = new Map<string, SearchResult>();
  let duplicatesRemoved = 0;

  for (const result of results) {
    const canonical = canonicalizeUrl(result.url) ?? result.url;
    const existing = byCanonical.get(canonical);

    if (!existing) {
      byCanonical.set(canonical, {
        ...result,
        url: canonical,
        searchQueries: [...result.searchQueries],
      });
      continue;
    }

    duplicatesRemoved += 1;
    const queries = new Set([
      ...existing.searchQueries,
      ...result.searchQueries,
      result.searchQuery,
    ]);
    existing.searchQueries = [...queries];
    if (!existing.snippet && result.snippet) {
      existing.snippet = result.snippet;
    }
    if (!existing.publishedAt && result.publishedAt) {
      existing.publishedAt = result.publishedAt;
    }
  }

  return {
    results: [...byCanonical.values()],
    duplicatesRemoved,
  };
}
