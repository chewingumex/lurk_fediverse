// fediverse.observer's GraphQL directory covers software that has no
// dedicated public directory API of its own (Lemmy, Pixelfed, Pleroma,
// Friendica, Misskey, Mobilizon).
//
// All six are fetched in a single batched GraphQL request (one query,
// aliased per software) rather than one request each — firing six
// concurrent anonymous requests at this free API tends to get some of them
// throttled/reset by their edge, which surfaces in the browser as a generic
// "Load failed" with no further detail.
const API = "https://api.fediverse.observer/";

const SOFTWARE_META = {
  lemmy: { contentType: "links" },
  pixelfed: { contentType: "images" },
  pleroma: { contentType: "posts" },
  friendica: { contentType: "posts" },
  misskey: { contentType: "posts" },
  mobilizon: { contentType: "events" },
};

let inFlight = null;

function queryAll() {
  if (!inFlight) {
    const names = Object.keys(SOFTWARE_META);
    const query = `{ ${names
      .map((n) => `${n}: nodes(status:"UP", softwarename:"${n}") { domain total_users }`)
      .join(" ")} }`;

    inFlight = fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`fediverse.observer error: ${res.status}`);
        return res.json();
      })
      .then((json) => json.data ?? {})
      .catch((err) => {
        inFlight = null; // don't cache a failure — let the next caller retry
        throw err;
      });
  }
  return inFlight;
}

function mapNodes(nodes, software, contentType) {
  return (nodes ?? []).map((n) => ({
    domain: n.domain,
    software,
    contentType,
    users: n.total_users ?? 0,
    description: "",
    language: "",
    country: "",
    url: `https://${n.domain}`,
  }));
}

function makeFetcher(software) {
  const { contentType } = SOFTWARE_META[software];
  return async function fetchSoftware() {
    const data = await queryAll();
    return mapNodes(data[software], software, contentType);
  };
}

export const fetchLemmy = makeFetcher("lemmy");
export const fetchPixelfed = makeFetcher("pixelfed");
export const fetchPleroma = makeFetcher("pleroma");
export const fetchFriendica = makeFetcher("friendica");
export const fetchMisskey = makeFetcher("misskey");
export const fetchMobilizon = makeFetcher("mobilizon");
