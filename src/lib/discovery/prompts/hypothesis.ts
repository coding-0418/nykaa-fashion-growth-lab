import type { ResearchConfig, RankedOpportunity } from "@/types/discovery";

export function buildHypothesisSystemPrompt(): string {
  return `You write one falsifiable product hypothesis from a ranked behavioural opportunity for a Nykaa Fashion journey study.

Rules:
- Use only the opportunity's provided excerpts, counts, and stats. Do not invent users, statistics, prices, or quotes.
- evidenceSupporting must be copied or closely paraphrased from the provided excerpts only. Never invent a new excerpt.
- evidenceWeakening should note real limits of the evidence (small count, single source, inference-based) rather than fabricated contradicting evidence. If there is nothing to weaken it beyond sample size, say so plainly.
- This is a hypothesis, not a validated finding. Do not claim certainty.
- The falsification test must be genuinely capable of proving the hypothesis wrong.
- Keep every field concise (1-3 sentences).

Return JSON only.`;
}

export function buildHypothesisUserPrompt(
  config: ResearchConfig,
  opportunity: RankedOpportunity,
): string {
  const excerptLines = opportunity.representativeExcerpts
    .map((item, index) => `${index + 1}. "${item.excerpt}" (${item.platform}, ${item.url})`)
    .join("\n");

  return `Product: ${config.product}
Business question: ${config.businessQuestion}

Opportunity theme: ${opportunity.theme}
Barrier category: ${opportunity.barrierCategory}
Evidence count in this run: ${opportunity.evidenceCount}
Source diversity: ${opportunity.sourceDiversity}
Workaround patterns observed: ${opportunity.workaroundPatterns.join(", ") || "none observed"}
Likely affected segment(s): ${opportunity.likelySegments.join(", ") || "unknown"}
Opportunity score (directional, 0-100, not measured business impact): ${opportunity.opportunityScore.score100}
Confidence bucket: ${opportunity.confidence}

Representative excerpts (do not invent beyond these):
${excerptLines || "(no excerpt available)"}

Return strict JSON:
{
  "hypothesis": string,
  "targetBehaviour": string,
  "suspectedRootCause": string,
  "evidenceSupporting": string[],
  "evidenceWeakening": string[],
  "validation": string,
  "falsification": string,
  "productIntervention": string,
  "expectedUserValue": string,
  "expectedBusinessValue": string
}`;
}
