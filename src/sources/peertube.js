const API = "https://instances.joinpeertube.org/api/v1/instances";

export async function fetchPeerTube() {
  const res = await fetch(`${API}?count=1000&sort=-totalUsers`);
  if (!res.ok) throw new Error(`PeerTube directory error: ${res.status}`);
  const data = await res.json();
  return data.data.map((s) => ({
    domain: s.host,
    software: "peertube",
    contentType: "video",
    users: s.totalUsers ?? 0,
    description: (s.shortDescription ?? "").trim(),
    language: s.languages?.[0] ?? "",
    country: s.country ?? "",
    url: `https://${s.host}`,
  }));
}
