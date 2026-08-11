import { buildSystemInstruction } from "@/lib/bot";
import { invalidateModel, resolveModel } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface IncomingMessage {
  role?: string;
  text?: string;
}

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function endpoint(model: string, key: string) {
  return (
    `https://generativelanguage.googleapis.com/v1beta/models/${model}` +
    `:streamGenerateContent?alt=sse&key=${key}`
  );
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
    generationConfig: { temperature: 0.8, maxOutputTokens: 800 },
  });

  const call = (model: string) =>
    fetch(endpoint(model, key), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });

  // Modelo: override/cache/auto-descoberta. Se der 404 (modelo retirado),
  // redescobre uma vez e tenta de novo.
  let model = await resolveModel(key);
  if (!model) {
    return new Response("No Gemini model available for this API key.", { status: 502 });
  }
  let geminiRes = await call(model);
  if (geminiRes.status === 404 && !process.env.GEMINI_MODEL) {
    invalidateModel();
    const fresh = await resolveModel(key, true);
    if (fresh && fresh !== model) {
      model = fresh;
      geminiRes = await call(model);
    }
  }

  if (!geminiRes.ok || !geminiRes.body) {
    const detail = await geminiRes.text().catch(() => "");
    return new Response(`Gemini error (${geminiRes.status}): ${detail.slice(0, 300)}`, {
      status: 502,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = geminiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as GeminiChunk;
              const text =
                json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // chunk parcial — junta no próximo read
            }
          }
        }
      } catch {
        controller.enqueue(encoder.encode("\n\n⚠️ A ligação foi interrompida."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
