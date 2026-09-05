import { describe, expect, it } from "vitest";
import { fetchPublicPage } from "@/lib/retrieval/fetch/fetcher";
import { extractTextFromHtml } from "@/lib/retrieval/fetch/extract";

describe("HTML extraction", () => {
  it("strips scripts and keeps article text", () => {
    const { title, text } = extractTextFromHtml(`
      <html>
        <head><title>Demo</title><script>alert(1)</script></head>
        <body>
          <nav>Home</nav>
          <article><p>Wishlist friction example.</p></article>
          <style>.x{}</style>
        </body>
      </html>
    `);
    expect(title).toBe("Demo");
    expect(text).toContain("Wishlist friction example.");
    expect(text).not.toContain("alert(1)");
  });
});

describe("fetch timeout and error handling", () => {
  it("marks aborted requests as failed", async () => {
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });

    const result = await fetchPublicPage(
      "https://example.com/slow",
      { timeoutMs: 30, maxContentBytes: 1000 },
      hangingFetch,
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toMatch(/timed out/i);
  });

  it("marks auth walls as unavailable, not as invented content", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("login", { status: 403, headers: { "content-type": "text/html" } });

    const result = await fetchPublicPage(
      "https://example.com/private",
      { timeoutMs: 1000, maxContentBytes: 1000 },
      fetchImpl,
    );

    expect(result.status).toBe("unavailable");
    expect(result.content).toBeUndefined();
  });
});
