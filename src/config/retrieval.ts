import type { RetrievalLimits } from "@/types/retrieval";

/**
 * maxQueries/maxPagesFetched/maxContentBytes were raised from 6/8/400_000: at the old
 * values, a typical run's top-8-by-rank fetch slice was dominated by large app-store and
 * social pages that exceeded the byte cap, pushing genuinely useful (but lower-ranked)
 * Reddit/review-page URLs past the fetch cutoff without ever being attempted. All three
 * remain env-overridable and bounded by the same ceilings as before.
 */
export const DEFAULT_RETRIEVAL_LIMITS: RetrievalLimits = {
  maxQueries: 10,
  maxResultsPerQuery: 4,
  maxPagesFetched: 15,
  timeoutMs: 6000,
  maxContentBytes: 900_000,
};

function readPositiveInt(
  name: string,
  fallback: number,
  max: number,
): number {
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

export function getRetrievalLimits(
  overrides?: Partial<RetrievalLimits>,
): RetrievalLimits {
  const fromEnv: RetrievalLimits = {
    maxQueries: readPositiveInt(
      "RETRIEVAL_MAX_QUERIES",
      DEFAULT_RETRIEVAL_LIMITS.maxQueries,
      20,
    ),
    maxResultsPerQuery: readPositiveInt(
      "RETRIEVAL_MAX_RESULTS_PER_QUERY",
      DEFAULT_RETRIEVAL_LIMITS.maxResultsPerQuery,
      20,
    ),
    maxPagesFetched: readPositiveInt(
      "RETRIEVAL_MAX_PAGES_FETCHED",
      DEFAULT_RETRIEVAL_LIMITS.maxPagesFetched,
      30,
    ),
    timeoutMs: readPositiveInt(
      "RETRIEVAL_TIMEOUT_MS",
      DEFAULT_RETRIEVAL_LIMITS.timeoutMs,
      20_000,
    ),
    maxContentBytes: readPositiveInt(
      "RETRIEVAL_MAX_CONTENT_BYTES",
      DEFAULT_RETRIEVAL_LIMITS.maxContentBytes,
      2_000_000,
    ),
  };

  return { ...fromEnv, ...overrides };
}
