export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness de la app. No verifica MongoDB ni ejecuta llamadas de IA.
export function GET() {
  return Response.json(
    { status: "ok", service: "fraudlens" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
