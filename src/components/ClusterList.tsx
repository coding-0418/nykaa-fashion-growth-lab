import type { EvidenceCluster } from "@/types/discovery";

export function ClusterList({ clusters }: { clusters: EvidenceCluster[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
          Behavioural clusters
        </h2>
        <p className="text-sm text-muted">{clusters.length} theme(s)</p>
      </div>
      <p className="mt-2 text-sm text-muted">
        Evidence grouped by behavioural barrier. Counts describe this run&apos;s
        retrieved evidence only — not population statistics.
      </p>

      {clusters.length === 0 ? (
        <p className="mt-4 rounded-md border border-border bg-surface-raised px-3 py-6 text-center text-sm text-muted">
          No clusters yet. Run discovery to extract evidence and group it into themes.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {clusters.map((cluster) => (
            <li
              key={cluster.id}
              className="rounded-lg border border-border bg-surface-raised p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{cluster.theme}</h3>
                <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                  {cluster.evidenceCount} unit{cluster.evidenceCount === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                {cluster.sourceDiversity} source{cluster.sourceDiversity === 1 ? "" : "s"} ·{" "}
                {cluster.observedCount} observed / {cluster.inferredCount} inferred
                {cluster.duplicatesCollapsed > 0
                  ? ` · ${cluster.duplicatesCollapsed} duplicate(s) collapsed`
                  : ""}
                {cluster.isMock ? " · MOCK/DEMO" : ""}
              </p>

              {cluster.representativeExcerpts.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {cluster.representativeExcerpts.map((item) => (
                    <li key={item.evidenceId} className="text-xs text-foreground/80">
                      <span className="text-muted">
                        “{item.excerpt}” —{" "}
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline underline-offset-2"
                      >
                        {item.platform}
                      </a>
                      {!item.grounded ? (
                        <span className="ml-1 text-amber">(needs review)</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {cluster.workaroundPatterns.length > 0 ? (
                <p className="mt-3 text-xs text-muted">
                  Workarounds observed: {cluster.workaroundPatterns.join(", ")}
                </p>
              ) : null}
              {cluster.likelySegments.length > 0 ? (
                <p className="mt-1 text-xs text-muted">
                  Likely segment(s): {cluster.likelySegments.join(", ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
