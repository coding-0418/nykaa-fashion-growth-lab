"use client";

import { useState } from "react";
import { FIT_PREFERENCES, type FitCheckResult, type FitPreference } from "@/types/fit-check";

interface FitCheckAppProps {
  aiProvider?: string;
  aiConfigured?: boolean;
}

interface FormState {
  referenceBrand: string;
  usualSize: string;
  fitPreference: FitPreference;
  bodyNotes: string;
  productName: string;
  brand: string;
  availableSizes: string;
  sizeChart: string;
  fabric: string;
  cutStyle: string;
  reviewText: string;
}

const EMPTY_FORM: FormState = {
  referenceBrand: "",
  usualSize: "",
  fitPreference: "true_to_size",
  bodyNotes: "",
  productName: "",
  brand: "",
  availableSizes: "",
  sizeChart: "",
  fabric: "",
  cutStyle: "",
  reviewText: "",
};

const FIT_PREFERENCE_LABELS: Record<FitPreference, string> = {
  relaxed: "Relaxed",
  true_to_size: "True to size",
  snug: "Snug",
};

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  product_fact: "Product fact",
  review_signal: "Review signal",
  inference: "Inference",
};

function inputClass() {
  return "mt-1 w-full rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm text-foreground placeholder:text-muted";
}

export function FitCheckApp({ aiProvider, aiConfigured }: FitCheckAppProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<FitCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setStatus("running");
    setErrorMessage(null);
    setResult(null);

    const availableSizes = form.availableSizes
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/fit-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            referenceBrand: form.referenceBrand || undefined,
            usualSize: form.usualSize || undefined,
            fitPreference: form.fitPreference,
            bodyNotes: form.bodyNotes || undefined,
          },
          product: {
            productName: form.productName,
            brand: form.brand,
            availableSizes,
            sizeChart: form.sizeChart || undefined,
            fabric: form.fabric || undefined,
            cutStyle: form.cutStyle || undefined,
            reviewText: form.reviewText || undefined,
          },
        }),
      });

      const payload = (await response.json()) as FitCheckResult | { error?: { message?: string } };

      if ("status" in payload) {
        setResult(payload);
        setStatus("done");
        return;
      }

      setErrorMessage(
        "error" in payload ? (payload.error?.message ?? "Fit check failed.") : "Fit check failed.",
      );
      setStatus("error");
    } catch {
      setErrorMessage("Could not reach the Fit Check API.");
      setStatus("error");
    }
  }

  const canSubmit =
    form.productName.trim() && form.brand.trim() && form.availableSizes.trim();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">
          Personalised Fit Check
        </p>
        <h1 className="text-3xl font-semibold text-foreground">
          &ldquo;I know my size. I don&apos;t know if THIS will fit ME.&rdquo;
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Nykaa Fashion already shows product-specific size charts. The shopper&apos;s
          decision is body-specific. This agent reasons across her usual brand, size,
          and fit preference alongside this product&apos;s size chart, fabric, cut, and
          reviews — and says plainly when there isn&apos;t enough information to
          recommend a size.
        </p>
        {aiProvider ? (
          <p className="text-xs text-muted">
            AI provider: <span className="font-medium text-foreground capitalize">{aiProvider}</span>{" "}
            {aiConfigured ? (
              <span className="text-emerald-400">configured</span>
            ) : (
              <span className="text-amber">not configured — reasoning will be unavailable</span>
            )}
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
            Your fit context
          </h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-foreground/80">
              Reference / usual brand
              <input
                className={inputClass()}
                value={form.referenceBrand}
                onChange={(e) => update("referenceBrand", e.target.value)}
                placeholder="e.g. Zara"
              />
            </label>
            <label className="block text-sm text-foreground/80">
              Usual size in that brand
              <input
                className={inputClass()}
                value={form.usualSize}
                onChange={(e) => update("usualSize", e.target.value)}
                placeholder="e.g. M"
              />
            </label>
            <label className="block text-sm text-foreground/80">
              Fit preference
              <select
                className={inputClass()}
                value={form.fitPreference}
                onChange={(e) => update("fitPreference", e.target.value as FitPreference)}
              >
                {FIT_PREFERENCES.map((pref) => (
                  <option key={pref} value={pref}>
                    {FIT_PREFERENCE_LABELS[pref]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-foreground/80">
              Body/proportion notes (optional, only what you choose to share)
              <textarea
                className={inputClass()}
                rows={2}
                value={form.bodyNotes}
                onChange={(e) => update("bodyNotes", e.target.value)}
                placeholder="e.g. long torso — never inferred, only used if you say it"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
            Product information
          </h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-foreground/80">
              Product name *
              <input
                className={inputClass()}
                value={form.productName}
                onChange={(e) => update("productName", e.target.value)}
                placeholder="e.g. Wrap Midi Dress"
              />
            </label>
            <label className="block text-sm text-foreground/80">
              Brand *
              <input
                className={inputClass()}
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                placeholder="e.g. Nykaa Fashion label"
              />
            </label>
            <label className="block text-sm text-foreground/80">
              Available sizes * (comma separated)
              <input
                className={inputClass()}
                value={form.availableSizes}
                onChange={(e) => update("availableSizes", e.target.value)}
                placeholder="XS, S, M, L, XL"
              />
            </label>
            <label className="block text-sm text-foreground/80">
              Size chart
              <textarea
                className={inputClass()}
                rows={3}
                value={form.sizeChart}
                onChange={(e) => update("sizeChart", e.target.value)}
                placeholder="Paste the product's size chart (measurements per size)"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-foreground/80">
                Fabric/material
                <input
                  className={inputClass()}
                  value={form.fabric}
                  onChange={(e) => update("fabric", e.target.value)}
                  placeholder="e.g. 96% cotton, 4% spandex"
                />
              </label>
              <label className="block text-sm text-foreground/80">
                Cut/style
                <input
                  className={inputClass()}
                  value={form.cutStyle}
                  onChange={(e) => update("cutStyle", e.target.value)}
                  placeholder="e.g. bodycon, wrap"
                />
              </label>
            </div>
            <label className="block text-sm text-foreground/80">
              Review text mentioning fit
              <textarea
                className={inputClass()}
                rows={3}
                value={form.reviewText}
                onChange={(e) => update("reviewText", e.target.value)}
                placeholder="Paste reviews that mention sizing/fit, e.g. 'runs small, size up'"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-5">
        <p className="text-xs text-muted">
          A size chart or fit-relevant review text is required — without either, the
          agent will say the information is insufficient rather than guess.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || status === "running"}
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {status === "running" ? "Checking…" : "Check my fit"}
        </button>
      </div>

      {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}

      {result ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted uppercase">
            Result
          </h2>

          {result.status === "ok" ? (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-semibold text-accent">
                  {result.recommendedSize}
                </span>
                <span className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-xs capitalize text-foreground/80">
                  {result.confidence} confidence
                </span>
              </div>
              {result.reasoning ? (
                <p className="text-sm text-foreground/90">{result.reasoning}</p>
              ) : null}

              {result.signals.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">
                    Signals used
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {result.signals.map((signal, index) => (
                      <li key={index} className="text-sm text-foreground/80">
                        <span className="mr-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                          {SIGNAL_TYPE_LABELS[signal.type] ?? signal.type}
                        </span>
                        {signal.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.caveats.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">Caveats</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                    {result.caveats.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.whatCouldMakeThisWrong.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">
                    What could make this wrong
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
                    {result.whatCouldMakeThisWrong.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-amber/30 bg-amber-soft px-3 py-3 text-sm text-amber">
              <p className="font-medium">
                {result.status === "provider_unconfigured"
                  ? "AI provider not configured"
                  : "Insufficient information"}
              </p>
              <p className="mt-1 text-foreground/80">{result.message}</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
