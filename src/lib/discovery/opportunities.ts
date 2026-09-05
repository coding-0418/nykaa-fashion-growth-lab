/**
 * Turns EvidenceClusters into a ranked, comparable opportunity list.
 * Ranking compares opportunities within this run only.
 */
import type { BarrierCategory } from "@/config/taxonomy";
import { confidenceForCluster, scoreCluster } from "@/lib/discovery/scoring";
import type { EvidenceCluster, RankedOpportunity } from "@/types/discovery";

const RESEARCH_QUESTIONS: Partial<Record<BarrierCategory, string>> = {
  fit: "For Decision-Stuck Shoppers who wishlist but delay, what specific fit signal (brand comparison, body-specific proportion, fabric stretch) would resolve their uncertainty fastest?",
  appearance: "What visual information (on-model diversity, colour-true photography, video) would most reduce 'how will this look on me' hesitation?",
  quality: "Which fabric/material claims do shoppers most distrust without a review, and what would make a claim credible?",
  styling: "What occasion or styling context is most often unresolved before a wishlist item is purchased?",
  reviews: "What review content (fit-specific, body-type-specific) is missing that shoppers seek off-platform?",
  social_validation: "What social-proof gap sends shoppers to Instagram/YouTube instead of trusting on-platform reviews?",
  comparison: "What comparison information (price, fit, quality) is hardest to find in one place before deciding?",
  cross_platform: "Which competitor platforms are shoppers checking, and for which specific piece of missing information?",
  substitution: "What similar-product signal would keep a shopper on-platform instead of substituting?",
  price_value: "At what price/value threshold do wishlist shoppers delay rather than decide?",
  timing: "What timing signal (sale, occasion, payday) most often determines when a wishlist item converts?",
  availability: "How often does perceived or real stock uncertainty stall a wishlist decision, and at what point in the journey?",
  trust: "What specific trust signal is missing for shoppers who hesitate on this barrier?",
  delivery: "What delivery expectation, once resolved, would unblock a stalled decision?",
  returns: "What return/exchange concern most often precedes a wishlist item being abandoned rather than purchased?",
  checkout: "What checkout-stage friction causes shoppers to abandon after resolving product uncertainty?",
  post_purchase_trust: "What post-purchase experience most shapes future wishlist-to-purchase trust?",
  intent: "What distinguishes a bookmark-only wishlist add from one with real purchase intent?",
};

function researchQuestionFor(cluster: EvidenceCluster): string {
  const category = cluster.barrierCategory as BarrierCategory;
  return (
    RESEARCH_QUESTIONS[category] ??
    `What would need to be true for shoppers experiencing "${cluster.theme}" to resolve their uncertainty and complete a wishlist purchase?`
  );
}

export function rankOpportunities(clusters: EvidenceCluster[]): RankedOpportunity[] {
  const opportunities: RankedOpportunity[] = clusters.map((cluster) => {
    const opportunityScore = scoreCluster(cluster);
    const confidence = confidenceForCluster(cluster);

    const observed =
      cluster.observedCount > 0
        ? [
            `${cluster.observedCount} of ${cluster.evidenceCount} evidence unit(s) are directly grounded in retrieved source text.`,
          ]
        : [];
    const inferred =
      cluster.inferredCount > 0
        ? [
            `${cluster.inferredCount} of ${cluster.evidenceCount} evidence unit(s) rely on model inference beyond the literal excerpt and need review.`,
          ]
        : [];

    return {
      id: `opp-${cluster.id}`,
      theme: cluster.theme,
      behaviouralProblem: cluster.behaviouralProblem,
      barrierCategory: cluster.barrierCategory,
      evidenceCount: cluster.evidenceCount,
      sourceDiversity: cluster.sourceDiversity,
      strongestEvidence: cluster.strongestEvidence,
      representativeExcerpts: cluster.representativeExcerpts,
      workaroundPatterns: cluster.workaroundPatterns,
      likelySegments: cluster.likelySegments,
      opportunityScore,
      confidence,
      observed,
      inferred,
      recommendedNextResearchQuestion: researchQuestionFor(cluster),
      isMock: cluster.isMock,
    };
  });

  return opportunities.sort((a, b) => {
    if (b.opportunityScore.score100 !== a.opportunityScore.score100) {
      return b.opportunityScore.score100 - a.opportunityScore.score100;
    }
    return b.evidenceCount - a.evidenceCount;
  });
}
