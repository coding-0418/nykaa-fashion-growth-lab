import { AppStoreReviewsAdapter } from "@/lib/retrieval/sources/app-store-reviews";
import { ProductReviewsAdapter } from "@/lib/retrieval/sources/product-reviews";
import { RedditAdapter } from "@/lib/retrieval/sources/reddit";
import { SocialAdapter } from "@/lib/retrieval/sources/social";
import { WebAdapter } from "@/lib/retrieval/sources/web";
import { YouTubeAdapter } from "@/lib/retrieval/sources/youtube";
import type { SourceAdapter } from "@/lib/retrieval/provider";
import type { SourceType } from "@/types/discovery";

const adapters: SourceAdapter[] = [
  new RedditAdapter(),
  new YouTubeAdapter(),
  new WebAdapter(),
  new ProductReviewsAdapter(),
  new AppStoreReviewsAdapter(),
  new SocialAdapter(),
];

const adaptersById = new Map(
  adapters.map((adapter) => [adapter.id, adapter]),
);

export function getSourceAdapter(id: SourceType): SourceAdapter | undefined {
  return adaptersById.get(id);
}

export function listSourceAdapters(): SourceAdapter[] {
  return [...adapters];
}
