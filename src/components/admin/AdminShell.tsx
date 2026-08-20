"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserClient, hasSupabase } from "@/lib/supabase";

export const inputCls =
  "w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent";
export const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-wider text-muted";
export const btnCls =
  "inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.03] disabled:opacity-50";
export const btnGhostCls =
  "inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm transition-colors hover:border-accent";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/movies", label: "Movies" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/eras", label: "Eras" },
  { href: "/admin/tours", label: "Tours" },
  { href: "/admin/timeline", label: "Timeline" },
  { href: "/admin/stats", label: "Stats" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/alerts", label: "Alerts" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!hasSupabase) {
      setChecking(false);
      return;
    }
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!hasSupabase) return <SetupCard />;
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Checking session…
      </div>
    );
  }
  if (!session) return <LoginCard />;

  return (
    <div className="min-h-screen">
      <div className="border-b border-line bg-surface/60 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="font-display text-2xl chrome-text">
            GAGAFLIX
          </Link>
          <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            Admin
          </span>
          <nav className="flex items-center gap-4 text-sm">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={pathname === n.href ? "text-text" : "text-muted hover:text-text"}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => getBrowserClient().auth.signOut()}
            className="ml-auto text-sm text-muted transition-colors hover:text-accent"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}

function SetupCard() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded-lg border border-line bg-surface p-8">
        <h1 className="font-display text-3xl chrome-text">Admin not connected yet</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The panel needs Supabase to work. Follow the checklist in{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">README.md</code> (the
          “Your part” section): create the Supabase project, run{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">supabase/schema.sql</code> and
          set the two variables{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          Meanwhile, the public site keeps running on the starter content.
        </p>
      </div>
    </div>
  );
}

function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getBrowserClient().auth.signInWithPassword({ email, password });
    if (error) setError("Sign in failed — check your email and password.");
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border border-line bg-surface p-8">
        <h1 className="font-display text-3xl chrome-text">Admin sign in</h1>
        <div className="mt-6">
          <label htmlFor="email" className={labelCls}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="password" className={labelCls}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="mt-4 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={busy} className={`${btnCls} mt-6 w-full justify-center`}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
