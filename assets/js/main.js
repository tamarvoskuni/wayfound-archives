(() => {
  "use strict";

  const root = document.documentElement;
  const journey = document.getElementById("journey");
  const sun = document.querySelector(".sun");
  const moon = document.querySelector(".moon");
  const captions = [...document.querySelectorAll(".caption")];
  const wall = document.getElementById("wall");

  // ---------- Helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // 0 before `a`, 1 after `b`, eased in between.
  const ramp = (p, a, b) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (c1, c2, t) => {
    const a = hex(c1), b = hex(c2);
    return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
  };
  // Pick a colour along a list of [position, colour] stops.
  const along = (stops, p) => {
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) {
        const [p0, c0] = stops[i - 1], [p1, c1] = stops[i];
        return mix(c0, c1, (p - p0) / (p1 - p0));
      }
    }
    return stops[stops.length - 1][1];
  };

  // ---------- Sky: golden afternoon -> ember sunset -> umber dusk -> green-black night ----------
  const SKY_TOP = [[0, "#d9b56e"], [.22, "#c98a45"], [.38, "#8a4a2a"], [.5, "#3a2a26"], [.62, "#171a16"], [.76, "#0b0f0c"], [1, "#0b0f0c"]];
  const SKY_BOTTOM = [[0, "#f3e2b8"], [.22, "#efc98a"], [.38, "#d98a4a"], [.5, "#8a4f30"], [.62, "#2f2a20"], [.76, "#1a2118"], [1, "#1a2118"]];
  const SUN_CORE = [[0, "#f7d98a"], [.25, "#f6c66e"], [.42, "#ee9a52"], [1, "#d9663a"]];
  const SUN_EDGE = [[0, "#e2a54a"], [.25, "#dd8a3a"], [.42, "#c4582c"], [1, "#9e3a22"]];

  // ---------- Stars ----------
  (function makeStars() {
    const box = document.querySelector(".stars");
    const n = window.innerWidth < 600 ? 55 : 110;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      const big = Math.random() < 0.08;
      s.className = big ? "star star--big" : "star";
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.pow(Math.random(), 1.4) * 100}%`;
      if (big) s.style.setProperty("--s", `${8 + Math.random() * 10}px`);
      else { const d = 1 + Math.random() * 1.8; s.style.width = s.style.height = `${d}px`; }
      s.style.setProperty("--tw", `${2.5 + Math.random() * 4}s`);
      s.style.animationDelay = `${-Math.random() * 6}s`;
      frag.appendChild(s);
    }
    box.appendChild(frag);
  })();

  // ---------- Scroll-driven scene ----------
  let ticking = false;
  // Preview helper: ?at=0.5 freezes the scene halfway down the descent.
  const atParam = parseFloat(new URLSearchParams(location.search).get("at"));
  const forcedP = atParam >= 0 && atParam <= 1 ? atParam : null;
  if (forcedP !== null) document.body.classList.add("is-preview");

  function render() {
    ticking = false;
    const rect = journey.getBoundingClientRect();
    const span = rect.height - window.innerHeight;
    const p = forcedP ?? clamp(-rect.top / span);
    const vh = window.innerHeight;

    root.style.setProperty("--p", p.toFixed(4));
    const s = root.style;
    s.setProperty("--sky-top", along(SKY_TOP, p));
    s.setProperty("--sky-bottom", along(SKY_BOTTOM, p));
    s.setProperty("--sun-core", along(SUN_CORE, p));
    s.setProperty("--sun-edge", along(SUN_EDGE, p));

    // Sun sinks behind the trees.
    const sunT = ramp(p, 0, 0.5);
    const sunY = lerp(vh * 0.04, vh * 0.86, sunT);
    sun.style.transform = `translate(${lerp(10, 30, sunT)}vw, ${sunY}px)`;
    sun.style.opacity = (1 - ramp(p, 0.42, 0.52)).toFixed(3);

    // Moon rises once the sun is gone.
    const moonT = ramp(p, 0.42, 0.74);
    const moonY = lerp(vh * 0.92, vh * 0.07, moonT);
    moon.style.transform = `translate(${lerp(-28, -20, moonT)}vw, ${moonY}px)`;
    moon.style.opacity = ramp(p, 0.44, 0.56).toFixed(3);

    const night = ramp(p, 0.36, 0.7);
    s.setProperty("--night", night.toFixed(3));
    s.setProperty("--stars", ramp(p, 0.5, 0.72).toFixed(3));
    s.setProperty("--back-b", lerp(1.15, 0.32, night).toFixed(3));
    s.setProperty("--front-b", lerp(1, 0.12, night).toFixed(3));
    s.setProperty("--hint", (1 - ramp(p, 0.01, 0.06)).toFixed(3));

    // Caption ink flips from dark-on-gold to bone-on-night.
    const light = ramp(p, 0.4, 0.5);
    s.setProperty("--cap-color", mix("#14110d", "#ece2cb", light));
    s.setProperty("--cap-shadow", light > 0.5 ? "rgba(11,15,12,.9)" : "rgba(243,226,184,.8)");
    s.setProperty("--cap-accent", mix("#8a3a1c", "#d9a35a", light));

    for (const c of captions) {
      const a = +c.dataset.in, b = +c.dataset.out;
      const o = Math.min(ramp(p, a, a + 0.04), 1 - ramp(p, b - 0.04, b));
      c.style.opacity = o.toFixed(3);
      c.style.setProperty("--o", o.toFixed(3));
    }

    // The wall rises over the last stretch.
    s.setProperty("--wall", (1 - ramp(p, 0.78, 0.97)).toFixed(4));
  }

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  render();

  // ---------- The seal: unlocking the archive ----------
  // Must match normalize() in tools/seal.py.
  const normalize = (pw) => pw.trim().toLowerCase().split(/\s+/).join(" ");
  const b64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  const STORE_KEY = "wayfound:word";
  const store = {
    get() { try { return localStorage.getItem(STORE_KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(STORE_KEY, v); } catch { /* private mode */ } },
    clear() { try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ } },
  };

  let sealed = null;
  async function getSealed() {
    if (!sealed) {
      const res = await fetch("assets/archive.sealed.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("missing");
      sealed = await res.json();
    }
    return sealed;
  }

  async function openSeal(word) {
    const box = await getSealed();
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", enc.encode(normalize(word)), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: b64(box.salt), iterations: box.iter },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(box.iv) }, key, b64(box.data));
    return new TextDecoder().decode(plain);
  }

  const form = document.getElementById("seal");
  const input = document.getElementById("word");
  const msg = document.getElementById("seal-msg");
  const remembered = document.getElementById("remembered");
  const archive = document.getElementById("archive");
  let unlockedHTML = null;

  const WRONG = [
    "The wall does not know you.",
    "Nothing stirs.",
    "The bricks stay cold.",
  ];
  let misses = 0;

  function enter(html) {
    archive.innerHTML = html;
    archive.hidden = false;
    wall.classList.add("is-open");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => archive.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }), reduce ? 50 : 1900);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const word = input.value;
    if (!word.trim()) return;
    const btn = form.querySelector("button");
    btn.disabled = true;
    msg.textContent = "Listening…";
    try {
      const html = await openSeal(word);
      store.set(word);
      msg.textContent = "";
      enter(html);
    } catch (err) {
      msg.textContent = err.message === "missing" ? "The archive is sealed for now." : WRONG[misses++ % WRONG.length];
      wall.classList.remove("is-wrong");
      void wall.offsetWidth; // restart the shake
      wall.classList.add("is-wrong");
      input.select();
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("enter-again").addEventListener("click", () => {
    if (unlockedHTML) enter(unlockedHTML);
  });

  // Returning readers: if their word still works, the wall remembers them.
  const saved = store.get();
  if (saved) {
    openSeal(saved).then((html) => {
      unlockedHTML = html;
      form.hidden = true;
      remembered.hidden = false;
    }).catch(() => store.clear());
  }
})();
