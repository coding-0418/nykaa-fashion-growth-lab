import { getRetrievalLimits } from "@/config/retrieval";
import { dedupeSearchResults } from "@/lib/retrieval/dedupe";
import { extractTextFromHtml } from "@/lib/retrieval/fetch/extract";
import { fetchPublicPage } from "@/lib/retrieval/fetch/fetcher";
import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";
import { generateSearchQueries } from "@/lib/retrieval/queries/generator";
import { getSearchProvider } from "@/lib/retrieval/search";
import { getMockPageHtml, MOCK_DEMO_NOTICE } from "@/lib/retrieval/search/mock";
import type { SearchProvider } from "@/lib/retrieval/search/provider";
import {
  canonicalizeUrl,
  classifySourceType,
  labelSourceFromUrl,
  normalizeFetchUrl,
} from "@/lib/retrieval/urls";
import type { ResearchConfig } from "@/types/discovery";
import type {
  DocumentSourceType,
  EvidenceKind,
  RawDocument,
  RetrievalLimits,
  RetrievalRunResult,
  SearchResult,
} from "@/types/retrieval";

/** Minimum extracted characters before social-platform content counts as readable
 * rather than a login wall / client-rendered shell. */
const SOCIAL_MIN_READABLE_CHARS = 200;

/**
 * Per-source-type handling of an already-fetched page. Every source type still goes
 * through the SAME generic fetchPublicPage() call above this — this only decides how to
 * label/shape the result afterwards. No platform-specific scraping, no auth, no bypass.
 */
function classifyEvidenceKind(sourceType: DocumentSourceType): EvidenceKind {
  if (sourceType === "youtube" || sourceType === "app_store_reviews" || sourceType === "social") {
    return "metadata";
  }
  return "content";
}

export interface RetrievalDeps {
  searchProvider?: SearchProvider;
  fetchImpl?: FetchLike;
  limits?: Partial<RetrievalLimits>;
  now?: () => string;
}

function stableId(prefix: string, value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `${prefix}-${Math.abs(hash).toString(16)}`;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      const item = items[current];
      if (item === undefined) {
        continue;
      }
      results[current] = await mapper(item);
    }
  }

  const size = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: size }, () => worker()));
  return results;
}

function emptyStats(): RetrievalRunResult["stats"] {
  return {
    queriesGenerated: 0,
    resultsFound: 0,
    documentsFetched: 0,
    documentsFailed: 0,
    duplicatesRemoved: 0,
    documentsSkipped: 0,
  };
}

export async function runPublicWebRetrieval(
  config: ResearchConfig,
  deps: RetrievalDeps = {},
): Promise<RetrievalRunResult> {
  const limits = getRetrievalLimits(deps.limits);
  const now = deps.now ?? (() => new Date().toISOString());
  const warnings: string[] = [];
  const errors: Array<{ stage: string; message: string }> = [];
  const provider = deps.searchProvider ?? getSearchProvider(deps.fetchImpl);

  const queries = generateSearchQueries(config, limits.maxQueries);

  if (!provider.isConfigured()) {
    warnings.push(
      `Search provider "${provider.name}" is not configured. No search results were invented.`,
    );
    return {
      success: false,
      status: "unavailable",
      pipelineImplemented: true,
      queries,
      searchResults: [],
      documents: [],
      stats: { ...emptyStats(), queriesGenerated: queries.length },
      warnings,
      message: `Public web search is unavailable because ${provider.name} is not configured.`,
      mockMode: provider.isMock,
      errors: [
        {
          stage: "search",
          message: `Provider "${provider.name}" is not configured.`,
        },
      ],
    };
  }

  if (provider.isMock) {
    warnings.push(
      "MOCK/DEMO retrieval mode is on. Results are synthetic and must not be treated as research evidence.",
    );
  }

  const rawHits: SearchResult[] = [];
  let queryFailures = 0;
  let queryUnavailability = 0;

  const searchOutcomes = await mapPool(queries, 2, async (query) => {
    try {
      return { query, outcome: await provider.search({ query, limit: limits.maxResultsPerQuery }) };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Search query failed.";
      return {
        query,
        outcome: { status: "failed" as const, reason: message },
      };
    }
  });

  for (const item of searchOutcomes) {
    if (item.outcome.status === "ok") {
      const discoveredAt = now();
      for (const hit of item.outcome.hits) {
        const canonical = canonicalizeUrl(hit.url);
        if (!canonical) {
          errors.push({
            stage: "search",
            message: `Skipped invalid URL from query "${item.query.text}".`,
          });
          continue;
        }

        rawHits.push({
          id: stableId("sr", canonical),
          source: labelSourceFromUrl(canonical),
          sourceType: classifySourceType(canonical),
          title: hit.title,
          url: canonical,
          snippet: hit.snippet,
          publishedAt: hit.publishedAt,
          discoveredAt,
          searchQuery: item.query.text,
          searchQueries: [item.query.text],
          contentStatus: "skipped",
          isMock: provider.isMock || undefined,
        });
      }
      continue;
    }

    if (item.outcome.status === "unavailable") {
      queryUnavailability += 1;
    } else {
      queryFailures += 1;
    }
    errors.push({
      stage: "search",
      message: `Query "${item.query.text}": ${item.outcome.reason}`,
    });
  }

  const deduped = dedupeSearchResults(rawHits);

  if (queryFailures === queries.length && queries.length > 0) {
    return {
      success: false,
      status: "failed",
      pipelineImplemented: true,
      queries,
      searchResults: [],
      documents: [],
      stats: {
        queriesGenerated: queries.length,
        resultsFound: 0,
        documentsFetched: 0,
        documentsFailed: 0,
        duplicatesRemoved: deduped.duplicatesRemoved,
        documentsSkipped: 0,
      },
      warnings,
      message: "Every search query failed. No results were invented.",
      mockMode: provider.isMock,
      errors,
    };
  }

  if (queryUnavailability === queries.length && queries.length > 0) {
    return {
      success: false,
      status: "unavailable",
      pipelineImplemented: true,
      queries,
      searchResults: [],
      documents: [],
      stats: {
        queriesGenerated: queries.length,
        resultsFound: 0,
        documentsFetched: 0,
        documentsFailed: 0,
        duplicatesRemoved: 0,
        documentsSkipped: 0,
      },
      warnings,
      message: "Search provider reported unavailable for all queries.",
      mockMode: provider.isMock,
      errors,
    };
  }

  // Priority order for the fetch cap: put URLs most likely to carry behavioural
  // evidence (Reddit threads, review platforms, generic web) ahead of app-store
  // listing pages and social posts, which are frequently large, JS-gated, or both.
  const FETCH_PRIORITY: Record<DocumentSourceType, number> = {
    reddit: 0,
    product_reviews: 0,
    web: 1,
    youtube: 2,
    app_store_reviews: 3,
    social: 3,
  };
  const prioritized = [...deduped.results].sort(
    (a, b) =>
      (FETCH_PRIORITY[a.sourceType ?? "web"] ?? 1) -
      (FETCH_PRIORITY[b.sourceType ?? "web"] ?? 1),
  );
  const toFetch = prioritized.slice(0, limits.maxPagesFetched);
  const documents: RawDocument[] = [];
  let documentsFetched = 0;
  let documentsFailed = 0;

  const fetchResults = await mapPool(toFetch, 3, async (result) => {
    if (provider.isMock) {
      const html = getMockPageHtml(result.url);
      if (!html) {
        return {
          result,
          page: {
            status: "unavailable" as const,
            url: result.url,
            reason: "Mock page is not defined.",
          },
        };
      }
      return {
        result,
        page: {
          status: "fetched" as const,
          url: result.url,
          title: result.title,
          content: extractTextFromHtml(html).text || MOCK_DEMO_NOTICE,
          contentType: "text/html",
        },
      };
    }

    // The network request may go to a normalized mirror (e.g. old.reddit.com) that a
    // GET-only fetch can actually read; the citation stays the original discovered URL.
    const fetchUrl = normalizeFetchUrl(result.url);
    const page = await fetchPublicPage(
      fetchUrl,
      limits,
      deps.fetchImpl ?? fetch,
    );
    return { result, page: { ...page, url: result.url } };
  });

  const byUrl = new Map(fetchResults.map((row) => [row.result.url, row]));

  for (const result of deduped.results) {
    const fetched = byUrl.get(result.url);
    if (!fetched) {
      result.contentStatus = "skipped";
      continue;
    }

    const sourceType = result.sourceType ?? "web";

    // A metadata-only page (e.g. a YouTube watch page whose body is entirely
    // client-rendered chrome) can have empty `content` but a real, usable
    // `description` — that must not be treated as "no content" and marked failed.
    const hasUsableFetch =
      fetched.page.status === "fetched" &&
      Boolean(fetched.page.content || fetched.page.description);

    if (hasUsableFetch) {
      const rawContentLength = fetched.page.content?.length ?? 0;

      // Social platforms are frequently login-gated: a "fetched" 200 response can
      // still be a near-empty shell. Treat too-short text as genuinely unavailable
      // rather than a real (if thin) document.
      if (sourceType === "social" && rawContentLength < SOCIAL_MIN_READABLE_CHARS) {
        result.contentStatus = "unavailable";
        errors.push({
          stage: "fetch",
          message: `${result.url}: Login-gated or client-rendered public page; insufficient public text was returned.`,
        });
        continue;
      }

      result.contentStatus = "fetched";
      documentsFetched += 1;

      // YouTube watch pages are almost entirely client-rendered chrome/script text once
      // stripped of tags; a real transcript is not available via a plain GET. Use the
      // page's own public metadata instead of pretending the video was analyzed.
      let content = fetched.page.content ?? "";
      if (sourceType === "youtube" && fetched.page.description) {
        content = `Video title: ${fetched.page.title ?? result.title ?? "unknown"}\nVideo description: ${fetched.page.description}`;
      } else if (!content && fetched.page.description) {
        content = fetched.page.description;
      }

      documents.push({
        id: stableId("doc", result.url),
        source: result.source,
        url: fetched.page.url,
        title: fetched.page.title ?? result.title,
        publishedAt: result.publishedAt,
        retrievedAt: now(),
        content,
        contentType: fetched.page.contentType ?? "text/html",
        searchQuery: result.searchQuery,
        isMock: provider.isMock || undefined,
        sourceType,
        evidenceKind: classifyEvidenceKind(sourceType),
      });
      continue;
    }

    if (fetched.page.status === "unavailable") {
      result.contentStatus = "unavailable";
      errors.push({
        stage: "fetch",
        message: `${result.url}: ${fetched.page.reason ?? "unavailable"}`,
      });
      continue;
    }

    result.contentStatus = "failed";
    documentsFailed += 1;
    errors.push({
      stage: "fetch",
      message: `${result.url}: ${fetched.page.reason ?? "failed"}`,
    });
  }

  const documentsSkipped = deduped.results.filter(
    (result) => result.contentStatus === "skipped",
  ).length;

  const hasQueryIssues = queryFailures > 0 || queryUnavailability > 0;
  const status =
    hasQueryIssues || documentsFailed > 0 ? "partial" : "success";

  warnings.push(
    "AI extraction, relevance classification, clustering, and opportunity scoring are not part of this retrieval run.",
  );

  return {
    success: true,
    status,
    pipelineImplemented: true,
    queries,
    searchResults: deduped.results,
    documents,
    stats: {
      queriesGenerated: queries.length,
      resultsFound: deduped.results.length,
      documentsFetched,
      documentsFailed,
      duplicatesRemoved: deduped.duplicatesRemoved,
      documentsSkipped,
    },
    warnings,
    message:
      status === "success"
        ? "Public web retrieval completed. Results are search candidates, not analysed evidence."
        : "Public web retrieval completed with some search or fetch issues. Missing pages were not invented.",
    mockMode: provider.isMock,
    errors,
  };
}
