import { getAiProviderName } from "@/config/env";
import { GeminiProvider } from "@/lib/ai/gemini";
import { GroqProvider } from "@/lib/ai/groq";
import type { AiProviderName } from "@/types/ai";

export type { AiProviderName };

export interface AiCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface AiCompletionResult {
  text: string;
  provider: AiProviderName;
  model: string;
}

export interface AiProvider {
  readonly name: AiProviderName;
  isConfigured(): boolean;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
  completeStructured(request: AiCompletionRequest): Promise<AiCompletionResult>;
}

export function getAiProvider(): AiProvider {
  const name = getAiProviderName();

  if (name === "groq") {
    return new GroqProvider();
  }

  return new GeminiProvider();
}
