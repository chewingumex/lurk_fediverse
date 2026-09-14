import { getFavorites } from "../favorites.js";

const CONTENT_TYPES = [
  { key: "posts", label: "Posts", colorVar: "--series-1", available: true },
  { key: "video", label: "Video", colorVar: "--series-2", available: true },
  {
    key: "images",
    label: "Images",
    colorVar: "--series-3",
    available: false,
    reason: "Pixelfed requires a logged-in session for all public API access — can't be searched anonymously.",
  },
  { key: "links", label: "Links & discussions", colorVar: "--series-4", available: true },
];

const TYPE_META = Object.fromEntries(CONTENT_TYPES.map((c) => [c.key, c]));

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function mountSearch(root) {
  const state = {
    term: "",
    contentTypes: new Set(["posts", "video", "links"]),
    includeFavorites: true,
    loading: false,
    results: null,
    error: null,
  };

  function searchableFavorites() {
    return getFavorites().filter((f) => TYPE_META[f.contentType]?.available && state.contentTypes.has(f.contentType));
  }

  let resultsArea = null;

  function renderResultsArea() {
    if (!resultsArea) return;
    resultsArea.innerHTML = "";

    if (state.loading) {
      const loading = document.createElement("div");
      loading.className = "loading-state";
      loading.textContent = "Querying instances…";
      resultsArea.appendChild(loading);
      return;
    }

    if (state.error) {
      const banner = document.createElement("div");
      banner.className = "error-banner";
      banner.textContent = state.error;
      resultsArea.appendChild(banner);
      return;
    }

    if (!state.results) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent =
        'Enter a term and hit Search. Posts search matches hashtags — try a single word like "photography" rather than a full sentence.';
      resultsArea.appendChild(empty);
      return;
    }

    const { results, errors, queried } = state.results;

    const queriedLine = document.createElement("div");
    queriedLine.className = "results-summary";
    queriedLine.textContent = `Queried ${queried.length} instance${queried.length === 1 ? "" : "s"}: ${queried
      .map((q) => `${q.instance} (${q.count})`)
      .join(", ")}`;
    resultsArea.appendChild(queriedLine);

    if (errors.length) {
      const banner = document.createElement("div");
      banner.className = "error-banner";
      banner.textContent = `Some instances failed: ${errors.map((e) => `${e.instance} (${e.message})`).join(", ")}`;
      resultsArea.appendChild(banner);
    }

    if (!results.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No results from these instances for this term.";
      resultsArea.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "search-results";

    for (const r of results) {
      const meta = TYPE_META[r.contentType];
      const card = document.createElement("div");
      card.className = "search-card";
      card.innerHTML = `
        ${r.thumbnail ? `<img class="search-card__thumb" src="${r.thumbnail}" alt="" loading="lazy" />` : ""}
        <div class="search-card__body">
          <div class="search-card__top">
            <span class="card__badge"><span class="card__badge-dot" style="background: var(${meta.colorVar})"></span>${r.source}</span>
            <span class="search-card__date">${r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : ""}</span>
          </div>
          <div class="search-card__title">${escapeHtml(r.title || "")}</div>
          ${r.text && r.text !== r.title ? `<div class="search-card__text">${escapeHtml(r.text).slice(0, 240)}</div>` : ""}
          <div class="search-card__footer">
            <span class="search-card__author">${r.author?.name ? escapeHtml(r.author.name) : ""}</span>
            <a class="card__link" href="${r.url}" target="_blank" rel="noopener noreferrer">View original →</a>
          </div>
        </div>
      `;
      list.appendChild(card);
    }
    resultsArea.appendChild(list);
  }

  async function runSearch() {
    const term = state.term.trim();
    if (!term) return;

    const types = [...state.contentTypes];
    if (!types.length) {
      state.error = "Select at least one content type.";
      state.results = null;
      renderResultsArea();
      return;
    }

    state.loading = true;
    state.error = null;
    render();

    const extra = state.includeFavorites
      ? searchableFavorites().map((f) => ({ domain: f.domain, contentType: f.contentType }))
      : [];

    try {
      const params = new URLSearchParams({ term, types: types.join(",") });
      if (extra.length) params.set("extra", JSON.stringify(extra));
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Search failed (${res.status})`);
      state.results = data;
    } catch (err) {
      state.error = `Search failed: ${err.message}`;
      state.results = null;
    } finally {
      state.loading = false;
      render();
    }
  }

  function render() {
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "app-header";
    header.innerHTML = `
      <div>
        <h1>Search the Fediverse</h1>
        <p>Fans out to a small set of instances per content type — coverage is partial, not fediverse-wide.</p>
      </div>
    `;
    root.appendChild(header);

    const bar = document.createElement("div");
    bar.className = "filters-bar";

    const fieldset = document.createElement("fieldset");
    CONTENT_TYPES.forEach((c) => {
      const label = document.createElement("label");
      if (!c.available) label.title = c.reason;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = !c.available;
      checkbox.checked = c.available && state.contentTypes.has(c.key);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.contentTypes.add(c.key);
        else state.contentTypes.delete(c.key);
      });
      const dot = document.createElement("span");
      dot.className = "card__badge-dot";
      dot.style.background = `var(${c.colorVar})`;
      label.appendChild(checkbox);
      label.appendChild(dot);
      label.append(` ${c.label}${c.available ? "" : " (login required)"}`);
      fieldset.appendChild(label);
    });
    bar.appendChild(fieldset);

    const favCount = searchableFavorites().length;
    const favLabel = document.createElement("label");
    const favCheckbox = document.createElement("input");
    favCheckbox.type = "checkbox";
    favCheckbox.checked = state.includeFavorites;
    favCheckbox.disabled = favCount === 0;
    favCheckbox.addEventListener("change", () => {
      state.includeFavorites = favCheckbox.checked;
    });
    favLabel.appendChild(favCheckbox);
    favLabel.append(favCount ? ` Include my favorites (${favCount})` : " Include my favorites (none pinned)");
    bar.appendChild(favLabel);

    const termInput = document.createElement("input");
    termInput.type = "text";
    termInput.placeholder = "Search term or #hashtag…";
    termInput.value = state.term;
    termInput.addEventListener("input", () => {
      state.term = termInput.value;
    });
    termInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runSearch();
    });
    bar.appendChild(termInput);

    const btn = document.createElement("button");
    btn.className = "refresh";
    btn.textContent = state.loading ? "Searching…" : "Search";
    btn.disabled = state.loading;
    btn.addEventListener("click", () => runSearch());
    bar.appendChild(btn);

    root.appendChild(bar);

    resultsArea = document.createElement("div");
    root.appendChild(resultsArea);

    renderResultsArea();
  }

  render();
}
