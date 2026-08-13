"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getBrowserClient, hasSupabase } from "@/lib/supabase";

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
 * Logs one privacy-friendly page view per navigation into Supabase.
 * No cookies, no third parties — just path, referrer host and an anonymous id.
 * The admin panel is never tracked.
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!hasSupabase || !pathname) return;
    if (pathname.startsWith("/admin")) return;

    // Fire-and-forget; a failed insert must never disturb the visitor.
    getBrowserClient()
      .from("page_views")
      .insert({
        path: pathname,
        referrer: referrerHost(),
        visitor_id: getVisitorId(),
      })
      .then(() => {}, () => {});
  }, [pathname]);

  return null;
}
