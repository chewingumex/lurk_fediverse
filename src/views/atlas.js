import { fetchAllSources } from "../sources/index.js";
import { renderContentTypeChart, renderSizeDistributionChart } from "../charts.js";

const CONTENT_TYPES = [
  { key: "posts", label: "Posts", colorVar: "--series-1" },
  { key: "video", label: "Video", colorVar: "--series-2" },
  { key: "images", label: "Images", colorVar: "--series-3" },
  { key: "links", label: "Links & discussions", colorVar: "--series-4" },
];

const PAGE_SIZE = 60;

export function mountAtlas(root) {
  const state = {
    instances: [],
    errors: [],
    fetchedAt: null,
    loading: true,
    filters: {
      contentTypes: new Set(CONTENT_TYPES.map((c) => c.key)),
      query: "",
      minUsers: 0,
      sort: "users-desc",
    },
    visibleCount: PAGE_SIZE,
  };

  let resultsContainer = null;

  function groupByContentType(instances) {
    const groups = Object.fromEntries(CONTENT_TYPES.map((c) => [c.key, []]));
    for (const i of instances) {
      (groups[i.contentType] ??= []).push(i);
    }
    return groups;
  }

  function applyFilters(instances) {
    const { contentTypes, query, minUsers, sort } = state.filters;
    const q = query.trim().toLowerCase();

    let result = instances.filter((i) => {
      if (!contentTypes.has(i.contentType)) return false;
      if (i.users < minUsers) return false;
      if (q && !i.domain.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sort === "users-desc") return b.users - a.users;
      if (sort === "users-asc") return a.users - b.users;
      if (sort === "domain-asc") return a.domain.localeCompare(b.domain);
      return 0;
    });

    return result;
  }

  function fmt(n) {
    return n.toLocaleString();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderResults(container) {
    container.innerHTML = "";
    const filtered = applyFilters(state.instances);

    const summary = document.createElement("div");
    summary.className = "results-summary";
    summary.textContent = `${fmt(filtered.length)} instance${filtered.length === 1 ? "" : "s"} match`;
    container.appendChild(summary);

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No instances match these filters.";
      container.appendChild(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "results-grid";

    const visible = filtered.slice(0, state.visibleCount);
    const typeMeta = Object.fromEntries(CONTENT_TYPES.map((c) => [c.key, c]));

    for (const inst of visible) {
      const meta = typeMeta[inst.contentType];
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card__top">
          <div class="card__domain">${inst.domain}</div>
          <span class="card__badge"><span class="card__badge-dot" style="background: var(${meta.colorVar})"></span>${meta.label}</span>
        </div>
        <div class="card__users">${fmt(inst.users)} users</div>
        ${inst.description ? `<div class="card__desc">${escapeHtml(inst.description)}</div>` : ""}
        <a class="card__link" href="${inst.url}" target="_blank" rel="noopener noreferrer">Visit →</a>
      `;
      grid.appendChild(card);
    }
    container.appendChild(grid);

    if (filtered.length > state.visibleCount) {
      const btn = document.createElement("button");
      btn.className = "load-more";
      btn.textContent = `Load more (${fmt(filtered.length - state.visibleCount)} remaining)`;
      btn.addEventListener("click", () => {
        state.visibleCount += PAGE_SIZE;
        renderResults(container);
      });
      container.appendChild(btn);
    }
  }

  function renderResultsOnly() {
    if (resultsContainer) renderResults(resultsContainer);
  }

  function render() {
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "app-header";
    header.innerHTML = `
      <div>
        <h1>Fediverse Atlas</h1>
        <p>Public instances across posts, video, images, and link-sharing software.</p>
      </div>
    `;
    const meta = document.createElement("div");
    meta.className = "header-meta";
    if (state.fetchedAt) {
      meta.innerHTML = `<span>Updated ${new Date(state.fetchedAt).toLocaleTimeString()}</span>`;
    }
    const refreshBtn = document.createElement("button");
    refreshBtn.className = "refresh";
    refreshBtn.textContent = "Refresh";
    refreshBtn.addEventListener("click", () => load({ forceRefresh: true }));
    meta.appendChild(refreshBtn);
    header.appendChild(meta);
    root.appendChild(header);

    if (state.loading) {
      const loading = document.createElement("div");
      loading.className = "loading-state";
      loading.textContent = "Fetching instance directories…";
      root.appendChild(loading);
      return;
    }

    if (state.errors.length) {
      const banner = document.createElement("div");
      banner.className = "error-banner";
      banner.textContent = `Some sources failed to load: ${state.errors
        .map((e) => `${e.source} (${e.message})`)
        .join(", ")}`;
      root.appendChild(banner);
    }

    const grouped = groupByContentType(state.instances);
    const totalUsers = state.instances.reduce((sum, i) => sum + i.users, 0);

    const stats = document.createElement("div");
    stats.className = "stat-tiles";
    const tiles = [
      { label: "Instances", value: fmt(state.instances.length) },
      { label: "Total users", value: fmt(totalUsers) },
      ...CONTENT_TYPES.map((c) => ({ label: c.label, value: fmt(grouped[c.key].length) })),
    ];
    for (const t of tiles) {
      const tile = document.createElement("div");
      tile.className = "stat-tile";
      tile.innerHTML = `<div class="stat-tile__label">${t.label}</div><div class="stat-tile__value">${t.value}</div>`;
      stats.appendChild(tile);
    }
    root.appendChild(stats);

    const chartsGrid = document.createElement("div");
    chartsGrid.className = "charts-grid";

    const panel1 = document.createElement("div");
    panel1.className = "chart-panel";
    panel1.innerHTML = `<h2>Instances by content type</h2>`;
    const chart1Root = document.createElement("div");
    panel1.appendChild(chart1Root);

    const panel2 = document.createElement("div");
    panel2.className = "chart-panel";
    panel2.innerHTML = `<h2>Instance size distribution (by users)</h2>`;
    const chart2Root = document.createElement("div");
    panel2.appendChild(chart2Root);

    chartsGrid.appendChild(panel1);
    chartsGrid.appendChild(panel2);
    root.appendChild(chartsGrid);

    renderContentTypeChart(chart1Root, grouped);
    renderSizeDistributionChart(chart2Root, state.instances);

    const filtersBar = document.createElement("div");
    filtersBar.className = "filters-bar";

    const fieldset = document.createElement("fieldset");
    CONTENT_TYPES.forEach((c) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.filters.contentTypes.has(c.key);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) state.filters.contentTypes.add(c.key);
        else state.filters.contentTypes.delete(c.key);
        state.visibleCount = PAGE_SIZE;
        render();
      });
      const dot = document.createElement("span");
      dot.className = "card__badge-dot";
      dot.style.background = `var(${c.colorVar})`;
      label.appendChild(checkbox);
      label.appendChild(dot);
      label.append(` ${c.label}`);
      fieldset.appendChild(label);
    });
    filtersBar.appendChild(fieldset);

    const searchLabel = document.createElement("label");
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search domain or description…";
    searchInput.value = state.filters.query;
    searchInput.addEventListener("input", () => {
      state.filters.query = searchInput.value;
      state.visibleCount = PAGE_SIZE;
      renderResultsOnly();
    });
    searchLabel.appendChild(searchInput);
    filtersBar.appendChild(searchLabel);

    const minUsersLabel = document.createElement("label");
    minUsersLabel.append("Min users");
    const minUsersInput = document.createElement("input");
    minUsersInput.type = "number";
    minUsersInput.min = "0";
    minUsersInput.value = String(state.filters.minUsers);
    minUsersInput.style.width = "90px";
    minUsersInput.addEventListener("input", () => {
      state.filters.minUsers = Number(minUsersInput.value) || 0;
      state.visibleCount = PAGE_SIZE;
      renderResultsOnly();
    });
    minUsersLabel.appendChild(minUsersInput);
    filtersBar.appendChild(minUsersLabel);

    const sortLabel = document.createElement("label");
    sortLabel.append("Sort");
    const sortSelect = document.createElement("select");
    [
      ["users-desc", "Most users"],
      ["users-asc", "Fewest users"],
      ["domain-asc", "Domain A–Z"],
    ].forEach(([value, text]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = text;
      if (state.filters.sort === value) opt.selected = true;
      sortSelect.appendChild(opt);
    });
    sortSelect.addEventListener("change", () => {
      state.filters.sort = sortSelect.value;
      render();
    });
    sortLabel.appendChild(sortSelect);
    filtersBar.appendChild(sortLabel);

    root.appendChild(filtersBar);

    resultsContainer = document.createElement("div");
    root.appendChild(resultsContainer);

    renderResults(resultsContainer);
  }

  async function load({ forceRefresh = false } = {}) {
    state.loading = true;
    render();
    const { instances, errors, fetchedAt } = await fetchAllSources({ forceRefresh });
    state.instances = instances;
    state.errors = errors;
    state.fetchedAt = fetchedAt;
    state.loading = false;
    state.visibleCount = PAGE_SIZE;
    render();
  }

  load();
}
