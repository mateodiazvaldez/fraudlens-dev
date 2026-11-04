import "server-only";
import { connectDB } from "../../lib/db/mongoose.ts";
import { getAiModel, getAiModelId } from "../../lib/ai/index.ts";
import type { DecisionModel } from "../../lib/ai/decision-model";
import { TransactionEvaluation, type TransactionEvaluationDocument } from "../models/transaction-evaluation.ts";
import { loadApprovedTransactionHistory } from "../repositories/approved-transaction-history.ts";
import { assessTransactionRisk, ASSESSMENT_VERSION, type HistoricalTransaction } from "./assess-transaction-risk.ts";
import type { TransactionInput } from "./transaction-evaluation-input";
import { logServerError, type ErrorStage } from "../../lib/server-errors.ts";

type EvaluationToSave = Omit<TransactionEvaluationDocument, "created_at" | "updated_at">;
type EvaluationDependencies = {
  connect(): Promise<unknown>;
  getModel(): { model: DecisionModel; modelId: string };
  loadHistory(input: TransactionInput): Promise<HistoricalTransaction[]>;
  save(evaluation: EvaluationToSave): Promise<{ _id: { toString(): string } }>;
};

const dependencies: EvaluationDependencies = {
  connect: connectDB,
  getModel: () => ({ model: getAiModel(), modelId: getAiModelId() }),
  loadHistory: loadApprovedTransactionHistory,
  save: evaluation => TransactionEvaluation.create(evaluation),
};

export async function evaluateTransaction(input: TransactionInput, deps = dependencies) {
  let stage: ErrorStage = "configuration";
  try {
    const { model, modelId } = deps.getModel();
    stage = "database_connection";
    await deps.connect();
    stage = "history_read";
    const history = await deps.loadHistory(input);
    stage = "inference";
    const assessment = await assessTransactionRisk(input, history, model);
    const result = {
      ...assessment,
      rules_applied: [] as string[],
      model_id: modelId,
      assessment_version: ASSESSMENT_VERSION,
      history_count: history.length,
    };
    stage = "persistence";
    const evaluation = await deps.save({
      ...input,
      transaction_datetime: new Date(input.transaction_datetime),
      ...result,
    });
    return {
      transaction_evaluation_id: evaluation._id.toString(),
      transaction_id: input.transaction_id,
      ...result,
    };
  } catch (error) {
    logServerError("transaction_evaluation_failed", stage, error);
    throw error;
  }
}
