import test from "node:test";
import assert from "node:assert/strict";
import { createTransactionEvaluation, getTransactionEvaluations, toTransactionInput } from "../src/lib/client/transaction-evaluations.ts";

const form = {
  transaction_id: " tx-002 ", user_id: " user-002 ", transaction_datetime: "2026-10-27T12:30",
  amount: "0.001", currency: "ars", merchant: " Comercio ", country: "ar", card_country: "uy",
  cardholder_present: "false", card_present: "false",
};
const input = {
  transaction_id: "tx-002", user_id: "user-002", transaction_datetime: new Date(form.transaction_datetime).toISOString(),
  amount: 0.001, currency: "ARS", operation_type: "PURCHASE", merchant: "Comercio",
  country: "AR", card_country: "UY", cardholder_present: false, card_present: false,
};

test("maps the form to the current contract, keeping card country independent, booleans and small positive amount", () => {
  assert.deepEqual(toTransactionInput(form), input);
});

test("lists with offset pagination and returns has_more unchanged", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const expected = { items: [], limit: 10, offset: 20, has_more: true };
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "/api/transaction-evaluations?limit=10&offset=20");
    assert.equal(options.cache, "no-store");
    return Response.json(expected);
  };
  assert.deepEqual(await getTransactionEvaluations(20, 10), expected);
});

test("posts exact current input and passes current decision reasons and signals through", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const evaluations = ["APPROVED", "REJECTED"];
  for (const decision of evaluations) {
    const expected = { transaction_evaluation_id: "abc123", transaction_id: input.transaction_id, risk_score: 0.2, decision, reasons: ["reason"], signals: ["COUNTRY_MISMATCH"] };
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), "/api/transaction-evaluations");
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), input);
      return Response.json(expected, { status: 201 });
    };
    assert.deepEqual(await createTransactionEvaluation(input), expected);
  }
});

test("keeps legacy BLOCK history readable without recasting it", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const legacy = { ...input, decision: "BLOCK", transaction_evaluation_id: "old", risk_score: 0.8 };
  const expected = { items: [legacy], limit: 10, offset: 0, has_more: false };
  globalThis.fetch = async () => Response.json(expected);
  assert.deepEqual(await getTransactionEvaluations(), expected);
});

test("surfaces API error messages and uses fallback for unreadable error bodies", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => Response.json({ error: "Unable to evaluate transaction" }, { status: 503 });
  await assert.rejects(createTransactionEvaluation(input), { message: "Unable to evaluate transaction" });
  globalThis.fetch = async () => new Response("not-json", { status: 503 });
  await assert.rejects(getTransactionEvaluations(), { message: "No se pudo completar la solicitud." });
});
