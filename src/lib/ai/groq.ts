import { getGroqApiKey, getGroqModel } from "@/config/env";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import { postJson } from "@/lib/ai/http";
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from "@/lib/ai/provider";
import { ProviderNotConfiguredError } from "@/lib/errors";
import type { FetchLike } from "@/lib/retrieval/fetch/fetcher";

interface GroqResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
}

export class GroqProvider implements AiProvider {
  readonly name = "groq" as const;

  constructor(
    private readonly getApiKey: () => string | undefined = getGroqApiKey,
    private readonly getModel: () => string = getGroqModel,
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
      throw new ProviderNotConfiguredError("groq");
    }

    const model = this.getModel();
    const messages = [
      ...(request.systemPrompt
        ? [{ role: "system", content: request.systemPrompt }]
        : []),
      { role: "user", content: request.prompt },
    ];

    const payload = await postJson({
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      timeoutMs: request.timeoutMs ?? DEFAULT_AI_LIMITS.timeoutMs,
      retryLimit: DEFAULT_AI_LIMITS.retryLimit,
      fetchImpl: this.fetchImpl,
      body: {
        model,
        temperature: 0.1,
        messages,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      },
    });

    const text =
      (payload as GroqResponse).choices?.[0]?.message?.content?.trim() ?? "";

    if (!text) {
      throw new Error("Groq returned an empty response.");
    }

    return { text, provider: "groq", model };
  }
}
