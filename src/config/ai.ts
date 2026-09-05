export interface AiLimits {
  maxDocumentsScreened: number;
  maxDocumentsExtracted: number;
  timeoutMs: number;
  retryLimit: number;
  concurrency: number;
  /** Model self-reported confidence below this flags needsReview. Not statistical confidence. */
  reviewConfidenceThreshold: number;
  /** Partially relevant docs below this are not deeply extracted. */
  partialExtractMinConfidence: number;
  maxSourceChars: number;
}

export const DEFAULT_AI_LIMITS: AiLimits = {
  maxDocumentsScreened: 8,
  maxDocumentsExtracted: 5,
  timeoutMs: 20_000,
  retryLimit: 1,
  concurrency: 2,
  reviewConfidenceThreshold: 0.55,
  partialExtractMinConfidence: 0.65,
  maxSourceChars: 8_000,
};

function readPositiveInt(name: string, fallback: number, max: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function readUnitInterval(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, parsed));
}

export function getAiLimits(overrides?: Partial<AiLimits>): AiLimits {
  const fromEnv: AiLimits = {
    maxDocumentsScreened: readPositiveInt(
      "AI_MAX_DOCUMENTS_SCREENED",
      DEFAULT_AI_LIMITS.maxDocumentsScreened,
      30,
    ),
    maxDocumentsExtracted: readPositiveInt(
      "AI_MAX_DOCUMENTS_EXTRACTED",
      DEFAULT_AI_LIMITS.maxDocumentsExtracted,
      20,
    ),
    timeoutMs: readPositiveInt(
      "AI_TIMEOUT_MS",
      DEFAULT_AI_LIMITS.timeoutMs,
      60_000,
    ),
    retryLimit: readPositiveInt(
      "AI_RETRY_LIMIT",
      DEFAULT_AI_LIMITS.retryLimit,
      3,
    ),
    concurrency: readPositiveInt(
      "AI_CONCURRENCY",
      DEFAULT_AI_LIMITS.concurrency,
      4,
    ),
    reviewConfidenceThreshold: readUnitInterval(
      "AI_REVIEW_CONFIDENCE_THRESHOLD",
      DEFAULT_AI_LIMITS.reviewConfidenceThreshold,
    ),
    partialExtractMinConfidence: readUnitInterval(
      "AI_PARTIAL_EXTRACT_MIN_CONFIDENCE",
      DEFAULT_AI_LIMITS.partialExtractMinConfidence,
    ),
    maxSourceChars: readPositiveInt(
      "AI_MAX_SOURCE_CHARS",
      DEFAULT_AI_LIMITS.maxSourceChars,
      20_000,
    ),
  };

  return { ...fromEnv, ...overrides };
}

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
