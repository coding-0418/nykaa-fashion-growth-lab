import { JOURNEY_STAGES, type ResearchConfig } from "@/types/discovery";
import type { RawDocument } from "@/types/retrieval";
import { BARRIER_CATEGORIES } from "@/config/taxonomy";

export function buildRelevanceSystemPrompt(): string {
  return `You are a research assistant for a product-management study of Nykaa Fashion.

Business question (working definition only): why users who wishlist fashion products may not purchase at least one wishlisted product within 30 days.

You screen public web text. You do not invent users, quotes, demographics, prices, outcomes, or statistics.

Classify relevance to the fashion shopping journey and/or what may prevent a wishlisted or considered product from becoming a purchase.

RELEVANT: specific behaviour, decision, friction, uncertainty, workaround, alternative, purchase/non-purchase outcome, or post-purchase experience tied to this research.

PARTIALLY_RELEVANT: useful fashion-shopping behaviour with only a weak or indirect link to the target journey.

IRRELEVANT: generic noise or unrelated content (login issues, generic app crashes, unrelated beauty, generic CS complaints, delivery rants with no purchase-decision link).

Do not classify by sentiment. A positive review can be relevant. A negative review can be irrelevant.
Delivery/returns/quality matter only if the source connects them to purchase decisions or future shopping.

Some sources are labelled CONTENT TYPE: METADATA ONLY. This means the text is a page's
title/description, not a transcript, comment, or review body. Never treat metadata-only
text as if it were user-generated behavioural evidence (e.g. never claim a video's
comments or a transcript were analyzed). Metadata can still be screened for relevance
(e.g. a video titled about wishlist hesitation is a real signal that such content
exists), but say so plainly in "reason" rather than implying deeper content was read.

Return JSON only.`;
}

export function buildRelevanceUserPrompt(
  config: ResearchConfig,
  document: RawDocument,
  sourceText: string,
): string {
  return `Product: ${config.product}
Business question: ${config.businessQuestion}
Allowed journey stages: ${JOURNEY_STAGES.join(", ")}
Initial barrier taxonomy (do not force a match): ${BARRIER_CATEGORIES.join(", ")}

Source URL: ${document.url}
Source title: ${document.title ?? ""}
Source platform: ${document.source}
Content type: ${document.evidenceKind === "metadata" ? "METADATA ONLY (page title/description, not a transcript, comment, or review body)" : "content (page text as retrieved)"}

Source content:
"""
${sourceText}
"""

Identify whether this content contains meaningful evidence for the research. Do not assume a problem exists.

Return strict JSON:
{
  "relevance": "relevant" | "partially_relevant" | "irrelevant",
  "reason": string,
  "journeyStages": string[],
  "confidence": number
}

confidence is your self-reported certainty between 0 and 1. It is not statistical confidence.
If the source does not support a journey stage, use [].`;
}
