import type { SourceAdapter } from "@/lib/retrieval/provider";
import { unsupported } from "@/lib/retrieval/provider";
import type { RetrievalQuery, RetrievalResult } from "@/lib/retrieval/provider";

export class YouTubeAdapter implements SourceAdapter {
  readonly id = "youtube" as const;
  readonly label = "YouTube";

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    void query;
    return unsupported(this.label);
  }
}
