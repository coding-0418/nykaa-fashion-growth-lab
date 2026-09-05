import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";
import type {
  SearchProvider,
  WebSearchOutcome,
  WebSearchRequest,
} from "@/lib/retrieval/search/provider";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilySearchResponse {
  results?: TavilyResult[];
}

/**
 * Low-value domains that reliably return corporate/reference content rather than
 * behavioural evidence, regardless of query wording. Excluded at the API level rather
 * than by post-filtering so a fetch/analysis slot isn't wasted on them.
 */
const DEFAULT_EXCLUDE_DOMAINS = ["en.wikipedia.org", "www.wikipedia.org"];

export class TavilySearchProvider implements SearchProvider {
  readonly name = "tavily";
  readonly isMock = false;

  constructor(
    private readonly getApiKey: () => string | undefined,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  async search(request: WebSearchRequest): Promise<WebSearchOutcome> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        status: "unavailable",
        reason: "TAVILY_API_KEY is not configured.",
      };
    }

    try {
      const response = await this.fetchImpl("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: request.query.text,
          max_results: Math.min(request.limit, 20),
          exclude_domains: DEFAULT_EXCLUDE_DOMAINS,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        return {
          status: "unavailable",
          reason: "Tavily Search rejected the request (check the API key).",
        };
      }

      if (response.status === 429) {
        return {
          status: "failed",
          reason: "Tavily Search rate limit exceeded.",
        };
      }

      if (!response.ok) {
        return {
          status: "failed",
          reason: `Tavily Search HTTP ${response.status}`,
        };
      }

      const payload = (await response.json()) as TavilySearchResponse;
      const hits = (payload.results ?? [])
        .filter((row) => typeof row.url === "string" && row.url.length > 0)
        .map((row) => ({
          title: row.title?.trim() || row.url || "Untitled",
          url: row.url as string,
          snippet: row.content,
        }));

      return { status: "ok", hits };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tavily Search request failed.";
      return { status: "failed", reason: message };
    }
  }
}
