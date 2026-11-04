import test from "node:test";
import assert from "node:assert/strict";
import { logAiProviderResponse } from "../src/lib/ai/debug-response.ts";
import { createGroqDecisionModel } from "../src/lib/ai/groq.ts";

function setup(t, nodeEnv, enabled) {
  const previous = Object.fromEntries(["NODE_ENV", "AI_DEBUG_RESPONSES", "TEST_SECRET"].map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.NODE_ENV = nodeEnv;
  process.env.AI_DEBUG_RESPONSES = enabled;
  const logs = [];
  t.mock.method(console, "info", line => logs.push(JSON.parse(line)));
  return logs;
}

test("does not log responses unless explicitly enabled in development", async t => {
  const logs = setup(t, "production", "true");
  await logAiProviderResponse(Response.json({ error: "private" }), "test-key");
  process.env.NODE_ENV = "development";
  process.env.AI_DEBUG_RESPONSES = "false";
  await logAiProviderResponse(Response.json({ error: "private" }), "test-key");
  assert.deepEqual(logs, []);
});

test("logs success/error bodies, redacts credentials and leaves the original response readable", async t => {
  const logs = setup(t, "development", "true");
  process.env.TEST_SECRET = "environment-secret";
  const response = Response.json({ error: {
    message: "Unsupported schema keyword: uniqueItems. environment-secret test-key",
    api_key: "arbitrary-secret", authorization: "Bearer another-secret",
  } }, { status: 400, headers: { "secret-header": "never-log-this" } });
  await logAiProviderResponse(response, "test-key");
  assert.equal(logs[0].status, 400);
  assert.match(logs[0].body, /Unsupported schema keyword: uniqueItems/);
  for (const secret of ["environment-secret", "test-key", "arbitrary-secret", "another-secret", "never-log-this"]) {
    assert.ok(!JSON.stringify(logs).includes(secret));
  }
  assert.equal((await response.json()).error.api_key, "arbitrary-secret");
  await logAiProviderResponse(Response.json({ decision: "APPROVED" }), "test-key");
  assert.equal(logs[1].status, 200);
});

test("bounds malformed response logs and does not fail on unreadable responses", async t => {
  const logs = setup(t, "development", "true");
  await logAiProviderResponse(new Response("x".repeat(9_000), { status: 502 }), "test-key");
  assert.equal(logs[0].body.length, 8_000);
  assert.equal(logs[0].truncated, true);
  const consumed = new Response("consumed");
  await consumed.text();
  await assert.doesNotReject(logAiProviderResponse(consumed, "test-key"));
});

test("captures provider rejection before the adapter sanitizes it", async t => {
  const logs = setup(t, "development", "true");
  const model = createGroqDecisionModel({
    apiKey: "test-key", modelId: "test-model",
    fetch: async () => Response.json({ error: { message: "Unsupported response_format" } }, { status: 400 }),
  });
  await assert.rejects(model.decide({ input: "fixture", instructions: "fixture",
    outputSchema: { jsonSchema: { type: "object" }, parse: value => value },
  }), { message: "No se pudo consultar el modelo de IA." });
  assert.equal(logs[0].status, 400);
  assert.match(logs[0].body, /Unsupported response_format/);
});
