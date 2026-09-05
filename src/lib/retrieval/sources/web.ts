import type { SourceAdapter } from "@/lib/retrieval/provider";
import { unsupported } from "@/lib/retrieval/provider";
import type { RetrievalQuery, RetrievalResult } from "@/lib/retrieval/provider";

export class WebAdapter implements SourceAdapter {
  readonly id = "web" as const;
  readonly label = "Public web / fashion communities";

  /**
   * Dedicated adapter search remains unused. Live public-web retrieval
   * goes through SearchProvider in `lib/retrieval/run.ts`.
   */
  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    void query;
    return unsupported(
      this.label,
      "Use the public web SearchProvider path. This adapter is a source-status placeholder.",
    );
  }
}
