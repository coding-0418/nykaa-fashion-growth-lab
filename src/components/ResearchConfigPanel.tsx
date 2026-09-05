import {
  DEFAULT_RESEARCH_CONFIG,
  INITIAL_HYPOTHESIS_THEMES,
  WORKING_METRIC_NOTE,
} from "@/config/research-config";

export function ResearchConfigPanel() {
  const config = DEFAULT_RESEARCH_CONFIG;

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
        Research configuration
      </h2>
      <p className="mt-2 text-sm text-muted">
        Defaults for V0.1. Editing and persisted runs are not implemented yet.
      </p>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-medium text-foreground/90">Product</dt>
          <dd className="text-muted">{config.product}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/90">Business question</dt>
          <dd className="text-muted">{config.businessQuestion}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/90">Journey</dt>
          <dd className="text-muted">Entire journey</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/90">Source types</dt>
          <dd className="text-muted">{config.sourceTypes.join(", ")}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/90">Result limit</dt>
          <dd className="text-muted">{config.resultLimit}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/90">Themes (hypotheses, not conclusions)</dt>
          <dd className="text-muted">{INITIAL_HYPOTHESIS_THEMES.join(", ")}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-5 text-muted">{WORKING_METRIC_NOTE}</p>
    </section>
  );
}
