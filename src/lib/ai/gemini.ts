import { getGeminiApiKey, getGeminiModel } from "@/config/env";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import { postJson } from "@/lib/ai/http";
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from "@/lib/ai/provider";
import { ProviderNotConfiguredError } from "@/lib/errors";
import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini" as const;

  constructor(
    private readonly getApiKey: () => string | undefined = getGeminiApiKey,
    private readonly getModel: () => string = getGeminiModel,
    private readonly fetchImpl?: FetchLike,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  async complete(
    request: AiCompletionRequest,
  ): Promise<AiCompletionResult> {
    return this.generate(request, Boolean(request.jsonMode));
  }

  async completeStructured(
    request: AiCompletionRequest,
  ): Promise<AiCompletionResult> {
    return this.generate(request, true);
  }

  private async generate(
    request: AiCompletionRequest,
    jsonMode: boolean,
  ): Promise<AiCompletionResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ProviderNotConfiguredError("gemini");
    }

    const model = this.getModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const payload = await postJson({
      url,
      headers: { "Content-Type": "application/json" },
      timeoutMs: request.timeoutMs ?? DEFAULT_AI_LIMITS.timeoutMs,
      retryLimit: DEFAULT_AI_LIMITS.retryLimit,
      fetchImpl: this.fetchImpl,
      body: {
        systemInstruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: 0.1,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      },
    });

    const text =
      (payload as GeminiResponse).candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return { text, provider: "gemini", model };
  }
}
