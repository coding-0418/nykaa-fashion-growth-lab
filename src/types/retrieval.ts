export type RetrievalRunStatus =
  | "success"
  | "partial"
  | "unavailable"
  | "failed";

export type ContentRetrievalStatus =
  | "fetched"
  | "unavailable"
  | "failed"
  | "skipped";

export interface GeneratedQuery {
  id: string;
  family: string;
  text: string;
}

export interface SearchResult {
  id: string;
  source: string;
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: string;
  discoveredAt: string;
  searchQuery: string;
  searchQueries: string[];
  contentStatus: ContentRetrievalStatus;
  isMock?: boolean;
  sourceType?: DocumentSourceType;
}

/** Coarse source-type classification of a discovered URL, used for diagnostics and
 * lightweight per-domain normalization. Every value still goes through the SAME
 * generic public-web fetch path — this is a routing/labelling hint, not a gate. */
export type DocumentSourceType =
  | "reddit"
  | "youtube"
  | "app_store_reviews"
  | "product_reviews"
  | "social"
  | "web";

/** Whether the retrieved text is real user-generated content, or only page metadata
 * (e.g. a video's title/description rather than its transcript or comments). */
export type EvidenceKind = "content" | "metadata";

export interface RawDocument {
  id: string;
  source: string;
  url: string;
  title?: string;
  publishedAt?: string;
  retrievedAt: string;
  content: string;
  contentType: string;
  searchQuery?: string;
  isMock?: boolean;
  sourceType?: DocumentSourceType;
  evidenceKind?: EvidenceKind;
}

export interface RetrievalStats {
  queriesGenerated: number;
  resultsFound: number;
  documentsFetched: number;
  documentsFailed: number;
  duplicatesRemoved: number;
  documentsSkipped: number;
}

export interface RetrievalLimits {
  maxQueries: number;
  maxResultsPerQuery: number;
  maxPagesFetched: number;
  timeoutMs: number;
  maxContentBytes: number;
}

export interface RetrievalRunResult {
  success: boolean;
  status: RetrievalRunStatus;
  pipelineImplemented: true;
  queries: GeneratedQuery[];
  searchResults: SearchResult[];
  documents: RawDocument[];
  stats: RetrievalStats;
  warnings: string[];
  message: string;
  mockMode: boolean;
  errors: Array<{ stage: string; message: string }>;
}
