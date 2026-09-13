import { fetchJson, stripHtml } from "../http.js";

export async function searchMastodon(instance, term, limit) {
  const hashtag = term.trim().replace(/^#/, "").replace(/\s+/g, "");
  if (!hashtag) return [];

  const url = `https://${instance}/api/v1/timelines/tag/${encodeURIComponent(hashtag)}?limit=${limit}`;
  const statuses = await fetchJson(url);

  return statuses.map((s) => ({
    id: `mastodon:${instance}:${s.id}`,
    source: instance,
    software: "mastodon",
    contentType: "posts",
    title: stripHtml(s.content).slice(0, 140),
    text: stripHtml(s.content),
    author: { name: s.account?.display_name || s.account?.acct || "unknown", url: s.account?.url },
    url: s.url || s.uri,
    thumbnail: s.media_attachments?.[0]?.preview_url ?? null,
    publishedAt: s.created_at,
  }));
}
