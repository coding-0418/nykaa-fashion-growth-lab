import { classifySourceType } from "@/lib/retrieval/urls";
import type {
  DocumentProcessingStatus,
  EvidenceUnit,
  SkipReasonCount,
  SourceStageBreakdown,
  SourceType,
} from "@/types/discovery";
import type { RawDocument, SearchResult } from "@/types/retrieval";

const TRACKED_SOURCE_TYPES: SourceType[] = [
  "reddit",
  "youtube",
  "web",
  "product_reviews",
  "app_store_reviews",
  "social",
];

/**
 * Per-source-type funnel across the whole pipeline (found -> fetched -> screened ->
 * relevant -> extracted), so it's visible at which stage each source type loses
 * documents instead of only seeing final totals.
 */
export function buildSourceBreakdown(
  searchResults: SearchResult[],
  documents: RawDocument[],
  documentProcessing: DocumentProcessingStatus[],
  evidence: EvidenceUnit[],
): SourceStageBreakdown[] {
  const byType = new Map<SourceType, SourceStageBreakdown>();
  for (const sourceType of TRACKED_SOURCE_TYPES) {
    byType.set(sourceType, {
      sourceType,
      resultsFound: 0,
      documentsFetched: 0,
      documentsFailed: 0,
      documentsScreened: 0,
      relevantDocuments: 0,
      evidenceExtracted: 0,
    });
  }

  for (const result of searchResults) {
    const sourceType = result.sourceType ?? classifySourceType(result.url);
    const row = byType.get(sourceType);
    if (!row) continue;
    row.resultsFound += 1;
    if (result.contentStatus === "fetched") row.documentsFetched += 1;
    if (result.contentStatus === "failed") row.documentsFailed += 1;
  }

  const documentById = new Map(documents.map((doc) => [doc.id, doc]));
  for (const status of documentProcessing) {
    const document = documentById.get(status.documentId);
    const sourceType = document?.sourceType ?? classifySourceType(status.url);
    const row = byType.get(sourceType);
    if (!row) continue;
    if (status.screeningStatus === "success") {
      row.documentsScreened += 1;
      if (status.relevance === "relevant" || status.relevance === "partially_relevant") {
        row.relevantDocuments += 1;
      }
    }
  }

  for (const unit of evidence) {
    const sourceType = classifySourceType(unit.source.url);
    const row = byType.get(sourceType);
    if (!row) continue;
    row.evidenceExtracted += 1;
  }

  return TRACKED_SOURCE_TYPES.map((type) => byType.get(type)!).filter(
    (row) => row.resultsFound > 0,
  );
}

function bucketFetchError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("exceeds max content size")) return "content_too_large";
  if (lower.includes("unsupported content type")) return "unsupported_content_type";
  if (lower.includes("no extractable public text")) return "no_extractable_text";
  if (lower.includes("login-gated") || lower.includes("insufficient public text"))
    return "login_gated_or_client_rendered";
  if (lower.includes("page is not publicly retrievable") || lower.includes("http 401") || lower.includes("http 403") || lower.includes("http 407"))
    return "not_publicly_accessible";
  if (lower.includes("page not found") || lower.includes("http 404") || lower.includes("http 410"))
    return "not_found";
  if (lower.includes("timed out")) return "timeout";
  if (lower.includes("http ")) return "http_error";
  return "other_fetch_error";
}

function bucketScreeningError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("empty document")) return "empty_document";
  if (lower.includes("timed out")) return "screening_timeout";
  if (lower.includes("ai http")) return "ai_provider_http_error";
  return "screening_failed";
}

/**
 * Aggregates why documents did NOT become evidence: fetch failures (by cause),
 * screening failures, and results that were never attempted because the fetch cap
 * was reached first (see run.ts's FETCH_PRIORITY ordering for how the cap is spent).
 */
export function buildSkipReasons(
  errors: Array<{ stage: string; message: string }>,
  searchResults: SearchResult[],
): SkipReasonCount[] {
  const counts = new Map<string, number>();
  const bump = (reason: string) => counts.set(reason, (counts.get(reason) ?? 0) + 1);

  for (const error of errors) {
    if (error.stage === "fetch") {
      bump(bucketFetchError(error.message));
    } else if (error.stage === "screening") {
      bump(bucketScreeningError(error.message));
    } else if (error.stage === "extraction") {
      bump("extraction_failed");
    } else if (error.stage === "hypothesis") {
      bump("hypothesis_generation_failed");
    }
  }

  const notAttempted = searchResults.filter(
    (result) => result.contentStatus === "skipped",
  ).length;
  if (notAttempted > 0) {
    counts.set("not_attempted_fetch_cap_reached", notAttempted);
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
