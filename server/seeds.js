// A small, hand-picked set of large/reliable instances per content type.
// Search coverage is bounded by this list — an instance only knows about
// content that has actually federated to it, so this is not fediverse-wide
// search, just a fan-out across a few well-connected servers.
export const SEED_INSTANCES = {
  posts: ["mastodon.social", "mstdn.social"],
  video: ["framatube.org", "peertube.tv"],
  links: ["lemmy.world", "lemmy.ml"],
  // images (Pixelfed) intentionally omitted — every instance checked
  // requires an authenticated session for all public API timelines.
};
