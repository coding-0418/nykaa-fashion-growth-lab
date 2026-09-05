import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";

export class AiHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "AiHttpError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Backoff before a retryable (429/5xx) retry. Respects a numeric Retry-After header
 * (seconds) when the provider sends one; otherwise a short exponential backoff.
 * Without this, a 429 was retried immediately and almost always failed again —
 * masking whether a document would otherwise have screened as relevant.
 */
function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number.parseFloat(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 5000);
    }
  }
  return Math.min(400 * 2 ** attempt, 3000);
}

export async function postJson(options: {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  retryLimit: number;
  fetchImpl?: FetchLike;
}): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let lastError: Error = new Error("AI request failed.");

  const attempts = Math.max(1, options.retryLimit + 1);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetchImpl(options.url, {
        method: "POST",
        headers: options.headers,
        body: JSON.stringify(options.body),
        signal: controller.signal,
      });

      if (response.status === 429 || response.status >= 500) {
        lastError = new AiHttpError(
          `AI HTTP ${response.status}`,
          response.status,
          true,
        );
        if (attempt < attempts - 1) {
          await sleep(retryDelayMs(attempt, response.headers.get("retry-after")));
        }
        continue;
      }

      if (!response.ok) {
        throw new AiHttpError(
          `AI HTTP ${response.status}`,
          response.status,
          false,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof AiHttpError && !error.retryable) {
        throw error;
      }
      const timedOut =
        error instanceof Error &&
        (error.name === "AbortError" || /abort|timed out/i.test(error.message));
      lastError = timedOut
        ? new AiHttpError("AI request timed out.", undefined, true)
        : error instanceof Error
          ? error
          : new Error("AI request failed.");
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}
