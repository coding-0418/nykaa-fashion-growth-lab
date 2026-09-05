export const BARRIER_CATEGORIES = [
  "intent",
  "fit",
  "quality",
  "appearance",
  "styling",
  "reviews",
  "social_validation",
  "comparison",
  "cross_platform",
  "substitution",
  "price_value",
  "timing",
  "availability",
  "trust",
  "delivery",
  "returns",
  "checkout",
  "post_purchase_trust",
  "other",
] as const;

export type BarrierCategory = (typeof BARRIER_CATEGORIES)[number];

const BARRIER_ALIASES: Record<string, BarrierCategory> = {
  fit_uncertainty: "fit",
  size: "fit",
  sizing: "fit",
  fabric: "quality",
  colour: "appearance",
  color: "appearance",
  occasion: "styling",
  social: "social_validation",
  myntra: "cross_platform",
  ajio: "cross_platform",
  price: "price_value",
  value: "price_value",
  sale: "timing",
  stock: "availability",
  shipping: "delivery",
  return: "returns",
  exchange: "returns",
  payment: "checkout",
};

export function normalizeBarrierCategory(value: unknown): BarrierCategory {
  if (typeof value !== "string" || value.trim() === "") {
    return "other";
  }

  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((BARRIER_CATEGORIES as readonly string[]).includes(key)) {
    return key as BarrierCategory;
  }

  return BARRIER_ALIASES[key] ?? "other";
}

/**
 * Human theme label per barrier category, used to present clusters/opportunities.
 * Evidence classified as "other" is not forced into these labels; see clustering.ts.
 */
export const BARRIER_THEME_LABELS: Record<BarrierCategory, string> = {
  intent: "Low or Undecided Purchase Intent",
  fit: "Fit & Size Uncertainty",
  quality: "Quality / Fabric Uncertainty",
  appearance: "Appearance — How It Will Look",
  styling: "Styling / Occasion Uncertainty",
  reviews: "Social Proof & Review Gaps",
  social_validation: "Social Proof & Review Gaps",
  comparison: "Comparison Difficulty",
  cross_platform: "Cross-Platform Comparison",
  substitution: "Product Substitution",
  price_value: "Price / Value Hesitation",
  timing: "Timing (Sale, Occasion, Budget Cycle)",
  availability: "Availability / Stock Uncertainty",
  trust: "Platform / Seller Trust",
  delivery: "Delivery Friction",
  returns: "Returns / Exchange Friction",
  checkout: "Checkout Friction",
  post_purchase_trust: "Post-Purchase Trust",
  other: "Emerging / Unclassified Theme",
};

/**
 * Directional actionability weight (0-1): how directly a product team can intervene on
 * this barrier without new supply-chain, pricing, or logistics changes. Not a measured effect size.
 */
export const BARRIER_ACTIONABILITY: Record<BarrierCategory, number> = {
  fit: 0.9,
  appearance: 0.7,
  quality: 0.6,
  styling: 0.6,
  reviews: 0.55,
  social_validation: 0.55,
  comparison: 0.45,
  substitution: 0.35,
  trust: 0.5,
  checkout: 0.45,
  delivery: 0.35,
  returns: 0.4,
  post_purchase_trust: 0.45,
  cross_platform: 0.3,
  price_value: 0.2,
  timing: 0.2,
  availability: 0.25,
  intent: 0.3,
  other: 0.4,
};
