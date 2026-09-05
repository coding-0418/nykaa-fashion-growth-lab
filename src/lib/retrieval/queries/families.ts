export interface QueryFamily {
  id: string;
  /**
   * Theme keys from ResearchConfig.themes that activate this family.
   * Use ["*"] to always include when any themes are selected.
   */
  themeKeys: string[];
  build(productPhrase: string): string[];
}

function quoteProduct(product: string): string {
  const trimmed = product.trim();
  if (trimmed.includes(" ")) {
    return `"${trimmed}"`;
  }
  return trimmed;
}

/**
 * Families are ordered by how directly they target behavioural evidence for the
 * business question (wishlist -> purchase), not alphabetically. generateSearchQueries
 * round-robins across matched families, so this order only matters as a tie-breaker —
 * but it still documents intent: fit/sizing and cross-platform behavioural sources
 * (Reddit, YouTube, app reviews) come before generic/corporate-leaning families.
 */
export function createQueryFamilies(): QueryFamily[] {
  return [
    {
      id: "fit_sizing",
      themeKeys: ["fit_and_size_uncertainty", "*"],
      build: (p) => [
        `${p} size fit review`,
        `${p} sizing chart wrong`,
        `${p} returned wrong size`,
        `${p} runs small runs large`,
      ],
    },
    {
      id: "wishlist_behaviour",
      themeKeys: ["low_or_weak_purchase_intent", "*"],
      build: (p) => [
        `${p} wishlist purchase`,
        `${p} saved item didn't buy`,
        `${p} wishlist deciding`,
      ],
    },
    {
      id: "reddit_experiences",
      themeKeys: ["*"],
      build: (p) => [
        `${p} reddit experience`,
        `site:reddit.com ${p} review`,
        `site:reddit.com ${p} sizing`,
      ],
    },
    {
      id: "reviews_sizing",
      themeKeys: ["fit_and_size_uncertainty", "review_social_validation_gaps"],
      build: (p) => [
        `${p} product reviews sizing`,
        `${p} customer reviews fit true to size`,
      ],
    },
    {
      id: "youtube_haul",
      themeKeys: ["*"],
      build: (p) => [
        `${p} haul review youtube`,
        `${p} unboxing try-on youtube`,
      ],
    },
    {
      id: "app_reviews",
      themeKeys: ["*"],
      build: (p) => [`${p} app review size`, `${p} app store review`],
    },
    {
      id: "purchase_hesitation",
      themeKeys: ["low_or_weak_purchase_intent", "comparison_decision_fatigue"],
      build: (p) => [
        `${p} wishlist not buying`,
        `${p} hesitation checkout fashion`,
      ],
    },
    {
      id: "returns_fit",
      themeKeys: ["fit_and_size_uncertainty", "post_purchase_experience_future_trust"],
      build: (p) => [`${p} return fit quality`, `${p} exchange size issue`],
    },
    {
      id: "social_discussion",
      themeKeys: ["*"],
      build: (p) => [
        `${p} Instagram comments review`,
        `${p} social media discussion`,
      ],
    },
    {
      id: "product_evaluation",
      themeKeys: ["appearance_colour_expectation_uncertainty"],
      build: (p) => [
        `${p} product review looks different`,
        `${p} colour expectation review`,
      ],
    },
    {
      id: "quality_fabric",
      themeKeys: ["product_quality_fabric_uncertainty"],
      build: (p) => [`${p} quality review`, `${p} fabric quality disappointed`],
    },
    {
      id: "styling_occasion",
      themeKeys: ["styling_occasion_uncertainty"],
      build: (p) => [`${p} occasion wear review`, `${p} styling help dress`],
    },
    {
      id: "reviews_social_validation",
      themeKeys: ["review_social_validation_gaps"],
      build: (p) => [`${p} reviews fake`, `${p} not enough reviews`],
    },
    {
      id: "cross_platform_comparison",
      themeKeys: ["cross_platform_comparison"],
      build: (p) => [`${p} vs Myntra`, `${p} vs AJIO`],
    },
    {
      id: "product_substitution",
      themeKeys: ["product_substitution"],
      build: (p) => [
        `${p} same product elsewhere`,
        `${p} bought similar somewhere else`,
      ],
    },
    {
      id: "price_value_timing",
      themeKeys: ["price_value_timing"],
      build: (p) => [`${p} sale wait wishlist`, `${p} overpriced review`],
    },
    {
      id: "availability",
      themeKeys: ["availability"],
      build: (p) => [`${p} out of stock wishlist`, `${p} size unavailable`],
    },
    {
      id: "trust",
      themeKeys: ["trust"],
      build: (p) => [`${p} authentic review`, `${p} trust issues shopping`],
    },
    {
      id: "post_purchase",
      themeKeys: ["post_purchase_experience_future_trust", "delivery_checkout_friction"],
      build: (p) => [
        `${p} delivery damaged fashion`,
      ],
    },
    {
      id: "future_shopping",
      themeKeys: ["post_purchase_experience_future_trust"],
      build: (p) => [`${p} never shopping again`, `${p} switch to Myntra`],
    },
    {
      id: "unknown_emerging",
      themeKeys: ["unknown_emerging"],
      build: (p) => [
        `${p} fashion shopping problems`,
        `${p} app wishlist experience`,
      ],
    },
  ];
}

export { quoteProduct };
