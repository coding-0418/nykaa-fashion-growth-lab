import type { SourceAdapter } from "@/lib/retrieval/provider";
import { unsupported } from "@/lib/retrieval/provider";
import type { RetrievalQuery, RetrievalResult } from "@/lib/retrieval/provider";

export class SocialAdapter implements SourceAdapter {
  readonly id = "social" as const;
  readonly label = "Public social content";

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    void query;
    return unsupported(
      this.label,
      "Public social retrieval is not implemented. Only legally and technically appropriate public content should be added later; restricted sources must fail gracefully.",
    );
  }
}
