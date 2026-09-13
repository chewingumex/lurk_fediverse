import "./style.css";
import { mountHero } from "./hero.js";
import { mountAtlas } from "./views/atlas.js";
import { mountSearch } from "./views/search.js";

mountHero(document.getElementById("hero"));

const app = document.getElementById("app");

app.innerHTML = `
  <div class="tab-bar">
    <button class="tab-btn active" data-tab="atlas">Atlas</button>
    <button class="tab-btn" data-tab="search">Search</button>
  </div>
  <div id="view-atlas" class="view"></div>
  <div id="view-search" class="view" hidden></div>
`;

const views = {
  atlas: document.getElementById("view-atlas"),
  search: document.getElementById("view-search"),
};

app.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    app.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    Object.entries(views).forEach(([key, el]) => {
      el.hidden = key !== btn.dataset.tab;
    });
  });
});

mountAtlas(views.atlas);
mountSearch(views.search);
