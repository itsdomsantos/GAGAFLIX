import { getBrowserClient } from "./supabase";

export type AutomationAction = "catalog" | "news" | "extra" | "reel" | "trailer";

/** Calls /api/admin/automation with the admin's session token. */
export async function automationApi(method: "GET" | "POST", body?: { action: AutomationAction; test: boolean }) {
  const { data } = await getBrowserClient().auth.getSession();
  const res = await fetch("/api/admin/automation", {
    method,
    headers: {
      authorization: `Bearer ${data.session?.access_token ?? ""}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return res.json() as Promise<{ ok: boolean; error?: string; runs?: Run[] }>;
}

export interface Run {
  id: number;
  workflow: string;
  name: string;
  title: string;
  event: string;
  status: string;
  conclusion: string | null;
  url: string;
  createdAt: string;
}
