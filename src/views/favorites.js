import { getFavorites, toggleFavorite, onFavoritesChange } from "../favorites.js";

const TYPE_META = {
  posts: { label: "Posts", colorVar: "--series-1" },
  video: { label: "Video", colorVar: "--series-2" },
  images: { label: "Images", colorVar: "--series-3" },
  links: { label: "Links & discussions", colorVar: "--series-4" },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function fmt(n) {
  return n.toLocaleString();
}

export function mountFavorites(root) {
  function render() {
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "app-header";
    header.innerHTML = `
      <div>
        <h1>Favorites</h1>
        <p>Servers you've pinned — saved in this browser, included in Search when you ask for them.</p>
      </div>
    `;
    root.appendChild(header);

    const favorites = getFavorites();

    if (!favorites.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No favorites yet — pin instances from the Atlas tab to see them here.";
      root.appendChild(empty);
      return;
    }

    const summary = document.createElement("div");
    summary.className = "results-summary";
    summary.textContent = `${fmt(favorites.length)} pinned instance${favorites.length === 1 ? "" : "s"}`;
    root.appendChild(summary);

    const grid = document.createElement("div");
    grid.className = "results-grid";

    for (const inst of favorites) {
      const meta = TYPE_META[inst.contentType];
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card__top">
          <div class="card__domain">${inst.domain}</div>
          <div class="card__top-right">
            <button class="card__pin card__pin--active" type="button" aria-label="Unpin ${inst.domain}">★</button>
            <span class="card__badge"><span class="card__badge-dot" style="background: var(${meta.colorVar})"></span>${meta.label}</span>
          </div>
        </div>
        <div class="card__users">${fmt(inst.users)} users</div>
        ${inst.description ? `<div class="card__desc">${escapeHtml(inst.description)}</div>` : ""}
        <a class="card__link" href="${inst.url}" target="_blank" rel="noopener noreferrer">Visit →</a>
      `;
      card.querySelector(".card__pin").addEventListener("click", () => toggleFavorite(inst));
      grid.appendChild(card);
    }
    root.appendChild(grid);
  }

  onFavoritesChange(render);
  render();
}
