import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

import type { TransactionInput } from "@/server/services/transaction-evaluation-input";

type TransactionEvaluationDocument = Omit<TransactionInput, "transaction_datetime"> & {
  transaction_datetime: Date;
  risk_score: number;
  decision: "BLOCK";
  rules_applied: string[];
  created_at: Date;
  updated_at: Date;
};

const transactionEvaluationSchema = new Schema<TransactionEvaluationDocument>({
  transaction_id: { type: String, required: true },
  user_id: { type: String, required: true },
  transaction_datetime: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  operation_type: { type: String, enum: ["PURCHASE"], required: true },
  merchant: { type: String, required: true },
  country: { type: String, required: true },
  cardholder_present: { type: Boolean, required: true },
  card_present: { type: Boolean, required: true },
  risk_score: { type: Number, required: true, min: 0, max: 1 },
  decision: { type: String, enum: ["BLOCK"], required: true },
  rules_applied: { type: [String], required: true },
}, { collection: "transaction_evaluations", timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

transactionEvaluationSchema.index({ created_at: -1, _id: -1 });

export const TransactionEvaluation: Model<TransactionEvaluationDocument> =
  (mongoose.models.TransactionEvaluation as Model<TransactionEvaluationDocument> | undefined) ??
  mongoose.model<TransactionEvaluationDocument>("TransactionEvaluation", transactionEvaluationSchema);
