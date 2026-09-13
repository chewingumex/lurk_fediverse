const API = "https://api.joinmastodon.org/servers";

export async function fetchMastodon() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`Mastodon directory error: ${res.status}`);
  const data = await res.json();
  return data.map((s) => ({
    domain: s.domain,
    software: "mastodon",
    contentType: "posts",
    users: s.total_users ?? 0,
    description: (s.description ?? "").trim(),
    language: s.language ?? s.languages?.[0] ?? "",
    country: "",
    url: `https://${s.domain}`,
  }));
}
