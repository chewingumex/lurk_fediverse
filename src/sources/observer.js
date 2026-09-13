// fediverse.observer's GraphQL directory covers software that has no
// dedicated public directory API of its own (Lemmy, Pixelfed).
const API = "https://api.fediverse.observer/";

async function queryObserver(softwarename) {
  const query = `{ nodes(status:"UP", softwarename:"${softwarename}") { domain name total_users } }`;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`fediverse.observer error (${softwarename}): ${res.status}`);
  const json = await res.json();
  return json.data?.nodes ?? [];
}

export async function fetchLemmy() {
  const nodes = await queryObserver("lemmy");
  return nodes.map((n) => ({
    domain: n.domain,
    software: "lemmy",
    contentType: "links",
    users: n.total_users ?? 0,
    description: "",
    language: "",
    country: "",
    url: `https://${n.domain}`,
  }));
}

export async function fetchPixelfed() {
  const nodes = await queryObserver("pixelfed");
  return nodes.map((n) => ({
    domain: n.domain,
    software: "pixelfed",
    contentType: "images",
    users: n.total_users ?? 0,
    description: "",
    language: "",
    country: "",
    url: `https://${n.domain}`,
  }));
}
