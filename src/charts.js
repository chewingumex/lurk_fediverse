// Small hand-rolled SVG bar charts. No charting library — two fixed shapes
// (a categorical breakdown, a single-hue histogram) don't need one.

const CONTENT_TYPE_META = {
  posts: { label: "Posts (Mastodon-like)", colorVar: "--series-1" },
  video: { label: "Video (PeerTube)", colorVar: "--series-2" },
  images: { label: "Images (Pixelfed)", colorVar: "--series-3" },
  links: { label: "Links & discussions (Lemmy)", colorVar: "--series-4" },
};

function makeTooltip(container) {
  const tip = document.createElement("div");
  tip.className = "viz-tooltip";
  tip.hidden = true;
  container.appendChild(tip);
  return {
    show(html, evt) {
      tip.innerHTML = html;
      tip.hidden = false;
      const rect = container.getBoundingClientRect();
      tip.style.left = `${evt.clientX - rect.left + 12}px`;
      tip.style.top = `${evt.clientY - rect.top + 12}px`;
    },
    hide() {
      tip.hidden = true;
    },
  };
}

export function renderContentTypeChart(root, instancesByType) {
  root.innerHTML = "";
  root.classList.add("viz-root");

  const entries = Object.entries(instancesByType)
    .map(([key, list]) => ({ key, count: list.length, ...CONTENT_TYPE_META[key] }))
    .sort((a, b) => b.count - a.count);

  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const max = Math.max(...entries.map((e) => e.count), 1);

  const wrap = document.createElement("div");
  wrap.className = "chart-bars chart-bars--h";

  const tooltip = makeTooltip(root);

  entries.forEach((e) => {
    const row = document.createElement("div");
    row.className = "bar-row";

    const label = document.createElement("div");
    label.className = "bar-row__label";
    label.textContent = e.label;

    const track = document.createElement("div");
    track.className = "bar-row__track";

    const bar = document.createElement("div");
    bar.className = "bar-row__bar";
    bar.style.width = `${(e.count / max) * 100}%`;
    bar.style.background = `var(${e.colorVar})`;
    bar.tabIndex = 0;
    bar.setAttribute("role", "img");
    bar.setAttribute(
      "aria-label",
      `${e.label}: ${e.count.toLocaleString()} instances (${((e.count / total) * 100).toFixed(1)}%)`
    );

    const onEnter = (evt) => {
      tooltip.show(
        `<strong>${e.label}</strong><br>${e.count.toLocaleString()} instances · ${((e.count / total) * 100).toFixed(1)}%`,
        evt
      );
    };
    bar.addEventListener("mousemove", onEnter);
    bar.addEventListener("mouseenter", onEnter);
    bar.addEventListener("mouseleave", () => tooltip.hide());
    bar.addEventListener("focus", (evt) => onEnter(evt));
    bar.addEventListener("blur", () => tooltip.hide());

    const value = document.createElement("span");
    value.className = "bar-row__value";
    value.textContent = e.count.toLocaleString();

    track.appendChild(bar);
    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    wrap.appendChild(row);
  });

  root.appendChild(wrap);
}

const SIZE_BINS = [
  { label: "0", test: (u) => u === 0 },
  { label: "1–9", test: (u) => u >= 1 && u < 10 },
  { label: "10–99", test: (u) => u >= 10 && u < 100 },
  { label: "100–999", test: (u) => u >= 100 && u < 1000 },
  { label: "1K–9.9K", test: (u) => u >= 1000 && u < 10000 },
  { label: "10K–99K", test: (u) => u >= 10000 && u < 100000 },
  { label: "100K+", test: (u) => u >= 100000 },
];

export function renderSizeDistributionChart(root, instances) {
  root.innerHTML = "";
  root.classList.add("viz-root");

  const counts = SIZE_BINS.map((bin) => ({
    label: bin.label,
    count: instances.filter((i) => bin.test(i.users)).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  const wrap = document.createElement("div");
  wrap.className = "chart-bars chart-bars--v";

  const tooltip = makeTooltip(root);

  counts.forEach((c) => {
    const col = document.createElement("div");
    col.className = "col";

    const track = document.createElement("div");
    track.className = "col__track";

    const bar = document.createElement("div");
    bar.className = "col__bar";
    bar.style.height = `${(c.count / max) * 100}%`;
    bar.style.background = "var(--series-1)";
    bar.tabIndex = 0;
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", `${c.label} users: ${c.count.toLocaleString()} instances`);

    const onEnter = (evt) => {
      tooltip.show(`<strong>${c.label} users</strong><br>${c.count.toLocaleString()} instances`, evt);
    };
    bar.addEventListener("mousemove", onEnter);
    bar.addEventListener("mouseenter", onEnter);
    bar.addEventListener("mouseleave", () => tooltip.hide());
    bar.addEventListener("focus", (evt) => onEnter(evt));
    bar.addEventListener("blur", () => tooltip.hide());

    track.appendChild(bar);

    const label = document.createElement("div");
    label.className = "col__label";
    label.textContent = c.label;

    col.appendChild(track);
    col.appendChild(label);
    wrap.appendChild(col);
  });

  root.appendChild(wrap);
}
