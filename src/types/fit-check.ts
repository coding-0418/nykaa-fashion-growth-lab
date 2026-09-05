/**
 * Personalised Fit Check types.
 * "I know my size. I don't know if THIS will fit ME."
 * The agent must never infer body measurements or sensitive attributes the user did not provide.
 */

export const FIT_PREFERENCES = ["relaxed", "true_to_size", "snug"] as const;
export type FitPreference = (typeof FIT_PREFERENCES)[number];

export interface FitCheckUserContext {
  /** A brand the shopper already knows their size in, used as a size-mapping anchor. */
  referenceBrand?: string;
  usualSize?: string;
  fitPreference: FitPreference;
  /** Optional free-text proportion notes volunteered by the shopper (e.g. "long torso"). Never inferred. */
  bodyNotes?: string;
}

export interface FitCheckProductContext {
  productName: string;
  brand: string;
  availableSizes: string[];
  sizeChart?: string;
  fabric?: string;
  cutStyle?: string;
  /** Pasted review text that may contain fit signals ("runs small", "true to size"). */
  reviewText?: string;
}

export interface FitCheckRequest {
  user: FitCheckUserContext;
  product: FitCheckProductContext;
}

export type FitConfidence = "low" | "medium" | "high";

export type FitSignalType = "product_fact" | "review_signal" | "inference";

export interface FitSignal {
  type: FitSignalType;
  text: string;
}

export type FitCheckStatus = "ok" | "insufficient_information" | "provider_unconfigured";

export interface FitCheckResult {
  status: FitCheckStatus;
  recommendedSize?: string;
  confidence?: FitConfidence;
  reasoning?: string;
  signals: FitSignal[];
  caveats: string[];
  whatCouldMakeThisWrong: string[];
  message?: string;
  isMock?: boolean;
}
