// Solo para el servidor de integración: cargar explícitamente con NODE_OPTIONS=--import=...
// No se importa desde producción ni reemplaza getAiModel(). El SDK y la DB son reales.
if (process.env.GROQ_API_KEY !== "fraudlens-test-only-key") {
  throw new Error("The Groq transport fixture requires the dedicated test key");
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (resource, options) => {
  const url = String(resource instanceof Request ? resource.url : resource);
  if (!url.startsWith("https://api.groq.com/")) return originalFetch(resource, options);
  const request = JSON.parse(options.body);
  const context = JSON.parse(request.messages.find(message => message.role === "user").content);
  if (context.transaction.merchant === "Fixture unavailable") {
    return Response.json({ error: { message: "Private upstream failure" } }, { status: 503 });
  }
  const signals = [];
  if (!context.approved_history.length) signals.push("INSUFFICIENT_HISTORY");
  if (context.transaction.country !== context.transaction.card_country) signals.push("COUNTRY_MISMATCH");
  const rejected = context.transaction.merchant === "Fixture rejected";
  const assessment = {
    decision: rejected ? "REJECTED" : "APPROVED",
    risk_score: rejected ? 0.8 : 0.1,
    reasons: [`Antecedentes recibidos: ${context.approved_history.length}.`],
    signals,
  };
  return Response.json({
    id: "integration-fixture", object: "chat.completion", created: 0, model: request.model,
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(assessment) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });
};
