import type {
  SearchProvider,
  WebSearchOutcome,
  WebSearchRequest,
} from "@/lib/retrieval/search/provider";

export const MOCK_DEMO_NOTICE =
  "[MOCK/DEMO] Synthetic local-development content. Not public-web evidence.";

export const MOCK_PAGES: Record<
  string,
  { title: string; html: string; snippet: string }
> = {
  "https://example.com/mock-demo/nykaa-fashion-wishlist": {
    title: "[MOCK/DEMO] Wishlist discussion (not real evidence)",
    snippet:
      "[MOCK/DEMO] A labelled placeholder about saving items and not purchasing.",
    html: `<html><head><title>[MOCK/DEMO] Wishlist discussion (not real evidence)</title></head><body><article><p>${MOCK_DEMO_NOTICE}</p><p>Placeholder text about a wishlist item that was not purchased. This is not a real user conversation.</p></article></body></html>`,
  },
  "https://example.com/mock-demo/nykaa-fashion-fit": {
    title: "[MOCK/DEMO] Fit and size notes (not real evidence)",
    snippet: "[MOCK/DEMO] A labelled placeholder about size uncertainty.",
    html: `<html><head><title>[MOCK/DEMO] Fit and size notes (not real evidence)</title></head><body><article><p>${MOCK_DEMO_NOTICE}</p><p>Placeholder text about fit uncertainty. This is not a real review.</p></article></body></html>`,
  },
  "https://example.com/mock-demo/nykaa-fashion-vs-myntra": {
    title: "[MOCK/DEMO] Cross-platform comparison (not real evidence)",
    snippet: "[MOCK/DEMO] A labelled placeholder about comparing platforms.",
    html: `<html><head><title>[MOCK/DEMO] Cross-platform comparison (not real evidence)</title></head><body><article><p>${MOCK_DEMO_NOTICE}</p><p>Placeholder comparison text. This is not a real forum thread.</p></article></body></html>`,
  },
};

const MOCK_URLS = Object.keys(MOCK_PAGES);

export class MockSearchProvider implements SearchProvider {
  readonly name = "mock";
  readonly isMock = true;

  isConfigured(): boolean {
    return true;
  }

  async search(request: WebSearchRequest): Promise<WebSearchOutcome> {
    const hits = MOCK_URLS.slice(0, request.limit).map((url) => {
      const page = MOCK_PAGES[url];
      return {
        title: page?.title ?? "[MOCK/DEMO] Untitled",
        url,
        snippet: page?.snippet,
      };
    });

    return { status: "ok", hits };
  }
}

export function getMockPageHtml(url: string): string | undefined {
  return MOCK_PAGES[url]?.html;
}
