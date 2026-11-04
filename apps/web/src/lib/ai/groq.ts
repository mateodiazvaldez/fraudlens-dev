import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { APICallError, generateText, jsonSchema, NoObjectGeneratedError, Output } from "ai";
import type { DecisionModel, DecisionRequest } from "./decision-model";
import { OperationalError } from "../server-errors.ts";
import { logAiProviderResponse } from "./debug-response.ts";

function safeProviderCode(body: string | undefined): string | undefined {
  if (!body) return;
  try {
    const code: unknown = JSON.parse(body)?.error?.code;
    // Lista cerrada: nunca copiar textos arbitrarios del proveedor al log.
    const allowed = ["json_validate_failed", "model_decommissioned", "model_not_found", "invalid_api_key",
      "rate_limit_exceeded", "insufficient_quota", "context_length_exceeded", "invalid_json_schema", "unsupported_response_format"];
    return allowed.find(known => known === code);
  } catch {
    return;
  }
}

interface GroqDecisionModelOptions {
  apiKey: string;
  modelId: string;
  fetch?: typeof globalThis.fetch;
}

/** Crear el adapter no envía solicitudes. El transporte es inyectable para pruebas. */
export function createGroqDecisionModel(options: GroqDecisionModelOptions): DecisionModel {
  const provider = createGroq({
    apiKey: options.apiKey,
    fetch: async (input, init) => {
      const response = await (options.fetch ?? globalThis.fetch)(input, init);
      // Capturar también los errores HTTP y las respuestas que el SDK no puede parsear.
      await logAiProviderResponse(response, options.apiKey);
      return response;
    },
  });
  const model = provider(options.modelId);

  return {
    async decide<T>(request: DecisionRequest<T>): Promise<T> {
      try {
        const result = await generateText({
          model,
          system: request.instructions,
          prompt: request.input,
          output: Output.object({
            schema: jsonSchema<T>(request.outputSchema.jsonSchema, {
              validate: (value) => {
                try {
                  return { success: true, value: request.outputSchema.parse(value) };
                } catch {
                  return { success: false, error: new Error("Respuesta fuera del esquema solicitado.") };
                }
              },
            }),
          }),
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(30_000),
        });
        return result.output;
      } catch (error) {
        // No propagar cuerpos, prompts, headers ni detalles del proveedor.
        if (NoObjectGeneratedError.isInstance(error)) {
          throw new OperationalError("AI_INVALID_OUTPUT", "El modelo no devolvió una respuesta válida.");
        }
        if (APICallError.isInstance(error)) {
          throw new OperationalError("AI_PROVIDER_ERROR", "No se pudo consultar el modelo de IA.", error.statusCode, safeProviderCode(error.responseBody));
        }
        const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
        throw new OperationalError(timeout ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR", "No se pudo consultar el modelo de IA.");
      }
    },
  };
}
