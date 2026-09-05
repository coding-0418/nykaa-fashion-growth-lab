import type { SourceAdapter } from "@/lib/retrieval/provider";
import { unsupported } from "@/lib/retrieval/provider";
import type { RetrievalQuery, RetrievalResult } from "@/lib/retrieval/provider";

export class RedditAdapter implements SourceAdapter {
  readonly id = "reddit" as const;
  readonly label = "Reddit";

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    void query;
    return unsupported(this.label);
  }
}
