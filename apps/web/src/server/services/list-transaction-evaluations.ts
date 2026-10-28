import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { TransactionEvaluation } from "@/server/models/transaction-evaluation";

export async function listTransactionEvaluations(limit: number, offset: number) {
  await connectDB();
  const documents = await TransactionEvaluation.find({})
    .sort({ created_at: -1, _id: -1 })
    .skip(offset)
    .limit(limit + 1)
    .select("-__v")
    .lean()
    .exec();
  return {
    items: documents.slice(0, limit).map(({ _id, ...evaluation }) => ({
      transaction_evaluation_id: _id.toString(),
      ...evaluation,
    })),
    limit,
    offset,
    has_more: documents.length > limit,
  };
}
