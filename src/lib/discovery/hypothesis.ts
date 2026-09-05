import type { AiLimits } from "@/config/ai";
import type { BarrierCategory } from "@/config/taxonomy";
import type { AiProvider } from "@/lib/ai/provider";
import { parseModelJson } from "@/lib/ai/json";
import {
  buildHypothesisSystemPrompt,
  buildHypothesisUserPrompt,
} from "@/lib/discovery/prompts/hypothesis";
import type {
  Hypothesis,
  OpportunityConfidence,
  RankedOpportunity,
  ResearchConfig,
} from "@/types/discovery";

const DEFAULT_MAX_HYPOTHESES = 3;

const INTERVENTION_TEMPLATES: Partial<Record<BarrierCategory, string>> = {
  fit: "A Personalised Fit Check that reasons across usual brand/size, fit preference, and the product's size chart, fabric, and reviews.",
  appearance: "Richer on-model imagery/video across body types for wishlisted items.",
  quality: "Surfaced fabric/material facts and quality-specific review excerpts at the point of decision.",
  styling: "Occasion/styling guidance surfaced for wishlisted items.",
  reviews: "Structured, fit- or quality-specific review highlights instead of generic star ratings.",
  social_validation: "In-app social proof (e.g. verified fit outcomes) to reduce off-platform checking.",
  comparison: "Side-by-side comparison support for wishlisted alternatives.",
  cross_platform: "Clearer differentiation of the value not available on competitor platforms.",
  substitution: "Better in-app alternative suggestions when the exact item is uncertain.",
  price_value: "Clearer value framing at the point the shopper hesitates on price.",
  timing: "Wishlist reminders tied to relevant timing (sale, occasion) rather than generic nudges.",
  availability: "Clear, trustworthy stock/restock signals on wishlisted items.",
  trust: "Trust signals addressing the specific concern raised in evidence.",
  delivery: "Delivery-expectation clarity earlier in the decision, not just at checkout.",
  returns: "Clearer return/exchange terms surfaced before purchase, not after.",
  checkout: "Checkout-flow simplification at the specific step evidenced as friction.",
  post_purchase_trust: "Post-purchase follow-up that closes the loop on the original uncertainty.",
  intent: "Signals to distinguish inspirational wishlist adds from purchase-intent adds.",
};

function interventionFor(category: string): string {
  return (
    INTERVENTION_TEMPLATES[category as BarrierCategory] ??
    "A targeted product change addressing the specific uncertainty in the evidence."
  );
}

function stringList(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/**
 * Keeps only AI-claimed supporting evidence that is actually traceable to one of the
 * opportunity's real excerpts, so a generated hypothesis cannot cite invented evidence.
 */
function groundSupportingEvidence(
  claims: string[],
  opportunity: RankedOpportunity,
): string[] {
  const sourceTexts = opportunity.representativeExcerpts.map((item) =>
    item.excerpt.toLowerCase(),
  );
  const grounded = claims.filter((claim) => {
    const needle = claim.toLowerCase();
    return sourceTexts.some(
      (source) => source.includes(needle) || needle.includes(source),
    );
  });
  if (grounded.length > 0) {
    return grounded;
  }
  // Fall back to the opportunity's own excerpts rather than keeping an ungrounded claim.
  return opportunity.representativeExcerpts.map((item) => item.excerpt);
}

function templateHypothesis(
  opportunity: RankedOpportunity,
  isMock: boolean,
): Hypothesis {
  return {
    id: `hyp-${opportunity.id}`,
    opportunityId: opportunity.id,
    theme: opportunity.theme,
    hypothesis: `Shoppers experiencing "${opportunity.theme}" may delay or abandon a wishlist purchase because their uncertainty is not resolved by current product information.`,
    targetBehaviour: "Wishlist item is not purchased within 30 days despite stated or implied interest.",
    suspectedRootCause: `Directly observed in ${opportunity.evidenceCount} retrieved document(s) for this run; not yet validated with primary research.`,
    evidenceSupporting: opportunity.representativeExcerpts.map((item) => item.excerpt),
    evidenceWeakening: [
      `Based on ${opportunity.evidenceCount} document(s) from ${opportunity.sourceDiversity} source(s) in one retrieval run — too small to generalize.`,
    ],
    validation: "Run a moderated study or targeted survey with Decision-Stuck Shoppers asking directly about this barrier.",
    falsification: "If shoppers report no difficulty here, or a controlled product change shows no change in wishlist-to-purchase conversion, the hypothesis is not supported.",
    productIntervention: interventionFor(opportunity.barrierCategory),
    expectedUserValue: "Faster, more confident purchase decisions on items already wishlisted.",
    expectedBusinessValue: "Directional improvement in 30-day wishlist purchase conversion; not a measured figure.",
    confidence: opportunity.confidence,
    source: "template_generated",
    isMock,
  };
}

function parseHypothesisJson(
  text: string,
  opportunity: RankedOpportunity,
  isMock: boolean,
): { ok: true; value: Hypothesis } | { ok: false; error: string } {
  const parsed = parseModelJson(text);
  if (!parsed.ok) {
    return parsed;
  }
  if (!parsed.value || typeof parsed.value !== "object") {
    return { ok: false, error: "Hypothesis payload is not an object." };
  }
  const raw = parsed.value as Record<string, unknown>;

  const hypothesis = nonEmptyString(raw.hypothesis, "");
  if (!hypothesis) {
    return { ok: false, error: "Missing hypothesis statement." };
  }

  const supporting = groundSupportingEvidence(
    stringList(raw.evidenceSupporting),
    opportunity,
  );

  return {
    ok: true,
    value: {
      id: `hyp-${opportunity.id}`,
      opportunityId: opportunity.id,
      theme: opportunity.theme,
      hypothesis,
      targetBehaviour: nonEmptyString(
        raw.targetBehaviour,
        "Wishlist item is not purchased within 30 days.",
      ),
      suspectedRootCause: nonEmptyString(
        raw.suspectedRootCause,
        "Not stated by the model; treat as unresolved.",
      ),
      evidenceSupporting: supporting,
      evidenceWeakening: stringList(raw.evidenceWeakening).length
        ? stringList(raw.evidenceWeakening)
        : [
            `Based on ${opportunity.evidenceCount} document(s) from ${opportunity.sourceDiversity} source(s) — a limited sample.`,
          ],
      validation: nonEmptyString(
        raw.validation,
        "Run a moderated study or survey with Decision-Stuck Shoppers.",
      ),
      falsification: nonEmptyString(
        raw.falsification,
        "If shoppers report no difficulty here, the hypothesis is not supported.",
      ),
      productIntervention: nonEmptyString(
        raw.productIntervention,
        interventionFor(opportunity.barrierCategory),
      ),
      expectedUserValue: nonEmptyString(
        raw.expectedUserValue,
        "Faster, more confident purchase decisions on wishlisted items.",
      ),
      expectedBusinessValue: nonEmptyString(
        raw.expectedBusinessValue,
        "Directional improvement in 30-day wishlist purchase conversion; not a measured figure.",
      ),
      confidence: opportunity.confidence as OpportunityConfidence,
      source: "ai_generated",
      isMock,
    },
  };
}

export interface HypothesisGenerationResult {
  hypotheses: Hypothesis[];
  warnings: string[];
  errors: Array<{ stage: string; message: string }>;
}

export async function generateHypotheses(options: {
  opportunities: RankedOpportunity[];
  config: ResearchConfig;
  ai: AiProvider;
  limits: AiLimits;
  mockMode: boolean;
  maxHypotheses?: number;
}): Promise<HypothesisGenerationResult> {
  const { opportunities, config, ai, limits, mockMode } = options;
  const maxHypotheses = options.maxHypotheses ?? DEFAULT_MAX_HYPOTHESES;

  const warnings: string[] = [];
  const errors: Array<{ stage: string; message: string }> = [];
  const candidates = opportunities.filter((o) => o.evidenceCount > 0).slice(0, maxHypotheses);

  if (candidates.length === 0) {
    return { hypotheses: [], warnings, errors };
  }

  if (!ai.isConfigured()) {
    warnings.push(
      `AI provider "${ai.name}" is not configured. Hypotheses below were generated from opportunity statistics only, without an AI reasoning pass.`,
    );
    return {
      hypotheses: candidates.map((opportunity) =>
        templateHypothesis(opportunity, mockMode || opportunity.isMock),
      ),
      warnings,
      errors,
    };
  }

  const hypotheses: Hypothesis[] = [];
  for (const opportunity of candidates) {
    try {
      const response = await ai.completeStructured({
        systemPrompt: buildHypothesisSystemPrompt(),
        prompt: buildHypothesisUserPrompt(config, opportunity),
        timeoutMs: limits.timeoutMs,
      });
      const parsed = parseHypothesisJson(
        response.text,
        opportunity,
        mockMode || opportunity.isMock,
      );
      if (!parsed.ok) {
        errors.push({ stage: "hypothesis", message: `${opportunity.id}: ${parsed.error}` });
        hypotheses.push(templateHypothesis(opportunity, mockMode || opportunity.isMock));
        continue;
      }
      hypotheses.push(parsed.value);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hypothesis generation failed.";
      errors.push({ stage: "hypothesis", message: `${opportunity.id}: ${message}` });
      hypotheses.push(templateHypothesis(opportunity, mockMode || opportunity.isMock));
    }
  }

  warnings.push(
    "Hypotheses are AI-generated interpretations of directional evidence. They are not validated findings until checked against primary research.",
  );

  return { hypotheses, warnings, errors };
}
