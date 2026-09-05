import type { EvidenceUnit } from "@/types/discovery";

export function EvidenceTable({
  evidence,
  mockMode,
}: {
  evidence: EvidenceUnit[];
  mockMode?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
          Evidence results
        </h2>
        <p className="text-sm text-muted">{evidence.length} units</p>
      </div>
      {mockMode ? (
        <p className="mt-2 rounded-md border border-amber/30 bg-amber-soft px-3 py-2 text-sm text-amber">
          MOCK / DEMO — NOT RESEARCH EVIDENCE
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted">
        Extracted units are grounded hypotheses. Open the source URL to verify.
        Model confidence is not statistical confidence.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[70rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-3 font-medium">Source</th>
              <th className="py-2 pr-3 font-medium">Journey stage</th>
              <th className="py-2 pr-3 font-medium">Intent</th>
              <th className="py-2 pr-3 font-medium">Barrier</th>
              <th className="py-2 pr-3 font-medium">Information needed</th>
              <th className="py-2 pr-3 font-medium">Workaround</th>
              <th className="py-2 pr-3 font-medium">Outcome</th>
              <th className="py-2 pr-3 font-medium">Evidence strength</th>
              <th className="py-2 pr-3 font-medium">Review flag</th>
              <th className="py-2 font-medium">Source link</th>
            </tr>
          </thead>
          <tbody>
            {evidence.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-muted">
                  No evidence units. Irrelevant or failed documents are omitted,
                  not treated as findings.
                </td>
              </tr>
            ) : (
              evidence.map((unit) => (
                <tr key={unit.id} className="border-b border-border align-top">
                  <td className="py-3 pr-3 text-foreground/90">
                    {unit.source.platform}
                    {unit.isMock ? " · MOCK/DEMO" : ""}
                    <div className="mt-1 max-w-xs text-xs text-muted">
                      {unit.content.relevantExcerpt}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-foreground/90">{unit.journeyStage}</td>
                  <td className="py-3 pr-3 text-foreground/90">{unit.wishlistIntent}</td>
                  <td className="py-3 pr-3 text-foreground/90">
                    {unit.barrier.category}
                    {unit.barrier.subcategory
                      ? ` / ${unit.barrier.subcategory}`
                      : ""}
                  </td>
                  <td className="py-3 pr-3 text-foreground/90">
                    {unit.informationNeeded.join(", ") || "—"}
                  </td>
                  <td className="py-3 pr-3 text-foreground/90">
                    {unit.workaround.join(", ") || "—"}
                  </td>
                  <td className="py-3 pr-3 text-foreground/90">{unit.outcome}</td>
                  <td className="py-3 pr-3 text-foreground/90">{unit.evidenceStrength}</td>
                  <td className="py-3 pr-3 text-foreground/90">
                    {unit.needsReview ? "Needs review" : "—"}
                  </td>
                  <td className="py-3">
                    <a
                      className="text-accent underline underline-offset-2"
                      href={unit.source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
