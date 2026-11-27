import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 860px)').matches || 'ontouchstart' in window;
const { gsap } = window;
const ST = window.ScrollTrigger;
if (reduce) document.documentElement.classList.add('reduce');
document.getElementById('yr').textContent = new Date().getFullYear();

/* wrap hero name lines so they can slide up */
document.querySelectorAll('.name span').forEach(s => { s.innerHTML = '<b>' + s.textContent + '</b>'; });

/* ================= smooth scroll (Lenis) ================= */
let lenis = null;
if (window.Lenis && !reduce) {
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
  if (gsap && ST) {
    gsap.registerPlugin(ST);
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
} else if (gsap && ST) { gsap.registerPlugin(ST); }

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const t = id === '#top' ? 0 : document.querySelector(id);
    if (t === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(t, { duration: 1.6 }); else (t === 0 ? window.scrollTo({ top: 0, behavior: 'smooth' }) : t.scrollIntoView({ behavior: 'smooth' }));
  });
});

/* ================= WebGL world ================= */
const canvas = document.getElementById('bg');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
const state = { scroll: 0, max: 1, camZ: 6 };
const STATIONS = [-1, -26, -52, -78, -104];       // z of each scene
const HOLD = STATIONS.map(z => z + 7);            // camera z while reading that section

let world = null;
function buildWorld() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08060d);
  scene.fog = new THREE.FogExp2(0x08060d, 0.021);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0, 6);

  const VIOLET = 0xa78bfa, DEEP = 0x7c3aed, PINK = 0xf0abfc;
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...o });
  const lineM = (c, o = 0.6) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false });

  /* ---- starfield spanning the whole journey ---- */
  const N = isMobile ? 900 : 2600;
  const sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    sp[i * 3] = (Math.random() - 0.5) * 40;
    sp[i * 3 + 1] = (Math.random() - 0.5) * 24;
    sp[i * 3 + 2] = 14 - Math.random() * 135;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc4b5fd, size: 0.045, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }));
  scene.add(stars);

  /* ---- S0: portcullis gate ---- */
  const gate = new THREE.Group();
  const W = 4.4, H = 3.6, bars = 9, rows = 6, pts = [];
  for (let i = 0; i <= bars; i++) { const x = -W / 2 + (W / bars) * i; pts.push(x, -H / 2, 0, x, H / 2, 0); }
  for (let j = 0; j <= rows; j++) { const y = -H / 2 + (H / rows) * j; pts.push(-W / 2, y, 0, W / 2, y, 0); }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  gate.add(new THREE.LineSegments(gg, lineM(VIOLET, 0.8)));
  const spikeGeo = new THREE.ConeGeometry(0.055, 0.3, 6);
  for (let i = 0; i <= bars; i++) {
    const m = new THREE.Mesh(spikeGeo, basic(PINK));
    m.position.set(-W / 2 + (W / bars) * i, -H / 2 - 0.15, 0); m.rotation.z = Math.PI; gate.add(m);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 3), basic(DEEP, { wireframe: true, transparent: true, opacity: 0.9 }));
  core.position.z = 0.4; gate.add(core);
  gate.position.set(isMobile ? 0 : 1.1, 0.1, STATIONS[0]);
  gate.rotation.y = -0.35;
  scene.add(gate);

  /* ---- S1: Lua moon ---- */
  const moon = new THREE.Group();
  moon.add(new THREE.Mesh(new THREE.SphereGeometry(1.7, 48, 48), basic(0x0b0716)));
  moon.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.72, 4), basic(VIOLET, { wireframe: true, transparent: true, opacity: 0.45 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.012, 8, 160), basic(PINK, { transparent: true, opacity: 0.9 }));
  ring.rotation.x = 1.15; moon.add(ring);
  const ring2 = ring.clone(); ring2.scale.setScalar(1.28); ring2.rotation.set(1.0, 0.5, 0); ring2.material = basic(VIOLET, { transparent: true, opacity: 0.5 }); moon.add(ring2);
  const sat = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), basic(0xffffff)); moon.add(sat);
  moon.position.set(isMobile ? 0 : 3.3, 0, STATIONS[1]);
  scene.add(moon);

  /* ---- S2: server rack ---- */
  const rack = new THREE.Group();
  const cols = 5, rws = 9, total = cols * rws;
  const unit = new THREE.BoxGeometry(0.62, 0.3, 0.9);
  const inst = new THREE.InstancedMesh(unit, basic(0xffffff), total);
  const dummy = new THREE.Object3D(); const color = new THREE.Color();
  const phase = new Float32Array(total);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rws; r++) {
    const i = c * rws + r;
    dummy.position.set((c - (cols - 1) / 2) * 0.72, (r - (rws - 1) / 2) * 0.4, 0);
    dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
    phase[i] = Math.random() * 6.28; inst.setColorAt(i, color.set(0x140c26));
  }
  rack.add(inst);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(cols * 0.72 + 0.1, rws * 0.4 + 0.1, 1.05)), lineM(VIOLET, 0.55));
  rack.add(edges);
  rack.position.set(isMobile ? 0 : -5.4, 0.3, STATIONS[2] - 2);
  rack.rotation.y = 0.5;
  scene.add(rack);

  /* ---- S3: globe with Altivora regions ---- */
  const globe = new THREE.Group();
  const R = 2;
  const gp = [];
  const GN = isMobile ? 900 : 2200;
  for (let i = 0; i < GN; i++) {
    const y = 1 - (i / (GN - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
    gp.push(Math.cos(th) * rad * R, y * R, Math.sin(th) * rad * R);
  }
  const ggeo = new THREE.BufferGeometry(); ggeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  globe.add(new THREE.Points(ggeo, new THREE.PointsMaterial({ color: VIOLET, size: 0.028, transparent: true, opacity: 0.85, toneMapped: false })));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 32, 32), basic(0x0b0716)));
  const ll = (lat, lon, r = R) => {
    const p = (90 - lat) * Math.PI / 180, t = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
  };
  const regions = [[12.97, 77.59], [1.35, 103.8], [39, -98], [50.1, 8.7], [45.4, -75.7]];
  const markers = [];
  regions.forEach(([la, lo], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.07 : 0.055, 16, 16), basic(i === 0 ? 0xffffff : PINK));
    m.position.copy(ll(la, lo)); globe.add(m); markers.push(m);
    const pr = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 32), basic(PINK, { transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    pr.position.copy(m.position); pr.lookAt(m.position.clone().multiplyScalar(2)); pr.userData.i = i; globe.add(pr); markers.push(pr);
  });
  const hub = ll(...regions[0]);
  regions.slice(1).forEach(([la, lo]) => {
    const end = ll(la, lo);
    const mid = hub.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.55);
    const curve = new THREE.QuadraticBezierCurve3(hub, mid, end);
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), lineM(PINK, 0.75)));
  });
  globe.position.set(isMobile ? 0 : 4.2, 0, STATIONS[3] - 2);
  globe.rotation.y = 4.2;
  scene.add(globe);

  /* ---- S4: portal ---- */
  const portal = new THREE.Group();
  const rings = [];
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(1.2 + i * 0.5, 0.02 + (4 - i) * 0.004, 8, 120), basic(i % 2 ? PINK : VIOLET, { transparent: true, opacity: 0.9 - i * 0.12 }));
    t.position.z = -i * 0.5; portal.add(t); rings.push(t);
  }
  const pc = 700, pv = new Float32Array(pc * 3), pa = new Float32Array(pc * 2);
  for (let i = 0; i < pc; i++) { pa[i * 2] = Math.random() * 6.28; pa[i * 2 + 1] = 0.6 + Math.random() * 3; pv[i * 3 + 2] = (Math.random() - 0.5) * 9; }
  const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.BufferAttribute(pv, 3));
  const stream = new THREE.Points(pgeo, new THREE.PointsMaterial({ color: PINK, size: 0.05, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  portal.add(stream);
  portal.position.set(isMobile ? 0 : 3, 0, STATIONS[4]);
  scene.add(portal);

  /* ---- post: bloom ---- */
  let composer = null;
  if (!isMobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.85, 0.7, 0.12));
    composer.addPass(new OutputPass());
  }

  const resize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); composer.setSize(w, h); }
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const s = w < 860 ? 0.7 : 1;
    [gate, moon, rack, globe, portal].forEach(o => o.scale.setScalar(s));
  };
  resize();
  window.addEventListener('resize', resize);

  return { scene, camera, composer, gate, core, moon, ring, ring2, sat, rack, inst, phase, dummy, color, globe, markers, portal, rings, stream, pa, pv, stars, total };
}

if (renderer) {
  world = buildWorld();
  window.addEventListener('pointermove', e => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
} else { canvas.remove(); document.body.style.background = '#08060d'; }

/* scroll -> station keyframes: hold on each section, glide between them */
let centers = [];
function measure() {
  const secs = [document.querySelector('.hero'), document.getElementById('about'), document.getElementById('work'), document.querySelector('.altivora'), document.getElementById('contact')];
  const y = window.scrollY;
  centers = secs.map(s => { const r = s.getBoundingClientRect(); return y + r.top + r.height / 2 - window.innerHeight / 2; });
  centers[0] = 0;
  centers[4] = Math.max(centers[4], document.documentElement.scrollHeight - window.innerHeight);
}
const smooth = x => x * x * (3 - 2 * x);
function sceneProgress(y) {
  if (centers.length < 5) return { z: 6, e: 0, i: 0, x: 0 };
  let i = 0;
  while (i < 3 && y > centers[i + 1]) i++;
  const span = Math.max(1, centers[i + 1] - centers[i]);
  const u = Math.min(1, Math.max(0, (y - centers[i]) / span));
  const e = smooth(Math.min(1, Math.max(0, (u - 0.22) / 0.56)));
  const z = HOLD[i] + (HOLD[i + 1] - HOLD[i]) * e;
  return { z, e, i };
}

/* ================= frame loop ================= */
const clock = new THREE.Clock();
let running = true, scrollNow = 0;
function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  if (!world) return;
  const t = clock.getElapsedTime();
  const y = lenis ? lenis.animatedScroll : window.scrollY;
  scrollNow += (y - scrollNow) * 0.12;
  mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
  const m = reduce ? 0 : 1;
  const { z, e, i } = sceneProgress(scrollNow);
  const { camera } = world;
  camera.position.z = z;
  camera.position.x = mouse.x * 0.45 * m + Math.sin(t * 0.3) * 0.08 * m;
  camera.position.y = -mouse.y * 0.28 * m + Math.cos(t * 0.27) * 0.06 * m;
  camera.rotation.z = Math.sin(e * Math.PI) * 0.05 * m;
  camera.lookAt(mouse.x * 0.3 * m, -mouse.y * 0.2 * m, z - 10);

  /* gate lifts then is passed */
  const lift = smooth(Math.min(1, scrollNow / Math.max(1, centers[1] * 0.55)));
  world.gate.position.y = 0.1 + lift * 4.2;
  world.gate.rotation.y = -0.35 + mouse.x * 0.3 * m + Math.sin(t * 0.4) * 0.05 * m;
  world.gate.visible = z > STATIONS[0] - 4;
  world.core.rotation.x = t * 0.3 * m; world.core.rotation.y = t * 0.4 * m;

  /* moon */
  world.moon.rotation.y = t * 0.12 * m; world.moon.rotation.x = 0.2;
  world.ring.rotation.z = t * 0.2 * m; world.ring2.rotation.z = -t * 0.14 * m;
  world.sat.position.set(Math.cos(t * 0.8) * 2.7, Math.sin(t * 0.8) * 2.7 * Math.cos(1.15), Math.sin(t * 0.8) * 2.7 * Math.sin(1.15));

  /* rack LEDs */
  const { inst, phase, dummy, color } = world;
  for (let k = 0; k < world.total; k++) {
    const v = Math.max(0, Math.sin(t * 1.6 + phase[k]) * Math.sin(t * 0.7 + phase[k] * 2.3));
    color.setRGB(0.05 + v * 0.3, 0.03 + v * 0.2, 0.1 + v * 0.6);
    inst.setColorAt(k, color);
  }
  inst.instanceColor.needsUpdate = true;
  world.rack.rotation.y = 0.5 + Math.sin(t * 0.25) * 0.12 * m + mouse.x * 0.1 * m;

  /* globe */
  world.globe.rotation.y += 0.0016 * m;
  world.markers.forEach(mk => { if (mk.userData.i !== undefined) { const s = 1 + ((t * 0.9 + mk.userData.i * 0.4) % 1) * 1.6; mk.scale.setScalar(s); mk.material.opacity = 0.8 * (1 - ((t * 0.9 + mk.userData.i * 0.4) % 1)); } });

  /* portal */
  world.rings.forEach((r, k) => { r.rotation.z = t * (0.15 + k * 0.07) * (k % 2 ? -1 : 1) * m; r.scale.setScalar(1 + Math.sin(t * 1.4 - k * 0.6) * 0.03); });
  const pos = world.stream.geometry.attributes.position.array, pa = world.pa;
  for (let k = 0; k < pos.length / 3; k++) {
    let zz = pos[k * 3 + 2] + 0.045 * (m ? 1 : 0);
    if (zz > 4.5) zz = -4.5;
    const a = pa[k * 2] + t * 0.15, rd = pa[k * 2 + 1] * (1 - (zz + 4.5) / 14);
    pos[k * 3] = Math.cos(a) * rd; pos[k * 3 + 1] = Math.sin(a) * rd; pos[k * 3 + 2] = zz;
  }
  world.stream.geometry.attributes.position.needsUpdate = true;

  world.stars.rotation.z = t * 0.004 * m;
  if (world.composer) world.composer.render(); else renderer.render(world.scene, camera);
}
document.addEventListener('visibilitychange', () => { const was = running; running = !document.hidden; if (running && !was) frame(); });

/* ================= UI motion ================= */
const bar = document.querySelector('.progress i');
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const y = lenis ? lenis.animatedScroll : window.scrollY;
  bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
}
(lenis ? (cb => lenis.on('scroll', cb)) : (cb => window.addEventListener('scroll', cb, { passive: true })))(updateProgress);

/* custom cursor */
const cur = document.querySelector('.cursor');
if (cur && !('ontouchstart' in window)) {
  let cx = 0, cy = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); }, { passive: true });
  (function loop() { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
  document.querySelectorAll('a,.card,.chip,.btn').forEach(el => {
    el.addEventListener('pointerenter', () => cur.classList.add('big'));
    el.addEventListener('pointerleave', () => cur.classList.remove('big'));
  });
}

/* card 3D tilt + spotlight */
document.querySelectorAll('.card').forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    if (!reduce) c.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateY(-4px)`;
  });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});

/* magnetic buttons */
if (!reduce) document.querySelectorAll('.btn,.mega,.resume').forEach(el => {
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px,${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

/* ================= intro + scroll reveals ================= */
function startAnimations() {
  measure();
  if (!gsap || !ST || reduce) {
    document.querySelectorAll('[data-count]').forEach(el => { el.textContent = el.dataset.count + (el.dataset.plus ? '+' : ''); });
    document.querySelectorAll('.reveal').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.hello', { y: 20, opacity: 0, duration: 0.8 }, 0.1)
    .from('.name span b', { yPercent: 115, duration: 1.2, stagger: 0.14, ease: 'power4.out' }, 0.2)
    .from('.loc', { opacity: 0, duration: 1 }, 0.9)
    .from('.an', { y: 20, opacity: 0, duration: 0.8 }, 0.5)
    .from('.social a, .resume, .nav > *', { opacity: 0, y: -12, stagger: 0.07, duration: 0.7 }, 0.7);

  const roles = gsap.utils.toArray('.role'); let ri = 0;
  const show = idx => {
    const el = roles[idx];
    gsap.fromTo(el, { yPercent: 70, opacity: 0, filter: 'blur(10px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' });
    gsap.to(el, { yPercent: -70, opacity: 0, filter: 'blur(10px)', duration: 0.6, delay: 2.5, ease: 'power2.in', onComplete: () => { ri = (ri + 1) % roles.length; show(ri); } });
  };
  gsap.delayedCall(0.9, () => show(0));

  /* hero text drifts away as the camera flies on */
  gsap.to('.hero-left', { yPercent: -30, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 20%', scrub: true } });
  gsap.to('.hero-right', { yPercent: -45, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true } });
  gsap.to('.scroll-cue', { opacity: 0, scrollTrigger: { trigger: '.hero', start: '5% top', end: '20% top', scrub: true } });

  gsap.utils.toArray('.reveal').forEach(el => {
    gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  gsap.utils.toArray('.sec-title').forEach(el => {
    gsap.fromTo(el, { letterSpacing: '0.18em' }, { letterSpacing: '0.01em', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 50%', scrub: true } });
  });
  gsap.utils.toArray('.cards .card').forEach((c, idx) => {
    gsap.fromTo(c, { rotateX: 14, scale: 0.94 }, { rotateX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: c, start: 'top 98%', end: 'top 60%', scrub: true } });
  });
  gsap.to('.marquee', { xPercent: -3, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });

  document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, plus = el.dataset.plus ? '+' : '', o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v) + plus; } });
  });
  ST.addEventListener('refresh', measure);
  ST.refresh();
}

/* ================= preloader ================= */
const ldBar = document.querySelector('.ld-bar i'), ldPct = document.querySelector('.ld-pct'), loader = document.getElementById('loader');
let p = 0, ready = document.readyState === 'complete';
window.addEventListener('load', () => { ready = true; });
const tick = setInterval(() => {
  p = Math.min(ready ? 100 : 88, p + (ready ? 7 : 2.4));
  ldBar.style.width = p + '%'; ldPct.textContent = Math.round(p);
  if (p >= 100) {
    clearInterval(tick);
    loader.classList.add('done'); document.body.classList.remove('loading');
    setTimeout(() => loader.remove(), 900);
    startAnimations();
    if (world) { measure(); frame(); }
  }
}, 30);
window.addEventListener('resize', () => { measure(); if (ST) ST.refresh(); });
