import { listGenerateModels, preferModel } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico: que modelos Gemini a chave tem disponíveis, e qual escolheríamos.
 * Abre /api/models no browser para ver. Não expõe a chave.
 */
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ ok: false, error: "GEMINI_API_KEY not configured." }, { status: 500 });
  }
  const models = await listGenerateModels(key);
  return Response.json({
    ok: true,
    count: models.length,
    picked: preferModel(models),
    override: process.env.GEMINI_MODEL ?? null,
    models,
  });
}
