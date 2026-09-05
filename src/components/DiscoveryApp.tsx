"use client";

import { useState } from "react";
import { DEFAULT_RESEARCH_CONFIG } from "@/config/research-config";
import { ClusterList } from "@/components/ClusterList";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { EvidenceTable } from "@/components/EvidenceTable";
import {
  applyEvidenceFilters,
  EMPTY_EVIDENCE_FILTERS,
  FilterBar,
  type EvidenceFilters,
} from "@/components/FilterBar";
import { HypothesisList } from "@/components/HypothesisList";
import { OpportunityList } from "@/components/OpportunityList";
import { ResearchConfigPanel } from "@/components/ResearchConfigPanel";
import { RetrievalResultsTable } from "@/components/RetrievalResultsTable";
import type { DiscoverRunResult } from "@/types/discovery";

type RunState = "idle" | "running" | "complete" | "error";

interface DiscoveryAppProps {
  searchProvider?: string;
  aiProvider?: string;
}

export function DiscoveryApp({ searchProvider, aiProvider }: DiscoveryAppProps) {
  const [state, setState] = useState<RunState>("idle");
  const [result, setResult] = useState<DiscoverRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<EvidenceFilters>(EMPTY_EVIDENCE_FILTERS);

  async function runDiscovery() {
    setState("running");
    setErrorMessage(null);
    setFilters(EMPTY_EVIDENCE_FILTERS);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: DEFAULT_RESEARCH_CONFIG }),
      });

      const payload = (await response.json()) as
        | DiscoverRunResult
        | { error?: { message?: string } };

      if ("searchResults" in payload && "stats" in payload) {
        setResult(payload);
        setState("complete");
        return;
      }

      setErrorMessage(
        "error" in payload
          ? (payload.error?.message ?? "Discovery request failed.")
          : "Discovery request failed.",
      );
      setState("error");
    } catch {
      setErrorMessage("Could not reach the discovery API.");
      setState("error");
    }
  }

  const statusLabel =
    state === "idle"
      ? "Idle"
      : state === "running"
        ? "Retrieving public pages and running AI screening…"
        : state === "complete"
          ? `Complete (${result?.status ?? "unknown"})`
          : "Error";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
          AI Discovery Engine
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          Public conversations → ranked product opportunities
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted">
          Search publicly available web conversations, screen and extract them into
          grounded EvidenceUnits, then cluster, score, and rank them into opportunities
          and hypotheses. 30-day wishlist purchase conversion remains the business
          anchor. Every claim traces back to a source URL. AI output is a hypothesis,
          not a measured finding.
        </p>
      </header>

      <ResearchConfigPanel />

      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
              Run
            </h2>
            <p className="mt-1 text-sm text-foreground/90">
              Status: <span className="font-medium text-foreground">{statusLabel}</span>
            </p>
            {searchProvider && (
              <p className="mt-1 text-sm text-muted">
                Search provider:{" "}
                <span className="font-medium text-foreground capitalize">{searchProvider}</span>
              </p>
            )}
            {aiProvider && (
              <p className="mt-1 text-sm text-muted">
                AI provider:{" "}
                <span className="font-medium text-foreground capitalize">{aiProvider}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={runDiscovery}
            disabled={state === "running"}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {state === "running" ? "Running…" : "Run Discovery"}
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-400">{errorMessage}</p>
        ) : null}

        {result ? (
          <div className="mt-4 space-y-3 text-sm text-foreground/90">
            {result.mockMode ? (
              <p className="rounded-md border border-amber/30 bg-amber-soft px-3 py-2 text-amber">
                MOCK / DEMO — NOT RESEARCH EVIDENCE
              </p>
            ) : null}
            <p className="text-muted">{result.message}</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-muted">Queries generated</dt>
                <dd className="font-semibold text-foreground">
                  {result.stats.queriesGenerated}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Results found</dt>
                <dd className="font-semibold text-foreground">
                  {result.stats.resultsFound}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Pages fetched</dt>
                <dd className="font-semibold text-foreground">
                  {result.stats.documentsFetched}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Pages failed</dt>
                <dd className="font-semibold text-foreground">
                  {result.stats.documentsFailed}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Pages skipped (fetch cap)</dt>
                <dd className="font-semibold text-foreground">
                  {result.stats.documentsSkipped}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted">
              Query generation: {result.queries.length} queries. Search:{" "}
              {result.status}. Duplicates removed: {result.stats.duplicatesRemoved}.
            </p>
            {result.queries.length > 0 ? (
              <details className="rounded-md bg-surface-raised p-3">
                <summary className="cursor-pointer font-medium text-foreground/90">
                  Generated queries
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  {result.queries.map((query) => (
                    <li key={query.id}>
                      <span className="text-muted">{query.family}:</span> {query.text}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {result.warnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-muted">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {result.errors.length > 0 ? (
              <details className="rounded-md border border-border p-3">
                <summary className="cursor-pointer font-medium text-foreground/90">
                  Retrieval issues ({result.errors.length})
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  {result.errors.map((item, index) => (
                    <li key={`${item.stage}-${index}`}>
                      {item.stage}: {item.message}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <p className="font-medium text-foreground/90">Source adapter status</p>
            <ul className="space-y-1 text-muted">
              {result.sourceStatuses.map((item) => (
                <li key={item.sourceType}>
                  {item.sourceType}: {item.status}
                  {item.reason ? ` — ${item.reason}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {result ? (
        <DiagnosticsPanel
          sourceBreakdown={result.sourceBreakdown}
          skipReasons={result.skipReasons}
        />
      ) : null}

      <FilterBar
        evidence={result?.evidence ?? []}
        filters={filters}
        onChange={setFilters}
      />

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
          Summary counts
        </h2>
        <p className="mt-2 text-sm text-muted">
          Counts describe this run only. They are not conversion rates or business
          impact. AI confidence is not statistical confidence.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-muted">Documents analyzed</dt>
            <dd className="text-lg font-semibold text-foreground">
              {result?.stats.documentsScreened ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Relevant</dt>
            <dd className="text-lg font-semibold text-foreground">
              {result?.stats.relevantDocuments ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Evidence units</dt>
            <dd className="text-lg font-semibold text-foreground">
              {result?.evidence.length ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Clusters</dt>
            <dd className="text-lg font-semibold text-accent">
              {result?.stats.clustersFound ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Opportunities</dt>
            <dd className="text-lg font-semibold text-accent">
              {result?.stats.opportunitiesRanked ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Hypotheses</dt>
            <dd className="text-lg font-semibold text-accent">
              {result?.stats.hypothesesGenerated ?? 0}
            </dd>
          </div>
        </dl>
      </section>

      <OpportunityList opportunities={result?.opportunities ?? []} />
      <ClusterList clusters={result?.clusters ?? []} />
      <HypothesisList hypotheses={result?.hypotheses ?? []} />

      <RetrievalResultsTable results={result?.searchResults ?? []} />
      <EvidenceTable
        evidence={applyEvidenceFilters(result?.evidence ?? [], filters)}
        mockMode={result?.mockMode}
      />
    </div>
  );
}
