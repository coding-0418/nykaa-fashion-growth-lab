/**
 * Transparent, directional opportunity scoring over EvidenceClusters.
 *
 * Opportunity Score = Evidence Strength x Behavioural Impact x Actionability x Product Relevance
 *
 * Each dimension is normalized to [0, 1] and explained below. The composite score is a
 * product of four probabilities/weights, not a measured business-impact number, and must
 * never be presented as one. It exists to help compare opportunities against each other
 * within a single run, not across runs or against ground truth.
 *
 * Evidence strength (1-5) itself is directional, not statistical significance:
 * 1 weak/general opinion
 * 2 specific issue, little behavioural context
 * 3 specific behaviour + friction
 * 4 behaviour + friction + workaround
 * 5 journey behaviour + blocker + workaround + outcome
 */
import { BARRIER_ACTIONABILITY, type BarrierCategory } from "@/config/taxonomy";
import type {
  EvidenceCluster,
  JourneyStage,
  OpportunityConfidence,
  OpportunityScoreBreakdown,
} from "@/types/discovery";

const HIGH_RELEVANCE_STAGES: JourneyStage[] = [
  "wishlist",
  "post_wishlist",
  "product_evaluation",
  "cart",
];

const MEDIUM_RELEVANCE_STAGES: JourneyStage[] = [
  "discovery",
  "search_browse",
  "checkout",
  "purchase",
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Directional evidence-strength dimension: average strength blended with how much of the
 * cluster is directly observed (grounded, non-inferred) vs inferred. */
function evidenceStrengthScore(cluster: EvidenceCluster): number {
  const strengthComponent = cluster.averageEvidenceStrength / 5;
  const observedRatio =
    cluster.evidenceCount > 0 ? cluster.observedCount / cluster.evidenceCount : 0;
  return clamp01(strengthComponent * 0.7 + observedRatio * 0.3);
}

/** Behavioural-impact dimension: does the evidence show real behaviour (a workaround, a
 * concrete outcome, high stated intent) rather than a passing comment. */
function behaviouralImpactScore(cluster: EvidenceCluster): number {
  if (cluster.evidenceCount === 0) return 0;
  const workaroundRatio =
    cluster.workaroundPatterns.length > 0
      ? Math.min(1, cluster.workaroundPatterns.length / cluster.evidenceCount + 0.3)
      : 0;
  const knownOutcomeCount = Object.entries(cluster.outcomeCounts).reduce(
    (sum, [outcome, count]) => (outcome === "unknown" ? sum : sum + (count ?? 0)),
    0,
  );
  const outcomeRatio = knownOutcomeCount / cluster.evidenceCount;
  return clamp01(workaroundRatio * 0.5 + outcomeRatio * 0.5);
}

/** Actionability dimension: how directly a product team can intervene on this barrier. */
function actionabilityScore(cluster: EvidenceCluster): number {
  const category = cluster.barrierCategory as BarrierCategory;
  return clamp01(BARRIER_ACTIONABILITY[category] ?? BARRIER_ACTIONABILITY.other);
}

/** Product-relevance dimension: how close the affected journey stages sit to the
 * wishlist -> purchase decision this project studies. */
function productRelevanceScore(cluster: EvidenceCluster): number {
  if (cluster.journeyStages.length === 0) return 0.4;
  const stageScores = cluster.journeyStages.map((stage) => {
    if (HIGH_RELEVANCE_STAGES.includes(stage)) return 1;
    if (MEDIUM_RELEVANCE_STAGES.includes(stage)) return 0.6;
    if (stage === "unknown") return 0.3;
    return 0.4;
  });
  return clamp01(stageScores.reduce((sum, v) => sum + v, 0) / stageScores.length);
}

export function scoreCluster(cluster: EvidenceCluster): OpportunityScoreBreakdown {
  const evidenceStrength = evidenceStrengthScore(cluster);
  const behaviouralImpact = behaviouralImpactScore(cluster);
  const actionability = actionabilityScore(cluster);
  const productRelevance = productRelevanceScore(cluster);
  const compositeScore = clamp01(
    evidenceStrength * behaviouralImpact * actionability * productRelevance,
  );

  return {
    evidenceStrength,
    behaviouralImpact,
    actionability,
    productRelevance,
    compositeScore,
    score100: Math.round(compositeScore * 100),
  };
}

export function confidenceForCluster(cluster: EvidenceCluster): OpportunityConfidence {
  if (cluster.evidenceCount >= 3 && cluster.averageConfidence >= 0.7) {
    return "high";
  }
  if (cluster.evidenceCount >= 2 && cluster.averageConfidence >= 0.5) {
    return "medium";
  }
  return "low";
}
