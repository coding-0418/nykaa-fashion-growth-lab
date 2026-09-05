import type { SourceAdapter } from "@/lib/retrieval/provider";
import { unsupported } from "@/lib/retrieval/provider";
import type { RetrievalQuery, RetrievalResult } from "@/lib/retrieval/provider";

export class ProductReviewsAdapter implements SourceAdapter {
  readonly id = "product_reviews" as const;
  readonly label = "Public product reviews and Q&A";

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    void query;
    return unsupported(this.label);
  }
}
