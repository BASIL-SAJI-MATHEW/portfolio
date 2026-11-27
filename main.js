import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const isMobile = window.matchMedia('(max-width: 860px)').matches || isTouch;
const gsap = window.gsap, ST = window.ScrollTrigger;
document.getElementById('yr').textContent = new Date().getFullYear();
const clamp01 = x => Math.min(1, Math.max(0, x));
const smooth = x => x * x * (3 - 2 * x);

/* ---------- inertia scrolling (desktop only; touch devices keep native momentum) ---------- */
let lenis = null;
if (window.Lenis && !reduce && !isTouch) {
  try {
    lenis = new window.Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
    if (gsap && ST) {
      gsap.registerPlugin(ST);
      lenis.on('scroll', ST.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  } catch (e) { lenis = null; }
}
const currentScroll = () => (lenis ? lenis.animatedScroll : window.scrollY);
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', ev => {
    const id = a.getAttribute('href'), target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    ev.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.5, offset: id === '#top' ? 0 : -64 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: 'smooth' }); else target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ---------- WebGL world ---------- */
const canvas = document.getElementById('bg');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }

const SECTIONS = ['#top', '#about', '#skills', '#projects', '#experience', '#contact'];
const NAMES = ['HOME', 'ABOUT', 'SKILLS', 'PROJECTS', 'BACKGROUND', 'CONTACT'];
const STATIONS = [-1, -26, -52, -78, -104, -130];
const HOLD = STATIONS.map(z => z + 7);
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
let centers = [], scrollNow = currentScroll(), vel = 0, world = null;

function build() {
  const BLUE = 0x5aa2ff, DEEP = 0x2563eb, CYAN = 0x22d3ee;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080f);
  scene.fog = new THREE.FogExp2(0x05080f, 0.019);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 240);
  camera.position.set(0, 0, 6);
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
  const lineM = (c, o = 0.6) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false });
  const side = isMobile ? 0 : 1;

  /* stars */
  const N = isMobile ? 700 : 2200, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 46; sp[i * 3 + 1] = (Math.random() - 0.5) * 28; sp[i * 3 + 2] = 14 - Math.random() * 170; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbcd9ff, size: 0.045, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }));
  scene.add(stars);

  /* infinite-looking grid floor that follows the camera (futuristic horizon) */
  const floor = new THREE.Group(), gl = [], span = 90, step = 3;
  for (let x = -span; x <= span; x += step) gl.push(x, 0, -span, x, 0, span);
  for (let z = -span; z <= span; z += step) gl.push(-span, 0, z, span, 0, z);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(gl, 3));
  floor.add(new THREE.LineSegments(fg, lineM(BLUE, 0.2)));
  floor.position.y = -3.6; scene.add(floor);

  /* light streaks along the flight path */
  const SN = isMobile ? 60 : 170, sl = [];
  for (let i = 0; i < SN; i++) {
    const x = (Math.random() - 0.5) * 30, y = (Math.random() - 0.5) * 16, z = 10 - Math.random() * 160, len = 1.5 + Math.random() * 5;
    if (Math.abs(x) < 1.6 && Math.abs(y) < 1.2) continue;
    sl.push(x, y, z, x, y, z - len);
  }
  const slg = new THREE.BufferGeometry(); slg.setAttribute('position', new THREE.Float32BufferAttribute(sl, 3));
  const streaks = new THREE.LineSegments(slg, lineM(CYAN, 0.3)); scene.add(streaks);

  /* S0 gate */
  const gate = new THREE.Group(), W = 4.4, H = 3.6, bars = 9, rows = 6, pts = [];
  for (let i = 0; i <= bars; i++) { const x = -W / 2 + (W / bars) * i; pts.push(x, -H / 2, 0, x, H / 2, 0); }
  for (let j = 0; j <= rows; j++) { const y = -H / 2 + (H / rows) * j; pts.push(-W / 2, y, 0, W / 2, y, 0); }
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  gate.add(new THREE.LineSegments(gg, lineM(BLUE, 0.85)));
  const spike = new THREE.ConeGeometry(0.055, 0.3, 6);
  for (let i = 0; i <= bars; i++) { const m = new THREE.Mesh(spike, basic(CYAN)); m.position.set(-W / 2 + (W / bars) * i, -H / 2 - 0.15, 0); m.rotation.z = Math.PI; gate.add(m); }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 3), basic(DEEP, { wireframe: true, transparent: true, opacity: 0.95 }));
  core.position.z = 0.4; gate.add(core);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.012, 8, 120), basic(CYAN, { transparent: true, opacity: 0.8 }));
  halo.position.z = 0.4; gate.add(halo);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.008, 8, 120), basic(BLUE, { transparent: true, opacity: 0.6 }));
  halo2.position.z = 0.4; gate.add(halo2);
  gate.position.set(2.7 * side, 0.1, STATIONS[0]); gate.rotation.y = -0.35; scene.add(gate);

  /* S1 moon */
  const moon = new THREE.Group();
  moon.add(new THREE.Mesh(new THREE.SphereGeometry(1.7, 48, 48), basic(0x0a1222)));
  moon.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.72, 4), basic(BLUE, { wireframe: true, transparent: true, opacity: 0.4 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.012, 8, 160), basic(CYAN, { transparent: true, opacity: 0.9 }));
  ring.rotation.x = 1.15; moon.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.01, 8, 160), basic(BLUE, { transparent: true, opacity: 0.5 }));
  ring2.rotation.set(1.0, 0.5, 0); moon.add(ring2);
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), basic(0xffffff)); moon.add(sat);
  moon.position.set(3.4 * side, 0, STATIONS[1]); scene.add(moon);

  /* S2 lattice */
  const lattice = new THREE.Group(), L = 4, lp = [];
  for (let x = 0; x < L; x++) for (let y = 0; y < L; y++) for (let z = 0; z < L; z++) lp.push((x - 1.5) * 0.9, (y - 1.5) * 0.9, (z - 1.5) * 0.9);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lattice.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: CYAN, size: 0.12, toneMapped: false })));
  lattice.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.7, 2.7, 2.7)), lineM(BLUE, 0.9)));
  const inner = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), basic(DEEP, { wireframe: true, transparent: true, opacity: 0.55 }));
  lattice.add(inner);
  lattice.position.set(-3.6 * side, 0, STATIONS[2]); scene.add(lattice);

  /* S3 rack */
  const rack = new THREE.Group(), cols = 5, rws = 9, total = cols * rws;
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.3, 0.9), basic(0xffffff), total);
  const dummy = new THREE.Object3D(), color = new THREE.Color(), phase = new Float32Array(total);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rws; r++) {
    const i = c * rws + r;
    dummy.position.set((c - (cols - 1) / 2) * 0.72, (r - (rws - 1) / 2) * 0.4, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    phase[i] = Math.random() * 6.28; inst.setColorAt(i, color.set(0x0c1424));
  }
  rack.add(inst);
  rack.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(cols * 0.72 + 0.1, rws * 0.4 + 0.1, 1.05)), lineM(BLUE, 0.55)));
  rack.position.set(4.6 * side, 0.2, STATIONS[3] - 2); rack.rotation.y = -0.5; scene.add(rack);

  /* S4 globe */
  const globe = new THREE.Group(), R = 2, gp = [], GN = isMobile ? 900 : 2200;
  for (let i = 0; i < GN; i++) { const y = 1 - (i / (GN - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963; gp.push(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R); }
  const ggeo = new THREE.BufferGeometry(); ggeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  globe.add(new THREE.Points(ggeo, new THREE.PointsMaterial({ color: BLUE, size: 0.028, transparent: true, opacity: 0.85, toneMapped: false })));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 32, 32), basic(0x0a1222)));
  const ll = (lat, lon, r = R) => { const p = (90 - lat) * Math.PI / 180, t = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); };
  const regions = [[12.97, 77.59], [1.35, 103.8], [39, -98], [50.1, 8.7], [45.4, -75.7]], pulses = [];
  regions.forEach(([la, lo], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.07 : 0.055, 16, 16), basic(i === 0 ? 0xffffff : CYAN)); m.position.copy(ll(la, lo)); globe.add(m);
    const pr = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 32), basic(CYAN, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    pr.position.copy(m.position); pr.lookAt(m.position.clone().multiplyScalar(2)); pr.userData.i = i; globe.add(pr); pulses.push(pr);
  });
  const hub = ll(...regions[0]);
  regions.slice(1).forEach(([la, lo]) => {
    const end = ll(la, lo), mid = hub.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.55);
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(hub, mid, end).getPoints(48)), lineM(CYAN, 0.8)));
  });
  globe.position.set(-4.2 * side, 0, STATIONS[4] - 2); globe.rotation.y = 4.2; scene.add(globe);

  /* S5 portal */
  const portal = new THREE.Group(), rings = [];
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 0.5, 0.02 + (4 - i) * 0.004, 8, 120), basic(i % 2 ? CYAN : BLUE, { transparent: true, opacity: 0.9 - i * 0.12 }));
    t.position.z = -i * 0.5; portal.add(t); rings.push(t);
  }
  const pc = 600, pv = new Float32Array(pc * 3), pa = new Float32Array(pc * 2);
  for (let i = 0; i < pc; i++) { pa[i * 2] = Math.random() * 6.28; pa[i * 2 + 1] = 0.6 + Math.random() * 3; pv[i * 3 + 2] = (Math.random() - 0.5) * 9; }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pv, 3));
  const stream = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: CYAN, size: 0.05, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  portal.add(stream); portal.position.set(3.2 * side, 0, STATIONS[5]); scene.add(portal);

  let composer = null;
  if (!isMobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.7, 0.65, 0.18));
    composer.addPass(new OutputPass());
  }
  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); composer.setSize(w, h); }
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const s = w < 860 ? 0.65 : 1;
    [gate, moon, lattice, rack, globe, portal].forEach(o => o.scale.setScalar(s));
  };
  resize(); window.addEventListener('resize', resize);
  return { scene, camera, composer, floor, streaks, gate, core, halo, halo2, moon, ring, ring2, sat, lattice, inner, rack, inst, phase, color, total, globe, pulses, portal, rings, stream, pa, stars };
}

if (renderer) { try { world = build(); } catch (e) { console.error(e); world = null; } }
if (!world) canvas.style.display = 'none';
else window.addEventListener('pointermove', e => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

function measure() {
  const y = window.scrollY;
  centers = SECTIONS.map(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return y + r.top + r.height / 2 - innerHeight / 2; });
  centers[0] = 0;
  centers[centers.length - 1] = Math.max(centers[centers.length - 1], document.documentElement.scrollHeight - innerHeight);
}
function journey(y) {
  if (centers.length < SECTIONS.length) return { z: HOLD[0], e: 0, i: 0 };
  let i = 0;
  while (i < centers.length - 2 && y > centers[i + 1]) i++;
  const u = clamp01((y - centers[i]) / Math.max(1, centers[i + 1] - centers[i]));
  const e = smooth(clamp01((u - 0.2) / 0.6));
  return { z: HOLD[i] + (HOLD[i + 1] - HOLD[i]) * e, e, i: u > 0.5 ? i + 1 : i };
}

/* ---------- HUD ---------- */
const hudSector = document.getElementById('hud-sector'), hudPct = document.getElementById('hud-pct'), hudZ = document.getElementById('hud-z');
const bar = document.querySelector('.progress i');
let lastSector = -1;
function updateHud(y, z, idx) {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight), p = clamp01(y / max);
  bar.style.transform = 'scaleX(' + p + ')';
  if (hudPct) hudPct.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';
  if (hudZ) hudZ.textContent = 'Z ' + (z < 0 ? '-' : '') + String(Math.abs(z).toFixed(1)).padStart(5, '0');
  if (idx !== lastSector) { lastSector = idx; if (hudSector) hudSector.textContent = 'SECTOR 0' + (idx + 1) + ' / ' + NAMES[idx]; }
}

/* ---------- frame loop (frame-rate independent) ---------- */
const clock = new THREE.Clock();
let running = true;
const perf = { start: performance.now() + 2500, frames: 0, level: 0 };
function checkPerf() {
  if (document.hidden || performance.now() < perf.start) return;
  perf.frames++;
  const el = performance.now() - perf.start;
  if (el < 1800 || perf.frames < 3) return;
  const fps = perf.frames / (el / 1000);
  perf.start = performance.now(); perf.frames = 0;
  if (fps >= 26) return;
  if (perf.level === 0) {
    perf.level = 1; world.composer = null;
    renderer.setPixelRatio(1); renderer.setSize(window.innerWidth, window.innerHeight, false);
    world.streaks.visible = false; world.stars.visible = !isMobile;
  } else if (perf.level === 1 && fps < 16) { perf.level = 2; running = false; root.classList.add('lite'); }
}
function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  checkPerf();
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, m = reduce ? 0 : 1;
  const k = 1 - Math.exp(-dt * 7);                       /* exponential smoothing, same feel at any fps */
  const target = currentScroll();
  const prev = scrollNow;
  scrollNow += (target - scrollNow) * (1 - Math.exp(-dt * 5.5));
  vel += (Math.min(1, Math.abs(scrollNow - prev) / Math.max(dt, 0.001) / 2500) - vel) * k;
  mouse.x += (mouse.tx - mouse.x) * k * 0.6; mouse.y += (mouse.ty - mouse.y) * k * 0.6;
  const w = world, { z, e, i } = journey(scrollNow), cam = w.camera;
  cam.position.set(mouse.x * 0.45 * m + Math.sin(t * 0.3) * 0.08 * m, -mouse.y * 0.28 * m + Math.cos(t * 0.27) * 0.06 * m, z);
  cam.rotation.z = Math.sin(e * Math.PI) * 0.05 * m;
  cam.lookAt(mouse.x * 0.3 * m, -mouse.y * 0.2 * m, z - 10);
  cam.fov = 55 + vel * 9 * m; cam.updateProjectionMatrix();          /* gentle warp when flying */
  w.floor.position.z = Math.round(z / 3) * 3;                        /* grid follows the camera, snapped so it never swims */
  w.streaks.material.opacity = 0.22 + vel * 0.6;

  w.gate.position.y = 0.1 + smooth(clamp01(scrollNow / Math.max(1, centers[1] * 0.55))) * 4.2;
  w.gate.rotation.y = -0.35 + mouse.x * 0.3 * m + Math.sin(t * 0.4) * 0.05 * m;
  w.gate.visible = z > STATIONS[0] - 4;
  w.core.rotation.x = t * 0.3 * m; w.core.rotation.y = t * 0.4 * m;
  w.halo.rotation.x = t * 0.5 * m; w.halo.rotation.y = t * 0.3 * m;
  w.halo2.rotation.x = -t * 0.35 * m; w.halo2.rotation.z = t * 0.25 * m;

  w.moon.rotation.y = t * 0.12 * m; w.moon.rotation.x = 0.2;
  w.ring.rotation.z = t * 0.2 * m; w.ring2.rotation.z = -t * 0.14 * m;
  w.sat.position.set(Math.cos(t * 0.8) * 2.7, Math.sin(t * 0.8) * 2.7 * Math.cos(1.15), Math.sin(t * 0.8) * 2.7 * Math.sin(1.15));
  w.lattice.rotation.y = t * 0.25 * m + mouse.x * 0.2 * m; w.lattice.rotation.x = t * 0.15 * m;
  w.inner.rotation.y = -t * 0.4 * m;

  for (let n = 0; n < w.total; n++) {
    const v = Math.max(0, Math.sin(t * 1.6 + w.phase[n]) * Math.sin(t * 0.7 + w.phase[n] * 2.3));
    w.color.setRGB(0.03 + v * 0.15, 0.06 + v * 0.45, 0.12 + v * 0.9); w.inst.setColorAt(n, w.color);
  }
  w.inst.instanceColor.needsUpdate = true;
  w.rack.rotation.y = -0.5 + Math.sin(t * 0.25) * 0.12 * m + mouse.x * 0.1 * m;
  w.globe.rotation.y += dt * 0.1 * m;
  w.pulses.forEach(p => { const ph = (t * 0.9 + p.userData.i * 0.4) % 1; p.scale.setScalar(1 + ph * 1.6); p.material.opacity = 0.8 * (1 - ph); });
  w.rings.forEach((r, n) => { r.rotation.z = t * (0.15 + n * 0.07) * (n % 2 ? -1 : 1) * m; r.scale.setScalar(1 + Math.sin(t * 1.4 - n * 0.6) * 0.03); });
  const pos = w.stream.geometry.attributes.position.array;
  for (let n = 0; n < pos.length / 3; n++) {
    let zz = pos[n * 3 + 2] + dt * 2.7 * m; if (zz > 4.5) zz = -4.5;
    const a = w.pa[n * 2] + t * 0.15, rd = w.pa[n * 2 + 1] * (1 - (zz + 4.5) / 14);
    pos[n * 3] = Math.cos(a) * rd; pos[n * 3 + 1] = Math.sin(a) * rd; pos[n * 3 + 2] = zz;
  }
  w.stream.geometry.attributes.position.needsUpdate = true;
  w.stars.rotation.z = t * 0.004 * m;
  updateHud(scrollNow, z, i);
  if (w.composer) w.composer.render(); else renderer.render(w.scene, cam);
}
document.addEventListener('visibilitychange', () => { const was = running; running = !document.hidden && perf.level < 2; if (running && !was && world) { clock.getDelta(); frame(); } });

/* ---------- decode effect, typing line, scroll reveals ---------- */
const GLYPHS = '01<>/\\{}[]#$%&*+=?';
function decode(el, ms = 700) {
  if (reduce) return;
  const final = el.dataset.final || (el.dataset.final = el.textContent), n = final.length, t0 = performance.now();
  (function step(now) {
    const p = clamp01((now - t0) / ms);
    let out = '';
    for (let i = 0; i < n; i++) out += (final[i] === ' ' || i < p * n) ? final[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step); else el.textContent = final;
  })(t0);
}
const termEl = document.getElementById('term-text');
if (termEl) {
  const text = termEl.dataset.text; let i = 0;
  if (reduce) termEl.textContent = text;
  else setTimeout(function type() { termEl.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(type, 28 + Math.random() * 40); }, 900);
}

function animate() {
  if (!gsap || !ST || reduce) return;
  gsap.registerPlugin(ST);
  gsap.to('.hero-inner', { yPercent: -14, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 25%', scrub: true } });
  document.querySelectorAll('.card, .panel, .prose, .facts, .timeline li, .mail-big').forEach(el => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  document.querySelectorAll('h2, .kicker').forEach(el => {
    el.classList.add('decode');
    ST.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => decode(el, el.tagName === 'H2' ? 900 : 600) });
  });
  document.querySelectorAll('.cards .card').forEach(c => {
    gsap.fromTo(c, { rotateX: 10, scale: 0.96 }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: c, start: 'top 98%', end: 'top 62%', scrub: true } });
  });
  document.querySelectorAll('.facts dt').forEach(el => {
    const raw = el.textContent.trim(), num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!isFinite(num) || raw.indexOf('/') > -1) return;
    const suffix = raw.replace(/[0-9.,]/g, ''), o = { v: 0 };
    gsap.to(o, { v: num, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } });
  });
  ST.addEventListener('refresh', measure);
  ST.refresh();
}
try { animate(); } catch (e) { console.error(e); }

const links = document.querySelectorAll('.nav a');
if ('IntersectionObserver' in window) {
  const map = {}; links.forEach(a => { map[a.getAttribute('href').slice(1)] = a; });
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && map[e.target.id]) { links.forEach(a => a.classList.remove('active')); map[e.target.id].classList.add('active'); }
  }), { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach(id => { const s = document.getElementById(id); if (s) so.observe(s); });
}
document.querySelectorAll('.card').forEach(c => {
  c.addEventListener('pointermove', e => {
    if (reduce) return;
    const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    c.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-3px)`;
  });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});

measure();
scrollNow = currentScroll();
window.addEventListener('load', () => { measure(); scrollNow = currentScroll(); });
window.addEventListener('resize', () => { measure(); if (ST) ST.refresh(); });
if (!world) { const f = () => { updateHud(currentScroll(), 6, 0); requestAnimationFrame(f); }; }
if (world) frame();
