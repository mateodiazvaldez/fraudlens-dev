import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Opt-in separado: esta prueba usa el modelo configurado en el servidor y puede consumir cuota.
const baseUrl = process.env.TEST_BASE_URL;
const enabled = baseUrl && process.env.TEST_AI_EVALUATIONS === "1";

test("POST persists AI results and GET lists and paginates evaluations", { skip: !enabled }, async () => {
  const transaction = {
    transaction_id: `integration-${randomUUID()}`, user_id: "integration-user",
    transaction_datetime: "2026-10-27T12:30:00-03:00", amount: 25, currency: "ARS",
    operation_type: "PURCHASE", merchant: "Integration test", country: "AR", card_country: "AR",
    cardholder_present: false, card_present: false,
  };
  const response = await fetch(`${baseUrl}/api/transaction-evaluations`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(transaction),
  });
  assert.equal(response.status, 201);
  const created = await response.json();
  assert.match(created.transaction_evaluation_id, /^[a-f0-9]{24}$/);
  const listing = await fetch(`${baseUrl}/api/transaction-evaluations?limit=1`);
  assert.equal(listing.status, 200);
  assert.match(listing.headers.get("cache-control"), /no-store/);
  const page = await listing.json();
  assert.equal(page.limit, 1);
  assert.equal(page.offset, 0);
  assert.equal(page.items.length, 1);
  const saved = page.items[0];
  assert.equal(saved.transaction_evaluation_id, created.transaction_evaluation_id);
  for (const [key, value] of Object.entries(transaction)) {
    if (key !== "transaction_datetime") assert.deepEqual(saved[key], value);
  }
  assert.equal(saved.transaction_datetime, "2026-10-27T15:30:00.000Z");
  assert.ok(["APPROVED", "REJECTED"].includes(created.decision));
  assert.ok(created.risk_score >= 0 && created.risk_score <= 1);
  assert.ok(created.reasons.length > 0);
  for (const key of ["risk_score", "decision", "reasons", "signals", "model_id", "assessment_version", "history_count", "rules_applied"]) {
    assert.deepEqual(saved[key], created[key]);
  }
  assert.deepEqual(saved.rules_applied, []);
  assert.ok(saved.created_at && saved.updated_at);
  assert.ok(!("_id" in saved) && !("__v" in saved));
  const next = await (await fetch(`${baseUrl}/api/transaction-evaluations?limit=1&offset=1`)).json();
  assert.equal(next.offset, 1);
  assert.equal(page.has_more, next.items.length > 0);
  if (next.items.length) assert.notEqual(next.items[0].transaction_evaluation_id, saved.transaction_evaluation_id);
  const empty = await (await fetch(`${baseUrl}/api/transaction-evaluations?offset=1000000`)).json();
  assert.deepEqual(empty.items, []);
  assert.equal(empty.has_more, false);
  assert.equal((await fetch(`${baseUrl}/api/transaction-evaluations?limit=101`)).status, 400);
});

test("HTTP history isolation, rejected exclusion, cold start, card country and provider failure", {
  skip: !enabled || process.env.TEST_GROQ_FIXTURE !== "1",
}, async () => {
  const user = `history-${randomUUID()}`;
  const post = async (transaction_id, user_id, transaction_datetime, merchant = "Fixture approved", extra = {}) => {
    const response = await fetch(`${baseUrl}/api/transaction-evaluations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transaction_id, user_id, transaction_datetime, amount: 100, currency: "ARS", operation_type: "PURCHASE",
        merchant, country: "AR", card_country: "AR", cardholder_present: false, card_present: false, ...extra,
      }),
    });
    return { response, result: await response.json() };
  };
  const first = await post("first", user, "2026-11-01T12:00:00Z");
  assert.equal(first.response.status, 201);
  assert.equal(first.result.decision, "APPROVED");
  assert.equal(first.result.history_count, 0);
  assert.ok(first.result.signals.includes("INSUFFICIENT_HISTORY"));
  const rejected = await post("rejected", user, "2026-11-02T12:00:00Z", "Fixture rejected");
  assert.equal(rejected.result.decision, "REJECTED");
  assert.equal(rejected.result.history_count, 1);
  const other = await post("other-user", `${user}-other`, "2026-11-03T12:00:00Z");
  assert.equal(other.result.history_count, 0);
  const foreign = await post("foreign", user, "2026-11-04T12:00:00Z", "Fixture approved", { country: "BR" });
  assert.equal(foreign.result.history_count, 1, "rejected and other-user records must not become context");
  assert.deepEqual(foreign.result.signals, ["COUNTRY_MISMATCH"]);
  assert.deepEqual(foreign.result.reasons, ["Antecedentes recibidos: 1."]);
  const repeated = await post("first", user, "2026-11-01T12:00:00Z");
  assert.equal(repeated.result.history_count, 0, "same ID and future history must be excluded");
  const failedId = `failed-${randomUUID()}`;
  const failed = await post(failedId, user, "2026-11-05T12:00:00Z", "Fixture unavailable");
  assert.equal(failed.response.status, 503);
  assert.deepEqual(failed.result, { error: "Unable to evaluate transaction" });
  const page = await (await fetch(`${baseUrl}/api/transaction-evaluations?limit=100`)).json();
  assert.ok(!page.items.some(item => item.transaction_id === failedId), "failure must not persist a success");
  const invalid = await post("invalid", user, "2026-11-05T12:00:00Z", "Fixture approved", { card_country: null });
  assert.equal(invalid.response.status, 400);
});
