import "./style.css";

/* ============ утилиты ============ */
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(pointer: coarse)").matches;

/* ============ ВРЕМЯ СУТОК ПО СКРОЛЛУ ============ */
/* ключевые кадры дня: [позиция, sunOpacity, sunX, sunY, nightVeil, stars, moon] */
const DAY_STOPS = [
  { p: 0.0,  sun: 0.4,  sunX: 64, sunY: 70, night: 0,   stars: 0,   moon: 0 },
  { p: 0.12, sun: 0.95, sunX: 56, sunY: 46, night: 0,   stars: 0,   moon: 0 },
  { p: 0.34, sun: 1,    sunX: 44, sunY: 40, night: 0,   stars: 0,   moon: 0 },
  { p: 0.52, sun: 0.85, sunX: 32, sunY: 52, night: 0,   stars: 0,   moon: 0 },
  { p: 0.68, sun: 0.35, sunX: 24, sunY: 78, night: 0.55, stars: 0.25, moon: 0.35 },
  { p: 0.85, sun: 0,    sunX: 20, sunY: 96, night: 0.9,  stars: 0.7,  moon: 0.85 },
  { p: 1.0,  sun: 0,    sunX: 18, sunY: 100, night: 1,   stars: 1,    moon: 1 },
];

function sampleDay(p) {
  for (let i = 0; i < DAY_STOPS.length - 1; i++) {
    const a = DAY_STOPS[i], b = DAY_STOPS[i + 1];
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p || 1);
      return {
        sun: lerp(a.sun, b.sun, t),
        sunX: lerp(a.sunX, b.sunX, t),
        sunY: lerp(a.sunY, b.sunY, t),
        night: lerp(a.night, b.night, t),
        stars: lerp(a.stars, b.stars, t),
        moon: lerp(a.moon, b.moon, t),
      };
    }
  }
  return DAY_STOPS[DAY_STOPS.length - 1];
}

const root = document.documentElement;
let docH = 1, vh = 1;

function setSky() {
  const p = clamp(scrollY / (docH - vh || 1), 0, 1);
  const s = sampleDay(p);
  root.style.setProperty("--sun-opacity", s.sun.toFixed(3));
  root.style.setProperty("--sun-x", s.sunX + "%");
  root.style.setProperty("--sun-y", s.sunY + "%");
  root.style.setProperty("--night-veil", s.night.toFixed(3));
  root.style.setProperty("--stars-opacity", s.stars.toFixed(3));
  root.style.setProperty("--moon-opacity", s.moon.toFixed(3));
}

function measure() {
  docH = document.documentElement.scrollHeight;
  vh = innerHeight;
  setSky();
}

/* ============ ПЫЛИНКИ ============ */
const dust = document.getElementById("dust");
const dctx = dust.getContext("2d");
let motes = [];

function initDust() {
  const n = Math.min(90, Math.floor(innerWidth / 16));
  motes = Array.from({ length: n }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    r: Math.random() * 1.8 + 0.4,
    vy: -(Math.random() * 0.25 + 0.08),
    vx: (Math.random() - 0.5) * 0.16,
    tw: Math.random() * Math.PI * 2,
    hue: Math.random() < 0.6 ? 38 : 320,
  }));
}

function drawDust() {
  dctx.clearRect(0, 0, dust.width, dust.height);
  const t = performance.now() / 1000;
  for (const m of motes) {
    m.x += m.vx + Math.sin(t * 0.4 + m.tw) * 0.08;
    m.y += m.vy;
    if (m.y < -6) { m.y = dust.height + 6; m.x = Math.random() * dust.width; }
    const a = 0.28 + 0.22 * Math.sin(t * 1.4 + m.tw);
    dctx.beginPath();
    dctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    dctx.fillStyle = `hsla(${m.hue}, 90%, 78%, ${a})`;
    dctx.fill();
  }
}

/* ============ PAW-КУРСОР ============ */
const paw = document.querySelector(".paw");
const trail = document.querySelector(".paw-trail");
let mx = innerWidth / 2, my = innerHeight / 2;
let px = mx, py = my;
let lastX = mx, lastDir = 1;
let pawDown = false;

if (isTouch) {
  paw.style.display = "none";
  document.body.classList.add("has-native-cursor");
}

addEventListener("pointermove", (e) => {
  mx = e.clientX; my = e.clientY;
  lastDir = e.clientX >= lastX ? 1 : -1;
  lastX = e.clientX;
}, { passive: true });

const PAW_SVG =
  '<svg viewBox="0 0 100 100"><g fill="currentColor"><ellipse cx="50" cy="66" rx="20" ry="18"/><ellipse cx="20" cy="44" rx="9" ry="13" transform="rotate(-18 20 44)"/><ellipse cx="39" cy="30" rx="9" ry="13" transform="rotate(-6 39 30)"/><ellipse cx="61" cy="30" rx="9" ry="13" transform="rotate(6 61 30)"/><ellipse cx="80" cy="44" rx="9" ry="13" transform="rotate(18 80 44)"/></g></svg>';

function stampPaw(x, y, alt) {
  if (isTouch || reduced) return;
  const el = document.createElement("span");
  el.className = "print";
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.innerHTML = PAW_SVG;
  if (alt) el.style.transform += " scaleX(-1)";
  trail.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

addEventListener("pointerdown", (e) => {
  if (isTouch) return;
  pawDown = true;
  stampPaw(e.clientX, e.clientY, lastDir === -1);
});
addEventListener("pointerup", () => (pawDown = false));

let hoverTarget = false;
const HOVER_SELECTOR = "a, button, .card, .legend, .place, .counter";
document.addEventListener("pointerover", (e) => {
  hoverTarget = !!e.target.closest(HOVER_SELECTOR);
});

function tickPaw() {
  px = lerp(px, mx, 0.22);
  py = lerp(py, my, 0.22);
  paw.style.left = px + "px";
  paw.style.top = py + "px";
  paw.classList.toggle("is-alt", lastDir === -1);
  paw.classList.toggle("is-down", pawDown);
  paw.classList.toggle("is-hover", hoverTarget && !pawDown);
}

/* ============ HERO-КОТ: глаза следят, моргание ============ */
const heroCat = document.querySelector(".hero__cat");
const pupils = heroCat ? heroCat.querySelectorAll(".cat__pupil") : [];
const eyes = heroCat ? heroCat.querySelectorAll(".cat__eye") : [];

if (!reduced) {
  setInterval(() => {
    if (!heroCat) return;
    heroCat.classList.add("is-blinking");
    setTimeout(() => heroCat.classList.remove("is-blinking"), 300);
  }, 2600 + Math.random() * 3200);
}

function tickEyes() {
  if (!heroCat || reduced) return;
  eyes.forEach((eye) => {
    const r = eye.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = clamp((mx - cx) / r.width, -1, 1) * 2.6;
    const dy = clamp((my - cy) / r.height, -1, 1) * 1.6;
    const pupil = eye.querySelector(".cat__pupil");
    if (pupil) pupil.style.transform = `translate(${dx}px, ${dy}px)`;
  });
}

/* ============ NAV ============ */
const nav = document.querySelector(".nav");
function tickNav() {
  nav.classList.toggle("is-scrolled", scrollY > 40);
}

/* ============ REVEAL ============ */
const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        io.unobserve(en.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);
revealEls.forEach((el) => io.observe(el));

/* ============ СЧЁТЧИКИ ============ */
const fmt = new Intl.NumberFormat("ru-RU");
const counterIO = new IntersectionObserver(
  (entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      counterIO.unobserve(el);
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      const dur = 1600;
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = fmt.format(Math.round(target * eased)) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  },
  { threshold: 0.6 }
);
document.querySelectorAll(".counter__value").forEach((el) => counterIO.observe(el));

/* ============ ПАРАЛЛАКС ============ */
const parallaxEls = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
  el,
  speed: parseFloat(el.dataset.parallax),
}));

function tickParallax() {
  for (const { el, speed } of parallaxEls) {
    const r = el.getBoundingClientRect();
    const offset = (r.top + r.height / 2 - vh / 2) * -speed;
    el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
  }
}

/* ============ TILT-КАРТОЧКИ ============ */
document.querySelectorAll("[data-tilt]").forEach((card) => {
  const inner = card.querySelector(".card__inner");
  if (!inner || isTouch || reduced) return;
  let raf = null;
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      inner.style.transform = `rotateX(${(-ny * 7).toFixed(2)}deg) rotateY(${(nx * 9).toFixed(2)}deg) translateZ(10px)`;
    });
  });
  card.addEventListener("pointerleave", () => {
    if (raf) cancelAnimationFrame(raf);
    inner.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0)";
    inner.style.transition = "transform 0.7s cubic-bezier(0.16,1,0.3,1)";
    setTimeout(() => (inner.style.transition = ""), 700);
  });
});

/* ============ МАГНИТНЫЕ КНОПКИ ============ */
document.querySelectorAll("[data-magnetic]").forEach((btn) => {
  if (isTouch || reduced) return;
  btn.addEventListener("pointermove", (e) => {
    const r = btn.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    btn.style.transform = `translate(${dx * 0.28}px, ${dy * 0.32}px)`;
  });
  btn.addEventListener("pointerleave", () => {
    btn.style.transform = "";
  });
});

/* ============ MİYAV ============ */
function meow(x, y) {
  if (!x) {
    const b = document.querySelector(".finale")?.getBoundingClientRect();
    x = b ? b.left + b.width / 2 : innerWidth / 2;
    y = b ? b.top + b.height / 2 : innerHeight / 2;
  }
  const words = ["miyav!", "miau!", "мяу!", "meow!", "miyauv~"];
  const el = document.createElement("span");
  el.className = "meow-burst";
  el.textContent = words[Math.floor(Math.random() * words.length)];
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.setProperty("--mx", (Math.random() * 160 - 80) + "px");
  el.style.setProperty("--rot", (Math.random() * 24 - 12) + "deg");
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
  synthMeow();
}

function synthMeow() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = synthMeow.ctx || (synthMeow.ctx = new AC());
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(340, t + 0.34);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch {
    /* без звука */
  }
}

document.querySelectorAll("[data-meow]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const r = btn.getBoundingClientRect();
    meow(r.left + r.width / 2, r.top);
  });
});

/* ============ ГЛАВНЫЙ ЦИКЛ ============ */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    setSky();
    tickNav();
    tickParallax();
    ticking = false;
  });
}

function loop() {
  tickPaw();
  tickEyes();
  drawDust();
  requestAnimationFrame(loop);
}

addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", () => {
  measure();
  dust.width = innerWidth;
  dust.height = innerHeight;
  initDust();
});

/* старт */
measure();
dust.width = innerWidth;
dust.height = innerHeight;
initDust();
setSky();
loop();

/* печать при перезагрузке */
document.fonts?.ready.then(() => {
  setTimeout(() => {
    if (!isTouch) {
      const hb = document.querySelector(".hero__copy");
      const r = hb?.getBoundingClientRect();
      if (r) stampPaw(clamp(r.right, 40, innerWidth - 40), r.top + r.height * 0.7, false);
    }
  }, 900);
});
