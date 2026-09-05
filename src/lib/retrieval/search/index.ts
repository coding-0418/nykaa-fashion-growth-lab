import { getBraveSearchApiKey, getTavilyApiKey, getSearchProviderName } from "@/config/env";
import { BraveSearchProvider } from "@/lib/retrieval/search/brave";
import { TavilySearchProvider } from "@/lib/retrieval/search/tavily";
import { MockSearchProvider } from "@/lib/retrieval/search/mock";
import type { SearchProvider } from "@/lib/retrieval/search/provider";
import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";

export function getSearchProvider(fetchImpl?: FetchLike): SearchProvider {
  const name = getSearchProviderName();

  if (name === "mock") {
    return new MockSearchProvider();
  }

  if (name === "tavily") {
    return new TavilySearchProvider(getTavilyApiKey, fetchImpl ?? fetch);
  }

  return new BraveSearchProvider(getBraveSearchApiKey, fetchImpl ?? fetch);
}
