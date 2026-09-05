const SCRIPT_LIKE =
  /<(script|style|noscript|template|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi;
const TAGS = /<[^>]+>/g;
const WHITESPACE = /\s+/g;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeEntities(value: string): string {
  return value.replace(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g,
    (match) => ENTITIES[match] ?? match,
  );
}

function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(SCRIPT_LIKE, " ")
    .replace(/<\/?(nav|footer|header|form)[^>]*>/gi, " ");
}

function firstMatch(html: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(html);
  return match?.[1]?.trim();
}

function innerByTag(html: string, tag: string): string | undefined {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  return firstMatch(html, pattern);
}

function metaContent(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return decodeEntities(match[1]).trim();
    }
  }
  return undefined;
}

/**
 * Best-effort <meta> description, used when a page's real body text is not readable
 * without JavaScript (e.g. a video watch page) but public metadata still is.
 */
function extractMetaDescription(html: string): string | undefined {
  return metaContent(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
  ]);
}

export function extractTextFromHtml(html: string): {
  title?: string;
  description?: string;
  text: string;
} {
  const description = extractMetaDescription(html);
  const cleaned = stripNoise(html);
  const title = firstMatch(cleaned, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const article = innerByTag(cleaned, "article");
  const main = innerByTag(cleaned, "main");
  const body = innerByTag(cleaned, "body") ?? cleaned;
  const source = article ?? main ?? body;
  const text = decodeEntities(source.replace(TAGS, " "))
    .replace(WHITESPACE, " ")
    .trim()
    .slice(0, 50_000);

  return {
    title: title ? decodeEntities(title.replace(TAGS, " ")).trim() : undefined,
    description,
    text,
  };
}
