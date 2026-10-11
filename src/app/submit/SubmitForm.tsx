"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Preview {
  url: string;
  title: string | null;
  thumbnail: string | null;
  author: string | null;
}

type Result = { kind: "ok" | "dup" | "error"; text: string; href?: string };

const field =
  "w-full rounded-md border border-line bg-surface-2 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-era";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted";

export default function SubmitForm() {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  // When the visitor first touched the form: bots submit instantly.
  const openedAt = useRef(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Show the title + thumbnail as soon as a valid link is pasted.
  useEffect(() => {
    const u = url.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(u)) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/oembed?url=${encodeURIComponent(u)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setPreview({ url: u, title: d.title ?? null, thumbnail: d.thumbnail ?? null, author: d.author ?? null }))
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [url]);

  // Only show a preview that belongs to the link currently in the box.
  const shown = preview && preview.url === url.trim() ? preview : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          note,
          name,
          website,
          openedAt: openedAt.current,
          title: shown?.title,
          thumbnail: shown?.thumbnail,
          author: shown?.author,
        }),
      });
      const data = await res.json();
      if (!data.ok) setResult({ kind: "error", text: data.error ?? "Something went wrong." });
      else if (data.existing)
        setResult({ kind: "dup", text: "Good taste — it's already on GAGAFLIX!", href: data.existing });
      else {
        setResult({
          kind: "ok",
          text: data.duplicate
            ? "Someone already suggested this one — it's in the queue. Thank you!"
            : "Thank you, Little Monster! Your suggestion is in the queue. 🐾",
        });
        setUrl("");
        setNote("");
      }
    } catch {
      setResult({ kind: "error", text: "Network error — try again." });
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      onFocus={() => {
        if (!openedAt.current) openedAt.current = Date.now();
      }}
      className="mt-10 space-y-5"
    >
      <div>
        <label htmlFor="url" className={label}>
          Video link
        </label>
        <input
          id="url"
          type="url"
          required
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={field}
        />
      </div>

      {shown && (shown.title || shown.thumbnail) && (
        <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-3">
          {shown.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown.thumbnail} alt="" className="aspect-video w-32 rounded object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{shown.title ?? "Untitled link"}</p>
            {shown.author && <p className="text-xs text-muted">{shown.author}</p>}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="note" className={label}>
          What is it? <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="note"
          rows={3}
          maxLength={500}
          placeholder="e.g. Full Monster Ball show, Paris 2010 — pro-shot"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={field}
        />
      </div>

      <div>
        <label htmlFor="name" className={label}>
          Your name or @ <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="name"
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
      </div>

      {/* Honeypot — hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md bg-era px-6 py-3 font-semibold text-black transition-transform hover:scale-105 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send suggestion"}
      </button>

      {result && (
        <p
          role="status"
          className={`rounded-md border p-3 text-sm ${
            result.kind === "error" ? "border-accent/50 bg-accent/10" : "border-line bg-surface"
          }`}
        >
          {result.text}{" "}
          {result.href && (
            <Link href={result.href} className="underline">
              Watch it →
            </Link>
          )}
        </p>
      )}

      <p className="pt-4 text-xs text-muted">
        GAGAFLIX is a non-profit fan site: we never host videos, every one plays from its original
        platform.
      </p>
    </form>
  );
}
