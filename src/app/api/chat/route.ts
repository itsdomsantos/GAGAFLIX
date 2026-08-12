import { buildSystemInstruction } from "@/lib/bot";
import { invalidateModel, resolveModel } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface IncomingMessage {
  role?: string;
  text?: string;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

function endpoint(model: string, key: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return new Response("GEMINI_API_KEY not configured on the server.", { status: 500 });
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m): m is Required<IncomingMessage> =>
      typeof m?.text === "string" && m.text.trim().length > 0,
  );
  if (messages.length === 0) {
    return new Response("No messages provided.", { status: 400 });
  }

  const systemInstruction = await buildSystemInstruction();
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: messages.map((m) => ({
      role: m.role === "model" || m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    })),
    // Non-streaming: pedimos a resposta completa de uma vez. Mais fiável que o
    // SSE (que cortava a meio). maxOutputTokens folgado para não truncar.
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
  });

  const call = (model: string) =>
    fetch(endpoint(model, key), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });

  let model = await resolveModel(key);
  if (!model) {
    return new Response("No Gemini model available for this API key.", { status: 502 });
  }
  let res = await call(model);
  if (res.status === 404 && !process.env.GEMINI_MODEL) {
    invalidateModel();
    const fresh = await resolveModel(key, true);
    if (fresh && fresh !== model) {
      model = fresh;
      res = await call(model);
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return new Response(`Gemini error (${res.status}): ${detail.slice(0, 300)}`, { status: 502 });
  }

  const data = (await res.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

  if (!text.trim()) {
    const reason = candidate?.finishReason ?? data.promptFeedback?.blockReason ?? "empty response";
    return new Response(`⚠️ No answer (${reason}). Try rephrasing, Little Monster. 🐾`, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(text, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
