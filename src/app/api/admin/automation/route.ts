import { NextResponse } from "next/server";
import { AUTOMATIONS, dispatch, hasGithubToken, recentRuns, type AutomationKey } from "@/lib/github";
import { getServerClient, hasSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Only you: the request must carry the access token of a logged-in /admin session. */
async function isAdmin(request: Request): Promise<boolean> {
  if (!hasSupabase) return false;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await getServerClient().auth.getUser(token);
  return !error && Boolean(data.user);
}

const notConfigured = () =>
  NextResponse.json(
    { ok: false, error: "GITHUB_DISPATCH_TOKEN is not set in Vercel yet — see README → “A tua parte”, step 10." },
    { status: 503 },
  );

/** Latest runs of the catalogue robot and the Instagram autopilot. */
export async function GET(request: Request) {
  if (!(await isAdmin(request))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasGithubToken()) return notConfigured();
  return NextResponse.json({ ok: true, runs: await recentRuns() });
}

/** Start one: { action: "catalog" | "news" | "extra" | "reel", test?: boolean } */
export async function POST(request: Request) {
  if (!(await isAdmin(request))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasGithubToken()) return notConfigured();
  const body = (await request.json().catch(() => ({}))) as { action?: string; test?: boolean };
  if (!body.action || !(body.action in AUTOMATIONS)) {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }
  try {
    await dispatch(body.action as AutomationKey, Boolean(body.test));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
