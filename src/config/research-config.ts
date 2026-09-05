import type { ResearchConfig } from "@/types/discovery";

/**
 * Configurable research taxonomy. These are starting hypotheses, not conclusions.
 * Extraction must be allowed to surface themes that are not on this list.
 */
export const INITIAL_HYPOTHESIS_THEMES = [
  "low_or_weak_purchase_intent",
  "fit_and_size_uncertainty",
  "product_quality_fabric_uncertainty",
  "appearance_colour_expectation_uncertainty",
  "styling_occasion_uncertainty",
  "review_social_validation_gaps",
  "comparison_decision_fatigue",
  "cross_platform_comparison",
  "product_substitution",
  "price_value_timing",
  "availability",
  "trust",
  "delivery_checkout_friction",
  "post_purchase_experience_future_trust",
  "unknown_emerging",
] as const;

export const DEFAULT_RESEARCH_CONFIG: ResearchConfig = {
  product: "Nykaa Fashion",
  businessQuestion:
    "Why do users who wishlist fashion products fail to purchase at least one wishlisted product within 30 days?",
  journeyStages: "entire_journey",
  themes: [...INITIAL_HYPOTHESIS_THEMES],
  sourceTypes: [
    "reddit",
    "youtube",
    "web",
    "product_reviews",
    "app_store_reviews",
    "social",
  ],
  resultLimit: 20,
};

export const WORKING_METRIC_NOTE =
  "30-Day Wishlist Purchase Conversion is a working business metric definition. This application does not have internal Nykaa Fashion data and must not invent a baseline conversion rate.";
