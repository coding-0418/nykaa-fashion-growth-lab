import type { AiProviderName } from "@/types/ai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_GROQ_MODEL } from "@/config/ai";

/**
 * Server-side environment access only.
 * Never import this module from Client Components.
 * Never prefix secrets with NEXT_PUBLIC_.
 */

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value.trim();
}

export function getAiProviderName(): AiProviderName {
  const raw = (readEnv("AI_PROVIDER") ?? "gemini").toLowerCase();

  if (raw === "gemini" || raw === "groq") {
    return raw;
  }

  throw new Error(
    `Invalid AI_PROVIDER "${raw}". Use "gemini" or "groq".`,
  );
}

export function getGeminiApiKey(): string | undefined {
  return readEnv("GEMINI_API_KEY");
}

export function getGroqApiKey(): string | undefined {
  return readEnv("GROQ_API_KEY");
}

export type SearchProviderName = "brave" | "tavily" | "mock";

export function getSearchProviderName(): SearchProviderName {
  const raw = (readEnv("SEARCH_PROVIDER") ?? "brave").toLowerCase();

  if (raw === "brave" || raw === "tavily" || raw === "mock") {
    return raw;
  }

  throw new Error(
    `Invalid SEARCH_PROVIDER "${raw}". Use "brave", "tavily", or "mock".`,
  );
}

export function getBraveSearchApiKey(): string | undefined {
  return readEnv("BRAVE_SEARCH_API_KEY");
}

export function getTavilyApiKey(): string | undefined {
  return readEnv("TAVILY_API_KEY");
}

export function getSearchStatus(): {
  provider: SearchProviderName;
  braveConfigured: boolean;
  tavilyConfigured: boolean;
  mockMode: boolean;
} {
  const provider = getSearchProviderName();
  return {
    provider,
    braveConfigured: Boolean(getBraveSearchApiKey()),
    tavilyConfigured: Boolean(getTavilyApiKey()),
    mockMode: provider === "mock",
  };
}

export function getGeminiModel(): string {
  return readEnv("GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;
}

export function getGroqModel(): string {
  return readEnv("GROQ_MODEL") ?? DEFAULT_GROQ_MODEL;
}

export function getAiStatus(): {
  provider: AiProviderName;
  geminiConfigured: boolean;
  groqConfigured: boolean;
  geminiModel: string;
  groqModel: string;
} {
  return {
    provider: getAiProviderName(),
    geminiConfigured: Boolean(getGeminiApiKey()),
    groqConfigured: Boolean(getGroqApiKey()),
    geminiModel: getGeminiModel(),
    groqModel: getGroqModel(),
  };
}
