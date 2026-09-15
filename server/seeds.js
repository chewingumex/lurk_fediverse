// A small, hand-picked set of large/reliable instances per content type.
// Search coverage is bounded by this list — an instance only knows about
// content that has actually federated to it, so this is not fediverse-wide
// search, just a fan-out across a few well-connected servers.
//
// Each entry carries its software because a content type can now be served
// by more than one API shape (e.g. "posts" spans Mastodon, Pleroma and
// Misskey) — the searcher used per instance is chosen by `software`, not by
// content type alone. See server/search.js.
export const SEED_INSTANCES = {
  posts: [
    { domain: "mastodon.social", software: "mastodon" },
    { domain: "mstdn.social", software: "mastodon" },
    { domain: "social.lainon.life", software: "pleroma" },
    { domain: "habitat.zelle.one", software: "pleroma" },
    { domain: "misskey.io", software: "misskey" },
    { domain: "misskey.noellabo.jp", software: "misskey" },
    // Friendica intentionally omitted — its hashtag timeline requires a
    // logged-in session on every instance checked (see src/views/search.js).
  ],
  video: [
    { domain: "framatube.org", software: "peertube" },
    { domain: "peertube.tv", software: "peertube" },
  ],
  links: [
    { domain: "lemmy.world", software: "lemmy" },
    { domain: "lemmy.ml", software: "lemmy" },
  ],
  events: [
    { domain: "mobilizon.fr", software: "mobilizon" },
    { domain: "mobilizon.picasoft.net", software: "mobilizon" },
  ],
  // images (Pixelfed) intentionally omitted — every instance checked
  // requires an authenticated session for all public API timelines.
};
