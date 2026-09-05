import { parseModelJson } from "@/lib/ai/json";
import { normalizeBarrierCategory } from "@/config/taxonomy";
import {
  groundExcerpt,
  sanitizeSegmentName,
  truncateSource,
} from "@/lib/discovery/grounding";
import type { AiLimits } from "@/config/ai";
import {
  JOURNEY_STAGES,
  OUTCOMES,
  WISHLIST_INTENTS,
  type EvidenceStrength,
  type EvidenceUnit,
  type JourneyStage,
  type Outcome,
  type WishlistIntent,
} from "@/types/discovery";
import type { RawDocument } from "@/types/retrieval";
import type { RelevanceScreen } from "@/lib/discovery/relevance";

export interface ExtractionParseResult {
  unit: Omit<EvidenceUnit, "id" | "needsReview" | "isMock">;
  groundedExcerpt: boolean;
  uncertain: boolean;
  multipleBarriersPlausible: boolean;
}

function asEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

export function mapEvidenceStrength(value: unknown): EvidenceStrength {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  const rounded = Math.round(numeric);
  if (rounded <= 1) return 1;
  if (rounded === 2) return 2;
  if (rounded === 3) return 3;
  if (rounded === 4) return 4;
  return 5;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function parseExtractionJson(
  text: string,
  document: RawDocument,
  sourceText: string,
  screening: RelevanceScreen,
  limits: Pick<AiLimits, "maxSourceChars">,
): { ok: true; value: ExtractionParseResult } | { ok: false; error: string } {
  const parsed = parseModelJson(text);
  if (!parsed.ok) {
    return parsed;
  }
  if (!parsed.value || typeof parsed.value !== "object") {
    return { ok: false, error: "Extraction payload is not an object." };
  }

  const raw = parsed.value as Record<string, unknown>;
  const barrierRaw =
    raw.barrier && typeof raw.barrier === "object"
      ? (raw.barrier as Record<string, unknown>)
      : {};
  const alternativesRaw =
    raw.alternatives && typeof raw.alternatives === "object"
      ? (raw.alternatives as Record<string, unknown>)
      : {};
  const segmentRaw =
    raw.segment && typeof raw.segment === "object"
      ? (raw.segment as Record<string, unknown>)
      : {};

  const excerptResult = groundExcerpt(
    sourceText,
    typeof raw.relevantExcerpt === "string" ? raw.relevantExcerpt : undefined,
  );

  const originalText = truncateSource(sourceText, limits.maxSourceChars);

  return {
    ok: true,
    value: {
      groundedExcerpt: excerptResult.grounded,
      uncertain: raw.uncertain === true,
      multipleBarriersPlausible: raw.multipleBarriersPlausible === true,
      unit: {
        source: {
          platform: document.source,
          url: document.url,
          title: document.title,
          publishedAt: document.publishedAt,
          discoveredAt: document.retrievedAt,
        },
        content: {
          originalText,
          relevantExcerpt: excerptResult.excerpt,
        },
        journeyStage: asEnum<JourneyStage>(
          raw.journeyStage,
          JOURNEY_STAGES,
          "unknown",
        ),
        wishlistIntent: asEnum<WishlistIntent>(
          raw.wishlistIntent,
          WISHLIST_INTENTS,
          "unknown",
        ),
        barrier: {
          category: normalizeBarrierCategory(barrierRaw.category),
          subcategory:
            typeof barrierRaw.subcategory === "string" &&
            barrierRaw.subcategory.trim()
              ? barrierRaw.subcategory.trim()
              : undefined,
        },
        informationNeeded: stringList(raw.informationNeeded),
        alternatives: {
          sameProductElsewhere: stringList(alternativesRaw.sameProductElsewhere),
          similarProducts: stringList(alternativesRaw.similarProducts),
          otherPlatforms: stringList(alternativesRaw.otherPlatforms),
        },
        workaround: stringList(raw.workaround),
        outcome: asEnum<Outcome>(raw.outcome, OUTCOMES, "unknown"),
        segment: {
          name: sanitizeSegmentName(segmentRaw.name),
          reasoning:
            typeof segmentRaw.reasoning === "string"
              ? segmentRaw.reasoning
              : undefined,
        },
        evidenceStrength: mapEvidenceStrength(raw.evidenceStrength),
        relevance: screening.relevance,
        confidence: clampConfidence(raw.confidence),
        screeningReason: screening.reason,
      },
    },
  };
}

export function isExtractionImplemented(): boolean {
  return true;
}

export function shouldExtract(
  screening: RelevanceScreen,
  partialMinConfidence: number,
): boolean {
  if (screening.relevance === "relevant") {
    return true;
  }
  if (screening.relevance === "partially_relevant") {
    return screening.confidence >= partialMinConfidence;
  }
  return false;
}
