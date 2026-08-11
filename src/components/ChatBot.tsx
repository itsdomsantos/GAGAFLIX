"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "model";
  text: string;
}

const GREETING =
  "Paws up, Little Monster! 🐾 Ask me anything about Gaga — eras, performances, trivia — or ask me to recommend a video from GAGAFLIX. ✨";

const SUGGESTIONS = [
  "What was Coachella 2025?",
  "Recommend an iconic music video",
  "Chromatica era trivia",
];

/** Torna clicáveis os /watch/<id> e links markdown que o bot devolve. */
function renderText(text: string) {
  const parts: React.ReactNode[] = [];
  const regex =
    /\[([^\]]+)\]\((\/watch\/[\w-]+)\)|(\/watch\/[\w-]+)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const href = m[2] ?? m[3];
    const label = m[1] ?? m[3];
    parts.push(
      <Link key={key++} href={href} className="text-accent underline underline-offset-2">
        {label}
      </Link>,
    );
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function ChatBot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (pathname.startsWith("/admin")) return null;

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    const history: Msg[] = [...messages, { role: "user", text: clean }];
    setMessages([...history, { role: "model", text: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "model", text: acc };
          return copy;
        });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "model",
          text: `⚠️ ${detail ? detail.slice(0, 300) : "Something went wrong. Try again in a moment."} 🐾`,
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Bola flutuante */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-[0_0_28px_-4px_var(--accent)] transition-transform hover:scale-105 md:bottom-6 md:right-6"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>

      {/* Painel do chat */}
      {open && (
        <div className="fixed bottom-36 right-4 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl sm:right-6 sm:w-96 md:bottom-24">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
              ✨
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg leading-none chrome-text">GAGAFLIX</p>
              <p className="text-[11px] text-muted">your Little Monster assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="ml-auto text-muted transition-colors hover:text-text"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <Bubble role="model">{GREETING}</Bubble>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-text"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.role === "model" && m.text === "" ? (
                  <span className="inline-flex gap-1">
                    <Dot /> <Dot /> <Dot />
                  </span>
                ) : (
                  renderText(m.text)
                )}
              </Bubble>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Mother Monster…"
              className="min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-4 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-black transition-transform hover:scale-105 disabled:opacity-40"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12l16-8-6 8 6 8-16-8Z" fill="currentColor" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: "user" | "model"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-accent text-black"
            : "rounded-bl-sm bg-surface-2 text-text"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-duration:0.9s]" />;
}
