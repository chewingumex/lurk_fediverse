import express from "express";
import { runSearch } from "./search.js";
import { fetchInstanceDetail } from "./detail.js";

const app = express();
const PORT = process.env.PORT || 8787;

const VALID_TYPES = new Set(["posts", "video", "links", "events"]);
const VALID_SOFTWARE = new Set([
  "mastodon",
  "peertube",
  "lemmy",
  "pixelfed",
  "pleroma",
  "friendica",
  "misskey",
  "mobilizon",
]);
const MAX_EXTRA_INSTANCES = 15;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function parseExtraInstances(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (e) =>
        e &&
        typeof e.domain === "string" &&
        DOMAIN_RE.test(e.domain) &&
        VALID_TYPES.has(e.contentType) &&
        VALID_SOFTWARE.has(e.software)
    )
    .slice(0, MAX_EXTRA_INSTANCES);
}

app.get("/api/search", async (req, res) => {
  const term = (req.query.term ?? "").toString().trim();
  if (!term) return res.status(400).json({ error: 'Query param "term" is required.' });

  const types = (req.query.types ?? "posts,video,links")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter((t) => VALID_TYPES.has(t));

  if (!types.length) return res.status(400).json({ error: "No valid content types requested." });

  const extraInstances = parseExtraInstances(req.query.extra);

  try {
    const data = await runSearch({ term, contentTypes: types, extraInstances });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/instance-detail", async (req, res) => {
  const domain = (req.query.domain ?? "").toString().trim().toLowerCase();
  const software = (req.query.software ?? "").toString().trim().toLowerCase();

  if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: "Invalid or missing domain." });
  if (!VALID_SOFTWARE.has(software)) return res.status(400).json({ error: "Invalid or missing software." });

  try {
    const detail = await fetchInstanceDetail(domain, software);
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Search proxy listening on http://localhost:${PORT}`);
});
