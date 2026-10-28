import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.TEST_BASE_URL;

test("POST persists results and GET lists and paginates evaluations", { skip: !baseUrl }, async () => {
  const transaction = {
    transaction_id: `integration-${randomUUID()}`, user_id: "integration-user",
    transaction_datetime: "2026-10-27T12:30:00-03:00", amount: 25, currency: "ARS",
    operation_type: "PURCHASE", merchant: "Integration test", country: "AR",
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
  assert.equal(saved.risk_score, 0.6);
  assert.equal(saved.decision, "BLOCK");
  assert.deepEqual(saved.rules_applied, ["block_if_over_50"]);
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
