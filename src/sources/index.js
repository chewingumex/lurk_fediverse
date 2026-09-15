import { fetchMastodon } from "./mastodon.js";
import { fetchPeerTube } from "./peertube.js";
import {
  fetchLemmy,
  fetchPixelfed,
  fetchPleroma,
  fetchFriendica,
  fetchMisskey,
  fetchMobilizon,
} from "./observer.js";

const CACHE_KEY = "fediverse-atlas-cache-v2";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — directory data doesn't move fast

const SOURCES = [
  { name: "mastodon", fetch: fetchMastodon },
  { name: "peertube", fetch: fetchPeerTube },
  { name: "lemmy", fetch: fetchLemmy },
  { name: "pixelfed", fetch: fetchPixelfed },
  { name: "pleroma", fetch: fetchPleroma },
  { name: "friendica", fetch: fetchFriendica },
  { name: "misskey", fetch: fetchMisskey },
  { name: "mobilizon", fetch: fetchMobilizon },
];

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // storage full/unavailable — fine to skip caching
  }
}

export async function fetchAllSources({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }

  const results = await Promise.allSettled(SOURCES.map((s) => s.fetch()));

  const instances = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") instances.push(...r.value);
    else errors.push({ source: SOURCES[i].name, message: r.reason?.message ?? String(r.reason) });
  });

  const payload = { instances, errors, fetchedAt: Date.now() };
  writeCache(payload);
  return payload;
}
