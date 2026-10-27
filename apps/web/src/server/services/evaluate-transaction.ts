import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { TransactionEvaluation } from "@/server/models/transaction-evaluation";
import type { TransactionInput } from "./transaction-evaluation-input";

export async function evaluateTransaction(input: TransactionInput) {
  await connectDB();
  // CU-01 provisional: no rules engine or AI inference runs here.
  const evaluation = await TransactionEvaluation.create({
    ...input,
    transaction_datetime: new Date(input.transaction_datetime),
    risk_score: 0.6,
    decision: "BLOCK",
    rules_applied: ["block_if_over_50"],
  });
  return {
    transaction_evaluation_id: evaluation._id.toString(),
    transaction_id: evaluation.transaction_id,
    risk_score: evaluation.risk_score,
    decision: evaluation.decision,
    rules_applied: evaluation.rules_applied,
  };
}
