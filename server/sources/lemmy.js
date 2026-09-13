import { fetchJson } from "../http.js";

export async function searchLemmy(instance, term, limit) {
  const url = `https://${instance}/api/v3/search?q=${encodeURIComponent(term)}&type_=Posts&sort=TopAll&limit=${limit}`;
  const data = await fetchJson(url);

  return (data.posts ?? []).map((p) => ({
    id: `lemmy:${instance}:${p.post.id}`,
    source: instance,
    software: "lemmy",
    contentType: "links",
    title: p.post.name,
    text: p.post.body || "",
    author: { name: p.creator?.name || "unknown", url: p.creator?.actor_id },
    url: p.post.ap_id || p.post.url,
    thumbnail: p.post.thumbnail_url ?? null,
    publishedAt: p.post.published,
  }));
}
