const API = "https://instances.joinpeertube.org/api/v1/instances";

export async function fetchPeerTube() {
  // First call just to learn the real total, then re-request that many —
  // avoids hardcoding a count that silently caps the result as the network grows.
  const countRes = await fetch(`${API}?count=1&sort=-totalUsers`);
  if (!countRes.ok) throw new Error(`PeerTube directory error: ${countRes.status}`);
  const { total } = await countRes.json();

  const res = await fetch(`${API}?count=${total}&sort=-totalUsers`);
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
