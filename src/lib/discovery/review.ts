import type { AiLimits } from "@/config/ai";
import type { EvidenceUnit } from "@/types/discovery";

export function shouldFlagForReview(
  unit: Pick<
    EvidenceUnit,
    "relevance" | "confidence" | "evidenceStrength" | "outcome"
  >,
  extras: {
    groundedExcerpt: boolean;
    uncertain: boolean;
    multipleBarriersPlausible: boolean;
  },
  limits: Pick<AiLimits, "reviewConfidenceThreshold">,
): boolean {
  if (unit.relevance === "partially_relevant") {
    return true;
  }
  if (unit.confidence < limits.reviewConfidenceThreshold) {
    return true;
  }
  if (unit.evidenceStrength <= 2) {
    return true;
  }
  if (unit.outcome === "unknown" && extras.uncertain) {
    return true;
  }
  if (extras.multipleBarriersPlausible) {
    return true;
  }
  if (!extras.groundedExcerpt) {
    return true;
  }
  if (extras.uncertain) {
    return true;
  }
  return false;
}
