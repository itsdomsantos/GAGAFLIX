/**
 * Starts and lists the automation workflows on GitHub Actions, so the admin
 * can run them with a button. Needs a fine-grained GitHub token with
 * "Actions: read and write" on this repository, stored in Vercel as
 * GITHUB_DISPATCH_TOKEN (server-only). See README → "A tua parte".
 */
const REPO = process.env.GITHUB_REPO || "itsdomsantos/GAGAFLIX";
const API = `https://api.github.com/repos/${REPO}/actions`;

export const AUTOMATIONS = {
  catalog: { workflow: "catalog-robot.yml", label: "Find new videos" },
  news: { workflow: "instagram-autopilot.yml", label: "Instagram · news", slot: "news" },
  extra: { workflow: "instagram-autopilot.yml", label: "Instagram · extra", slot: "extra" },
  reel: { workflow: "instagram-autopilot.yml", label: "Instagram · site reel", slot: "reel" },
} as const;

export type AutomationKey = keyof typeof AUTOMATIONS;

export const hasGithubToken = () => Boolean(process.env.GITHUB_DISPATCH_TOKEN?.trim());

function headers() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${process.env.GITHUB_DISPATCH_TOKEN?.trim()}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "gagaflix-admin",
  };
}

export async function dispatch(key: AutomationKey, test: boolean): Promise<void> {
  const a = AUTOMATIONS[key];
  const inputs = "slot" in a ? { slot: a.slot, dry_run: test } : undefined;
  const res = await fetch(`${API}/workflows/${a.workflow}/dispatches`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ref: "main", ...(inputs ? { inputs } : {}) }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`GitHub ${res.status}: ${body.message ?? "dispatch failed"}`);
  }
}

export interface RunSummary {
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

/** The latest runs of the two automation workflows, newest first. */
export async function recentRuns(): Promise<RunSummary[]> {
  const files = ["catalog-robot.yml", "instagram-autopilot.yml"];
  const lists = await Promise.all(
    files.map(async (f) => {
      const res = await fetch(`${API}/workflows/${f}/runs?per_page=8`, { headers: headers(), cache: "no-store" });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        workflow_runs: {
          id: number;
          name: string;
          display_title: string;
          event: string;
          status: string;
          conclusion: string | null;
          html_url: string;
          created_at: string;
        }[];
      };
      return json.workflow_runs.map((r) => ({
        id: r.id,
        workflow: f,
        name: r.name,
        title: r.display_title,
        event: r.event,
        status: r.status,
        conclusion: r.conclusion,
        url: r.html_url,
        createdAt: r.created_at,
      }));
    }),
  );
  return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
}
