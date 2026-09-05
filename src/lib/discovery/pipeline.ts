import { getAiLimits, type AiLimits } from "@/config/ai";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import { getAiProvider, type AiProvider } from "@/lib/ai/provider";
import { runEvidenceAnalysis } from "@/lib/discovery/analysis";
import { buildEvidenceClusters } from "@/lib/discovery/clustering";
import { buildSkipReasons, buildSourceBreakdown } from "@/lib/discovery/diagnostics";
import { generateHypotheses } from "@/lib/discovery/hypothesis";
import { rankOpportunities } from "@/lib/discovery/opportunities";
import { InvalidRequestError } from "@/lib/errors";
import { runPublicWebRetrieval } from "@/lib/retrieval/run";
import { getSourceAdapter } from "@/lib/retrieval/sources";
import {
  SOURCE_TYPES,
  type DiscoverRunResult,
  type DiscoveryStats,
  type DocumentProcessingStatus,
  type ResearchConfig,
  type SourceRunStatus,
  type SourceType,
} from "@/types/discovery";
import type { RetrievalRunResult } from "@/types/retrieval";

function isSourceType(value: unknown): value is SourceType {
  return (
    typeof value === "string" &&
    (SOURCE_TYPES as readonly string[]).includes(value)
  );
}

export function parseResearchConfig(input: unknown): ResearchConfig {
  if (input === undefined || input === null) {
    return DEFAULT_RESEARCH_CONFIG;
  }

  if (typeof input !== "object") {
    throw new InvalidRequestError("Research config must be an object.");
  }

  const candidate = input as Partial<ResearchConfig>;
  const base = DEFAULT_RESEARCH_CONFIG;

  const resultLimit =
    typeof candidate.resultLimit === "number" &&
    Number.isFinite(candidate.resultLimit) &&
    candidate.resultLimit > 0
      ? Math.min(Math.floor(candidate.resultLimit), 100)
      : base.resultLimit;

  const sourceTypes = Array.isArray(candidate.sourceTypes)
    ? candidate.sourceTypes.filter(isSourceType)
    : base.sourceTypes;

  if (sourceTypes.length === 0) {
    throw new InvalidRequestError("At least one source type is required.");
  }

  return {
    product:
      typeof candidate.product === "string" && candidate.product.trim()
        ? candidate.product.trim()
        : base.product,
    businessQuestion:
      typeof candidate.businessQuestion === "string" &&
      candidate.businessQuestion.trim()
        ? candidate.businessQuestion.trim()
        : base.businessQuestion,
    journeyStages: candidate.journeyStages ?? base.journeyStages,
    themes: Array.isArray(candidate.themes)
      ? candidate.themes.filter((theme) => typeof theme === "string")
      : base.themes,
    sourceTypes,
    dateRange: candidate.dateRange,
    resultLimit,
  };
}

function placeholderSourceStatus(sourceType: SourceType): SourceRunStatus {
  const adapter = getSourceAdapter(sourceType);
  if (!adapter) {
    return {
      sourceType,
      status: "unavailable",
      reason: "No adapter is registered for this source type.",
    };
  }

  return {
    sourceType,
    status: "fallback",
    reason: `${adapter.label} has no dedicated source-specific search, but URLs of this type discovered via the search provider are still fetched and analyzed through the generic public-web path.`,
  };
}

export function emptyDiscoveryStats(): DiscoveryStats {
  return {
    queriesGenerated: 0,
    resultsFound: 0,
    documentsFetched: 0,
    documentsFailed: 0,
    duplicatesRemoved: 0,
    documentsScreened: 0,
    relevantDocuments: 0,
    partiallyRelevantDocuments: 0,
    irrelevantDocuments: 0,
    extractionSucceeded: 0,
    extractionFailed: 0,
    needsReview: 0,
    documentsSkipped: 0,
    clustersFound: 0,
    opportunitiesRanked: 0,
    hypothesesGenerated: 0,
  };
}

function mergeStats(
  retrieval: RetrievalRunResult["stats"],
  analysis: {
    documentsScreened: number;
    relevantDocuments: number;
    partiallyRelevantDocuments: number;
    irrelevantDocuments: number;
    extractionSucceeded: number;
    extractionFailed: number;
    needsReview: number;
  },
  counts: {
    clustersFound: number;
    opportunitiesRanked: number;
    hypothesesGenerated: number;
  },
): DiscoveryStats {
  return {
    ...retrieval,
    documentsScreened: analysis.documentsScreened,
    relevantDocuments: analysis.relevantDocuments,
    partiallyRelevantDocuments: analysis.partiallyRelevantDocuments,
    irrelevantDocuments: analysis.irrelevantDocuments,
    extractionSucceeded: analysis.extractionSucceeded,
    extractionFailed: analysis.extractionFailed,
    needsReview: analysis.needsReview,
    clustersFound: counts.clustersFound,
    opportunitiesRanked: counts.opportunitiesRanked,
    hypothesesGenerated: counts.hypothesesGenerated,
  };
}

export interface DiscoveryPipelineDeps {
  runRetrieval?: typeof runPublicWebRetrieval;
  ai?: AiProvider;
  aiLimits?: Partial<AiLimits>;
}

/**
 * Retrieval plus two-stage AI analysis. No clustering or opportunity scoring.
 */
export async function runDiscoveryPipeline(
  config: ResearchConfig,
  deps: DiscoveryPipelineDeps = {},
): Promise<DiscoverRunResult> {
  const sourceStatuses: SourceRunStatus[] = [];
  const includeWeb = config.sourceTypes.includes("web");
  const ai = deps.ai ?? getAiProvider();

  for (const sourceType of config.sourceTypes) {
    if (sourceType === "web") {
      continue;
    }
    sourceStatuses.push(placeholderSourceStatus(sourceType));
  }

  const blankProcessing: DocumentProcessingStatus[] = [];

  if (!includeWeb) {
    sourceStatuses.push({
      sourceType: "web",
      status: "skipped",
      reason: "Public web was not selected in this run.",
    });

    return {
      success: true,
      status: "success",
      pipelineImplemented: true,
      config,
      queries: [],
      searchResults: [],
      documents: [],
      stats: emptyDiscoveryStats(),
      evidence: [],
      clusters: [],
      opportunities: [],
      hypotheses: [],
      documentProcessing: blankProcessing,
      sourceStatuses,
      sourceBreakdown: [],
      skipReasons: [],
      warnings: [
        "No public-web retrieval ran because source type `web` was not selected.",
      ],
      message: "Skipped public web retrieval.",
      mockMode: false,
      errors: [],
    };
  }

  const retrieve = deps.runRetrieval ?? runPublicWebRetrieval;
  const retrieval = await retrieve(config);

  sourceStatuses.unshift({
    sourceType: "web",
    status:
      retrieval.status === "unavailable"
        ? "unavailable"
        : retrieval.status === "failed"
          ? "unavailable"
          : "ok",
    reason:
      retrieval.status === "success" ? undefined : retrieval.message,
  });

  const aiLimits = getAiLimits(deps.aiLimits);
  const analysis = await runEvidenceAnalysis({
    config,
    documents: retrieval.documents,
    ai,
    limits: aiLimits,
    mockMode: retrieval.mockMode,
  });

  const clusters = buildEvidenceClusters(analysis.evidence);
  const opportunities = rankOpportunities(clusters);
  const hypothesisResult = await generateHypotheses({
    opportunities,
    config,
    ai,
    limits: aiLimits,
    mockMode: retrieval.mockMode,
  });

  let status = retrieval.status;
  if (retrieval.success) {
    if (!ai.isConfigured() && retrieval.documents.length > 0) {
      status = "partial";
    } else if (
      analysis.extractionFailed > 0 ||
      analysis.errors.some((item) => item.stage === "screening")
    ) {
      status = "partial";
    }
  }

  const allErrors = [...retrieval.errors, ...analysis.errors, ...hypothesisResult.errors];
  const sourceBreakdown = buildSourceBreakdown(
    retrieval.searchResults,
    retrieval.documents,
    analysis.documentProcessing,
    analysis.evidence,
  );
  const skipReasons = buildSkipReasons(allErrors, retrieval.searchResults);

  const messageParts = [retrieval.message];
  if (analysis.evidence.length > 0) {
    messageParts.push(
      `AI screening produced ${analysis.evidence.length} evidence unit(s) across ${clusters.length} theme cluster(s). These are hypotheses, not conclusions.`,
    );
  } else if (ai.isConfigured()) {
    messageParts.push("No evidence units were extracted from the retrieved documents.");
  }

  return {
    success: retrieval.success,
    status,
    pipelineImplemented: true,
    config,
    queries: retrieval.queries,
    searchResults: retrieval.searchResults,
    documents: retrieval.documents,
    stats: mergeStats(retrieval.stats, analysis, {
      clustersFound: clusters.length,
      opportunitiesRanked: opportunities.length,
      hypothesesGenerated: hypothesisResult.hypotheses.length,
    }),
    evidence: analysis.evidence,
    clusters,
    opportunities,
    hypotheses: hypothesisResult.hypotheses,
    documentProcessing: analysis.documentProcessing,
    sourceStatuses,
    sourceBreakdown,
    skipReasons,
    warnings: [...retrieval.warnings, ...analysis.warnings, ...hypothesisResult.warnings],
    message: messageParts.join(" "),
    mockMode: retrieval.mockMode,
    errors: allErrors,
  };
}
