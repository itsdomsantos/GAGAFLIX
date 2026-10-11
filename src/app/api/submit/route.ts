import { NextResponse } from "next/server";
import { suggestType } from "@/lib/classify";
import { getVideos } from "@/lib/data";
import { parseSource, youtubeId } from "@/lib/player";
import { getServerClient, hasSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface Body {
  url?: string;
  title?: string;
  thumbnail?: string;
  author?: string;
  note?: string;
  name?: string;
  /** Honeypot: a field humans never see. Bots fill it. */
  website?: string;
  /** When the form was opened (ms) — real people take more than a couple of seconds. */
  openedAt?: number;
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/**
 * Fan suggestions from /submit → public.video_inbox (status "pending").
 * Uses the anon key: the RLS policy in supabase/automation.sql only lets
 * anonymous visitors insert pending fan rows, nothing else. Anti-spam is a
 * honeypot field + a minimum fill time (free, no captcha).
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Bots: pretend everything went fine so they don't retry, but store nothing.
  const tooFast = typeof body.openedAt !== "number" || !body.openedAt || Date.now() - body.openedAt < 3000;
  if (body.website || tooFast) return NextResponse.json({ ok: true });

  const url = clip(body.url, 500);
  if (!/^https?:\/\/\S+\.\S+/i.test(url)) {
    return NextResponse.json({ ok: false, error: "Paste a full link (https://…)." }, { status: 400 });
  }
  if (!hasSupabase) {
    return NextResponse.json(
      { ok: false, error: "Suggestions are not open yet — check back soon!" },
      { status: 503 },
    );
  }

  const ytId = youtubeId(url);
  const videos = await getVideos();
  const already = videos.find((v) => v.url.trim() === url || (ytId && youtubeId(v.url) === ytId));
  if (already) {
    return NextResponse.json({ ok: true, existing: `/watch/${already.id}` });
  }

  const title = clip(body.title, 200);
  const { error } = await getServerClient()
    .from("video_inbox")
    .insert({
      url,
      source_id: ytId,
      title,
      thumbnail_url: /^https:\/\//.test(body.thumbnail ?? "") ? clip(body.thumbnail, 500) : null,
      channel_name: clip(body.author, 120) || parseSource(url).kind,
      origin: "fan",
      status: "pending",
      suggested_type: title ? suggestType(title) : null,
      note: clip(body.note, 500) || null,
      submitted_by: clip(body.name, 60) || null,
    });

  // 23505 = unique violation: someone (or the robot) already suggested it. Fine.
  if (error && error.code !== "23505") {
    console.error("[submit]", error.message);
    return NextResponse.json({ ok: false, error: "Couldn't save that — try again later." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, duplicate: error?.code === "23505" });
}
