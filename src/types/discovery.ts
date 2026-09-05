/**
 * Core research types for the Discovery Engine.
 * Keep this schema easy to change; do not treat it as a final ontology.
 */

import type {
  GeneratedQuery,
  RawDocument,
  RetrievalRunStatus,
  SearchResult,
} from "@/types/retrieval";

export const JOURNEY_STAGES = [
  "discovery",
  "search_browse",
  "product_evaluation",
  "wishlist",
  "post_wishlist",
  "cart",
  "checkout",
  "purchase",
  "delivery",
  "product_experience",
  "return_exchange",
  "review",
  "future_shopping",
  "unknown",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const WISHLIST_INTENTS = [
  "bookmark",
  "future_purchase",
  "high_intent",
  "comparison",
  "inspiration",
  "occasion_based",
  "unknown",
] as const;

export type WishlistIntent = (typeof WISHLIST_INTENTS)[number];

export const OUTCOMES = [
  "purchased",
  "purchased_elsewhere",
  "delayed",
  "abandoned",
  "returned",
  "exchanged",
  "still_considering",
  "unknown",
] as const;

export type Outcome = (typeof OUTCOMES)[number];

export const RELEVANCE_LEVELS = [
  "relevant",
  "partially_relevant",
  "irrelevant",
] as const;

export type Relevance = (typeof RELEVANCE_LEVELS)[number];

export type EvidenceStrength = 1 | 2 | 3 | 4 | 5;

export const SOURCE_TYPES = [
  "reddit",
  "youtube",
  "web",
  "product_reviews",
  "app_store_reviews",
  "social",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export interface EvidenceSource {
  platform: string;
  url: string;
  title?: string;
  author?: string;
  publishedAt?: string;
  discoveredAt: string;
}

export interface EvidenceContent {
  originalText: string;
  relevantExcerpt: string;
}

export interface Barrier {
  category: string;
  subcategory?: string;
}

export interface Alternatives {
  sameProductElsewhere?: string[];
  similarProducts?: string[];
  otherPlatforms?: string[];
}

export interface Segment {
  name: string;
  reasoning?: string;
}

export interface EvidenceUnit {
  id: string;
  source: EvidenceSource;
  content: EvidenceContent;
  journeyStage: JourneyStage;
  wishlistIntent: WishlistIntent;
  barrier: Barrier;
  informationNeeded: string[];
  alternatives: Alternatives;
  workaround: string[];
  outcome: Outcome;
  segment: Segment;
  evidenceStrength: EvidenceStrength;
  relevance: Relevance;
  /** Model self-reported confidence in [0, 1]. Not statistical confidence. */
  confidence: number;
  needsReview: boolean;
  isMock?: boolean;
  screeningReason?: string;
  /** Whether relevantExcerpt was verified as a literal substring of the source text. */
  groundedExcerpt?: boolean;
  /** Model flagged this unit as an inference rather than an explicit statement. */
  uncertain?: boolean;
}

/**
 * A behavioural theme grouping several EvidenceUnits.
 * Clusters describe patterns in THIS run's retrieved evidence, not population statistics.
 */
export interface EvidenceExcerptRef {
  evidenceId: string;
  excerpt: string;
  url: string;
  platform: string;
  evidenceStrength: EvidenceStrength;
  grounded: boolean;
}

export interface EvidenceCluster {
  id: string;
  theme: string;
  barrierCategory: string;
  subcategories: string[];
  behaviouralProblem: string;
  evidenceIds: string[];
  evidenceCount: number;
  duplicatesCollapsed: number;
  sourceDiversity: number;
  journeyStages: JourneyStage[];
  outcomeCounts: Partial<Record<Outcome, number>>;
  workaroundPatterns: string[];
  likelySegments: string[];
  representativeExcerpts: EvidenceExcerptRef[];
  strongestEvidence: EvidenceExcerptRef | null;
  observedCount: number;
  inferredCount: number;
  averageConfidence: number;
  averageEvidenceStrength: number;
  isMock: boolean;
}

/** Transparent, explicitly-normalized (0-1) opportunity scoring dimensions. Not measured business impact. */
export interface OpportunityScoreBreakdown {
  evidenceStrength: number;
  behaviouralImpact: number;
  actionability: number;
  productRelevance: number;
  compositeScore: number;
  score100: number;
}

export type OpportunityConfidence = "low" | "medium" | "high";

export interface RankedOpportunity {
  id: string;
  theme: string;
  behaviouralProblem: string;
  barrierCategory: string;
  evidenceCount: number;
  sourceDiversity: number;
  strongestEvidence: EvidenceExcerptRef | null;
  representativeExcerpts: EvidenceExcerptRef[];
  workaroundPatterns: string[];
  likelySegments: string[];
  opportunityScore: OpportunityScoreBreakdown;
  confidence: OpportunityConfidence;
  observed: string[];
  inferred: string[];
  recommendedNextResearchQuestion: string;
  isMock: boolean;
}

export interface Hypothesis {
  id: string;
  opportunityId: string;
  theme: string;
  hypothesis: string;
  targetBehaviour: string;
  suspectedRootCause: string;
  evidenceSupporting: string[];
  evidenceWeakening: string[];
  validation: string;
  falsification: string;
  productIntervention: string;
  expectedUserValue: string;
  expectedBusinessValue: string;
  confidence: OpportunityConfidence;
  source: "ai_generated" | "template_generated";
  isMock: boolean;
}

export interface DocumentProcessingStatus {
  documentId: string;
  url: string;
  screeningStatus: "success" | "failed" | "skipped";
  extractionStatus: "success" | "failed" | "skipped";
  relevance?: Relevance;
  reason?: string;
}

export interface DiscoveryStats {
  queriesGenerated: number;
  resultsFound: number;
  documentsFetched: number;
  documentsFailed: number;
  duplicatesRemoved: number;
  documentsScreened: number;
  relevantDocuments: number;
  partiallyRelevantDocuments: number;
  irrelevantDocuments: number;
  extractionSucceeded: number;
  extractionFailed: number;
  needsReview: number;
  documentsSkipped: number;
  clustersFound: number;
  opportunitiesRanked: number;
  hypothesesGenerated: number;
}

/** Per-source-type funnel, so it's visible where the pipeline actually loses documents. */
export interface SourceStageBreakdown {
  sourceType: SourceType;
  resultsFound: number;
  documentsFetched: number;
  documentsFailed: number;
  documentsScreened: number;
  relevantDocuments: number;
  evidenceExtracted: number;
}

export interface SkipReasonCount {
  reason: string;
  count: number;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface ResearchConfig {
  product: string;
  businessQuestion: string;
  /** Use "entire_journey" or a subset of journey stages. */
  journeyStages: JourneyStage[] | "entire_journey";
  themes: string[];
  sourceTypes: SourceType[];
  dateRange?: DateRange;
  resultLimit: number;
}

export interface SourceRunStatus {
  sourceType: SourceType;
  /**
   * "fallback" = no dedicated source-specific search adapter, but URLs of this type
   * discovered via the search provider ARE fetched through the generic public-web path.
   */
  status: "ok" | "fallback" | "unsupported" | "unavailable" | "skipped";
  reason?: string;
}

export interface DiscoverRunResult {
  success: boolean;
  status: RetrievalRunStatus | "foundation";
  pipelineImplemented: boolean;
  config: ResearchConfig;
  queries: GeneratedQuery[];
  searchResults: SearchResult[];
  documents: RawDocument[];
  stats: DiscoveryStats;
  evidence: EvidenceUnit[];
  clusters: EvidenceCluster[];
  opportunities: RankedOpportunity[];
  hypotheses: Hypothesis[];
  documentProcessing: DocumentProcessingStatus[];
  sourceStatuses: SourceRunStatus[];
  sourceBreakdown: SourceStageBreakdown[];
  skipReasons: SkipReasonCount[];
  warnings: string[];
  message: string;
  mockMode: boolean;
  errors: Array<{ stage: string; message: string }>;
}
