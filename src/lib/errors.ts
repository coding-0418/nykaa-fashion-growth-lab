export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotImplementedError extends AppError {
  constructor(feature: string) {
    super(`${feature} is not implemented yet.`, "NOT_IMPLEMENTED", 501, {
      feature,
    });
    this.name = "NotImplementedError";
  }
}

export class ProviderNotConfiguredError extends AppError {
  constructor(provider: string) {
    super(
      `${provider} is selected but its API key is missing.`,
      "PROVIDER_NOT_CONFIGURED",
      503,
      { provider },
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export class InvalidRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "INVALID_REQUEST", 400, details);
    this.name = "InvalidRequestError";
  }
}

export interface PublicErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function toErrorResponse(error: unknown): {
  body: PublicErrorBody;
  status: number;
} {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message,
      },
    },
  };
}
