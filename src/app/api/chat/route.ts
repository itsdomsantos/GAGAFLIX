import { buildSystemInstruction } from "@/lib/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Modelo configurável por env — se um dia for descontinuado, troca-se
// GEMINI_MODEL na Vercel sem mexer no código nem fazer novo commit.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

interface IncomingMessage {
  role?: string;
  text?: string;
}

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
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
    (m): m is Required<IncomingMessage> => typeof m?.text === "string" && m.text.trim().length > 0,
  );
  if (messages.length === 0) {
    return new Response("No messages provided.", { status: 400 });
  }

  const systemInstruction = await buildSystemInstruction();

  const contents = messages.map((m) => ({
    role: m.role === "model" || m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}` +
    `:streamGenerateContent?alt=sse&key=${key}`;

  const geminiRes = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 800 },
    }),
  });

  if (!geminiRes.ok || !geminiRes.body) {
    const detail = await geminiRes.text().catch(() => "");
    return new Response(`Gemini error (${geminiRes.status}): ${detail.slice(0, 300)}`, {
      status: 502,
    });
  }

  // Converte o SSE do Gemini (data: {json}) num stream de texto simples.
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
                json.candidates?.[0]?.content?.parts
                  ?.map((p) => p.text ?? "")
                  .join("") ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // chunk parcial — ignora, junta no próximo read
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
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
