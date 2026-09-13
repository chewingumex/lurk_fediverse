import { searchMastodon } from "./sources/mastodon.js";
import { searchPeerTube } from "./sources/peertube.js";
import { searchLemmy } from "./sources/lemmy.js";
import { SEED_INSTANCES } from "./seeds.js";

const SEARCHERS = {
  posts: searchMastodon,
  video: searchPeerTube,
  links: searchLemmy,
};

const RESULTS_PER_INSTANCE = 15;

export async function runSearch({ term, contentTypes }) {
  const jobs = [];

  for (const type of contentTypes) {
    const searcher = SEARCHERS[type];
    const instances = SEED_INSTANCES[type];
    if (!searcher || !instances) continue;

    for (const instance of instances) {
      jobs.push(
        searcher(instance, term, RESULTS_PER_INSTANCE)
          .then((results) => ({ instance, type, results, error: null }))
          .catch((err) => ({ instance, type, results: [], error: err.message }))
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
