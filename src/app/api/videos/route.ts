import { NextResponse } from "next/server";
import { getEras, getVideos } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Alimenta a pesquisa instantânea no cliente. */
export async function GET() {
  const [videos, eras] = await Promise.all([getVideos(), getEras()]);
  return NextResponse.json({ videos, eras });
}
