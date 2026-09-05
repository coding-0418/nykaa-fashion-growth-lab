/**
 * TEST FIXTURES ONLY.
 * MOCK / DEMO — NOT RESEARCH EVIDENCE.
 * Never present these as Nykaa Fashion findings.
 */

import type { RawDocument } from "@/types/retrieval";

const NOTICE = "MOCK / DEMO — NOT RESEARCH EVIDENCE.";

export interface ManualQaFixture {
  id: string;
  caseId: "A" | "B" | "C" | "D" | "E" | "F";
  summary: string;
  document: RawDocument;
}

function doc(
  caseId: ManualQaFixture["caseId"],
  title: string,
  content: string,
): RawDocument {
  const path = `https://example.com/mock-demo/qa-case-${caseId.toLowerCase()}`;
  return {
    id: `fixture-${caseId}`,
    source: "web",
    url: path,
    title: `[MOCK/DEMO] ${title}`,
    retrievedAt: "2026-01-01T00:00:00.000Z",
    content: `${NOTICE} ${content}`,
    contentType: "text/plain",
    isMock: true,
  };
}

export const MANUAL_QA_FIXTURES: ManualQaFixture[] = [
  {
    id: "A",
    caseId: "A",
    summary: "Saved because they liked it; no intention to buy soon.",
    document: doc(
      "A",
      "Saved for later with no plan to buy",
      "I saved the kurta on Nykaa Fashion because I liked it, but I am just bookmarking it. I do not plan to buy anytime soon.",
    ),
  },
  {
    id: "B",
    caseId: "B",
    summary: "Size uncertainty; checked external reviews.",
    document: doc(
      "B",
      "Size uncertainty then Instagram reviews",
      "I saved the dress because I liked it, but I wasn't sure about the size so I checked Instagram before buying.",
    ),
  },
  {
    id: "C",
    caseId: "C",
    summary: "Compared across platforms and bought elsewhere.",
    document: doc(
      "C",
      "Same dress bought on Myntra",
      "I found the same dress on Myntra and ordered there instead of Nykaa Fashion.",
    ),
  },
  {
    id: "D",
    caseId: "D",
    summary: "Returned because fit differed from expectations.",
    document: doc(
      "D",
      "Returned for fit",
      "I bought it from Nykaa Fashion and I returned it because the fit was wrong compared with what I expected.",
    ),
  },
  {
    id: "E",
    caseId: "E",
    summary: "Generic delivery complaint unrelated to purchase decision.",
    document: doc(
      "E",
      "Generic delivery complaint",
      "The delivery guy was rude yesterday. That is all. I am not talking about any product or wishlist.",
    ),
  },
  {
    id: "F",
    caseId: "F",
    summary: "Still considering because of an upcoming occasion.",
    document: doc(
      "F",
      "Considering for a wedding",
      "I saved this outfit on Nykaa Fashion for my cousin's wedding next month. I am still thinking about whether to buy it.",
    ),
  },
];

export function manualQaDocuments(): RawDocument[] {
  return MANUAL_QA_FIXTURES.map((fixture) => fixture.document);
}
