import { fetchJson } from "../http.js";

export async function fetchPeerTubeDetail(domain) {
  const d = await fetchJson(`https://${domain}/api/v1/config`);

  let registrationsText = null;
  if (d.signup?.allowed != null) {
    registrationsText = d.signup.allowed
      ? d.signup.requiresEmailVerification
        ? "Open (email verification required)"
        : "Open"
      : "Closed";
  }

  return {
    title: d.instance?.name ?? domain,
    description: (d.instance?.description || d.instance?.shortDescription || "").trim(),
    rules: [],
    languages: [],
    registrationsText,
    stats: {},
    contact: null,
    version: d.serverVersion ?? null,
  };
}

export async function searchPeerTube(instance, term, limit) {
  const url = `https://${instance}/api/v1/search/videos?search=${encodeURIComponent(term)}&count=${limit}`;
  const data = await fetchJson(url);

  return (data.data ?? []).map((v) => ({
    id: `peertube:${instance}:${v.uuid}`,
    source: instance,
    software: "peertube",
    contentType: "video",
    title: v.name,
    text: v.description || v.truncatedDescription || "",
    author: {
      name: v.channel?.displayName || v.account?.displayName || "unknown",
      url: v.channel?.url || v.account?.url,
    },
    url: v.url,
    thumbnail: v.thumbnailPath ? `https://${instance}${v.thumbnailPath}` : null,
    publishedAt: v.publishedAt,
  }));
}
