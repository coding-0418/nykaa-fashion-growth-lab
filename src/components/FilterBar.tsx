"use client";

import type { EvidenceUnit } from "@/types/discovery";

export interface EvidenceFilters {
  journeyStage: string;
  barrier: string;
  intent: string;
  outcome: string;
  source: string;
  needsReview: string;
}

export const EMPTY_EVIDENCE_FILTERS: EvidenceFilters = {
  journeyStage: "",
  barrier: "",
  intent: "",
  outcome: "",
  source: "",
  needsReview: "",
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function FilterBar({
  evidence,
  filters,
  onChange,
}: {
  evidence: EvidenceUnit[];
  filters: EvidenceFilters;
  onChange: (next: EvidenceFilters) => void;
}) {
  const options = {
    journeyStage: unique(evidence.map((unit) => unit.journeyStage)),
    barrier: unique(evidence.map((unit) => unit.barrier.category)),
    intent: unique(evidence.map((unit) => unit.wishlistIntent)),
    outcome: unique(evidence.map((unit) => unit.outcome)),
    source: unique(evidence.map((unit) => unit.source.platform)),
  };

  function update(key: keyof EvidenceFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
        Filters
      </h2>
      <p className="mt-2 text-sm text-muted">
        Filters apply to extracted evidence units only. They are not analytics.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm text-foreground/80">
          Journey stage
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-foreground"
            value={filters.journeyStage}
            onChange={(event) => update("journeyStage", event.target.value)}
          >
            <option value="">All</option>
            {options.journeyStage.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-foreground/80">
          Barrier
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-foreground"
            value={filters.barrier}
            onChange={(event) => update("barrier", event.target.value)}
          >
            <option value="">All</option>
            {options.barrier.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-foreground/80">
          Intent
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-foreground"
            value={filters.intent}
            onChange={(event) => update("intent", event.target.value)}
          >
            <option value="">All</option>
            {options.intent.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-foreground/80">
          Outcome
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-foreground"
            value={filters.outcome}
            onChange={(event) => update("outcome", event.target.value)}
          >
            <option value="">All</option>
            {options.outcome.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-foreground/80">
          Source
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-foreground"
            value={filters.source}
            onChange={(event) => update("source", event.target.value)}
          >
            <option value="">All</option>
            {options.source.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-foreground/80">
          Needs review
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-foreground"
            value={filters.needsReview}
            onChange={(event) => update("needsReview", event.target.value)}
          >
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export function applyEvidenceFilters(
  evidence: EvidenceUnit[],
  filters: EvidenceFilters,
): EvidenceUnit[] {
  return evidence.filter((unit) => {
    if (filters.journeyStage && unit.journeyStage !== filters.journeyStage) {
      return false;
    }
    if (filters.barrier && unit.barrier.category !== filters.barrier) {
      return false;
    }
    if (filters.intent && unit.wishlistIntent !== filters.intent) {
      return false;
    }
    if (filters.outcome && unit.outcome !== filters.outcome) {
      return false;
    }
    if (filters.source && unit.source.platform !== filters.source) {
      return false;
    }
    if (filters.needsReview === "yes" && !unit.needsReview) {
      return false;
    }
    if (filters.needsReview === "no" && unit.needsReview) {
      return false;
    }
    return true;
  });
}
