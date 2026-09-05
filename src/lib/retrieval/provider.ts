import type { DateRange, SourceType } from "@/types/discovery";

export interface RetrievalQuery {
  query: string;
  limit: number;
  dateRange?: DateRange;
}

export interface RetrievedDocument {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string;
  platform: string;
}

export type RetrievalResult =
  | { status: "ok"; documents: RetrievedDocument[] }
  | { status: "unsupported"; reason: string }
  | { status: "unavailable"; reason: string };

export interface SourceAdapter {
  readonly id: SourceType;
  readonly label: string;
  search(query: RetrievalQuery): Promise<RetrievalResult>;
}

function unsupported(
  label: string,
  extra?: string,
): RetrievalResult {
  return {
    status: "unsupported",
    reason:
      extra ??
      `${label} retrieval is not implemented. Unsupported sources fail gracefully and must not block the rest of the pipeline.`,
  };
}

export { unsupported };
