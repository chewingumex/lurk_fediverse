import { fetchJson, stripHtml } from "../http.js";

function registrationsText(enabled, approvalRequired) {
  if (enabled == null) return null;
  if (!enabled) return "Closed";
  return approvalRequired ? "Open (approval required)" : "Open";
}

export async function fetchMastodonDetail(domain) {
  try {
    const d = await fetchJson(`https://${domain}/api/v2/instance`);
    const stats = {};
    if (d.usage?.users?.active_month != null) stats["Active this month"] = d.usage.users.active_month;
    return {
      title: d.title ?? domain,
      description: stripHtml(d.description ?? ""),
      rules: (d.rules ?? []).map((r) => r.text).filter(Boolean),
      languages: d.languages ?? [],
      registrationsText: registrationsText(d.registrations?.enabled, d.registrations?.approval_required),
      stats,
      contact: d.contact?.email ?? d.contact?.account?.acct ?? null,
      version: d.version ?? null,
    };
  } catch {
    // v2/instance is 4.0+; older Mastodon (and some forks) only have v1.
    const d = await fetchJson(`https://${domain}/api/v1/instance`);
    const stats = {};
    if (d.stats?.user_count != null) stats.Users = d.stats.user_count;
    if (d.stats?.status_count != null) stats.Posts = d.stats.status_count;
    if (d.stats?.domain_count != null) stats["Known instances"] = d.stats.domain_count;
    return {
      title: d.title ?? domain,
      description: stripHtml(d.description ?? ""),
      rules: [],
      languages: d.languages ?? [],
      registrationsText: registrationsText(d.registrations, d.approval_required),
      stats,
      contact: d.email ?? d.contact_account?.acct ?? null,
      version: d.version ?? null,
    };
  }
}

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
