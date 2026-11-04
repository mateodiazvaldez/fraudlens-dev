import "server-only";

type ErrorCode = "AI_CONFIGURATION_MISSING" | "AI_INVALID_OUTPUT" | "AI_INCONSISTENT_SIGNALS" |
  "AI_PROVIDER_ERROR" | "AI_TIMEOUT";

/** Solo diagnósticos controlados por la aplicación; nunca conservar el error original. */
export class OperationalError extends Error {
  readonly code: ErrorCode;
  readonly providerStatus?: number;
  readonly providerCode?: string;

  constructor(
    code: ErrorCode,
    message: string,
    providerStatus?: number,
    providerCode?: string,
  ) {
    super(message);
    this.code = code;
    this.providerStatus = providerStatus;
    this.providerCode = providerCode;
  }
}

export type ErrorStage = "configuration" | "database_connection" | "history_read" | "inference" | "persistence" | "history_list";

export function logServerError(event: "transaction_evaluation_failed" | "transaction_history_failed", stage: ErrorStage, error: unknown) {
  // No registrar message, stack, cause ni el objeto completo: pueden contener datos sensibles.
  const databaseErrors = ["MongoServerSelectionError", "MongooseServerSelectionError", "MongoNetworkError", "MongoNetworkTimeoutError"];
  const code = error instanceof OperationalError ? error.code
    : error instanceof Error && databaseErrors.includes(error.name) ? "DATABASE_UNAVAILABLE"
    : error instanceof Error && error.name === "ValidationError" ? "DATABASE_VALIDATION_FAILED"
    : "UNEXPECTED_ERROR";
  console.error(JSON.stringify({
    level: "error", timestamp: new Date().toISOString(), event, stage, code,
    ...(error instanceof OperationalError && error.providerStatus !== undefined ? { provider_status: error.providerStatus } : {}),
    ...(error instanceof OperationalError && error.providerCode ? { provider_code: error.providerCode } : {}),
  }));
}
