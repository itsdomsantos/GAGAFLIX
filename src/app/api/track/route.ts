import { NextResponse } from "next/server";
import { getServerClient, hasSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Records one privacy-friendly page view. Called by the client on every
 * navigation. The visitor's country comes from Vercel's edge geo header
 * (x-vercel-ip-country) — no IP is ever read or stored, no third parties.
 */
export async function POST(request: Request) {
  if (!hasSupabase) return NextResponse.json({ ok: false }, { status: 200 });

  let body: { path?: string; referrer?: string | null; visitor_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }

  const path = (body.path ?? "").trim();
  if (!path || path.length > 512) {
    return NextResponse.json({ ok: false, error: "bad path" }, { status: 400 });
  }

  // Vercel injects the ISO country code at the edge (e.g. "PT", "US").
  // "XX" / "T1" mean unknown (e.g. Tor) — normalise those to null.
  const raw = request.headers.get("x-vercel-ip-country");
  const country = raw && /^[A-Z]{2}$/.test(raw) && raw !== "XX" ? raw : null;

  try {
    await getServerClient()
      .from("page_views")
      .insert({
        path,
        referrer: body.referrer?.slice(0, 255) ?? null,
        visitor_id: body.visitor_id?.slice(0, 64) ?? null,
        country,
      });
  } catch {
    // Analytics must never surface an error to the visitor.
  }

  return NextResponse.json({ ok: true });
}
