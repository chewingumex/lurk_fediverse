import { searchMastodon } from "./sources/mastodon.js";
import { searchPeerTube } from "./sources/peertube.js";
import { searchLemmy } from "./sources/lemmy.js";
import { searchMisskey } from "./sources/misskey.js";
import { searchMobilizonEvents } from "./sources/mobilizon.js";
import { SEED_INSTANCES } from "./seeds.js";

// Keyed by software rather than content type: a content type like "posts"
// can be served by more than one incompatible API (Mastodon/Pleroma share
// one shape, Misskey has its own).
const SEARCHERS = {
  mastodon: searchMastodon,
  pleroma: searchMastodon,
  peertube: searchPeerTube,
  lemmy: searchLemmy,
  misskey: searchMisskey,
  mobilizon: searchMobilizonEvents,
};

const RESULTS_PER_INSTANCE = 15;

export async function runSearch({ term, contentTypes, extraInstances = [] }) {
  const jobs = [];

  for (const type of contentTypes) {
    const seeds = SEED_INSTANCES[type];
    if (!seeds) continue;

    const extras = extraInstances.filter((e) => e.contentType === type);
    const seen = new Set();
    const instances = [...seeds, ...extras].filter((i) => {
      if (seen.has(i.domain)) return false;
      seen.add(i.domain);
      return true;
    });

    for (const { domain, software } of instances) {
      const searcher = SEARCHERS[software];
      if (!searcher) {
        // e.g. a favorited Friendica instance — no anonymous search API to call.
        jobs.push(Promise.resolve({ instance: domain, type, results: [], error: `${software}: search not supported` }));
        continue;
      }

      jobs.push(
        searcher(domain, term, RESULTS_PER_INSTANCE)
          .then((results) => ({ instance: domain, type, results, error: null }))
          .catch((err) => ({ instance: domain, type, results: [], error: err.message }))
      );
    }
  }

  const settled = await Promise.all(jobs);

  const seen = new Set();
  const results = [];
  for (const s of settled) {
    for (const r of s.results) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      results.push(r);
    }
  }
  results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const errors = settled.filter((s) => s.error).map((s) => ({ instance: s.instance, type: s.type, message: s.error }));
  const queried = settled.map((s) => ({ instance: s.instance, type: s.type, count: s.results.length }));

  return { term, results, errors, queried };
}
