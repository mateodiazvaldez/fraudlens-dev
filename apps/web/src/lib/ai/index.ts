import "server-only";
import { createGroqDecisionModel } from "./groq.ts";
import type { DecisionModel } from "./decision-model";
import { OperationalError } from "../server-errors.ts";

export function getAiModelId(): string {
  return process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
}

/** Punto de composición: cambiar el proveedor no cambia el contrato del consumidor. */
export function getAiModel(): DecisionModel {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new OperationalError("AI_CONFIGURATION_MISSING", "Falta GROQ_API_KEY en el entorno del servidor.");

  return createGroqDecisionModel({
    apiKey,
    modelId: getAiModelId(),
  });
}
