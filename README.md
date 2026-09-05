# Nykaa Fashion Discovery Engine

AI-powered discovery engine for a product management graduation project.

**Product studied:** Nykaa Fashion

**Working business metric (definition only):** 30-Day Wishlist Purchase Conversion = users who add at least one product to wishlist and purchase at least one of those wishlisted products within 30 days / users who add at least one product to wishlist.

This repository does **not** contain internal Nykaa Fashion data and must not invent a current conversion rate.

Current milestone: **V0.3 AI evidence extraction**. Public-web retrieval plus two-stage Gemini/Groq analysis. Clustering and opportunity scoring are not implemented.

AI-generated EvidenceUnits are **hypotheses**. They are not validated findings until checked against the source and, later, primary research.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Server-only AI: Google Gemini or Groq (`AI_PROVIDER`)
- Server-only search: Brave Search, Tavily Search, or labelled mock mode
- Deploy: Vercel + GitHub

## Pipeline

```
ResearchConfig
  → Query generation
  → Brave, Tavily, or mock search
  → Public page fetch
  → Normalize + dedupe
  → Stage A: AI relevance screening
  → Stage B: AI evidence extraction (relevant, and high-confidence partial)
  → EvidenceUnits
  → POST /api/discover
```

Retrieval stays in `src/lib/retrieval/`. AI stays in `src/lib/ai/`. Discovery orchestration is in `src/lib/discovery/`. Prompts are in `src/lib/discovery/prompts/`.

The discovery pipeline calls `completeStructured(...)` on the shared `AiProvider` interface. It does not import Gemini/Groq SDKs.

## AI analysis architecture

1. **Relevance screening** returns `relevant | partially_relevant | irrelevant` JSON.
2. **Deep extraction** runs only for `relevant` documents and for `partially_relevant` documents at or above `AI_PARTIAL_EXTRACT_MIN_CONFIDENCE`.
3. JSON is parsed strictly. Malformed output marks that document failed; the run continues.
4. Excerpts must appear in the retrieved text. Invented wording is dropped and the unit is flagged for review.
5. **Confidence is the model’s self-score (0–1), not statistical confidence.**

### Grounding rules

The model must not invent users, demographics, quotes, prices, outcomes, or platform comparisons. Unsupported fields become `unknown` or `[]`. Segments are behavioural, not demographic.

### EvidenceUnit

See `src/types/discovery.ts`. Added for this milestone: `needsReview`, optional `isMock`, `screeningReason`. Provenance (`source.url`, timestamps, excerpt) is required.

Barrier categories are limited to the taxonomy in `src/config/taxonomy.ts` plus `other`. New theme discovery is deferred to clustering.

## Gemini setup

1. Create a Google AI Studio / Gemini API key.
2. In `.env.local`:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```

Default model: **gemini-3.6-flash**.

## Groq setup

```bash
AI_PROVIDER=groq
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b
```

Default model: **openai/gpt-oss-120b**.

Switching providers is only `AI_PROVIDER`. Keys never use `NEXT_PUBLIC_`.

## Cost / performance controls

| Variable | Default |
| --- | --- |
| `AI_MAX_DOCUMENTS_SCREENED` | 8 |
| `AI_MAX_DOCUMENTS_EXTRACTED` | 5 |
| `AI_TIMEOUT_MS` | 20000 |
| `AI_RETRY_LIMIT` | 1 |
| `AI_CONCURRENCY` | 2 |
| `AI_REVIEW_CONFIDENCE_THRESHOLD` | 0.55 |
| `AI_PARTIAL_EXTRACT_MIN_CONFIDENCE` | 0.65 |
| `AI_MAX_SOURCE_CHARS` | 8000 |

Retrieval limits from Milestone 2 still apply.

## Sources

| Source | Status |
| --- | --- |
| Public web (Brave Search / Tavily Search + HTTP GET) | Supported |
| Reddit / YouTube / reviews / app stores / social | Placeholder adapters |

## Public-access limitations

Single GET, timeout, size cap, HTML/text only. No CAPTCHA/login/paywall/robots bypass. Unavailable pages keep search metadata; content is not invented.

## Tavily Search setup

1. Create a Tavily Search API key.
2. In `.env.local`:

```bash
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=tvly-...
```

Refer to Tavily's current official pricing/documentation for account and usage limits.

## Brave Search setup

1. Create a Brave Search API key.
2. In `.env.local`:

```bash
SEARCH_PROVIDER=brave
BRAVE_SEARCH_API_KEY=...
```

## Mock / test mode

```bash
SEARCH_PROVIDER=mock
```

Mock retrieval and any evidence from it is labelled **MOCK / DEMO — NOT RESEARCH EVIDENCE**. Do not present it as Nykaa research.

`src/lib/discovery/fixtures/manual-qa.ts` holds synthetic cases A–F for tests only. They are not loaded into the production dashboard.

If `AI_PROVIDER` is set but the matching key is missing, retrieval still returns; evidence is empty and the run is `partial`.

## Local setup

```bash
npm install
cp .env.example .env.local
# set SEARCH_PROVIDER to brave, tavily, or mock
# set TAVILY_API_KEY (if SEARCH_PROVIDER=tavily) or BRAVE_SEARCH_API_KEY (if SEARCH_PROVIDER=brave)
# set AI_PROVIDER + GEMINI_API_KEY or GROQ_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Run Discovery**.

```bash
npm test
npm run lint
npm run build
```

Tests mock AI responses and do not call Gemini/Groq.

## Deploy on Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com/new).
2. Set `SEARCH_PROVIDER=tavily` (or `brave`), and set the corresponding `TAVILY_API_KEY` (or `BRAVE_SEARCH_API_KEY`). Also configure `AI_PROVIDER` and the matching AI key.
3. Optionally set model names and limit variables.
4. Keep mock search off for research demos.

`maxDuration` on `/api/discover` is 60 seconds (plan-dependent).

## What is not implemented yet (Milestone 4+)

- Clustering / semantic clustering
- Opportunity scoring
- Segment frequency charts
- Recommendations or “biggest problem” conclusions
- Interview analysis
