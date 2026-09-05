import type { SkipReasonCount, SourceStageBreakdown } from "@/types/discovery";

const REASON_LABELS: Record<string, string> = {
  content_too_large: "Page exceeded the byte size cap",
  unsupported_content_type: "Unsupported content type (not HTML/text)",
  no_extractable_text: "No extractable public text after parsing",
  login_gated_or_client_rendered: "Login-gated or client-rendered (too little public text)",
  not_publicly_accessible: "Not publicly accessible (401/403/407)",
  not_found: "Page not found (404/410)",
  timeout: "Request timed out",
  http_error: "Other HTTP error",
  other_fetch_error: "Other fetch error",
  empty_document: "Fetched document was empty",
  screening_timeout: "AI relevance screening timed out",
  ai_provider_http_error: "AI provider HTTP error during screening",
  screening_failed: "AI relevance screening failed",
  extraction_failed: "AI evidence extraction failed",
  hypothesis_generation_failed: "AI hypothesis generation failed (template used instead)",
  not_attempted_fetch_cap_reached: "Never attempted — fetch cap reached first",
};

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

export function DiagnosticsPanel({
  sourceBreakdown,
  skipReasons,
}: {
  sourceBreakdown: SourceStageBreakdown[];
  skipReasons: SkipReasonCount[];
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
        Diagnostics — where documents were gained or lost
      </h2>
      <p className="mt-2 text-sm text-muted">
        Per-source-type funnel and skip reasons for this run only, so it is visible
        whether the bottleneck is retrieval, fetching, or AI screening/extraction —
        not just a final count of zero.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-3 font-medium">Source type</th>
              <th className="py-2 pr-3 font-medium">Found</th>
              <th className="py-2 pr-3 font-medium">Fetched</th>
              <th className="py-2 pr-3 font-medium">Fetch failed</th>
              <th className="py-2 pr-3 font-medium">Screened</th>
              <th className="py-2 pr-3 font-medium">Relevant</th>
              <th className="py-2 font-medium">Evidence extracted</th>
            </tr>
          </thead>
          <tbody>
            {sourceBreakdown.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted">
                  No search results yet.
                </td>
              </tr>
            ) : (
              sourceBreakdown.map((row) => (
                <tr key={row.sourceType} className="border-b border-border">
                  <td className="py-2 pr-3 text-foreground/90">{row.sourceType}</td>
                  <td className="py-2 pr-3 text-foreground/90">{row.resultsFound}</td>
                  <td className="py-2 pr-3 text-foreground/90">{row.documentsFetched}</td>
                  <td className="py-2 pr-3 text-foreground/90">{row.documentsFailed}</td>
                  <td className="py-2 pr-3 text-foreground/90">{row.documentsScreened}</td>
                  <td className="py-2 pr-3 text-foreground/90">{row.relevantDocuments}</td>
                  <td className="py-2 text-foreground/90">{row.evidenceExtracted}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {skipReasons.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">
            Why documents did not become evidence
          </p>
          <ul className="mt-2 space-y-1 text-sm text-foreground/80">
            {skipReasons.map((item) => (
              <li key={item.reason} className="flex items-center justify-between gap-3">
                <span>{reasonLabel(item.reason)}</span>
                <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-muted">
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
