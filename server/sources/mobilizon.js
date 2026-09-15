import { postJson } from "../http.js";

async function graphql(domain, query, variables) {
  const res = await postJson(`https://${domain}/api`, { query, variables });
  if (res.errors?.length) throw new Error(res.errors[0].message);
  return res.data;
}

export async function fetchMobilizonDetail(domain) {
  const [config, statistics] = await Promise.all([
    graphql(domain, `{ config { name description registrationsOpen languages contact } }`).then(
      (d) => d?.config ?? {}
    ),
    graphql(domain, `{ statistics { numberOfUsers numberOfEvents numberOfComments numberOfGroups } }`)
      .then((d) => d?.statistics ?? {})
      .catch(() => ({})),
  ]);

  const stats = {};
  if (statistics.numberOfUsers != null) stats.Users = statistics.numberOfUsers;
  if (statistics.numberOfEvents != null) stats.Events = statistics.numberOfEvents;
  if (statistics.numberOfGroups != null) stats.Groups = statistics.numberOfGroups;
  if (statistics.numberOfComments != null) stats.Comments = statistics.numberOfComments;

  return {
    title: config.name ?? domain,
    description: (config.description ?? "").trim(),
    rules: [],
    languages: config.languages ?? [],
    registrationsText: config.registrationsOpen == null ? null : config.registrationsOpen ? "Open" : "Closed",
    stats,
    contact: config.contact ?? null,
    version: null,
  };
}

export async function searchMobilizonEvents(instance, term, limit) {
  const query = `
    query($term: String!, $limit: Int) {
      searchEvents(term: $term, limit: $limit) {
        elements {
          id
          title
          url
          beginsOn
          picture { url }
          organizerActor { preferredUsername domain }
        }
      }
    }
  `;
  const data = await graphql(instance, query, { term, limit });
  const elements = data?.searchEvents?.elements ?? [];

  return elements.map((e) => ({
    id: `mobilizon:${instance}:${e.id}`,
    source: instance,
    software: "mobilizon",
    contentType: "events",
    title: e.title,
    text: "",
    author: {
      name: e.organizerActor?.preferredUsername || "unknown",
      url: e.organizerActor
        ? `https://${e.organizerActor.domain || instance}/@${e.organizerActor.preferredUsername}`
        : null,
    },
    url: e.url,
    thumbnail: e.picture?.url ?? null,
    publishedAt: e.beginsOn,
  }));
}
