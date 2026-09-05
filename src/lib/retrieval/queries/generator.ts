import {
  createQueryFamilies,
  quoteProduct,
} from "@/lib/retrieval/queries/families";
import type { ResearchConfig } from "@/types/discovery";
import type { GeneratedQuery } from "@/types/retrieval";

function slugId(family: string, index: number, text: string): string {
  const compact = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48);
  return `${family}-${index}-${compact}`;
}

function familyMatches(themeKeys: string[], selectedThemes: string[]): boolean {
  if (themeKeys.includes("*")) {
    return true;
  }

  if (selectedThemes.length === 0) {
    return true;
  }

  return themeKeys.some((key) => selectedThemes.includes(key));
}

/**
 * Deterministic query generation from ResearchConfig.
 * Families are data, not a frozen list of production search strings.
 *
 * Queries are picked round-robin across matched families (one per family per round)
 * rather than exhausting each family's full text list before moving to the next.
 * With a small maxQueries budget, exhausting families in declaration order meant only
 * the first one or two families (e.g. generic "wishlist purchase" wording) ever ran —
 * fit/sizing, Reddit, and review-specific families never got a query slot. Round-robin
 * guarantees breadth across behavioural themes at any maxQueries value.
 */
export function generateSearchQueries(
  config: ResearchConfig,
  maxQueries: number,
): GeneratedQuery[] {
  const productPhrase = quoteProduct(config.product);
  const selectedThemes = config.themes;
  const seen = new Set<string>();

  const queues = createQueryFamilies()
    .filter((family) => familyMatches(family.themeKeys, selectedThemes))
    .map((family) => ({
      family,
      texts: family
        .build(productPhrase)
        .map((text) => text.replace(/\s+/g, " ").trim())
        .filter(Boolean),
      cursor: 0,
    }));

  const queries: GeneratedQuery[] = [];

  let madeProgress = true;
  while (queries.length < maxQueries && madeProgress) {
    madeProgress = false;
    for (const queue of queues) {
      if (queries.length >= maxQueries) break;
      while (queue.cursor < queue.texts.length) {
        const text = queue.texts[queue.cursor];
        queue.cursor += 1;
        if (!text || seen.has(text)) {
          continue;
        }
        seen.add(text);
        queries.push({
          id: slugId(queue.family.id, queue.cursor - 1, text),
          family: queue.family.id,
          text,
        });
        madeProgress = true;
        break;
      }
    }
  }

  return queries;
}
