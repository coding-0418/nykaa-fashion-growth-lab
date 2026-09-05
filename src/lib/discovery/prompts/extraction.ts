import {
  JOURNEY_STAGES,
  OUTCOMES,
  WISHLIST_INTENTS,
  type ResearchConfig,
} from "@/types/discovery";
import type { RawDocument } from "@/types/retrieval";
import { BARRIER_CATEGORIES } from "@/config/taxonomy";

export function buildExtractionSystemPrompt(): string {
  return `You extract structured evidence from one public source for a Nykaa Fashion journey study.

Rules:
- Use only the provided source text.
- Distinguish EXPLICIT EVIDENCE from INFERENCE from UNKNOWN.
- Prefer explicit evidence. If a field is not supported, use "unknown" or [].
- Do not invent users, demographics, quotes, prices, product facts, platform comparisons, or outcomes.
- Do not rewrite the excerpt. Copy a contiguous span from the source.
- Do not assume fit, price, or checkout problems unless the source states them.
- Do not infer age, gender, city, income, body type, or occupation.
- Segments must be behavioural (e.g. comparison_shopper), never demographic.
- Barrier category must be one of the allowed taxonomy values, or "other". Do not invent many new categories.
- Wishlist intent: bookmark, future_purchase, high_intent, comparison, inspiration, occasion_based, unknown.
  Do not use high_intent merely because the user liked an item.
- Outcome only if supported. Sentiment is not an outcome.
- Evidence strength is directional 1-5, not statistical significance:
  1 general opinion; 2 specific issue little context; 3 behaviour + friction; 4 + workaround; 5 journey + blocker + workaround + outcome.
- If the source is labelled CONTENT TYPE: METADATA ONLY, it is a page's title/description,
  not a transcript, comment, or review body. Do not claim a video was watched, a comment
  section was read, or a review was analyzed if only metadata was provided. Extract only
  what the metadata itself states, keep evidenceStrength low (1-2) unless the metadata
  text itself is unusually specific, and set uncertain: true.

Return JSON only.`;
}

export function buildExtractionUserPrompt(
  config: ResearchConfig,
  document: RawDocument,
  sourceText: string,
  screeningReason: string,
): string {
  return `Product: ${config.product}
Business question: ${config.businessQuestion}
Screening note from stage A (not a conclusion): ${screeningReason}

Allowed journeyStage: ${JOURNEY_STAGES.join(", ")}
Allowed wishlistIntent: ${WISHLIST_INTENTS.join(", ")}
Allowed outcome: ${OUTCOMES.join(", ")}
Allowed barrier.category: ${BARRIER_CATEGORIES.join(", ")}

Source URL: ${document.url}
Source title: ${document.title ?? ""}
Source platform: ${document.source}
Content type: ${document.evidenceKind === "metadata" ? "METADATA ONLY (page title/description, not a transcript, comment, or review body)" : "content (page text as retrieved)"}

Source content:
"""
${sourceText}
"""

Identify what problems, if any, are evidenced. Do not assume a biggest problem.

Return strict JSON:
{
  "journeyStage": string,
  "wishlistIntent": string,
  "barrier": { "category": string, "subcategory": string | null },
  "informationNeeded": string[],
  "alternatives": {
    "sameProductElsewhere": string[],
    "similarProducts": string[],
    "otherPlatforms": string[]
  },
  "workaround": string[],
  "outcome": string,
  "segment": { "name": string, "reasoning": string },
  "evidenceStrength": 1,
  "confidence": 0.0,
  "relevantExcerpt": string,
  "uncertain": false,
  "multipleBarriersPlausible": false
}

relevantExcerpt must be copied from the source content (contiguous if possible), concise, no invented words.
confidence is model self-reported certainty in [0,1], not statistical confidence.`;
}
