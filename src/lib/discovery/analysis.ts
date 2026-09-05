import type { AiLimits } from "@/config/ai";
import type { AiProvider } from "@/lib/ai/provider";
import {
  parseExtractionJson,
  shouldExtract,
} from "@/lib/discovery/extraction";
import { truncateSource } from "@/lib/discovery/grounding";
import {
  buildExtractionSystemPrompt,
  buildExtractionUserPrompt,
} from "@/lib/discovery/prompts/extraction";
import {
  buildRelevanceSystemPrompt,
  buildRelevanceUserPrompt,
} from "@/lib/discovery/prompts/relevance";
import { parseRelevanceJson } from "@/lib/discovery/relevance";
import { shouldFlagForReview } from "@/lib/discovery/review";
import type {
  DocumentProcessingStatus,
  EvidenceUnit,
  ResearchConfig,
} from "@/types/discovery";
import type { RawDocument } from "@/types/retrieval";

export interface AnalysisResult {
  evidence: EvidenceUnit[];
  documentProcessing: DocumentProcessingStatus[];
  documentsScreened: number;
  relevantDocuments: number;
  partiallyRelevantDocuments: number;
  irrelevantDocuments: number;
  extractionSucceeded: number;
  extractionFailed: number;
  needsReview: number;
  warnings: string[];
  errors: Array<{ stage: string; message: string }>;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      const item = items[current];
      if (item === undefined) {
        continue;
      }
      results[current] = await mapper(item);
    }
  }

  const size = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: size }, () => worker()));
  return results;
}

function emptyAnalysis(warnings: string[]): AnalysisResult {
  return {
    evidence: [],
    documentProcessing: [],
    documentsScreened: 0,
    relevantDocuments: 0,
    partiallyRelevantDocuments: 0,
    irrelevantDocuments: 0,
    extractionSucceeded: 0,
    extractionFailed: 0,
    needsReview: 0,
    warnings,
    errors: [],
  };
}

export async function runEvidenceAnalysis(options: {
  config: ResearchConfig;
  documents: RawDocument[];
  ai: AiProvider;
  limits: AiLimits;
  mockMode: boolean;
}): Promise<AnalysisResult> {
  const { config, ai, limits, mockMode } = options;

  if (!ai.isConfigured()) {
    return emptyAnalysis([
      `AI provider "${ai.name}" is not configured. Retrieved documents were kept; no evidence was invented.`,
    ]);
  }

  const toScreen = options.documents.slice(0, limits.maxDocumentsScreened);
  if (toScreen.length === 0) {
    return emptyAnalysis(["No fetched documents were available for AI screening."]);
  }

  const warnings: string[] = [
    "AI findings are hypotheses until validated with primary research. Model confidence is not statistical confidence.",
  ];
  if (mockMode) {
    warnings.push(
      "MOCK / DEMO — NOT RESEARCH EVIDENCE. Mock documents were analysed only to exercise the pipeline.",
    );
  }

  const errors: Array<{ stage: string; message: string }> = [];
  const processing: DocumentProcessingStatus[] = [];
  const evidence: EvidenceUnit[] = [];

  let relevantDocuments = 0;
  let partiallyRelevantDocuments = 0;
  let irrelevantDocuments = 0;
  let extractionSucceeded = 0;
  let extractionFailed = 0;
  let documentsScreened = 0;
  let extractedCount = 0;

  const screened = await mapPool(toScreen, limits.concurrency, async (document) => {
    const sourceText = truncateSource(document.content, limits.maxSourceChars);

    if (!sourceText) {
      return {
        document,
        sourceText,
        screening: null as ReturnType<typeof parseRelevanceJson> | null,
        screeningError: "Empty document; skipped AI screening.",
      };
    }

    try {
      const response = await ai.completeStructured({
        systemPrompt: buildRelevanceSystemPrompt(),
        prompt: buildRelevanceUserPrompt(config, document, sourceText),
        timeoutMs: limits.timeoutMs,
      });
      return {
        document,
        sourceText,
        screening: parseRelevanceJson(response.text),
        screeningError: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Relevance screening failed.";
      return {
        document,
        sourceText,
        screening: null,
        screeningError: message,
      };
    }
  });

  for (const row of screened) {
    if (!row.sourceText) {
      processing.push({
        documentId: row.document.id,
        url: row.document.url,
        screeningStatus: "skipped",
        extractionStatus: "skipped",
        reason: row.screeningError ?? "Empty document.",
      });
      errors.push({
        stage: "screening",
        message: `${row.document.url}: empty document`,
      });
      continue;
    }

    documentsScreened += 1;

    if (!row.screening || !row.screening.ok) {
      const reason =
        row.screeningError ??
        (row.screening && !row.screening.ok ? row.screening.error : "Screening failed.");
      processing.push({
        documentId: row.document.id,
        url: row.document.url,
        screeningStatus: "failed",
        extractionStatus: "skipped",
        reason,
      });
      errors.push({ stage: "screening", message: `${row.document.url}: ${reason}` });
      continue;
    }

    const screen = row.screening.value;
    if (screen.relevance === "relevant") relevantDocuments += 1;
    if (screen.relevance === "partially_relevant") partiallyRelevantDocuments += 1;
    if (screen.relevance === "irrelevant") irrelevantDocuments += 1;

    const extract = shouldExtract(screen, limits.partialExtractMinConfidence);
    if (!extract) {
      processing.push({
        documentId: row.document.id,
        url: row.document.url,
        screeningStatus: "success",
        extractionStatus: "skipped",
        relevance: screen.relevance,
        reason: screen.reason,
      });
      continue;
    }

    if (extractedCount >= limits.maxDocumentsExtracted) {
      processing.push({
        documentId: row.document.id,
        url: row.document.url,
        screeningStatus: "success",
        extractionStatus: "skipped",
        relevance: screen.relevance,
        reason: "Skipped deep extraction because the extraction cap was reached.",
      });
      continue;
    }

    extractedCount += 1;

    try {
      const response = await ai.completeStructured({
        systemPrompt: buildExtractionSystemPrompt(),
        prompt: buildExtractionUserPrompt(
          config,
          row.document,
          row.sourceText,
          screen.reason,
        ),
        timeoutMs: limits.timeoutMs,
      });
      const parsed = parseExtractionJson(
        response.text,
        row.document,
        row.sourceText,
        screen,
        limits,
      );

      if (!parsed.ok) {
        extractionFailed += 1;
        processing.push({
          documentId: row.document.id,
          url: row.document.url,
          screeningStatus: "success",
          extractionStatus: "failed",
          relevance: screen.relevance,
          reason: parsed.error,
        });
        errors.push({
          stage: "extraction",
          message: `${row.document.url}: ${parsed.error}`,
        });
        continue;
      }

      const needsReview = shouldFlagForReview(parsed.value.unit, parsed.value, limits);
      const unit: EvidenceUnit = {
        ...parsed.value.unit,
        id: `ev-${row.document.id}`,
        needsReview,
        isMock: mockMode || row.document.isMock,
        groundedExcerpt: parsed.value.groundedExcerpt,
        uncertain: parsed.value.uncertain,
      };
      evidence.push(unit);
      extractionSucceeded += 1;
      processing.push({
        documentId: row.document.id,
        url: row.document.url,
        screeningStatus: "success",
        extractionStatus: "success",
        relevance: screen.relevance,
        reason: screen.reason,
      });
    } catch (error) {
      extractionFailed += 1;
      const message =
        error instanceof Error ? error.message : "Extraction failed.";
      processing.push({
        documentId: row.document.id,
        url: row.document.url,
        screeningStatus: "success",
        extractionStatus: "failed",
        relevance: screen.relevance,
        reason: message,
      });
      errors.push({ stage: "extraction", message: `${row.document.url}: ${message}` });
    }
  }

  return {
    evidence,
    documentProcessing: processing,
    documentsScreened,
    relevantDocuments,
    partiallyRelevantDocuments,
    irrelevantDocuments,
    extractionSucceeded,
    extractionFailed,
    needsReview: evidence.filter((unit) => unit.needsReview).length,
    warnings,
    errors,
  };
}
