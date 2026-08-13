"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { hasSupabase } from "@/lib/supabase";

const VISITOR_KEY = "gagaflix_visitor";

/** Random, anonymous id kept in the browser to tell returning visitors apart. */
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/** Only keep the referrer's hostname — no query strings, no personal data. */
function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname;
    // Ignore internal navigation (referrer is our own site).
    if (host === location.hostname) return null;
    return host;
  } catch {
    return null;
  }
}

/**
 * Logs one privacy-friendly page view per navigation via /api/track.
 * No cookies, no third parties — just path, referrer host, an anonymous id
 * and the visitor's country (resolved server-side from Vercel's geo header).
 * The admin panel is never tracked.
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!hasSupabase || !pathname) return;
    if (pathname.startsWith("/admin")) return;

    // Fire-and-forget; a failed request must never disturb the visitor.
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: referrerHost(),
        visitor_id: getVisitorId(),
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
