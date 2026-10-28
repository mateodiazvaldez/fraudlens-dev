import test from "node:test";
import assert from "node:assert/strict";
import { parseEvaluationPagination } from "../src/server/services/evaluation-pagination.ts";

test("pagination defaults to 20 results starting at zero", () => {
  assert.deepEqual(parseEvaluationPagination(new URLSearchParams()), { success: true, limit: 20, offset: 0 });
});
test("pagination accepts boundaries", () => {
  assert.deepEqual(parseEvaluationPagination(new URLSearchParams("limit=100&offset=10")), { success: true, limit: 100, offset: 10 });
});
test("pagination rejects malformed and unsafe values", () => {
  for (const query of ["limit=0", "limit=101", "limit=-1", "limit=1.5", "limit=", "limit=abc", "offset=-1", "offset=1.5", "offset=", "offset=9007199254740992"]) {
    assert.equal(parseEvaluationPagination(new URLSearchParams(query)).success, false, query);
  }
});
