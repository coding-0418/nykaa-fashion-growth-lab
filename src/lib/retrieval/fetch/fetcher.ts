import { extractTextFromHtml } from "@/lib/retrieval/fetch/extract";
import type { RetrievalLimits } from "@/types/retrieval";

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type PageFetchStatus = "fetched" | "unavailable" | "failed";

export interface PageFetchResult {
  status: PageFetchStatus;
  url: string;
  title?: string;
  description?: string;
  content?: string;
  contentType?: string;
  reason?: string;
}

const ALLOWED_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/plain",
];

function isAllowedContentType(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const mime = value.split(";")[0]?.trim().toLowerCase() ?? "";
  return ALLOWED_TYPES.some((type) => mime === type);
}

async function readLimited(
  response: Response,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader) {
    const length = Number.parseInt(lengthHeader, 10);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new Error("Response exceeds max content size.");
    }
  }

  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error("Response exceeds max content size.");
    }
    return { bytes: buffer, truncated: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error("Response exceeds max content size.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { bytes, truncated: false };
}

export async function fetchPublicPage(
  url: string,
  limits: Pick<RetrievalLimits, "timeoutMs" | "maxContentBytes">,
  fetchImpl: FetchLike = fetch,
): Promise<PageFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limits.timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
        "User-Agent":
          "NykaaFashionDiscoveryEngine/0.2 (academic public-web retrieval)",
      },
    });

    if (response.status === 401 || response.status === 403 || response.status === 407) {
      return {
        status: "unavailable",
        url,
        reason: `HTTP ${response.status}: page is not publicly retrievable.`,
      };
    }

    if (response.status === 404 || response.status === 410) {
      return {
        status: "unavailable",
        url,
        reason: `HTTP ${response.status}: page not found.`,
      };
    }

    if (!response.ok) {
      return {
        status: "failed",
        url,
        reason: `HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get("content-type");
    if (!isAllowedContentType(contentType)) {
      return {
        status: "unavailable",
        url,
        reason: `Unsupported content type: ${contentType ?? "unknown"}`,
      };
    }

    const { bytes } = await readLimited(response, limits.maxContentBytes);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const mime = contentType?.split(";")[0]?.trim().toLowerCase() ?? "text/html";

    if (mime === "text/plain") {
      return {
        status: "fetched",
        url: response.url || url,
        content: text.trim().slice(0, 50_000),
        contentType: mime,
      };
    }

    const extracted = extractTextFromHtml(text);
    if (!extracted.text && !extracted.description) {
      return {
        status: "unavailable",
        url: response.url || url,
        title: extracted.title,
        reason: "No extractable public text.",
        contentType: mime,
      };
    }

    return {
      status: "fetched",
      url: response.url || url,
      title: extracted.title,
      description: extracted.description,
      content: extracted.text,
      contentType: mime,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown fetch error";
    const timedOut =
      (error instanceof Error && error.name === "AbortError") ||
      message.toLowerCase().includes("abort");

    return {
      status: timedOut ? "failed" : "failed",
      url,
      reason: timedOut ? "Request timed out." : message,
    };
  } finally {
    clearTimeout(timer);
  }
}
