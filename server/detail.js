import { fetchNodeinfo } from "./http.js";
import { fetchMastodonDetail } from "./sources/mastodon.js";
import { fetchPeerTubeDetail } from "./sources/peertube.js";
import { fetchLemmyDetail } from "./sources/lemmy.js";
import { fetchPixelfedDetail } from "./sources/pixelfed.js";

const DETAIL_FETCHERS = {
  mastodon: fetchMastodonDetail,
  peertube: fetchPeerTubeDetail,
  lemmy: fetchLemmyDetail,
  pixelfed: fetchPixelfedDetail,
};

const EMPTY_DETAIL = {
  title: null,
  description: "",
  rules: [],
  languages: [],
  registrationsText: null,
  stats: {},
  contact: null,
  version: null,
};

function fromNodeinfo(info) {
  const stats = {};
  if (info.usage?.users?.total != null) stats.Users = info.usage.users.total;
  if (info.usage?.users?.activeMonth != null) stats["Active this month"] = info.usage.users.activeMonth;
  if (info.usage?.localPosts != null) stats.Posts = info.usage.localPosts;

  return {
    ...EMPTY_DETAIL,
    title: info.metadata?.nodeName ?? null,
    description: info.metadata?.nodeDescription ?? "",
    registrationsText: info.openRegistrations === true ? "Open" : info.openRegistrations === false ? "Closed" : null,
    stats,
    version: info.software?.name ? `${info.software.name} ${info.software.version ?? ""}`.trim() : null,
  };
}

// Every software gets its own richer endpoint first (rules, contact,
// registration policy, etc). NodeInfo is the universal fallback when that
// fails or is gated — it covers less ground but works almost everywhere.
// If both fail, we still return a shape the client can render "no details".
export async function fetchInstanceDetail(domain, software) {
  const primary = DETAIL_FETCHERS[software];

  if (primary) {
    try {
      const detail = await primary(domain);
      return { domain, software, ...detail, title: detail.title ?? domain };
    } catch {
      // fall through to nodeinfo
    }
  }

  try {
    const info = await fetchNodeinfo(domain);
    const detail = fromNodeinfo(info);
    return { domain, software, ...detail, title: detail.title ?? domain };
  } catch {
    return { domain, software, ...EMPTY_DETAIL, title: domain, unavailable: true };
  }
}
