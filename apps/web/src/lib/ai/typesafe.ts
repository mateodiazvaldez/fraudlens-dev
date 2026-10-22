import "server-only";
import { createTypeSafeAi } from "@ai-sdk/typesafe-ai";

/** Configuración diferida: no consume API ni requiere secretos al compilar. */
export function getDecisionModel() {
  const apiKey = process.env.TYPESAFE_AI_API_KEY;
  if (!apiKey) throw new Error("Falta TYPESAFE_AI_API_KEY en el entorno del servidor.");
  const provider = createTypeSafeAi({ apiKey });
  return provider.decisionModel(process.env.TYPESAFE_AI_MODEL || "jev-latest");
}
