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

// Misskey's API and Mobilizon's GraphQL endpoint are both POST-only, even
// for anonymous reads.
export async function postJson(url, body, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "User-Agent": "myFediverse-atlas/0.1 (local exploration tool)",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

// NodeInfo (nodeinfo.diaspora.software) is the closest thing to a
// cross-software "about this instance" endpoint — most ActivityPub servers
// advertise it at a well-known path regardless of what dedicated API they
// otherwise expose. Used as a last-resort fallback when a server's own
// instance-info endpoint is missing, gated, or shaped differently than expected.
export async function fetchNodeinfo(domain) {
  const discovery = await fetchJson(`https://${domain}/.well-known/nodeinfo`);
  const links = discovery.links ?? [];
  const link = links[links.length - 1]?.href ?? links[0]?.href;
  if (!link) throw new Error("No nodeinfo link advertised");
  return fetchJson(link);
}
