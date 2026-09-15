import { fetchJson } from "../http.js";

const REGISTRATION_MODE_TEXT = {
  Open: "Open",
  RequireApplication: "Open (application required)",
  Closed: "Closed",
};

const MAX_DESCRIPTION_LENGTH = 500;

// Lemmy's `sidebar` is markdown meant for a full page — often full of badge
// images, donation links, and headings. Strip that noise before it's used
// as a fallback "about" blurb (the short `description` field is preferred
// when present).
function cleanMarkdown(md) {
  if (!md) return "";
  const text = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // image/badge embeds
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/^#{1,6}\s*/gm, "") // heading markers
    .replace(/[*_`]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return text.length > MAX_DESCRIPTION_LENGTH ? `${text.slice(0, MAX_DESCRIPTION_LENGTH).trim()}…` : text;
}

export async function fetchLemmyDetail(domain) {
  const d = await fetchJson(`https://${domain}/api/v3/site`);
  const site = d.site_view?.site;
  const counts = d.site_view?.counts ?? {};

  const stats = {};
  if (counts.users != null) stats.Users = counts.users;
  if (counts.posts != null) stats.Posts = counts.posts;
  if (counts.comments != null) stats.Comments = counts.comments;
  if (counts.communities != null) stats.Communities = counts.communities;

  return {
    title: site?.name ?? domain,
    description: site?.description?.trim() || cleanMarkdown(site?.sidebar),
    rules: [],
    languages: [],
    registrationsText: REGISTRATION_MODE_TEXT[d.site_view?.local_site?.registration_mode] ?? null,
    stats,
    contact: null,
    version: d.version ?? null,
  };
}

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
