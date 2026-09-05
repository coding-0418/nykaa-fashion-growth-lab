/**
 * Confirm excerpts come from retrieved text. Never keep invented wording.
 */
export function groundExcerpt(
  sourceText: string,
  candidate: string | undefined,
  maxLength = 500,
): { excerpt: string; grounded: boolean } {
  const source = sourceText.replace(/\s+/g, " ").trim();
  const fallback = source.slice(0, maxLength);

  if (!candidate || candidate.trim() === "") {
    return { excerpt: fallback, grounded: false };
  }

  const needle = candidate.replace(/\s+/g, " ").trim();
  const sourceLower = source.toLowerCase();
  const needleLower = needle.toLowerCase();
  const index = sourceLower.indexOf(needleLower);

  if (index === -1) {
    return { excerpt: fallback, grounded: false };
  }

  const exact = source.slice(index, index + needle.length).slice(0, maxLength);
  return { excerpt: exact, grounded: true };
}

export function truncateSource(text: string, maxChars: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) {
    return collapsed;
  }
  return collapsed.slice(0, maxChars);
}

const DEMOGRAPHIC_PATTERN =
  /\b(\d{2}\s*-?\s*year|gen z|millennial|urban woman|middle-?class|gender|income|from [a-z]+ city)\b/i;

export function sanitizeSegmentName(name: unknown): string {
  if (typeof name !== "string" || name.trim() === "") {
    return "unknown";
  }
  const trimmed = name.trim();
  if (DEMOGRAPHIC_PATTERN.test(trimmed)) {
    return "unknown";
  }
  return trimmed.slice(0, 80);
}
