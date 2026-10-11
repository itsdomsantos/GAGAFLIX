/**
 * Instagram Content Publishing API (free). Same setup as The Vice City News:
 * a professional Instagram account linked to a Facebook Page, a never-expiring
 * Page token ("EAA…") and the Instagram user id — both as GitHub secrets.
 *  - Facebook Login / Page tokens ("EAA…") → graph.facebook.com
 *  - Instagram Login tokens ("IG…")        → graph.instagram.com
 * Flow for every format: create a media container → wait until FINISHED → media_publish.
 */
const VERSION = process.env.IG_API_VERSION || "v23.0";
const host = () =>
  process.env.IG_API_HOST?.trim() ||
  (process.env.INSTAGRAM_ACCESS_TOKEN?.trim().startsWith("IG") ? "graph.instagram.com" : "graph.facebook.com");
const base = () => `https://${host()}/${VERSION}`;

function creds() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const user = process.env.INSTAGRAM_USER_ID?.trim();
  if (!token || !user) throw new Error("INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID are not set");
  return { token, user };
}

async function call(method, path, params = {}) {
  const { token } = creds();
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${base()}${path}?${body}` : `${base()}${path}`;
  const res = await fetch(url, method === "GET" ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Instagram ${path}: ${json.error?.message || res.status}`);
  return json;
}

async function waitReady(id, { tries = 40, every = 6000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const { status_code } = await call("GET", `/${id}`, { fields: "status_code" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`Instagram container ${id} ${status_code}`);
    await new Promise((r) => setTimeout(r, every));
  }
  throw new Error(`Instagram container ${id} not ready in time`);
}

async function publish(creationId) {
  const { user } = creds();
  // Instagram sometimes reports FINISHED a moment before it can publish — retry.
  for (let attempt = 1; ; attempt++) {
    try {
      const { id } = await call("POST", `/${user}/media_publish`, { creation_id: creationId });
      return id;
    } catch (err) {
      if (attempt >= 6 || !/not available|not ready|try again/i.test(err.message)) throw err;
      console.warn(`  publish not ready yet (${err.message}) — retry ${attempt}/5`);
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
}

export async function postImage(imageUrl, caption) {
  const { user } = creds();
  const { id } = await call("POST", `/${user}/media`, { image_url: imageUrl, caption });
  await waitReady(id, { every: 2000 });
  return publish(id);
}

export async function postCarousel(imageUrls, caption) {
  const { user } = creds();
  const children = [];
  for (const url of imageUrls.slice(0, 10)) {
    const { id } = await call("POST", `/${user}/media`, { image_url: url, is_carousel_item: "true" });
    children.push(id);
  }
  for (const id of children) await waitReady(id, { every: 2000 });
  const { id } = await call("POST", `/${user}/media`, { media_type: "CAROUSEL", children: children.join(","), caption });
  await waitReady(id, { every: 3000 });
  return publish(id);
}

export async function postReel(videoUrl, caption, coverUrl) {
  const { user } = creds();
  const params = { media_type: "REELS", video_url: videoUrl, caption, share_to_feed: "true" };
  if (coverUrl) params.cover_url = coverUrl;
  const { id } = await call("POST", `/${user}/media`, params);
  await waitReady(id);
  return publish(id);
}

export const instagramConfigured = () =>
  Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim() && process.env.INSTAGRAM_USER_ID?.trim());
