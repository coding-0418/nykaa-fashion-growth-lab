import { describe, expect, it } from "vitest";
import { TavilySearchProvider } from "@/lib/retrieval/search/tavily";
import { BraveSearchProvider } from "@/lib/retrieval/search/brave";
import { MockSearchProvider } from "@/lib/retrieval/search/mock";
import { getSearchProvider } from "@/lib/retrieval/search";
import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";

const query = {
  id: "q1",
  family: "test",
  text: `"Nykaa Fashion" wishlist purchase`,
};

describe("TavilySearchProvider", () => {
  // 1. Successful Tavily response, 2. Multiple search results, 10. Search query preserved, 11. URL/title/snippet mapping
  it("returns mapped results on successful 200 response with multiple results", async () => {
    const mockFetch: FetchLike = async (url, options) => {
      expect(url).toBe("https://api.tavily.com/search");
      expect(options?.method).toBe("POST");
      expect(options?.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer test-api-key",
      });

      const body = JSON.parse(options?.body as string);
      expect(body.query).toBe(query.text);
      expect(body.max_results).toBe(3);

      return new Response(
        JSON.stringify({
          results: [
            {
              title: "Page A Title",
              url: "https://example.com/page-a",
              content: "Snippet content for page A",
              score: 0.95,
            },
            {
              title: "Page B Title ",
              url: "https://example.com/page-b",
              content: "Snippet content for page B",
              score: 0.88,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    const provider = new TavilySearchProvider(() => "test-api-key", mockFetch);
    expect(provider.isConfigured()).toBe(true);

    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("Expected ok status");

    expect(outcome.hits).toHaveLength(2);
    expect(outcome.hits[0]).toEqual({
      title: "Page A Title",
      url: "https://example.com/page-a",
      snippet: "Snippet content for page A",
    });
    expect(outcome.hits[1]).toEqual({
      title: "Page B Title",
      url: "https://example.com/page-b",
      snippet: "Snippet content for page B",
    });
  });

  // 3. Empty response
  it("handles empty results list correctly", async () => {
    const mockFetch: FetchLike = async () => {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const provider = new TavilySearchProvider(() => "test-api-key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") throw new Error("Expected ok status");
    expect(outcome.hits).toEqual([]);
  });

  // 4. Missing API key
  it("returns unavailable when key is missing", async () => {
    const provider = new TavilySearchProvider(() => undefined);
    expect(provider.isConfigured()).toBe(false);

    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("unavailable");
    if (outcome.status !== "unavailable") throw new Error("Expected unavailable");
    expect(outcome.reason).toMatch(/TAVILY_API_KEY/);
  });

  // 5. Invalid API key (HTTP 401 / 403)
  it("returns unavailable when API key is invalid or rejected (HTTP 401)", async () => {
    const mockFetch: FetchLike = async () => {
      return new Response("Unauthorized", { status: 401 });
    };

    const provider = new TavilySearchProvider(() => "invalid-key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("unavailable");
    if (outcome.status !== "unavailable") throw new Error("Expected unavailable");
    expect(outcome.reason).toMatch(/rejected the request/);
  });

  it("returns unavailable when API key is invalid or rejected (HTTP 403)", async () => {
    const mockFetch: FetchLike = async () => {
      return new Response("Forbidden", { status: 403 });
    };

    const provider = new TavilySearchProvider(() => "invalid-key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("unavailable");
    if (outcome.status !== "unavailable") throw new Error("Expected unavailable");
    expect(outcome.reason).toMatch(/rejected the request/);
  });

  // 6. HTTP 429 (rate limiting)
  it("returns failed when rate limited (HTTP 429)", async () => {
    const mockFetch: FetchLike = async () => {
      return new Response("Too Many Requests", { status: 429 });
    };

    const provider = new TavilySearchProvider(() => "rate-limit-key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") throw new Error("Expected failed");
    expect(outcome.reason).toMatch(/rate limit exceeded/);
  });

  // 7. Network error
  it("returns failed and handles network exceptions cleanly", async () => {
    const mockFetch: FetchLike = async () => {
      throw new Error("DNS resolution failed");
    };

    const provider = new TavilySearchProvider(() => "key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") throw new Error("Expected failed");
    expect(outcome.reason).toBe("DNS resolution failed");
  });

  // 8. Timeout
  it("returns failed and handles request timeout exceptions cleanly", async () => {
    const mockFetch: FetchLike = async () => {
      throw new Error("The operation was aborted.");
    };

    const provider = new TavilySearchProvider(() => "key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") throw new Error("Expected failed");
    expect(outcome.reason).toBe("The operation was aborted.");
  });

  // 9. Malformed response
  it("returns failed when response has other non-ok HTTP status codes", async () => {
    const mockFetch: FetchLike = async () => {
      return new Response("Internal Server Error", { status: 500 });
    };

    const provider = new TavilySearchProvider(() => "key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") throw new Error("Expected failed");
    expect(outcome.reason).toBe("Tavily Search HTTP 500");
  });

  it("returns failed when payload is invalid JSON", async () => {
    const mockFetch: FetchLike = async () => {
      return new Response("{invalid-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const provider = new TavilySearchProvider(() => "key", mockFetch);
    const outcome = await provider.search({ query, limit: 3 });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") throw new Error("Expected failed");
    expect(outcome.reason).toMatch(/Unexpected token|JSON|position/i);
  });
});

describe("Provider Factory Selection", () => {
  const originalEnv = process.env.SEARCH_PROVIDER;

  // 12. Provider factory selects Tavily
  it("selects TavilySearchProvider when SEARCH_PROVIDER is tavily", () => {
    process.env.SEARCH_PROVIDER = "tavily";
    const provider = getSearchProvider();
    expect(provider).toBeInstanceOf(TavilySearchProvider);
    expect(provider.name).toBe("tavily");
  });

  // 13. Existing Brave provider still works
  it("selects BraveSearchProvider when SEARCH_PROVIDER is brave", () => {
    process.env.SEARCH_PROVIDER = "brave";
    const provider = getSearchProvider();
    expect(provider).toBeInstanceOf(BraveSearchProvider);
    expect(provider.name).toBe("brave");
  });

  // 14. Existing Mock provider still works
  it("selects MockSearchProvider when SEARCH_PROVIDER is mock", () => {
    process.env.SEARCH_PROVIDER = "mock";
    const provider = getSearchProvider();
    expect(provider).toBeInstanceOf(MockSearchProvider);
    expect(provider.name).toBe("mock");
  });

  // Clean up
  it("restores original environment after tests", () => {
    process.env.SEARCH_PROVIDER = originalEnv;
  });
});
