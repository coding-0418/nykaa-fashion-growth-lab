import type { AiLimits } from "@/config/ai";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import type { AiProvider } from "@/lib/ai/provider";
import { parseModelJson } from "@/lib/ai/json";
import {
  buildFitCheckSystemPrompt,
  buildFitCheckUserPrompt,
} from "@/lib/fit-check/prompts";
import {
  FIT_PREFERENCES,
  type FitCheckRequest,
  type FitCheckResult,
  type FitConfidence,
  type FitPreference,
  type FitSignal,
  type FitSignalType,
} from "@/types/fit-check";

const FIT_SIGNAL_TYPES: readonly FitSignalType[] = [
  "product_fact",
  "review_signal",
  "inference",
];
const FIT_CONFIDENCES: readonly FitConfidence[] = ["low", "medium", "high"];

export function validateFitCheckRequest(
  input: unknown,
): { ok: true; value: FitCheckRequest } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Request body must be an object." };
  }
  const raw = input as Record<string, unknown>;
  const userRaw = raw.user && typeof raw.user === "object" ? (raw.user as Record<string, unknown>) : {};
  const productRaw =
    raw.product && typeof raw.product === "object" ? (raw.product as Record<string, unknown>) : {};

  const fitPreference =
    typeof userRaw.fitPreference === "string" &&
    (FIT_PREFERENCES as readonly string[]).includes(userRaw.fitPreference)
      ? (userRaw.fitPreference as FitPreference)
      : undefined;
  if (!fitPreference) {
    return {
      ok: false,
      error: `user.fitPreference is required and must be one of: ${FIT_PREFERENCES.join(", ")}.`,
    };
  }

  const productName =
    typeof productRaw.productName === "string" ? productRaw.productName.trim() : "";
  if (!productName) {
    return { ok: false, error: "product.productName is required." };
  }

  const brand = typeof productRaw.brand === "string" ? productRaw.brand.trim() : "";
  if (!brand) {
    return { ok: false, error: "product.brand is required." };
  }

  const availableSizes = Array.isArray(productRaw.availableSizes)
    ? productRaw.availableSizes.filter(
        (size): size is string => typeof size === "string" && size.trim().length > 0,
      )
    : [];
  if (availableSizes.length === 0) {
    return { ok: false, error: "product.availableSizes must be a non-empty array of sizes." };
  }

  return {
    ok: true,
    value: {
      user: {
        referenceBrand:
          typeof userRaw.referenceBrand === "string" ? userRaw.referenceBrand.trim() : undefined,
        usualSize: typeof userRaw.usualSize === "string" ? userRaw.usualSize.trim() : undefined,
        fitPreference,
        bodyNotes: typeof userRaw.bodyNotes === "string" ? userRaw.bodyNotes.trim() : undefined,
      },
      product: {
        productName,
        brand,
        availableSizes,
        sizeChart: typeof productRaw.sizeChart === "string" ? productRaw.sizeChart.trim() : undefined,
        fabric: typeof productRaw.fabric === "string" ? productRaw.fabric.trim() : undefined,
        cutStyle: typeof productRaw.cutStyle === "string" ? productRaw.cutStyle.trim() : undefined,
        reviewText: typeof productRaw.reviewText === "string" ? productRaw.reviewText.trim() : undefined,
      },
    },
  };
}

/**
 * There is no way to reason about fit for THIS product without at least a size chart or
 * fit-relevant review text. Fail closed rather than guessing from brand/preference alone.
 */
export function hasEnoughProductSignal(request: FitCheckRequest): boolean {
  return Boolean(request.product.sizeChart?.trim() || request.product.reviewText?.trim());
}

function insufficientResult(message: string, isMock: boolean): FitCheckResult {
  return {
    status: "insufficient_information",
    signals: [],
    caveats: [],
    whatCouldMakeThisWrong: [],
    message,
    isMock,
  };
}

function parseSignals(value: unknown): FitSignal[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => ({
      type: FIT_SIGNAL_TYPES.includes(item.type as FitSignalType)
        ? (item.type as FitSignalType)
        : "inference",
      text: typeof item.text === "string" ? item.text.trim() : "",
    }))
    .filter((signal) => signal.text.length > 0)
    .slice(0, 12);
}

function stringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function parseFitCheckJson(
  text: string,
  request: FitCheckRequest,
  isMock: boolean,
): { ok: true; value: FitCheckResult } | { ok: false; error: string } {
  const parsed = parseModelJson(text);
  if (!parsed.ok) {
    return parsed;
  }
  if (!parsed.value || typeof parsed.value !== "object") {
    return { ok: false, error: "Fit check payload is not an object." };
  }
  const raw = parsed.value as Record<string, unknown>;

  if (raw.status === "insufficient_information") {
    return {
      ok: true,
      value: insufficientResult(
        typeof raw.message === "string" && raw.message.trim()
          ? raw.message.trim()
          : "The model determined the available product information is not enough to recommend a size.",
        isMock,
      ),
    };
  }

  const recommendedSize =
    typeof raw.recommendedSize === "string" ? raw.recommendedSize.trim() : "";
  if (!recommendedSize || !request.product.availableSizes.includes(recommendedSize)) {
    // A size outside the product's real options is treated as an unsupported
    // recommendation, not fabricated and returned to the shopper.
    return {
      ok: false,
      error: recommendedSize
        ? `Model recommended a size ("${recommendedSize}") that is not in availableSizes.`
        : "Model did not return a valid recommendedSize.",
    };
  }

  const confidence = FIT_CONFIDENCES.includes(raw.confidence as FitConfidence)
    ? (raw.confidence as FitConfidence)
    : "low";

  return {
    ok: true,
    value: {
      status: "ok",
      recommendedSize,
      confidence,
      reasoning:
        typeof raw.reasoning === "string" && raw.reasoning.trim()
          ? raw.reasoning.trim()
          : undefined,
      signals: parseSignals(raw.signals),
      caveats: stringList(raw.caveats),
      whatCouldMakeThisWrong: stringList(raw.whatCouldMakeThisWrong),
      isMock,
    },
  };
}

export async function runFitCheck(
  request: FitCheckRequest,
  deps: { ai: AiProvider; limits?: AiLimits },
): Promise<FitCheckResult> {
  const { ai } = deps;
  const limits = deps.limits ?? DEFAULT_AI_LIMITS;

  if (!ai.isConfigured()) {
    return {
      status: "provider_unconfigured",
      signals: [],
      caveats: [],
      whatCouldMakeThisWrong: [],
      message: `AI provider "${ai.name}" is not configured. Set GEMINI_API_KEY or GROQ_API_KEY to enable Fit Check reasoning.`,
    };
  }

  if (!hasEnoughProductSignal(request)) {
    return insufficientResult(
      "No size chart or fit-relevant review text was provided for this product, so a size cannot be reasoned about responsibly.",
      false,
    );
  }

  try {
    const response = await ai.completeStructured({
      systemPrompt: buildFitCheckSystemPrompt(),
      prompt: buildFitCheckUserPrompt(request),
      timeoutMs: limits.timeoutMs,
    });
    const parsed = parseFitCheckJson(response.text, request, false);
    if (!parsed.ok) {
      return insufficientResult(
        `Model output could not be validated (${parsed.error}). Returning no recommendation rather than an unsupported one.`,
        false,
      );
    }
    return parsed.value;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fit check reasoning failed.";
    return insufficientResult(
      `Fit reasoning request failed (${message}). Returning no recommendation rather than an unsupported one.`,
      false,
    );
  }
}
