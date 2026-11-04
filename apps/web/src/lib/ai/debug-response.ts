import "server-only";

/** Depuración local explícita. No registrar headers ni el request al proveedor. */
export async function logAiProviderResponse(response: Response, apiKey: string): Promise<void> {
  if (process.env.NODE_ENV !== "development" || process.env.AI_DEBUG_RESPONSES !== "true") return;
  try {
    const secrets = [apiKey, ...Object.entries(process.env)
      .filter(([key]) => /KEY|TOKEN|SECRET|PASSWORD|MONGODB_URI/i.test(key))
      .map(([, value]) => value)]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    const redactText = (text: string) => {
      for (const secret of secrets) text = text.replaceAll(secret, "[REDACTED]");
      return text.replace(/Bearer\s+[^\s"\\]+/gi, "Bearer [REDACTED]")
        .replace(/gsk_[A-Za-z0-9]+/g, "[REDACTED]");
    };
    const raw = await response.clone().text();
    let body: string;
    try {
      body = JSON.stringify(JSON.parse(raw), (key, value: unknown) => {
        if (/api[-_]?key|authorization|cookie|password|secret|access[-_]?token|refresh[-_]?token|mongodb[-_]?uri/i.test(key)) return "[REDACTED]";
        return typeof value === "string" ? redactText(value) : value;
      });
    } catch {
      body = redactText(raw);
    }
    console.info(JSON.stringify({
      level: "debug", timestamp: new Date().toISOString(), event: "ai_provider_response",
      provider: "groq", status: response.status, body: body.slice(0, 8_000), truncated: body.length > 8_000,
    }));
  } catch {
    // Una falla del diagnóstico no debe alterar el resultado de la inferencia.
  }
}
