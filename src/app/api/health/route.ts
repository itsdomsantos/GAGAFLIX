import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyVideo } from "@/lib/health";
import { supabaseUrl } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Row {
  id: string;
  url: string;
  unavailable_since: string | null;
}

/**
 * Scheduled link checker (Vercel Cron). Walks every video, and:
 *  - flags newly-gone links (404/401) as unavailable → hidden from the public
 *    site, surfaced on /admin/alerts;
 *  - clears the flag if a previously-flagged link is live again.
 * It NEVER deletes anything — removal is a manual click in /admin/alerts.
 *
 * Writes need a service-role key (RLS bypass), so this runs only with
 * SUPABASE_SERVICE_ROLE_KEY set, and is gated by CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("videos")
    .select("id, url, unavailable_since");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data as Row[]) ?? [];
  const now = new Date().toISOString();
  let flagged = 0;
  let cleared = 0;

  for (const v of rows) {
    const status = await classifyVideo(v.url);

    if (status === "removed" || status === "unplayable") {
      if (!v.unavailable_since) {
        await admin
          .from("videos")
          .update({ unavailable_since: now, unavailable_reason: status, last_checked: now })
          .eq("id", v.id);
        flagged++;
      } else {
        await admin.from("videos").update({ last_checked: now }).eq("id", v.id);
      }
    } else if (status === "live") {
      if (v.unavailable_since) {
        await admin
          .from("videos")
          .update({ unavailable_since: null, unavailable_reason: null, last_checked: now })
          .eq("id", v.id);
        cleared++;
      } else {
        await admin.from("videos").update({ last_checked: now }).eq("id", v.id);
      }
    } else {
      // unknown — leave the flag as-is, just record the check.
      await admin.from("videos").update({ last_checked: now }).eq("id", v.id);
    }
  }

  return NextResponse.json({ ok: true, checked: rows.length, flagged, cleared });
}
