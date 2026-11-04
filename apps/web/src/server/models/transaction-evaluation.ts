import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

import type { TransactionInput } from "@/server/services/transaction-evaluation-input";
import type { RiskAssessment } from "../services/assess-transaction-risk";

export type TransactionEvaluationDocument = Omit<TransactionInput, "transaction_datetime"> & RiskAssessment & {
  transaction_datetime: Date;
  rules_applied: string[];
  model_id: string;
  assessment_version: string;
  history_count: number;
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
  card_country: { type: String, required: true },
  cardholder_present: { type: Boolean, required: true },
  card_present: { type: Boolean, required: true },
  risk_score: { type: Number, required: true, min: 0, max: 1 },
  decision: { type: String, enum: ["APPROVED", "REJECTED"], required: true },
  reasons: { type: [String], required: true },
  signals: { type: [String], enum: ["UNUSUAL_AMOUNT", "UNUSUAL_MERCHANT", "COUNTRY_MISMATCH", "INSUFFICIENT_HISTORY"], required: true },
  rules_applied: { type: [String], required: true },
  model_id: { type: String, required: true },
  assessment_version: { type: String, required: true },
  history_count: { type: Number, required: true, min: 0 },
}, { collection: "transaction_evaluations", timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

transactionEvaluationSchema.index({ created_at: -1, _id: -1 });
transactionEvaluationSchema.index({ user_id: 1, decision: 1, transaction_datetime: -1, _id: -1 });

export const TransactionEvaluation: Model<TransactionEvaluationDocument> =
  (mongoose.models.TransactionEvaluation as Model<TransactionEvaluationDocument> | undefined) ??
  mongoose.model<TransactionEvaluationDocument>("TransactionEvaluation", transactionEvaluationSchema);
