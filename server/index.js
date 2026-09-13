import express from "express";
import { runSearch } from "./search.js";

const app = express();
const PORT = process.env.PORT || 8787;

const VALID_TYPES = new Set(["posts", "video", "links"]);

app.get("/api/search", async (req, res) => {
  const term = (req.query.term ?? "").toString().trim();
  if (!term) return res.status(400).json({ error: 'Query param "term" is required.' });

  const types = (req.query.types ?? "posts,video,links")
    .toString()
    .split(",")
    .map((s) => s.trim())
    .filter((t) => VALID_TYPES.has(t));

  if (!types.length) return res.status(400).json({ error: "No valid content types requested." });

  try {
    const data = await runSearch({ term, contentTypes: types });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Search proxy listening on http://localhost:${PORT}`);
});
