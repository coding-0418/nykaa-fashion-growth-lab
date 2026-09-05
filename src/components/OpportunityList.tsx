import type { RankedOpportunity } from "@/types/discovery";

const DIMENSION_LABELS: Array<{
  key: "evidenceStrength" | "behaviouralImpact" | "actionability" | "productRelevance";
  label: string;
}> = [
  { key: "evidenceStrength", label: "Evidence strength" },
  { key: "behaviouralImpact", label: "Behavioural impact" },
  { key: "actionability", label: "Actionability" },
  { key: "productRelevance", label: "Product relevance" },
];

const CONFIDENCE_STYLE: Record<RankedOpportunity["confidence"], string> = {
  high: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  medium: "text-amber border-amber/30 bg-amber-soft",
  low: "text-muted border-border bg-surface-raised",
};

function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full bg-accent"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-foreground/80">
        {Math.round(value * 100)}
      </span>
    </div>
  );
}

export function OpportunityList({
  opportunities,
}: {
  opportunities: RankedOpportunity[];
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
          Ranked opportunities
        </h2>
        <p className="text-sm text-muted">{opportunities.length} ranked</p>
      </div>
      <p className="mt-2 text-sm text-muted">
        Opportunity score = evidence strength × behavioural impact × actionability ×
        product relevance, each normalized 0–1. This is a directional score for
        comparing opportunities within this run, not a measured business-impact number.
      </p>

      {opportunities.length === 0 ? (
        <p className="mt-4 rounded-md border border-border bg-surface-raised px-3 py-6 text-center text-sm text-muted">
          No opportunities yet. Ranking appears once evidence has been clustered.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {opportunities.map((opportunity, index) => (
            <li
              key={opportunity.id}
              className="rounded-lg border border-border bg-surface-raised p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">#{index + 1}</p>
                  <h3 className="text-sm font-semibold text-foreground">
                    {opportunity.theme}
                  </h3>
                  <p className="mt-1 max-w-xl text-xs text-muted">
                    {opportunity.behaviouralProblem}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-2xl font-semibold text-accent">
                    {opportunity.opportunityScore.score100}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${CONFIDENCE_STYLE[opportunity.confidence]}`}
                  >
                    {opportunity.confidence} confidence
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {DIMENSION_LABELS.map(({ key, label }) => (
                  <ScoreBar
                    key={key}
                    label={label}
                    value={opportunity.opportunityScore[key]}
                  />
                ))}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
                <div>
                  <dt>Evidence count</dt>
                  <dd className="font-medium text-foreground/90">{opportunity.evidenceCount}</dd>
                </div>
                <div>
                  <dt>Source diversity</dt>
                  <dd className="font-medium text-foreground/90">{opportunity.sourceDiversity}</dd>
                </div>
                <div>
                  <dt>Workarounds</dt>
                  <dd className="font-medium text-foreground/90">
                    {opportunity.workaroundPatterns.length || "—"}
                  </dd>
                </div>
                <div>
                  <dt>Segment(s)</dt>
                  <dd className="font-medium text-foreground/90">
                    {opportunity.likelySegments.join(", ") || "unknown"}
                  </dd>
                </div>
              </dl>

              {opportunity.strongestEvidence ? (
                <p className="mt-3 text-xs text-foreground/80">
                  Strongest evidence: “{opportunity.strongestEvidence.excerpt}” —{" "}
                  <a
                    href={opportunity.strongestEvidence.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    {opportunity.strongestEvidence.platform}
                  </a>
                </p>
              ) : null}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {opportunity.observed.length > 0 ? (
                  <p className="text-xs text-muted">
                    <span className="font-medium text-foreground/80">Observed: </span>
                    {opportunity.observed.join(" ")}
                  </p>
                ) : null}
                {opportunity.inferred.length > 0 ? (
                  <p className="text-xs text-muted">
                    <span className="font-medium text-foreground/80">Inferred: </span>
                    {opportunity.inferred.join(" ")}
                  </p>
                ) : null}
              </div>

              <p className="mt-3 border-t border-border pt-3 text-xs text-foreground/80">
                <span className="font-medium text-accent">Next research question: </span>
                {opportunity.recommendedNextResearchQuestion}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
