export async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "myFediverse-atlas/0.1 (local exploration tool)" },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const ENTITY_MAP = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };

export function stripHtml(html) {
  if (!html) return "";
  return html
    // block/line boundaries become a space; everything else (mostly inline
    // <span>/<a> wrappers around a single run of text, e.g. Mastodon's
    // split-for-display long URLs) is removed with NO space, or adjacent
    // spans get glued into one broken word
    .replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ENTITY_MAP[e])
    .replace(/\s+/g, " ")
    .trim();
}
