import { postJson, stripHtml } from "../http.js";

export async function fetchMisskeyDetail(domain) {
  const d = await postJson(`https://${domain}/api/meta`, {});

  return {
    title: d.name ?? domain,
    description: stripHtml(d.description ?? ""),
    rules: [],
    languages: d.langs ?? [],
    registrationsText: d.disableRegistration == null ? null : d.disableRegistration ? "Closed" : "Open",
    stats: {},
    contact: d.maintainerEmail ?? null,
    version: d.version ?? null,
  };
}

export async function searchMisskey(instance, term, limit) {
  const hashtag = term.trim().replace(/^#/, "").replace(/\s+/g, "");
  if (!hashtag) return [];

  const notes = await postJson(`https://${instance}/api/notes/search-by-tag`, { tag: hashtag, limit });

  return notes.map((n) => {
    const host = n.user?.host ?? instance;
    return {
      id: `misskey:${instance}:${n.id}`,
      source: instance,
      software: "misskey",
      contentType: "posts",
      title: (n.text ?? "").slice(0, 140),
      text: n.text ?? "",
      author: {
        name: n.user?.name || n.user?.username || "unknown",
        url: n.user?.username ? `https://${host}/@${n.user.username}` : null,
      },
      url: n.url || n.uri || `https://${instance}/notes/${n.id}`,
      thumbnail: n.files?.[0]?.url ?? null,
      publishedAt: n.createdAt,
    };
  });
}
