import { describe, expect, it } from "vitest";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import {
  hasEnoughProductSignal,
  parseFitCheckJson,
  runFitCheck,
  validateFitCheckRequest,
} from "@/lib/fit-check/reasoning";
import type { FitCheckRequest } from "@/types/fit-check";
import { ScriptedAiProvider } from "./helpers/scripted-ai";

const baseRequest: FitCheckRequest = {
  user: {
    referenceBrand: "Zara",
    usualSize: "M",
    fitPreference: "true_to_size",
  },
  product: {
    productName: "Wrap Midi Dress",
    brand: "Nykaa Fashion",
    availableSizes: ["S", "M", "L"],
    sizeChart: "S: bust 34in, M: bust 36in, L: bust 38in",
    fabric: "96% cotton, 4% spandex",
    cutStyle: "wrap",
    reviewText: "Runs true to size, the wrap tie makes it adjustable.",
  },
};

function fitCheckJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    status: "ok",
    recommendedSize: "M",
    confidence: "medium",
    reasoning: "Usual size M in a comparable brand matches the size chart's M measurements.",
    signals: [
      { type: "product_fact", text: "M measures 36in bust per the size chart." },
      { type: "review_signal", text: "Reviews say it runs true to size." },
    ],
    caveats: ["Stretch fabric may fit differently than a woven fabric of the same size."],
    whatCouldMakeThisWrong: ["If the shopper's usual M in Zara runs larger than average."],
    message: null,
    ...overrides,
  });
}

describe("validateFitCheckRequest", () => {
  it("accepts a well-formed request", () => {
    const result = validateFitCheckRequest(baseRequest);
    expect(result.ok).toBe(true);
  });

  it("rejects missing product data", () => {
    const result = validateFitCheckRequest({
      user: { fitPreference: "true_to_size" },
      product: { productName: "", brand: "", availableSizes: [] },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid fit preference", () => {
    const result = validateFitCheckRequest({
      user: { fitPreference: "whatever" },
      product: baseRequest.product,
    });
    expect(result.ok).toBe(false);
  });
});

describe("hasEnoughProductSignal", () => {
  it("is false without a size chart or review text", () => {
    expect(
      hasEnoughProductSignal({
        ...baseRequest,
        product: { ...baseRequest.product, sizeChart: undefined, reviewText: undefined },
      }),
    ).toBe(false);
  });

  it("is true with only a size chart", () => {
    expect(
      hasEnoughProductSignal({
        ...baseRequest,
        product: { ...baseRequest.product, reviewText: undefined },
      }),
    ).toBe(true);
  });
});

describe("runFitCheck: valid recommendation", () => {
  it("returns a recommendation within availableSizes with signals and caveats", async () => {
    const ai = new ScriptedAiProvider([fitCheckJson()]);
    const result = await runFitCheck(baseRequest, { ai, limits: DEFAULT_AI_LIMITS });

    expect(result.status).toBe("ok");
    expect(result.recommendedSize).toBe("M");
    expect(result.confidence).toBe("medium");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.caveats.length).toBeGreaterThan(0);
  });
});

describe("runFitCheck: provider not configured", () => {
  it("returns provider_unconfigured without calling the model", async () => {
    const ai = new ScriptedAiProvider([], false);
    const result = await runFitCheck(baseRequest, { ai, limits: DEFAULT_AI_LIMITS });
    expect(result.status).toBe("provider_unconfigured");
    expect(ai.calls).toBe(0);
  });
});

describe("runFitCheck: insufficient information", () => {
  it("returns insufficient_information without calling the model when no size chart or reviews exist", async () => {
    const ai = new ScriptedAiProvider([]);
    const request: FitCheckRequest = {
      ...baseRequest,
      product: { ...baseRequest.product, sizeChart: undefined, reviewText: undefined },
    };
    const result = await runFitCheck(request, { ai, limits: DEFAULT_AI_LIMITS });
    expect(result.status).toBe("insufficient_information");
    expect(ai.calls).toBe(0);
  });

  it("respects the model's own insufficient_information verdict", async () => {
    const ai = new ScriptedAiProvider([
      JSON.stringify({ status: "insufficient_information", message: "Size chart lacks bust measurements." }),
    ]);
    const result = await runFitCheck(baseRequest, { ai, limits: DEFAULT_AI_LIMITS });
    expect(result.status).toBe("insufficient_information");
    expect(result.message).toMatch(/bust measurements/);
  });
});

describe("runFitCheck: malformed model output", () => {
  it("does not throw and returns insufficient_information", async () => {
    const ai = new ScriptedAiProvider(["not json at all"]);
    const result = await runFitCheck(baseRequest, { ai, limits: DEFAULT_AI_LIMITS });
    expect(result.status).toBe("insufficient_information");
    expect(result.recommendedSize).toBeUndefined();
  });
});

describe("runFitCheck: unsupported size", () => {
  it("does not accept a recommended size outside availableSizes", async () => {
    const ai = new ScriptedAiProvider([fitCheckJson({ recommendedSize: "XXL" })]);
    const result = await runFitCheck(baseRequest, { ai, limits: DEFAULT_AI_LIMITS });
    expect(result.status).toBe("insufficient_information");
  });
});

describe("parseFitCheckJson: confidence handling", () => {
  it("defaults to low confidence when the model returns an invalid value", () => {
    const parsed = parseFitCheckJson(
      fitCheckJson({ confidence: "extremely certain" }),
      baseRequest,
      false,
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.confidence).toBe("low");
    }
  });
});
