(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('yr').textContent = new Date().getFullYear();

  /* theme toggle (remembered, fails safe if storage is blocked) */
  document.getElementById('theme').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (window.redrawNet) window.redrawNet();
  });

  /* gentle reveal on scroll; content stays visible if JS or IntersectionObserver is missing */
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('js');
    var els = document.querySelectorAll('.card, .panel, .timeline li, .prose, .facts, .mail-big');
    els.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* active nav link */
  var links = document.querySelectorAll('.nav a');
  if ('IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (a) { a.classList.remove('active'); });
          map[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* hero background: a quiet network of nodes (plain canvas, no libraries) */
  var canvas = document.getElementById('net');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  var dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0, nodes = [], raf = 0, visible = true;

  function color() { return getComputedStyle(root).getPropertyValue('--net').trim() || 'rgba(79,140,255,.5)'; }
  function size() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(70, Math.max(24, W * H / 15000)));
    nodes = [];
    for (var i = 0; i < n; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22 });
  }
  function draw(move) {
    ctx.clearRect(0, 0, W, H);
    var c = color(), max = 130, i, j, a, b, d;
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 1;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      if (move) { a.x += a.vx; a.y += a.vy; if (a.x < 0 || a.x > W) a.vx *= -1; if (a.y < 0 || a.y > H) a.vy *= -1; }
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, 6.283); ctx.fill();
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j]; d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < max) { ctx.globalAlpha = (1 - d / max) * 0.55; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
  }
  function loop() { if (!visible) return; draw(true); raf = requestAnimationFrame(loop); }
  window.redrawNet = function () { if (reduce) draw(false); };
  size();
  if (reduce) { draw(false); } else { loop(); }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (reduce) draw(false); }, 150); });
  function setVisible(v) {
    if (v === visible) return;
    visible = v;
    if (v && !reduce) loop(); else cancelAnimationFrame(raf);
  }
  var inView = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { inView = en[0].isIntersecting; setVisible(inView && !document.hidden); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { setVisible(inView && !document.hidden); });
})();
