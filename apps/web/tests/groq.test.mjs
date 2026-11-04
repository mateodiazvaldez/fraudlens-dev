import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createGroqDecisionModel } from "../src/lib/ai/groq.ts";
import { getAiModel } from "../src/lib/ai/index.ts";

const outputSchema = {
  jsonSchema: {
    type: "object",
    properties: { value: { type: "string" } },
    required: ["value"],
    additionalProperties: false,
  },
  parse(value) {
    if (!value || typeof value.value !== "string") throw new Error("Private validation details");
    return { value: value.value };
  },
};
const request = { input: "Synthetic fixture", instructions: "Return the fixture as JSON.", outputSchema };

function completion(content) {
  return Response.json({
    id: "test-completion", object: "chat.completion", created: 0,
    model: "openai/gpt-oss-20b",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  });
}

function createModel(fetch) {
  return createGroqDecisionModel({ apiKey: "test-key", modelId: "openai/gpt-oss-20b", fetch });
}

test("uses the real Groq SDK with mocked HTTP and returns validated provider-neutral output", async () => {
  const calls = [];
  const model = createModel(async (url, init) => {
    calls.push({ url: String(url), init });
    return completion('{"value":"fixture"}');
  });
  assert.equal(calls.length, 0, "construction must not invoke inference");
  assert.deepEqual(await model.decide(request), { value: "fixture" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer test-key");
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, "openai/gpt-oss-20b");
  assert.deepEqual(body.messages, [
    { role: "system", content: request.instructions },
    { role: "user", content: request.input },
  ]);
  assert.equal(body.response_format.type, "json_schema");
  assert.deepEqual(body.response_format.json_schema.schema, outputSchema.jsonSchema);
});

test("model selection is configurable without changing the application contract", async () => {
  let body;
  const model = createGroqDecisionModel({
    apiKey: "test-key", modelId: "alternative-model",
    fetch: async (_url, init) => {
      body = JSON.parse(init.body);
      return completion('{"value":"fixture"}');
    },
  });
  assert.deepEqual(await model.decide(request), { value: "fixture" });
  assert.equal(body.model, "alternative-model");
});

test("rejects malformed or schema-invalid output without exposing provider content", async () => {
  for (const content of ["private-not-json", '{"value":42}', "null"]) {
    let calls = 0;
    const model = createModel(async () => { calls++; return completion(content); });
    await assert.rejects(model.decide(request), (error) => {
      assert.equal(error.message, "El modelo no devolvió una respuesta válida.");
      assert.equal(error.cause, undefined);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("provider errors are sanitized and are not retried or replaced with fabricated decisions", async () => {
  let calls = 0;
  const model = createModel(async () => {
    calls++;
    return Response.json({ error: { message: "private request and key", type: "rate_limit_exceeded" } }, { status: 429 });
  });
  await assert.rejects(model.decide(request), { message: "No se pudo consultar el modelo de IA." });
  assert.equal(calls, 1);
});

test("requires server configuration lazily and honors the default and configured model", async (t) => {
  const bodies = [];
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return completion('{"value":"fixture"}');
  });
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  t.after(() => {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = previousModel;
  });
  delete process.env.GROQ_API_KEY;
  assert.throws(() => getAiModel(), { message: "Falta GROQ_API_KEY en el entorno del servidor." });
  process.env.GROQ_API_KEY = "  ";
  assert.throws(() => getAiModel(), { message: "Falta GROQ_API_KEY en el entorno del servidor." });
  process.env.GROQ_API_KEY = "test-key";
  delete process.env.GROQ_MODEL;
  const model = getAiModel();
  assert.equal(bodies.length, 0);
  assert.deepEqual(await model.decide(request), { value: "fixture" });
  assert.equal(bodies[0].model, "openai/gpt-oss-20b");
  process.env.GROQ_MODEL = "configured-model";
  assert.deepEqual(await getAiModel().decide(request), { value: "fixture" });
  assert.equal(bodies[1].model, "configured-model");
});

test("preserves the existing lazy TypeSafe configuration", async (t) => {
  const { getDecisionModel } = await import("../src/lib/ai/typesafe.ts");
  const previousKey = process.env.TYPESAFE_AI_API_KEY;
  const previousModel = process.env.TYPESAFE_AI_MODEL;
  t.after(() => {
    if (previousKey === undefined) delete process.env.TYPESAFE_AI_API_KEY;
    else process.env.TYPESAFE_AI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.TYPESAFE_AI_MODEL;
    else process.env.TYPESAFE_AI_MODEL = previousModel;
  });
  delete process.env.TYPESAFE_AI_API_KEY;
  assert.throws(() => getDecisionModel(), { message: "Falta TYPESAFE_AI_API_KEY en el entorno del servidor." });
  process.env.TYPESAFE_AI_API_KEY = "test-key";
  delete process.env.TYPESAFE_AI_MODEL;
  assert.equal(getDecisionModel().modelId, "jev-latest");
  process.env.TYPESAFE_AI_MODEL = "custom-jev";
  assert.equal(getDecisionModel().modelId, "custom-jev");
});

test("AI modules remain server-only outside the react-server condition", () => {
  for (const path of ["../src/lib/ai/index.ts", "../src/lib/ai/groq.ts"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `import(${JSON.stringify(new URL(path, import.meta.url).href)})`], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /cannot be imported from a Client Component module/);
  }
});
