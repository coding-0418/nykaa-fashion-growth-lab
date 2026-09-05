import { parseModelJson } from "@/lib/ai/json";
import {
  JOURNEY_STAGES,
  RELEVANCE_LEVELS,
  type JourneyStage,
  type Relevance,
} from "@/types/discovery";

export interface RelevanceScreen {
  relevance: Relevance;
  reason: string;
  journeyStages: JourneyStage[];
  confidence: number;
}

function asRelevance(value: unknown): Relevance | undefined {
  if (typeof value === "string" && (RELEVANCE_LEVELS as readonly string[]).includes(value)) {
    return value as Relevance;
  }
  return undefined;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function parseRelevanceJson(
  text: string,
): { ok: true; value: RelevanceScreen } | { ok: false; error: string } {
  const parsed = parseModelJson(text);
  if (!parsed.ok) {
    return parsed;
  }

  if (!parsed.value || typeof parsed.value !== "object") {
    return { ok: false, error: "Relevance payload is not an object." };
  }

  const raw = parsed.value as Record<string, unknown>;
  const relevance = asRelevance(raw.relevance);
  if (!relevance) {
    return { ok: false, error: "Missing or invalid relevance." };
  }

  const journeyStages = Array.isArray(raw.journeyStages)
    ? raw.journeyStages.filter(
        (stage): stage is JourneyStage =>
          typeof stage === "string" &&
          (JOURNEY_STAGES as readonly string[]).includes(stage),
      )
    : [];

  return {
    ok: true,
    value: {
      relevance,
      reason: typeof raw.reason === "string" ? raw.reason : "",
      journeyStages,
      confidence: clampConfidence(raw.confidence),
    },
  };
}

export function isRelevanceFilterImplemented(): boolean {
  return true;
}
