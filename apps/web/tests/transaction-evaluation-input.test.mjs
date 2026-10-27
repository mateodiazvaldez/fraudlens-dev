import test from "node:test";
import assert from "node:assert/strict";
import { validateTransactionInput } from "../src/server/services/transaction-evaluation-input.ts";

const valid = {
  transaction_id: "tx-001", user_id: "user-001",
  transaction_datetime: "2026-10-27T12:30:00-03:00",
  amount: 25, currency: "ARS", operation_type: "PURCHASE",
  merchant: "Example merchant", country: "AR",
  cardholder_present: false, card_present: false,
};

test("accepts false booleans and copies only declared fields", () => {
  assert.deepEqual(validateTransactionInput({ ...valid, risk_score: 0, decision: "ALLOW" }), { success: true, data: valid });
});
test("rejects missing required fields", () => {
  const result = validateTransactionInput({});
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(result.errors).sort(), Object.keys(valid).sort());
});
test("rejects non-object bodies", () => {
  for (const value of [null, [], "transaction", 1]) assert.equal(validateTransactionInput(value).success, false);
});
test("rejects invalid values without coercing strings or numbers", () => {
  for (const [field, values] of Object.entries({
    amount: [0, -1, "25", NaN, Infinity],
    currency: ["ars", "AR", null], country: ["arg", "ARG", "ar"],
    operation_type: ["TRANSFER", "purchase"],
    card_present: ["false", 0, null], cardholder_present: ["true", 1],
    transaction_id: ["", "  ", 1], user_id: ["", null], merchant: ["  ", {}],
    transaction_datetime: ["2026-02-30T12:00:00Z", "2026-10-27", "2026-10-27T12:00:00", "invalid"],
  })) {
    for (const value of values) {
      const result = validateTransactionInput({ ...valid, [field]: value });
      assert.equal(result.success, false, `${field}: ${value}`);
      assert.ok(result.errors[field]);
    }
  }
});
