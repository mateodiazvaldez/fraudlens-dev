import "server-only";
import { createGroq } from "@ai-sdk/groq";
import { generateText, jsonSchema, NoObjectGeneratedError, Output } from "ai";
import type { DecisionModel, DecisionRequest } from "./decision-model";

interface GroqDecisionModelOptions {
  apiKey: string;
  modelId: string;
  fetch?: typeof globalThis.fetch;
}

/** Crear el adapter no envía solicitudes. El transporte es inyectable para pruebas. */
export function createGroqDecisionModel(options: GroqDecisionModelOptions): DecisionModel {
  const provider = createGroq({ apiKey: options.apiKey, fetch: options.fetch });
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
          throw new Error("El modelo no devolvió una respuesta válida.");
        }
        throw new Error("No se pudo consultar el modelo de IA.");
      }
    },
  };
}
