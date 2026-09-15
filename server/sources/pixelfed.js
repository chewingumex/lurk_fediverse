import { fetchJson, stripHtml } from "../http.js";

// Pixelfed exposes a Mastodon-compatible v1 instance endpoint, but some
// instances lock it behind auth (see src/views/search.js) — callers should
// fall back to NodeInfo when this throws.
export async function fetchPixelfedDetail(domain) {
  const d = await fetchJson(`https://${domain}/api/v1/instance`);

  let registrationsText = null;
  if (d.registrations != null) {
    registrationsText = d.registrations ? (d.approval_required ? "Open (approval required)" : "Open") : "Closed";
  }

  const stats = {};
  if (d.stats?.user_count != null) stats.Users = d.stats.user_count;
  if (d.stats?.status_count != null) stats.Posts = d.stats.status_count;

  return {
    title: d.title ?? domain,
    description: stripHtml(d.description ?? ""),
    rules: [],
    languages: d.languages ?? [],
    registrationsText,
    stats,
    contact: d.email ?? d.contact_account?.acct ?? null,
    version: d.version ?? null,
  };
}
