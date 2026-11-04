import "server-only";
import { TransactionEvaluation } from "../models/transaction-evaluation.ts";
import { HISTORY_LIMIT, type HistoricalTransaction } from "../services/assess-transaction-risk.ts";
import type { TransactionInput } from "../services/transaction-evaluation-input";

export async function loadApprovedTransactionHistory(input: TransactionInput): Promise<HistoricalTransaction[]> {
  const documents = await TransactionEvaluation.find({
    user_id: input.user_id,
    decision: "APPROVED",
    transaction_id: { $ne: input.transaction_id },
    transaction_datetime: { $lt: new Date(input.transaction_datetime) },
  })
    .sort({ transaction_datetime: -1, _id: -1 })
    .limit(HISTORY_LIMIT)
    .select("transaction_datetime amount currency merchant country -_id")
    .lean()
    .exec();
  return documents.map(item => ({
    transaction_datetime: item.transaction_datetime.toISOString(),
    amount: item.amount, currency: item.currency, merchant: item.merchant, country: item.country,
  }));
}
