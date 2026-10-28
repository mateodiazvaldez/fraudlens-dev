export function parseEvaluationPagination(params: URLSearchParams) {
  const limitValue = params.get("limit") ?? "20";
  const offsetValue = params.get("offset") ?? "0";
  const limit = Number(limitValue);
  const offset = Number(offsetValue);
  if (!/^\d+$/.test(limitValue) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 ||
      !/^\d+$/.test(offsetValue) || !Number.isSafeInteger(offset) || offset < 0) {
    return { success: false as const };
  }
  return { success: true as const, limit, offset };
}
