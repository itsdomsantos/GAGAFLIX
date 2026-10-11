/**
 * Autopilot memory + image hosting, both in the free Supabase project:
 *  - what was already posted → site_settings, key "instagram_autopilot"
 *  - rendered images/videos  → public Storage bucket "social"
 * Without Supabase secrets (local test runs) the memory lives in out/social/state.json.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { ROOT } from "../lib.mjs";

const KEY = "instagram_autopilot";
const LOCAL = join(ROOT, "out/social/state.json");
const EMPTY = { posted: {}, rotation: 0, eraIndex: 0, lastWeekly: null, lastPost: null };

export async function loadState(db) {
  if (db) {
    const { data, error } = await db.from("site_settings").select("value").eq("key", KEY).maybeSingle();
    if (error) throw new Error(`site_settings: ${error.message}`);
    return { ...EMPTY, ...(data?.value ?? {}) };
  }
  return existsSync(LOCAL) ? { ...EMPTY, ...JSON.parse(readFileSync(LOCAL, "utf8")) } : { ...EMPTY };
}

export async function saveState(db, state) {
  // Forget entries older than 400 days (anniversaries are keyed by year, so nothing repeats).
  const cutoff = Date.now() - 400 * 864e5;
  state.posted = Object.fromEntries(Object.entries(state.posted).filter(([, at]) => new Date(at).getTime() > cutoff));
  if (db) {
    const { error } = await db.from("site_settings").upsert({ key: KEY, value: state });
    if (error) throw new Error(`saving state: ${error.message}`);
    return;
  }
  mkdirSync(dirname(LOCAL), { recursive: true });
  writeFileSync(LOCAL, JSON.stringify(state, null, 2));
}

/** Upload a file to the public "social" bucket and return its public URL (Instagram downloads from it). */
export async function hostFile(db, path, folder) {
  const name = `${folder}/${basename(path)}`;
  const contentType = path.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
  const { error } = await db.storage.from("social").upload(name, readFileSync(path), { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed (${name}): ${error.message} — did you run supabase/automation.sql?`);
  return db.storage.from("social").getPublicUrl(name).data.publicUrl;
}
