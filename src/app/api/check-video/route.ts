import { NextResponse } from "next/server";
import { classifyVideo } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Read-only link check for a single video URL. Safe to call from the browser
 * (the admin "Check links now" button uses it); it never touches the database.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) return NextResponse.json({ status: "unknown" }, { status: 400 });
  const status = await classifyVideo(url);
  return NextResponse.json({ status });
}
