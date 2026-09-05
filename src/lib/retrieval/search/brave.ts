import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";
import type {
  SearchProvider,
  WebSearchOutcome,
  WebSearchRequest,
} from "@/lib/retrieval/search/provider";

interface BraveWebResult {
  title?: string;
  url?: string;
  description?: string;
  page_age?: string;
  age?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[];
  };
}

export class BraveSearchProvider implements SearchProvider {
  readonly name = "brave";
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
        reason: "BRAVE_SEARCH_API_KEY is not configured.",
      };
    }

    const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
    endpoint.searchParams.set("q", request.query.text);
    endpoint.searchParams.set("count", String(Math.min(request.limit, 20)));
    endpoint.searchParams.set("text_decorations", "false");

    try {
      const response = await this.fetchImpl(endpoint.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
      });

      if (response.status === 401 || response.status === 403) {
        return {
          status: "unavailable",
          reason: "Brave Search rejected the request (check the API key).",
        };
      }

      if (!response.ok) {
        return {
          status: "failed",
          reason: `Brave Search HTTP ${response.status}`,
        };
      }

      const payload = (await response.json()) as BraveSearchResponse;
      const hits = (payload.web?.results ?? [])
        .filter((row) => typeof row.url === "string" && row.url.length > 0)
        .map((row) => ({
          title: row.title?.trim() || row.url || "Untitled",
          url: row.url as string,
          snippet: row.description,
          publishedAt: row.page_age ?? row.age,
        }));

      return { status: "ok", hits };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Brave Search request failed.";
      return { status: "failed", reason: message };
    }
  }
}
