import "server-only";

/** Esquema y validación propiedad del consumidor, sin tipos de un proveedor. */
export interface DecisionOutputSchema<T> {
  jsonSchema: Record<string, unknown>;
  parse(value: unknown): T;
}

export interface DecisionRequest<T> {
  input: string;
  instructions: string;
  outputSchema: DecisionOutputSchema<T>;
}

/** Puerto de inferencia estructurada; no define decisiones ni reglas antifraude. */
export interface DecisionModel {
  decide<T>(request: DecisionRequest<T>): Promise<T>;
}
