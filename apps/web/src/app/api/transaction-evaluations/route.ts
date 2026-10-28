import { parseEvaluationPagination } from "@/server/services/evaluation-pagination";
import { listTransactionEvaluations } from "@/server/services/list-transaction-evaluations";
import { evaluateTransaction } from "@/server/services/evaluate-transaction";
import { validateTransactionInput } from "@/server/services/transaction-evaluation-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const result = validateTransactionInput(body);
  if (!result.success) {
    return Response.json({ error: "Invalid transaction", fields: result.errors }, { status: 400 });
  }
  try {
    const evaluation = await evaluateTransaction(result.data);
    return Response.json(evaluation, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not expose database errors or transaction data.
    return Response.json({ error: "Unable to persist transaction evaluation" }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const pagination = parseEvaluationPagination(new URL(request.url).searchParams);
  if (!pagination.success) {
    return Response.json({ error: "limit must be an integer from 1 to 100; offset must be a non-negative safe integer" }, { status: 400 });
  }
  try {
    const page = await listTransactionEvaluations(pagination.limit, pagination.offset);
    return Response.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Unable to retrieve transaction evaluations" }, { status: 503 });
  }
}
