import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTransaction } from "../src/server/services/evaluate-transaction.ts";
import { createGroqDecisionModel } from "../src/lib/ai/groq.ts";
import { OperationalError, logServerError } from "../src/lib/server-errors.ts";

test("logs each failing evaluation stage once without leaking error or transaction data", async t => {
  const logs = [];
  t.mock.method(console, "error", line => logs.push(JSON.parse(line)));
  const secret = "PRIVATE-TRANSACTION-AND-KEY";
  const input = {
    transaction_id: secret, user_id: secret, transaction_datetime: "2026-11-04T12:00:00Z",
    amount: 1, currency: "ARS", operation_type: "PURCHASE", merchant: secret,
    country: "AR", card_country: "AR", cardholder_present: false, card_present: false,
  };
  const assessment = { decision: "APPROVED", risk_score: 0.1, reasons: [secret], signals: ["INSUFFICIENT_HISTORY"] };
  const base = {
    getModel: () => ({ modelId: "test", model: { decide: async () => assessment } }),
    connect: async () => {}, loadHistory: async () => [], save: async () => ({ _id: "id" }),
  };
  const fail = () => { throw new Error(secret); };
  for (const [stage, overrides] of [
    ["configuration", { getModel: () => { throw new OperationalError("AI_CONFIGURATION_MISSING", secret); } }],
    ["database_connection", { connect: fail }],
    ["history_read", { loadHistory: fail }],
    ["inference", { getModel: () => ({ modelId: "test", model: { decide: fail } }) }],
    ["persistence", { save: fail }],
  ]) {
    const before = logs.length;
    await assert.rejects(evaluateTransaction(input, { ...base, ...overrides }));
    assert.equal(logs.length, before + 1);
    assert.equal(logs.at(-1).stage, stage);
    assert.equal(logs.at(-1).event, "transaction_evaluation_failed");
  }
  assert.equal(logs[0].code, "AI_CONFIGURATION_MISSING");
  await evaluateTransaction(input, base);
  assert.equal(logs.length, 5, "success must not produce an error log");
  assert.ok(!JSON.stringify(logs).includes(secret));
});

test("retains safe provider status and known codes while removing upstream bodies and causes", async t => {
  const logs = [];
  t.mock.method(console, "error", line => logs.push(JSON.parse(line)));
  for (const upstreamCode of ["json_validate_failed", "PRIVATE-UPSTREAM-CODE"]) {
    const model = createGroqDecisionModel({ apiKey: "PRIVATE-API-KEY", modelId: "test", fetch: async () =>
      Response.json({ error: { message: "PRIVATE-UPSTREAM-BODY", code: upstreamCode } }, { status: 400 }),
    });
    await assert.rejects(model.decide({
      input: "PRIVATE-PROMPT", instructions: "PRIVATE-INSTRUCTIONS",
      outputSchema: { jsonSchema: { type: "object" }, parse: value => value },
    }), error => {
      assert.equal(error.code, "AI_PROVIDER_ERROR");
      assert.equal(error.providerStatus, 400);
      assert.equal(error.cause, undefined);
      logServerError("transaction_evaluation_failed", "inference", error);
      return true;
    });
  }
  assert.equal(logs[0].provider_code, "json_validate_failed");
  assert.equal(logs[1].provider_code, undefined);
  assert.ok(!JSON.stringify(logs).includes("PRIVATE"));
});

test("classifies database availability errors without printing their messages", t => {
  const logs = [];
  t.mock.method(console, "error", line => logs.push(JSON.parse(line)));
  const error = new Error("mongodb://PRIVATE-CREDENTIALS");
  error.name = "MongoServerSelectionError";
  logServerError("transaction_history_failed", "history_list", error);
  assert.equal(logs[0].code, "DATABASE_UNAVAILABLE");
  assert.ok(!JSON.stringify(logs).includes("PRIVATE"));
});
