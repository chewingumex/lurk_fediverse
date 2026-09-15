const NODE_TYPES = [
  { type: "posts", colorVar: "--series-1", weight: 0.35 },
  { type: "links", colorVar: "--series-4", weight: 0.2 },
  { type: "video", colorVar: "--series-2", weight: 0.17 },
  { type: "images", colorVar: "--series-3", weight: 0.13 },
  { type: "events", colorVar: "--series-5", weight: 0.15 },
];

const NODE_COUNT = 42;
const HUB_COUNT = 4;
const APPEAR_STAGGER_MS = 45;
const APPEAR_FADE_MS = 350;
const PULSE_INTERVAL_MS = [500, 900];
const PULSE_DURATION_MS = 900;

function pickType(rand) {
  const r = rand();
  let acc = 0;
  for (const t of NODE_TYPES) {
    acc += t.weight;
    if (r <= acc) return t;
  }
  return NODE_TYPES[0];
}

// Small deterministic PRNG so the graph looks the same on every load
// rather than reshuffling and feeling glitchy on refresh.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraph() {
  const rand = mulberry32(20260913);
  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const isHub = i < HUB_COUNT;
    const t = pickType(rand);
    nodes.push({
      x: 0.05 + rand() * 0.9,
      y: 0.12 + rand() * 0.76,
      r: isHub ? 4.5 : 1.8 + rand() * 1.4,
      type: t.type,
      colorVar: t.colorVar,
      isHub,
      appearAt: i * APPEAR_STAGGER_MS,
    });
  }

  const edges = [];
  nodes.forEach((n, i) => {
    if (n.isHub) return;
    const hubIdx = Math.floor(rand() * HUB_COUNT);
    edges.push({ a: i, b: hubIdx });
  });
  // a handful of cross-links for texture (hub-to-hub, and a few long-tail pairs)
  for (let i = 0; i < HUB_COUNT; i++) {
    for (let j = i + 1; j < HUB_COUNT; j++) edges.push({ a: i, b: j });
  }
  for (let i = 0; i < 8; i++) {
    const a = Math.floor(rand() * NODE_COUNT);
    const b = Math.floor(rand() * NODE_COUNT);
    if (a !== b) edges.push({ a, b });
  }

  const lastAppearAt = (NODE_COUNT - 1) * APPEAR_STAGGER_MS + APPEAR_FADE_MS;
  return { nodes, edges, lastAppearAt };
}

function resolveColors() {
  const style = getComputedStyle(document.documentElement);
  const get = (name) => style.getPropertyValue(name).trim();
  return {
    posts: get("--series-1"),
    video: get("--series-2"),
    images: get("--series-3"),
    links: get("--series-4"),
    events: get("--series-5"),
    edge: get("--gridline"),
  };
}

function runGraph(canvas, reducedMotion) {
  const ctx = canvas.getContext("2d");
  const { nodes, edges, lastAppearAt } = buildGraph();
  let colors = resolveColors();

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    colors = resolveColors();
  });

  let width = 0;
  let height = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const px = (n) => n.x * width;
  const py = (n) => n.y * height;

  const start = performance.now();
  let pulses = [];
  let nextPulseAt = PULSE_INTERVAL_MS[0];

  function drawFrame(elapsed) {
    ctx.clearRect(0, 0, width, height);

    const nodeOpacity = (n) => {
      if (reducedMotion) return 1;
      return Math.max(0, Math.min(1, (elapsed - n.appearAt) / APPEAR_FADE_MS));
    };

    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = nodes[e.a];
      const b = nodes[e.b];
      const op = Math.min(nodeOpacity(a), nodeOpacity(b));
      if (op <= 0) continue;
      ctx.strokeStyle = colors.edge;
      ctx.globalAlpha = op * 0.7;
      ctx.beginPath();
      ctx.moveTo(px(a), py(a));
      ctx.lineTo(px(b), py(b));
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    for (const n of nodes) {
      const op = nodeOpacity(n);
      if (op <= 0) continue;
      ctx.globalAlpha = op;
      ctx.fillStyle = colors[n.type];
      ctx.beginPath();
      ctx.arc(px(n), py(n), n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!reducedMotion) {
      ctx.globalAlpha = 1;
      for (const p of pulses) {
        const t = (elapsed - p.startedAt) / PULSE_DURATION_MS;
        if (t < 0 || t > 1) continue;
        const a = nodes[p.edge.a];
        const b = nodes[p.edge.b];
        const x = px(a) + (px(b) - px(a)) * t;
        const y = py(a) + (py(b) - py(a)) * t;
        ctx.globalAlpha = 1 - Math.abs(t - 0.5) * 0.6;
        ctx.fillStyle = colors[a.type];
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  if (reducedMotion) {
    drawFrame(lastAppearAt);
    return;
  }

  function tick(now) {
    const elapsed = now - start;
    pulses = pulses.filter((p) => elapsed - p.startedAt < PULSE_DURATION_MS);
    if (elapsed > lastAppearAt && elapsed >= nextPulseAt) {
      const edge = edges[Math.floor(Math.random() * edges.length)];
      pulses.push({ edge, startedAt: elapsed });
      const [min, max] = PULSE_INTERVAL_MS;
      nextPulseAt = elapsed + min + Math.random() * (max - min);
    }
    drawFrame(elapsed);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const BOOT_SCRIPT = [
  {
    cmd: "whoami",
    lines: ["lurk — a small tool for looking around the fediverse without an account"],
  },
  {
    cmd: "ls tools/",
    lines: [
      "atlas    browse public instances by content type and size",
      "search   send a term across a handful of servers, see what comes back",
    ],
  },
  {
    cmd: "cat status",
    lines: [
      "atlas   online",
      "search  online (posts, video, links, events — images need a login we don't have)",
    ],
  },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function typeInto(el, text, speed) {
  for (const ch of text) {
    el.textContent += ch;
    await sleep(speed);
  }
}

async function runBoot(root, reducedMotion, onDone) {
  const scriptEl = root.querySelector(".boot-script");
  const launchLine = root.querySelector(".launch-line");

  if (reducedMotion) {
    scriptEl.innerHTML = BOOT_SCRIPT.map(
      (block) =>
        `<div class="boot-block"><div class="boot-cmd">$ ${block.cmd}</div>${block.lines
          .map((l) => `<div class="boot-output">${l}</div>`)
          .join("")}</div>`
    ).join("");
    launchLine.hidden = false;
    onDone?.();
    return;
  }

  for (const block of BOOT_SCRIPT) {
    const blockEl = document.createElement("div");
    blockEl.className = "boot-block";
    const cmdEl = document.createElement("div");
    cmdEl.className = "boot-cmd";
    cmdEl.textContent = "$ ";
    blockEl.appendChild(cmdEl);
    scriptEl.appendChild(blockEl);

    await typeInto(cmdEl, block.cmd, 22);
    await sleep(120);

    for (const line of block.lines) {
      const lineEl = document.createElement("div");
      lineEl.className = "boot-output boot-output--in";
      lineEl.textContent = line;
      blockEl.appendChild(lineEl);
      await sleep(90);
    }
    await sleep(200);
  }

  launchLine.hidden = false;
  onDone?.();
}

export function mountHero(root) {
  root.innerHTML = `
    <div class="hero-band">
      <div class="terminal-window">
        <div class="terminal-titlebar">
          <span class="terminal-path">lurk@fediverse:~</span>
          <span class="terminal-status">
            <span class="status-dot status-dot--ok" title="Atlas: online"></span>
            <span class="status-dot status-dot--ok" title="Search: online"></span>
            <span class="status-dot status-dot--dim" title="Images: requires login"></span>
          </span>
        </div>
        <div class="terminal-body">
          <canvas class="graph-canvas" aria-hidden="true"></canvas>
          <div class="hero-wordmark">lurk</div>
          <div class="hero-tagline">quietly watching the fediverse</div>
          <div class="boot-script" aria-live="polite"></div>
          <div class="launch-line" role="button" tabindex="0" hidden>
            <span class="boot-cmd">$ ./launch</span><span class="cursor-block"></span>
          </div>
        </div>
      </div>
    </div>
  `;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = root.querySelector(".graph-canvas");
  runGraph(canvas, reducedMotion);
  runBoot(root, reducedMotion);

  const launchLine = root.querySelector(".launch-line");
  const goToApp = () => {
    document.getElementById("app-shell")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  };
  launchLine.addEventListener("click", goToApp);
  launchLine.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToApp();
    }
  });
}
