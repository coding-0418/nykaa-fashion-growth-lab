import type { GeneratedQuery } from "@/types/retrieval";

export interface WebSearchRequest {
  query: GeneratedQuery;
  limit: number;
}

export interface WebSearchHit {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
}

export type WebSearchOutcome =
  | { status: "ok"; hits: WebSearchHit[] }
  | { status: "unavailable"; reason: string }
  | { status: "failed"; reason: string };

export interface SearchProvider {
  readonly name: string;
  readonly isMock: boolean;
  isConfigured(): boolean;
  search(request: WebSearchRequest): Promise<WebSearchOutcome>;
}
