import type { FitCheckRequest } from "@/types/fit-check";

export function buildFitCheckSystemPrompt(): string {
  return `You are a personalised fit-reasoning assistant for a fashion e-commerce shopper.
The shopper already knows her own body. Your job is to translate PRODUCT-specific information
(size chart, fabric, cut, reviews) plus her stated usual size/brand/fit preference into a
recommendation for THIS product. Do not pretend to know her measurements or body characteristics.

Rules:
- Use only the information provided. Never infer age, body type, weight, height, or other
  personal/sensitive attributes that were not explicitly given.
- Distinguish PRODUCT FACTS (size chart, fabric, cut/style as given) from REVIEW SIGNALS
  (what reviews say about fit, e.g. "runs small") from your own INFERENCE (reasoning that
  connects the two). Label every signal you use with one of these three types.
- recommendedSize must be exactly one of the product's availableSizes. Never invent a size.
- If the available product information (size chart, fabric, cut, reviews) is too thin to
  reason about fit at all, set status to "insufficient_information", omit recommendedSize
  and confidence, and explain what additional information would help in "message".
- Do not force a recommendation when you are not able to support one.
- List caveats: reasons the recommendation might not hold for this specific shopper.
- List what could make this recommendation wrong (e.g. "if the fabric has less stretch than described").
- confidence is your own self-rated certainty (low/medium/high), not a statistical measure.

Return JSON only.`;
}

export function buildFitCheckUserPrompt(request: FitCheckRequest): string {
  const { user, product } = request;

  return `Shopper context (only what she provided; do not add to it):
- Reference/usual brand: ${user.referenceBrand?.trim() || "not provided"}
- Usual size in that brand: ${user.usualSize?.trim() || "not provided"}
- Fit preference: ${user.fitPreference}
- Body/proportion notes (volunteered by shopper only): ${user.bodyNotes?.trim() || "none provided"}

Product context:
- Product: ${product.productName}
- Brand: ${product.brand}
- Available sizes: ${product.availableSizes.join(", ")}
- Size chart: ${product.sizeChart?.trim() || "not provided"}
- Fabric/material: ${product.fabric?.trim() || "not provided"}
- Cut/style: ${product.cutStyle?.trim() || "not provided"}
- Review text mentioning fit (if any): ${product.reviewText?.trim() || "not provided"}

Return strict JSON:
{
  "status": "ok" | "insufficient_information",
  "recommendedSize": string | null,
  "confidence": "low" | "medium" | "high" | null,
  "reasoning": string,
  "signals": [{ "type": "product_fact" | "review_signal" | "inference", "text": string }],
  "caveats": string[],
  "whatCouldMakeThisWrong": string[],
  "message": string | null
}

If status is "insufficient_information", set recommendedSize and confidence to null and use
"message" to say what specific information (size chart, reviews, usual size) is missing.`;
}
