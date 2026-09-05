import type { SearchResult } from "@/types/retrieval";

function sourceDistribution(results: SearchResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    counts[result.source] = (counts[result.source] ?? 0) + 1;
  }
  return counts;
}

export function RetrievalResultsTable({
  results,
}: {
  results: SearchResult[];
}) {
  const distribution = sourceDistribution(results);

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
          Retrieval results
        </h2>
        <p className="text-sm text-muted">{results.length} unique URLs</p>
      </div>

      {Object.keys(distribution).length > 0 ? (
        <p className="mt-2 text-sm text-muted">
          Source distribution:{" "}
          {Object.entries(distribution)
            .map(([source, count]) => `${source} (${count})`)
            .join(", ")}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-3 font-medium">Source</th>
              <th className="py-2 pr-3 font-medium">Title</th>
              <th className="py-2 pr-3 font-medium">URL</th>
              <th className="py-2 pr-3 font-medium">Query</th>
              <th className="py-2 pr-3 font-medium">Published</th>
              <th className="py-2 font-medium">Retrieval status</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">
                  No search results. This is an empty retrieval state, not a
                  research finding.
                </td>
              </tr>
            ) : (
              results.map((row) => (
                <tr key={row.id} className="border-b border-border align-top">
                  <td className="py-3 pr-3 text-foreground/90">
                    {row.source}
                    {row.isMock ? " · MOCK/DEMO" : ""}
                  </td>
                  <td className="py-3 pr-3 text-foreground/90">{row.title}</td>
                  <td className="py-3 pr-3">
                    <a
                      className="break-all text-accent underline underline-offset-2"
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.url}
                    </a>
                  </td>
                  <td className="py-3 pr-3 text-foreground/90">{row.searchQueries.join(" | ")}</td>
                  <td className="py-3 pr-3 text-foreground/90">{row.publishedAt ?? "—"}</td>
                  <td className="py-3 text-foreground/90">{row.contentStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
