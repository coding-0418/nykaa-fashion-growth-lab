import { getAiStatus, getSearchStatus } from "@/config/env";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import { DEFAULT_RETRIEVAL_LIMITS } from "@/config/retrieval";
import {
  parseResearchConfig,
  runDiscoveryPipeline,
} from "@/lib/discovery/pipeline";
import { toErrorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    const ai = getAiStatus();
    const search = getSearchStatus();

    return Response.json({
      status: "ok",
      pipelineImplemented: true,
      defaultConfig: DEFAULT_RESEARCH_CONFIG,
      retrievalLimits: DEFAULT_RETRIEVAL_LIMITS,
      aiLimits: DEFAULT_AI_LIMITS,
      ai: {
        provider: ai.provider,
        geminiConfigured: ai.geminiConfigured,
        groqConfigured: ai.groqConfigured,
        geminiModel: ai.geminiModel,
        groqModel: ai.groqModel,
      },
      search: {
        provider: search.provider,
        braveConfigured: search.braveConfigured,
        tavilyConfigured: search.tavilyConfigured,
        mockMode: search.mockMode,
      },
    });
  } catch (error) {
    const { body, status } = toErrorResponse(error);
    return Response.json(body, { status });
  }
}

export async function POST(request: Request) {
  try {
    let payload: unknown = {};

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await request.json();
    }

    const configInput =
      payload && typeof payload === "object" && "config" in payload
        ? (payload as { config: unknown }).config
        : payload;

    const config = parseResearchConfig(configInput);
    const result = await runDiscoveryPipeline(config);

    return Response.json(result);
  } catch (error) {
    const { body, status } = toErrorResponse(error);
    return Response.json(body, { status });
  }
}
