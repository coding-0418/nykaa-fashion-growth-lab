const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "igshid",
]);

export function canonicalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    url.hash = "";
    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    ) {
      url.port = "";
    }

    const params = [...url.searchParams.entries()]
      .filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b));

    url.search = "";
    for (const [key, value] of params) {
      url.searchParams.append(key, value);
    }

    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function hostnameOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const APP_STORE_HOSTS = ["apps.apple.com", "play.google.com"];
const REVIEW_PLATFORM_HOSTS = [
  "trustpilot.com",
  "pissedconsumer.com",
  "mouthshut.com",
  "consumeraffairs.com",
  "sitejabber.com",
  "quora.com",
];
const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "threads.net",
  "linkedin.com",
  "pinterest.com",
];

function hostMatches(host: string, domains: string[]): boolean {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/**
 * Fine-grained platform label for display/diagnostics (source distribution).
 * This is a display label, not a gate on whether the URL gets fetched.
 */
export function labelSourceFromUrl(raw: string): string {
  const host = hostnameOf(raw);
  if (!host) {
    return "web";
  }

  if (host === "reddit.com" || host.endsWith(".reddit.com")) {
    return "reddit";
  }

  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) {
    return "youtube";
  }

  if (host === "apps.apple.com") return "app_store";
  if (host === "play.google.com") return "play_store";
  if (hostMatches(host, REVIEW_PLATFORM_HOSTS)) return "review_platform";
  if (hostMatches(host, SOCIAL_HOSTS)) return "social";

  return "web";
}

/**
 * Classifies a discovered URL into one of the ResearchConfig source-type buckets so
 * fetched/screened/relevant/extracted counts can be broken down per source type, and
 * so lightweight per-domain normalization can be applied. This is a routing hint for
 * the SAME generic public-web fetch path — it never gates whether a URL is fetched.
 */
export function classifySourceType(
  raw: string,
): "reddit" | "youtube" | "app_store_reviews" | "product_reviews" | "social" | "web" {
  const host = hostnameOf(raw);
  if (!host) {
    return "web";
  }

  if (host === "reddit.com" || host.endsWith(".reddit.com")) {
    return "reddit";
  }
  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) {
    return "youtube";
  }
  if (hostMatches(host, APP_STORE_HOSTS)) {
    return "app_store_reviews";
  }
  if (hostMatches(host, REVIEW_PLATFORM_HOSTS)) {
    return "product_reviews";
  }
  if (hostMatches(host, SOCIAL_HOSTS)) {
    return "social";
  }
  return "web";
}

/**
 * Rewrites a small set of known hosts to a public, non-JS-gated equivalent that a
 * GET-only fetch can actually extract text from, while the ORIGINAL url is kept as
 * the citation (see run.ts). Never adds credentials, never targets a private endpoint.
 */
export function normalizeFetchUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (url.hostname === "www.reddit.com" || url.hostname === "reddit.com") {
      url.hostname = "old.reddit.com";
      return url.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}
