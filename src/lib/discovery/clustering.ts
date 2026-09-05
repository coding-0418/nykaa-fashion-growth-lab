/**
 * Groups Evidence Units into behavioural theme clusters.
 * Signal → Pattern → Hypothesis → Evidence. Clusters describe patterns in this
 * run's retrieved evidence only. Counts are not population statistics.
 */
import { BARRIER_THEME_LABELS, type BarrierCategory } from "@/config/taxonomy";
import { hostnameOf } from "@/lib/retrieval/urls";
import type {
  EvidenceCluster,
  EvidenceExcerptRef,
  EvidenceUnit,
  JourneyStage,
  Outcome,
} from "@/types/discovery";

function excerptRef(unit: EvidenceUnit): EvidenceExcerptRef {
  return {
    evidenceId: unit.id,
    excerpt: unit.content.relevantExcerpt,
    url: unit.source.url,
    platform: unit.source.platform,
    evidenceStrength: unit.evidenceStrength,
    grounded: unit.groundedExcerpt !== false,
  };
}

function dedupeKey(unit: EvidenceUnit): string {
  return `${unit.source.url}::${unit.content.relevantExcerpt.trim().toLowerCase()}`;
}

/**
 * Collapses evidence units that share the same source URL and excerpt so a single
 * retrieved statement is not double-counted as independent evidence.
 */
export function dedupeEvidenceUnits(evidence: EvidenceUnit[]): {
  deduped: EvidenceUnit[];
  duplicatesRemoved: number;
} {
  const seen = new Map<string, EvidenceUnit>();
  let duplicatesRemoved = 0;

  for (const unit of evidence) {
    const key = dedupeKey(unit);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, unit);
      continue;
    }
    duplicatesRemoved += 1;
    // Keep the stronger/more grounded of the two duplicates.
    const existingScore = (existing.groundedExcerpt !== false ? 1 : 0) + existing.evidenceStrength;
    const candidateScore = (unit.groundedExcerpt !== false ? 1 : 0) + unit.evidenceStrength;
    if (candidateScore > existingScore) {
      seen.set(key, unit);
    }
  }

  return { deduped: [...seen.values()], duplicatesRemoved };
}

/**
 * Groups "other"-classified evidence by a normalized subcategory label so genuinely new
 * themes can surface instead of collapsing into a single catch-all bucket.
 */
function groupKeyFor(unit: EvidenceUnit): { key: string; label: string } {
  const category = unit.barrier.category as BarrierCategory;
  if (category !== "other" || !unit.barrier.subcategory?.trim()) {
    return { key: category, label: BARRIER_THEME_LABELS[category] ?? category };
  }

  const sub = unit.barrier.subcategory.trim().toLowerCase().slice(0, 60);
  return { key: `other:${sub}`, label: `Emerging theme — ${unit.barrier.subcategory.trim()}` };
}

function sourceDiversityOf(units: EvidenceUnit[]): number {
  const hosts = new Set(
    units.map((unit) => hostnameOf(unit.source.url) ?? unit.source.platform),
  );
  return hosts.size;
}

function topExcerpts(units: EvidenceUnit[], max = 3): EvidenceExcerptRef[] {
  const sorted = [...units].sort((a, b) => {
    const aGrounded = a.groundedExcerpt !== false ? 1 : 0;
    const bGrounded = b.groundedExcerpt !== false ? 1 : 0;
    if (aGrounded !== bGrounded) return bGrounded - aGrounded;
    if (a.evidenceStrength !== b.evidenceStrength) return b.evidenceStrength - a.evidenceStrength;
    return b.confidence - a.confidence;
  });

  const seenExcerpts = new Set<string>();
  const result: EvidenceExcerptRef[] = [];
  for (const unit of sorted) {
    const text = unit.content.relevantExcerpt.trim();
    if (!text || seenExcerpts.has(text)) continue;
    seenExcerpts.add(text);
    result.push(excerptRef(unit));
    if (result.length >= max) break;
  }
  return result;
}

export function buildEvidenceClusters(evidence: EvidenceUnit[]): EvidenceCluster[] {
  const { deduped, duplicatesRemoved } = dedupeEvidenceUnits(evidence);

  const groups = new Map<string, { label: string; units: EvidenceUnit[] }>();
  for (const unit of deduped) {
    const { key, label } = groupKeyFor(unit);
    const existing = groups.get(key);
    if (existing) {
      existing.units.push(unit);
    } else {
      groups.set(key, { label, units: [unit] });
    }
  }

  const clusters: EvidenceCluster[] = [];

  for (const [key, { label, units }] of groups) {
    const journeyStages = [...new Set(units.map((u) => u.journeyStage))] as JourneyStage[];
    const outcomeCounts: Partial<Record<Outcome, number>> = {};
    for (const unit of units) {
      outcomeCounts[unit.outcome] = (outcomeCounts[unit.outcome] ?? 0) + 1;
    }

    const workaroundPatterns = [
      ...new Set(units.flatMap((u) => u.workaround.map((w) => w.trim())).filter(Boolean)),
    ];
    const likelySegments = [
      ...new Set(
        units
          .map((u) => u.segment.name.trim())
          .filter((name) => name && name.toLowerCase() !== "unknown"),
      ),
    ];

    const observedCount = units.filter(
      (u) => u.groundedExcerpt !== false && !u.uncertain,
    ).length;
    const inferredCount = units.length - observedCount;

    const averageConfidence =
      units.reduce((sum, u) => sum + u.confidence, 0) / units.length;
    const averageEvidenceStrength =
      units.reduce((sum, u) => sum + u.evidenceStrength, 0) / units.length;

    const excerpts = topExcerpts(units);
    const subcategories = [
      ...new Set(units.map((u) => u.barrier.subcategory?.trim()).filter(Boolean) as string[]),
    ];

    clusters.push({
      id: `cluster-${key}`,
      theme: label,
      barrierCategory: units[0]!.barrier.category,
      subcategories,
      behaviouralProblem:
        units.find((u) => u.groundedExcerpt !== false)?.content.relevantExcerpt ??
        units[0]!.content.relevantExcerpt,
      evidenceIds: units.map((u) => u.id),
      evidenceCount: units.length,
      duplicatesCollapsed: 0,
      sourceDiversity: sourceDiversityOf(units),
      journeyStages,
      outcomeCounts,
      workaroundPatterns,
      likelySegments,
      representativeExcerpts: excerpts,
      strongestEvidence: excerpts[0] ?? null,
      observedCount,
      inferredCount,
      averageConfidence,
      averageEvidenceStrength,
      isMock: units.some((u) => u.isMock),
    });
  }

  if (clusters.length > 0 && duplicatesRemoved > 0) {
    // Attribute the collapsed-duplicate count to the largest cluster for visibility;
    // the total evidence count already reflects deduping.
    clusters.sort((a, b) => b.evidenceCount - a.evidenceCount);
    clusters[0]!.duplicatesCollapsed = duplicatesRemoved;
  }

  return clusters.sort((a, b) => b.evidenceCount - a.evidenceCount);
}
