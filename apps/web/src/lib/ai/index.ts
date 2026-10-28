import "server-only";
import { createGroqDecisionModel } from "./groq.ts";
import type { DecisionModel } from "./decision-model";

/** Punto de composición: cambiar el proveedor no cambia el contrato del consumidor. */
export function getAiModel(): DecisionModel {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("Falta GROQ_API_KEY en el entorno del servidor.");

  return createGroqDecisionModel({
    apiKey,
    modelId: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
  });
}
