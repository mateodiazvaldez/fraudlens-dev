export type TransactionInput = {
  transaction_id: string;
  user_id: string;
  transaction_datetime: string;
  amount: number;
  currency: string;
  operation_type: "PURCHASE";
  merchant: string;
  country: string;
  card_country: string;
  cardholder_present: boolean;
  card_present: boolean;
};

export type TransactionEvaluation = TransactionInput & {
  transaction_evaluation_id: string;
  risk_score: number;
  decision: "APPROVED" | "REJECTED" | "BLOCK";
  reasons?: string[];
  signals?: string[];
  rules_applied?: string[];
  created_at: string;
  updated_at: string;
};

export type EvaluationResult = Pick<
  TransactionEvaluation,
  "transaction_evaluation_id" | "transaction_id" | "risk_score" | "decision" | "reasons" | "signals"
>;

export type EvaluationPage = {
  items: TransactionEvaluation[];
  limit: number;
  offset: number;
  has_more: boolean;
};

export type EvaluationForm = Omit<
  TransactionInput,
  "amount" | "operation_type" | "cardholder_present" | "card_present" | "transaction_datetime"
> & {
  amount: string;
  transaction_datetime: string;
  cardholder_present: string;
  card_present: string;
};

export function toTransactionInput(form: EvaluationForm): TransactionInput {
  const date = new Date(form.transaction_datetime);
  if (!Number.isFinite(date.getTime())) throw new Error("Ingresá una fecha y hora válidas.");
  return {
    transaction_id: form.transaction_id.trim(),
    user_id: form.user_id.trim(),
    transaction_datetime: date.toISOString(),
    amount: Number(form.amount),
    currency: form.currency.trim().toUpperCase(),
    operation_type: "PURCHASE",
    merchant: form.merchant.trim(),
    country: form.country.trim().toUpperCase(),
    card_country: form.card_country.trim().toUpperCase(),
    cardholder_present: form.cardholder_present === "true",
    card_present: form.card_present === "true",
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : "No se pudo completar la solicitud.";
    throw new Error(message);
  }
  return body as T;
}

export async function getTransactionEvaluations(offset = 0, limit = 10, signal?: AbortSignal): Promise<EvaluationPage> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await fetch(`/api/transaction-evaluations?${query}`, { cache: "no-store", signal });
  return parseResponse<EvaluationPage>(response);
}

export async function createTransactionEvaluation(input: TransactionInput): Promise<EvaluationResult> {
  const response = await fetch("/api/transaction-evaluations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<EvaluationResult>(response);
}
