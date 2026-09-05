import { describe, expect, it } from "vitest";
import { parseModelJson } from "@/lib/ai/json";
import { parseRelevanceJson } from "@/lib/discovery/relevance";
import { mapEvidenceStrength, parseExtractionJson } from "@/lib/discovery/extraction";
import { shouldFlagForReview } from "@/lib/discovery/review";
import { groundExcerpt } from "@/lib/discovery/grounding";
import { DEFAULT_AI_LIMITS } from "@/config/ai";
import type { RawDocument } from "@/types/retrieval";
import { relevanceJson, extractionJson } from "./helpers/scripted-ai";

const sampleDoc: RawDocument = {
  id: "doc-1",
  source: "web",
  url: "https://example.com/mock-demo/sample",
  title: "[MOCK/DEMO] sample",
  retrievedAt: "2026-01-01T00:00:00.000Z",
  content:
    "I saved the dress because I liked it, but I wasn't sure about the size so I checked Instagram before buying.",
  contentType: "text/plain",
  isMock: true,
};

const screening = {
  relevance: "relevant" as const,
  reason: "Behaviour plus friction.",
  journeyStages: ["wishlist" as const],
  confidence: 0.9,
};

describe("relevance JSON parsing", () => {
  it("parses a valid screening object", () => {
    const result = parseRelevanceJson(relevanceJson());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.relevance).toBe("relevant");
      expect(result.value.confidence).toBe(0.9);
    }
  });

  it("rejects invalid relevance", () => {
    const result = parseRelevanceJson(
      relevanceJson({ relevance: "super_relevant" }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("extraction JSON parsing", () => {
  it("parses known fields and keeps the source URL", () => {
    const result = parseExtractionJson(
      extractionJson({
        wishlistIntent: "high_intent",
        barrier: { category: "fit", subcategory: "size" },
        informationNeeded: ["size", "fit"],
        workaround: ["Instagram"],
        relevantExcerpt: "I wasn't sure about the size so I checked Instagram",
      }),
      sampleDoc,
      sampleDoc.content,
      screening,
      DEFAULT_AI_LIMITS,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unit.source.url).toBe(sampleDoc.url);
      expect(result.value.unit.barrier.category).toBe("fit");
      expect(result.value.unit.workaround).toEqual(["Instagram"]);
      expect(result.value.groundedExcerpt).toBe(true);
    }
  });

  it("fills unknown/empty values when fields are missing", () => {
    const result = parseExtractionJson(
      "{}",
      sampleDoc,
      sampleDoc.content,
      screening,
      DEFAULT_AI_LIMITS,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.unit.journeyStage).toBe("unknown");
      expect(result.value.unit.wishlistIntent).toBe("unknown");
      expect(result.value.unit.outcome).toBe("unknown");
      expect(result.value.unit.informationNeeded).toEqual([]);
      expect(result.value.unit.barrier.category).toBe("other");
    }
  });
});

describe("malformed AI response", () => {
  it("fails closed without fabricating an object", () => {
    expect(parseModelJson("not json at all").ok).toBe(false);
    expect(parseRelevanceJson("```json\n{not json}\n```").ok).toBe(false);
    const extraction = parseExtractionJson(
      "sorry, I cannot",
      sampleDoc,
      sampleDoc.content,
      screening,
      DEFAULT_AI_LIMITS,
    );
    expect(extraction.ok).toBe(false);
  });
});

describe("low-confidence and strength mapping", () => {
  it("flags low confidence for review", () => {
    expect(
      shouldFlagForReview(
        {
          relevance: "relevant",
          confidence: 0.2,
          evidenceStrength: 4,
          outcome: "purchased",
        },
        {
          groundedExcerpt: true,
          uncertain: false,
          multipleBarriersPlausible: false,
        },
        DEFAULT_AI_LIMITS,
      ),
    ).toBe(true);
  });

  it("maps evidence strength onto the 1-5 directional scale", () => {
    expect(mapEvidenceStrength(1)).toBe(1);
    expect(mapEvidenceStrength(3.2)).toBe(3);
    expect(mapEvidenceStrength(9)).toBe(5);
    expect(mapEvidenceStrength("nope")).toBe(1);
  });
});

describe("grounding behaviour", () => {
  it("does not keep an invented cheaper-on-Myntra claim", () => {
    const source = "I found the same dress on Myntra.";
    const grounded = groundExcerpt(source, "User found it cheaper on Myntra");
    expect(grounded.grounded).toBe(false);
    expect(grounded.excerpt).toContain("same dress on Myntra");
    expect(grounded.excerpt.toLowerCase()).not.toContain("cheaper");
  });

  it("keeps an explicit excerpt from the source", () => {
    const source =
      "I saved the dress because I liked it, but I wasn't sure about the size so I checked Instagram before buying.";
    const grounded = groundExcerpt(
      source,
      "I wasn't sure about the size so I checked Instagram",
    );
    expect(grounded.grounded).toBe(true);
  });
});
