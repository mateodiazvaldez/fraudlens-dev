export type TransactionInput = {
  transaction_id: string;
  user_id: string;
  transaction_datetime: string;
  amount: number;
  currency: string;
  operation_type: "PURCHASE";
  merchant: string;
  country: string;
  cardholder_present: boolean;
  card_present: boolean;
};

type ValidationResult =
  | { success: true; data: TransactionInput }
  | { success: false; errors: Record<string, string> };

export function validateTransactionInput(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: false, errors: { body: "Expected a JSON object" } };
  }
  const value = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  for (const field of ["transaction_id", "user_id", "merchant"] as const) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      errors[field] = "Expected a non-empty string";
    }
  }
  const datetime = value.transaction_datetime;
  if (typeof datetime !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(datetime) ||
      !Number.isFinite(Date.parse(datetime))) {
    errors.transaction_datetime = "Expected an ISO 8601 timestamp with timezone";
  } else {
    const [year, month, day] = datetime.slice(0, 10).split("-").map(Number);
    const calendarDate = new Date(0);
    calendarDate.setUTCFullYear(year, month - 1, day);
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
      errors.transaction_datetime = "Expected a valid calendar date";
    }
  }
  if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0) {
    errors.amount = "Expected a positive finite number";
  }
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency)) {
    errors.currency = "Expected a three-letter uppercase currency code";
  }
  if (value.operation_type !== "PURCHASE") errors.operation_type = "Only PURCHASE is supported";
  if (typeof value.country !== "string" || !/^[A-Z]{2}$/.test(value.country)) {
    errors.country = "Expected a two-letter uppercase country code";
  }
  for (const field of ["cardholder_present", "card_present"] as const) {
    if (typeof value[field] !== "boolean") errors[field] = "Expected a boolean";
  }
  if (Object.keys(errors).length) return { success: false, errors };
  // Copy only contract fields; never forward arbitrary input to MongoDB.
  return { success: true, data: {
    transaction_id: (value.transaction_id as string).trim(),
    user_id: (value.user_id as string).trim(),
    transaction_datetime: datetime as string,
    amount: value.amount as number,
    currency: value.currency as string,
    operation_type: "PURCHASE",
    merchant: (value.merchant as string).trim(),
    country: value.country as string,
    cardholder_present: value.cardholder_present as boolean,
    card_present: value.card_present as boolean,
  } };
}
