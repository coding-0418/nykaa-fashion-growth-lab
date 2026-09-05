import type { SourceAdapter } from "@/lib/retrieval/provider";
import { unsupported } from "@/lib/retrieval/provider";
import type { RetrievalQuery, RetrievalResult } from "@/lib/retrieval/provider";

export class AppStoreReviewsAdapter implements SourceAdapter {
  readonly id = "app_store_reviews" as const;
  readonly label = "Google Play / App Store reviews";

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    void query;
    return unsupported(this.label);
  }
}
