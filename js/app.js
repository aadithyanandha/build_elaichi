/* Elaichi — the 360° walk-through: four rendered standing points, things to click in each,
   and the cards that open from them. Plain script on purpose (no build step, no modules). */
(function () {
  'use strict';

  const D = window.ELAICHI, T = window.ELAICHI_TOUR, Pano = window.ElaichiPano;
  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rupee = (n) => '₹' + n;
  const wrap = (a) => ((a + 540) % 360) - 180;               // an angle into -180..180
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const easeIO = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const body = document.body, room = $('#room'), canvas = $('#gl'), pinsEl = $('#pins');
  const layer = $('#layer'), veil = $('#veil'), topbar = $('#top'), hint = $('#hint'), placesEl = $('#places');
  const nodes = { board: $('#board'), ticket: $('#ticket'), panel: $('#panel'), dish: $('#dish') };
  const stack = [];                       // what is open, innermost last

  /* ------------------------------------------------------------------ credits (CC BY needs them shown) */
  D.panels.credits = {
    skin: 'paper', title: 'Credits',
    lead: 'The café was modelled and rendered in Blender. These scanned models are used under CC BY 4.0:',
    links: [
      ['Og Taiwanese Fried Chicken Burger — Food 3D Scan', 'riccardogiorato', 'https://sketchfab.com/3d-models/90684c129f1744b5ad3bc26644aad37e'],
      ['Burrito', 'UmangRank', 'https://sketchfab.com/3d-models/954206697c3147d294e887194d9892f4'],
      ['Chocolate Cake', 'chimaera_studio', 'https://sketchfab.com/3d-models/282eb10220434f91bca48f06922dd40a'],
      ['Chocolate Cake — Photogrammetry', 'ecanvas', 'https://sketchfab.com/3d-models/9fcaad09b2db4fc7bbd2dee00baa1a6d'],
      ['Cake red velvet', 'chimaera_studio', 'https://sketchfab.com/3d-models/b7026cb76cbf4a08b8083c1df8b18f13'],
      ['Dulce De Leche Cheesecake', 'terrielsimmons', 'https://sketchfab.com/3d-models/d1a532bae58049ac8a365b11ef22ed71'],
      ['Creative Commons Attribution 4.0 licence', 'Creative Commons', 'https://creativecommons.org/licenses/by/4.0/']
    ],
    foot: 'All were resized and some were trimmed or recoloured. Textures, plants and skies are from Poly Haven (CC0).'
  };

  /* ------------------------------------------------------------------ the studio behind the demo
     The address is put together here rather than written in the page, so simple scrapers miss it. */
  const STUDIO_MAIL = ['mailfromaadithya', 'gmail.com'].join('@');
  D.panels.studio = {
    skin: 'paper', title: 'Team Sapphire',
    lead: 'Elaichi is a demo. We built it to show what a website can feel like when visitors can step inside the place. We make sites like this for cafés, restaurants, resorts, travel agencies and property businesses.',
    mail: STUDIO_MAIL,
    foot: 'Tell us about your business and what you would like the website to do.'
  };

  /* ------------------------------------------------------------------ what a pin is called */
  function labelFor(open) {
    const p = open.split(':'), k = p[0], id = p[1];
    if (k === 'board') return D.boards[id].title;
    if (k === 'dish') return D.dishes[id].name;
    if (k === 'panel') return D.panels[id].title;
    return '';
  }
  const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

  /* ------------------------------------------------------------------ the view */
  const points = {}; T.points.forEach((p) => { points[p.id] = p; });
  let here = points.entrance;
  const view = { yaw: here.start.yaw, pitch: here.start.pitch, fov: 72 };
  const vel = { yaw: 0, pitch: 0 };
  let anim = null;                 // a running turn or step
  let pano = null, raf = 0, vw = 0, vh = 0;
  const tex = {};                  // id -> { small, full } textures as they arrive
  let blend = null;                // during a step: { from, mix, zoomA, zoomB }
  let saved = null;                // the view before something was opened

  function fovLimits() { const portrait = vw < vh; return portrait ? [55, 100] : [40, 90]; }
  function baseFov() { return vw < vh ? 88 : (vw < 900 ? 78 : 72); }

  function texFor(id) { const t = tex[id]; return t && (t.full || t.small); }

  function frame(now) {
    raf = 0;
    let moving = false;
    if (anim) {
      const t = clamp((now - anim.t0) / anim.ms, 0, 1);
      anim.step(anim.ease ? anim.ease(t) : t);
      if (t >= 1) { const done = anim.done; anim = null; if (done) done(); } else moving = true;
    } else if (!drag && (Math.abs(vel.yaw) > 0.005 || Math.abs(vel.pitch) > 0.005)) {
      view.yaw = wrap(view.yaw + vel.yaw); view.pitch = clamp(view.pitch + vel.pitch, -75, 75);
      vel.yaw *= 0.9; vel.pitch *= 0.9; moving = true;
    }
    paint();
    if (moving) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  function paint() {
    if (!pano) return;
    const s = { yaw: view.yaw, pitch: view.pitch, fov: view.fov, a: texFor(here.id), headA: here.heading, zoomA: 1 };
    if (blend) {
      s.a = texFor(blend.from.id); s.headA = blend.from.heading; s.zoomA = blend.zoomA;
      s.b = texFor(here.id); s.headB = here.heading; s.zoomB = blend.zoomB; s.mix = blend.mix;
    }
    pano.draw(s);
    placePins();
  }

  function turnTo(yaw, pitch, fov, ms, done) {
    const y0 = view.yaw, p0 = view.pitch, f0 = view.fov, dy = wrap(yaw - y0);
    vel.yaw = vel.pitch = 0;
    if (reduce) ms = Math.min(ms, 1);
    anim = { t0: performance.now(), ms: ms, ease: easeIO, done: done, step: (t) => {
      view.yaw = wrap(y0 + dy * t); view.pitch = p0 + (pitch - p0) * t; view.fov = f0 + (fov - f0) * t;
    } };
    kick();
  }

  /* ------------------------------------------------------------------ pins on things, rings on the floor */
  let pinEls = [];
  function buildPins() {
    pinsEl.innerHTML = '';
    pinEls = [];
    here.pins.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pin'; b.dataset.open = p.open;
      const label = p.open.indexOf('board:') === 0 ? titleCase(labelFor(p.open)) : labelFor(p.open);
      b.setAttribute('aria-label', label);
      b.innerHTML = '<span class="dot" style="--delay:' + (0.05 * i).toFixed(2) + 's"></span><span class="pin-label">' + esc(label) + '</span>';
      pinsEl.appendChild(b); pinEls.push({ el: b, yaw: p.yaw, pitch: p.pitch, open: p.open });
    });
    here.steps.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'step' + (s.floor ? ' on-floor' : ''); b.dataset.go = s.to;
      b.setAttribute('aria-label', 'Walk to: ' + s.label);
      b.innerHTML = '<span class="ring" aria-hidden="true"></span><span class="step-label">' + esc(s.label) + '</span>';
      pinsEl.appendChild(b); pinEls.push({ el: b, yaw: s.yaw, pitch: s.pitch, step: s });
    });
    placesEl.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-current', b.dataset.go === here.id ? 'true' : 'false'); });
    canvas.setAttribute('aria-label', 'Inside Elaichi, ' + here.name.toLowerCase() + '. Drag to look around.');
  }
  function placePins() {
    const hide = !!blend;
    for (let i = 0; i < pinEls.length; i++) {
      const p = pinEls[i], at = hide ? null : Pano.project(p.yaw, p.pitch, view, vw, vh);
      if (!at) { if (!p.el.hidden) p.el.hidden = true; continue; }
      if (p.el.hidden) p.el.hidden = false;
      p.el.style.transform = 'translate(' + at[0].toFixed(1) + 'px,' + at[1].toFixed(1) + 'px)';
      if (p.step) {   // a ring on the floor flattens with distance and with how steeply you look down at it
        const k = clamp(Math.sin(Math.abs(p.step.pitch) * Math.PI / 180) * 1.6, 0.28, 1);
        p.el.style.setProperty('--squash', p.step.floor ? k.toFixed(3) : '1');
        p.el.style.setProperty('--size', clamp(260 / Math.max(p.step.dist, 1) * 72 / view.fov, 34, 120).toFixed(1) + 'px');
      }
    }
  }
  const spotFor = (open) => { const p = pinEls.find((x) => x.open === open && !x.el.hidden); return p ? p.el : null; };

  /* ------------------------------------------------------------------ walking from one point to another */
  let walking = false;
  function ensure(id, full) {
    const t = tex[id] || (tex[id] = {});
    const p = points[id];
    if (!t.smallP) t.smallP = pano.load(p.small).then((x) => { t.small = x; kick(); });
    if (full && !t.fullP) t.fullP = pano.load(p.image).then((x) => { t.full = x; kick(); });
    return full ? Promise.race([t.fullP, t.smallP.then(() => new Promise((ok) => setTimeout(ok, 900)))]) : t.smallP;
  }
  function walkTo(id) {
    if (walking || !pano || id === here.id) return;
    const from = here, to = points[id], step = from.steps.find((s) => s.to === id);
    walking = true; hint.classList.add('is-done');
    const toward = step ? step.yaw : view.yaw;
    const ready = ensure(id, true);
    turnTo(toward, clamp(step ? step.pitch * 0.35 : 0, -12, 6), view.fov, reduce ? 1 : 520, () => {
      ready.then(() => {
        here = to; buildPins();
        blend = { from: from, mix: 0, zoomA: 1, zoomB: 1 };
        const f0 = view.fov, endFov = baseFov();
        anim = { t0: performance.now(), ms: reduce ? 260 : 950, ease: null, done: () => {
          blend = null; view.fov = endFov;
          ensure(id, true); preloadNext();
          // then turn to face the best view from here, if that is not the way you walked in
          const s0 = to.start, turn = Math.abs(wrap(s0.yaw - view.yaw));
          if (turn > 45) turnTo(s0.yaw, s0.pitch, endFov, reduce ? 1 : 900 + turn * 5, () => { walking = false; });
          else { walking = false; kick(); }
        }, step: (t) => {
          const e = easeIO(t);
          blend.mix = clamp((t - 0.18) / 0.6, 0, 1);
          blend.zoomA = reduce ? 1 : 1 - 0.42 * ease(Math.min(t * 1.25, 1));    // the old room rushes past
          blend.zoomB = reduce ? 1 : 1.22 - 0.22 * e;                             // the new one settles in
          view.pitch = view.pitch * (1 - 0.08);
          view.fov = f0 + (endFov - f0) * e;
        } };
        kick();
      });
    });
  }
  function preloadNext() {
    const order = here.steps.map((s) => s.to);
    order.reduce((p, id) => p.then(() => ensure(id, false)), Promise.resolve())
      .then(() => order.reduce((p, id) => p.then(() => ensure(id, true)), Promise.resolve()))
      .catch(() => {});
  }

  /* ------------------------------------------------------------------ looking around */
  let drag = null, justDragged = false;
  const pointers = new Map();
  room.addEventListener('pointerdown', (e) => {
    if (stack.length || walking) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) { const a = [...pointers.values()]; drag = { pinch: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), fov: view.fov, moved: true }; return; }
    drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false };
    anim = null; vel.yaw = vel.pitch = 0;
  });
  room.addEventListener('pointermove', (e) => {
    if (!drag || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (drag.pinch) {
      const a = [...pointers.values()]; if (a.length < 2) return;
      const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), lim = fovLimits();
      view.fov = clamp(drag.fov * drag.pinch / d, lim[0], lim[1]); kick(); return;
    }
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    if (!drag.moved) { drag.moved = true; room.setPointerCapture(e.pointerId); body.classList.add('is-dragging'); }
    const k = view.fov / vh, dx = (e.clientX - drag.lx) * k, dy = (e.clientY - drag.ly) * k, now = performance.now(), dt = Math.max(now - drag.lt, 8);
    view.yaw = wrap(view.yaw - dx); view.pitch = clamp(view.pitch + dy, -75, 75);
    vel.yaw = -dx * 16 / dt; vel.pitch = dy * 16 / dt;
    drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
    kick();
  });
  function endDrag(e) {
    pointers.delete(e.pointerId);
    if (!drag) return;
    if (drag.pinch) { if (pointers.size === 0) drag = null; return; }
    if (drag.moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 80); hint.classList.add('is-done'); }
    if (performance.now() - drag.lt > 90) vel.yaw = vel.pitch = 0;
    drag = null; body.classList.remove('is-dragging'); kick();
  }
  room.addEventListener('pointerup', endDrag); room.addEventListener('pointercancel', endDrag);
  room.addEventListener('wheel', (e) => {
    if (stack.length) return;
    e.preventDefault();
    const lim = fovLimits();
    view.fov = clamp(view.fov * Math.exp(e.deltaY * 0.0012), lim[0], lim[1]); kick();
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (stack.length || walking || e.altKey || e.metaKey || e.ctrlKey) return;
    const k = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (!k || (document.activeElement && document.activeElement.closest('.places'))) return;
    e.preventDefault();
    turnTo(view.yaw + k[0], clamp(view.pitch + k[1], -60, 60), view.fov, 260);
  });

  /* ------------------------------------------------------------------ turning toward what was opened */
  function focusOn(fromEl, z) {
    const p = fromEl && pinEls.find((x) => x.el === fromEl);
    if (!p || !pano) return;
    if (!saved) saved = { fov: view.fov };
    turnTo(p.yaw, clamp(p.pitch, -40, 40), Math.max(view.fov / (z || 1.15), fovLimits()[0]), 700);
  }
  function unfocus() {
    if (saved && pano) { turnTo(view.yaw, view.pitch, saved.fov, 600); }
    saved = null;
  }

  /* ------------------------------------------------------------------ line drawings for the drinks */
  const ART = {
    shake:    '<path d="M41 40h38l-6 62a7 7 0 0 1-7 6H54a7 7 0 0 1-7-6z"/><path d="M39 40c-2-9 4-15 12-13 2-8 12-11 18-5 8-3 15 3 13 11 3 2 3 5 1 7"/><path d="M66 23l7-17h9"/><path d="M44 64h32"/>',
    icecream: '<path d="M30 62h60c0 14-12 24-30 24S30 76 30 62z"/><path d="M60 86v15M45 104h30"/><path d="M34 62a14 14 0 0 1 26-7 14 14 0 0 1 26 7"/><path d="M46 46a14 14 0 0 1 28 0"/>',
    tea:      '<path d="M36 50h48l-4 36a8 8 0 0 1-8 7H48a8 8 0 0 1-8-7z"/><path d="M83 58h6a9 9 0 0 1 0 18h-8"/><path d="M27 103h66"/><path d="M52 40c-4-6 4-9 0-16M66 40c-4-6 4-9 0-16"/>',
    coffee:   '<path d="M32 54h52v10c0 16-11 26-26 26S32 80 32 64z"/><path d="M84 60h5a9 9 0 0 1 0 18h-7"/><path d="M22 100c12 6 60 6 72 0"/><path d="M50 44c-4-6 4-9 0-16M64 44c-4-6 4-9 0-16"/>',
    frappe:   '<path d="M42 48h36l-5 54a7 7 0 0 1-7 6H54a7 7 0 0 1-7-6z"/><path d="M40 48a20 20 0 0 1 40 0z"/><path d="M60 30V8"/><path d="M45 72h30"/>',
    bun:      '<path d="M24 78c0-22 16-36 36-36s36 14 36 36z"/><path d="M22 78h76a6 6 0 0 1 0 12H22a6 6 0 0 1 0-12z"/><path d="M46 54c4 4 4 9 0 13M60 50c4 5 4 11 0 16M74 54c4 4 4 9 0 13"/>'
  };
  const art = (k) => '<svg class="art" viewBox="14 0 92 116" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ART[k] || ART.coffee) + '</svg>';
  const X = '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 3l12 12M15 3L3 15"/></svg>';
  const closeBtn = (label) => '<button type="button" class="close" data-close aria-label="' + esc(label) + '">' + X + '</button>';

  /* ------------------------------------------------------------------ opening and closing */
  // grow from (or shrink back to) the object on the wall
  function fly(node, rect, inward) {
    if (reduce || !node || !rect || !rect.width) return null;
    const to = node.getBoundingClientRect();
    if (!to.width) return null;
    const a = {
      transform: 'translate(' + (rect.left + rect.width / 2 - to.left - to.width / 2).toFixed(1) + 'px,' +
                 (rect.top + rect.height / 2 - to.top - to.height / 2).toFixed(1) + 'px) scale(' +
                 (rect.width / to.width).toFixed(4) + ',' + (rect.height / to.height).toFixed(4) + ')',
      opacity: 0.15
    };
    const b = { transform: 'translate(0,0) scale(1,1)', opacity: 1 };
    return node.animate(inward ? [a, b] : [b, a], {
      duration: inward ? 640 : 360,
      easing: inward ? 'cubic-bezier(.16,.84,.24,1)' : 'cubic-bezier(.5,0,.75,.2)',
      fill: inward ? 'none' : 'forwards'
    });
  }

  function show(kind, node, fromEl, flyNode) {
    if (!stack.length) {
      layer.hidden = false;
      void layer.offsetWidth;                       // let the veil and blur fade in
      body.classList.add('is-open');
      room.inert = true; topbar.inert = true;
      hint.classList.add('is-done');
    } else {
      stack[stack.length - 1].node.classList.add('is-under');
    }
    const fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
    node.hidden = false;
    node.classList.remove('is-out', 'is-under');
    node.scrollTop = 0;
    stack.push({ kind: kind, node: node, fromEl: fromEl, flyNode: flyNode || (() => node), opener: document.activeElement });
    fly((flyNode || (() => node))(), fromRect, true);
    const first = node.querySelector('[data-autofocus]') || node.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  function closeTop() {
    const top = stack.pop();
    if (!top) return;
    const node = top.node;
    node.classList.add('is-out');
    const finish = () => { node.hidden = true; node.classList.remove('is-out'); if (top.kind === 'dish') { currentDish = null; node.innerHTML = ''; } };
    const anim = top.fromEl ? fly(top.flyNode(), top.fromEl.getBoundingClientRect(), false) : null;
    if (anim) anim.finished.then(() => { finish(); anim.cancel(); }, finish); else finish();

    if (stack.length) {
      stack[stack.length - 1].node.classList.remove('is-under');
    } else {
      body.classList.remove('is-open');
      room.inert = false; topbar.inert = false;
      unfocus();
      setTimeout(() => { if (!stack.length) layer.hidden = true; }, 560);
    }
    if (top.opener && document.contains(top.opener)) top.opener.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ a menu board */
  function openBoard(id, fromEl) {
    const b = D.boards[id], node = nodes.board;
    node.dataset.board = id;
    node.innerHTML = closeBtn('Close the menu') +
      '<div class="card-body">' +
        '<h2 class="board-title" id="board-title">' + esc(b.title) + '</h2>' +
        '<p class="board-note">' + esc(b.note) + '</p>' +
        '<ul class="board-items">' + b.items.map((it, i) =>
          '<li><button type="button" class="item" data-item="' + i + '">' +
            '<span class="item-name">' + esc(it.name) + '</span>' +
            '<span class="item-price">' + rupee(it.price) + '</span>' +
            '<span class="item-line">' + esc(it.line) + '</span>' +
          '</button></li>').join('') + '</ul>' +
        '<div class="board-art">' + art(b.art) + '</div>' +
        '<p class="board-foot">Choose one to see what goes into it.</p>' +
      '</div>';
    focusOn(fromEl, 1.16, 0.55);
    show('board', node, fromEl);
  }

  function openItem(boardId, index, fromEl) {
    const b = D.boards[boardId], it = b.items[index], node = nodes.ticket;
    node.innerHTML = closeBtn('Back to the menu') +
      '<div class="card-body">' +
        '<div class="ticket-art">' + art(it.art || b.art) + '</div>' +
        '<h2 class="ticket-title" id="ticket-title">' + esc(it.name) + '</h2>' +
        '<p class="ticket-price">' + rupee(it.price) + (it.natural ? '<span class="natural">All natural</span>' : '') + '</p>' +
        '<p class="ticket-line">' + esc(it.line) + '</p>' +
        '<h3 class="ticket-h">What goes into it</h3>' +
        '<ul class="made">' + it.made.map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul>' +
        (it.tip ? '<p class="ticket-tip">' + esc(it.tip) + '</p>' : '') +
      '</div>';
    show('ticket', node, fromEl);
  }

  /* ------------------------------------------------------------------ contact, reviews, about, cups */
  function openPanel(id, fromEl) {
    const p = D.panels[id], node = nodes.panel;
    let inner = '<h2 class="panel-title" id="panel-title">' + esc(p.title) + '</h2>';
    if (p.rows) inner += '<dl class="rows">' + p.rows.map((r) => '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') + '</dl>';
    if (p.action) inner += '<button type="button" class="action" data-note="' + esc(p.actionNote) + '">' + esc(p.action) + '</button><p class="action-note" role="status"></p>';
    if (p.summary) inner += '<p class="score"><span class="star" aria-hidden="true">★</span>' + p.summary.rating + ' out of 5, from ' + p.summary.count + ' visitors</p>';
    if (p.quotes) inner += '<div class="quotes">' + p.quotes.map(quote).join('') + '</div>';
    if (p.body) inner += '<div class="prose">' + p.body.map((t) => '<p>' + esc(t) + '</p>').join('') + '</div>';
    if (p.lead) inner += '<p class="lead">' + esc(p.lead) + '</p>';
    if (p.list) inner += '<ul class="goods">' + p.list.map((g) => '<li><b>' + esc(g[0]) + '</b><i>' + rupee(g[1]) + '</i><span>' + esc(g[2]) + '</span></li>').join('') + '</ul>';
    if (p.links) inner += '<ul class="credits">' + p.links.map((l) => '<li><a href="' + esc(l[2]) + '" target="_blank" rel="noopener">' + esc(l[0]) + '</a><span>by ' + esc(l[1]) + '</span></li>').join('') + '</ul>';
    if (p.mail) inner += '<a class="mail" href="mailto:' + esc(p.mail) + '?subject=' + encodeURIComponent('A website like Elaichi') + '">' + esc(p.mail) + '</a>';
    if (p.foot) inner += '<p class="panel-foot">' + esc(p.foot) + '</p>';
    node.className = 'card panel ' + p.skin;
    node.innerHTML = (p.skin === 'walnut' ? '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>' : '') +
      closeBtn('Close') + '<div class="card-body">' + inner + '</div>';
    focusOn(fromEl, 1.12, 0.5);
    show('panel', node, fromEl);
  }
  function quote(q) { return '<blockquote class="quote" style="margin:0"><p>“' + esc(q[0]) + '”</p><cite>' + esc(q[1]) + '</cite></blockquote>'; }

  /* ------------------------------------------------------------------ a plate from the display
     Shows the photo straight away. If models/<id>.glb exists, the plate becomes a
     3D model you can turn all the way round. */
  let currentDish = null, viewerLoading = null;
  const modelKnown = {};
  function hasModel(id) {
    if (!(id in modelKnown)) {
      modelKnown[id] = fetch('models/' + id + '.glb', { method: 'HEAD' })
        .then((r) => r.ok && !/text\/html/.test(r.headers.get('content-type') || ''))
        .catch(() => false);
    }
    return modelKnown[id];
  }
  function loadViewer() {
    if (!viewerLoading) {
      viewerLoading = new Promise((ok, fail) => {
        if (window.customElements && customElements.get('model-viewer')) return ok();
        const s = document.createElement('script');
        s.src = 'vendor/model-viewer-umd.min.js'; s.onload = ok; s.onerror = fail;
        document.head.appendChild(s);
      });
    }
    return viewerLoading;
  }
  function make3D(id) {
    hasModel(id).then((yes) => (yes && currentDish === id) ? loadViewer() : Promise.reject())
      .then(() => {
        const plate = $('.plate', nodes.dish);
        if (!plate || currentDish !== id) return;
        const mv = document.createElement('model-viewer');
        const attrs = {
          src: 'models/' + id + '.glb', alt: D.dishes[id].name + ', a 3D model you can turn',
          'camera-controls': '', 'auto-rotate': '', 'auto-rotate-delay': '600', 'rotation-per-second': '20deg',
          'interaction-prompt': 'none', 'disable-zoom': '', 'disable-pan': '', 'touch-action': 'pan-y',
          'camera-orbit': '25deg 60deg auto', 'min-camera-orbit': 'auto 30deg auto', 'max-camera-orbit': 'auto 82deg auto',
          'shadow-intensity': '1', 'shadow-softness': '1', exposure: '1.05', 'environment-image': 'neutral'
        };
        Object.keys(attrs).forEach((k) => mv.setAttribute(k, attrs[k]));
        mv.addEventListener('load', () => plate.classList.add('is-3d'));
        plate.appendChild(mv);
      }).catch(() => {});
  }

  function dishHTML(id) {
    const d = D.dishes[id], shelf = D.shelves[d.shelf];
    return '<button type="button" class="dish-close" data-close>Close' + X + '</button>' +
      '<div class="dish-stage">' +
        '<div class="plate"><img class="plate-photo" src="assets/dishes/' + id + '.webp" alt="' + esc(d.name) + ' on a white plate" draggable="false"></div>' +
        '<p class="turn-note">Drag to turn the plate</p>' +
      '</div>' +
      '<div class="dish-text">' +
        '<p class="dish-kind"><span class="mark' + (d.veg ? '' : ' nonveg') + '" aria-hidden="true"></span>' + (d.veg ? 'Vegetarian' : 'Non-vegetarian') + ', from the ' + esc(shelf.name.toLowerCase()) + ' shelf</p>' +
        '<h2 class="dish-name" id="dish-title">' + esc(d.name) + '</h2>' +
        '<p class="dish-price">' + rupee(d.price) + '</p>' +
        '<p class="dish-line">' + esc(d.line) + '</p>' +
        '<p class="dish-made">' + esc(d.made) + '.</p>' +
        '<p class="dish-score"><span class="star" aria-hidden="true">★</span>' + d.rating + ' out of 5, from ' + d.count + ' reviews</p>' +
        d.reviews.map(quote).join('') +
      '</div>' +
      (shelf.order.length > 1 ?
        '<nav class="dish-switch" aria-label="More from this shelf">' + shelf.order.map((o) =>
          '<button type="button" data-dish="' + o + '" aria-label="' + esc(D.dishes[o].name) + '" title="' + esc(D.dishes[o].name) + '"' + (o === id ? ' aria-current="true"' : '') + '>' +
          '<img src="assets/dishes/' + o + '-thumb.webp" alt="" draggable="false"></button>').join('') + '</nav>' : '');
  }
  function openDish(id, fromEl) {
    const node = nodes.dish;
    currentDish = id;
    node.innerHTML = dishHTML(id);
    focusOn(fromEl, 1.2, 0.5);
    show('dish', node, fromEl, () => $('.plate', node));
    make3D(id);
  }
  function swapDish(id) {
    const node = nodes.dish, top = stack[stack.length - 1];
    if (id === currentDish || !top || top.kind !== 'dish') return;
    node.classList.add('is-swapping');
    setTimeout(() => {
      currentDish = id;
      node.innerHTML = dishHTML(id);
      node.classList.remove('is-swapping');
      top.fromEl = spotFor('dish:' + id) || top.fromEl;      // it goes back to its own tray
      focusOn(top.fromEl, 1.2, 0.5);
      const cur = node.querySelector('.dish-switch [aria-current="true"]');
      if (cur) cur.focus({ preventScroll: true });
      make3D(id);
    }, reduce ? 0 : 190);
  }
  // while it is still a photo, let it lean a little toward the pointer
  nodes.dish.addEventListener('pointermove', (e) => {
    const img = $('.plate-photo', nodes.dish);
    if (!img || reduce || e.pointerType !== 'mouse') return;
    const r = img.getBoundingClientRect();
    const nx = clamp((e.clientX - r.left - r.width / 2) / r.width, -1, 1), ny = clamp((e.clientY - r.top - r.height / 2) / r.height, -1, 1);
    img.style.setProperty('--ry', (nx * 9).toFixed(2) + 'deg');
    img.style.setProperty('--rx', (-ny * 7).toFixed(2) + 'deg');
  });

  /* ------------------------------------------------------------------ wiring */
  function route(open, fromEl) {
    const parts = open.split(':'), kind = parts[0], ref = parts[1];
    if (kind === 'board') openBoard(ref, fromEl);
    else if (kind === 'dish') openDish(ref, fromEl);
    else if (kind === 'panel') openPanel(ref, fromEl);
  }
  document.addEventListener('click', (e) => {
    const t = e.target;
    const closer = t.closest('[data-close]');
    if (closer) { closeTop(); return; }
    const item = t.closest('.item');
    if (item) { openItem(nodes.board.dataset.board, +item.dataset.item, item); return; }
    const sw = t.closest('[data-dish]');
    if (sw) { swapDish(sw.dataset.dish); return; }
    const act = t.closest('.action');
    if (act) { act.nextElementSibling.textContent = act.dataset.note; return; }
    if (justDragged) return;
    const go = t.closest('[data-go]');
    if (go) { walkTo(go.dataset.go); return; }
    const opener = t.closest('[data-open]');
    if (opener) {
      const pin = opener.classList.contains('pin') ? opener : spotFor(opener.dataset.open);
      route(opener.dataset.open, pin || opener);
    }
  });
  veil.addEventListener('click', closeTop);
  document.addEventListener('keydown', (e) => {
    if (!stack.length) return;
    if (e.key === 'Escape') { e.preventDefault(); closeTop(); return; }
    if (e.key === 'Tab') {                                // keep the keyboard inside whatever is open
      const node = stack[stack.length - 1].node;
      const f = Array.prototype.filter.call(node.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])'), (x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      else if (!node.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------------------ arrive */
  function layout() {
    vw = innerWidth; vh = innerHeight;
    if (pano) pano.size(vw, vh, Math.min(devicePixelRatio || 1, 2));
    const lim = fovLimits(); view.fov = clamp(view.fov, lim[0], lim[1]);
    kick();
  }
  addEventListener('resize', layout);

  T.points.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.go = p.id;
    b.innerHTML = '<span class="long">' + esc(p.name) + '</span><span class="short" aria-hidden="true">' + esc(p.short) + '</span>';
    placesEl.appendChild(b);
  });
  hint.textContent = fine ? 'Drag to look around. Click a menu board or the food to see it up close, or a circle on the floor to walk there.'
                          : 'Drag to look around. Tap a menu board or the food, or a circle on the floor to walk there.';

  function showFlat() {                                     // no WebGL: one still picture and the menus as buttons
    pano = null; body.classList.add('is-flat');
    placesEl.innerHTML = '';
    Object.keys(D.boards).forEach((id) => {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.open = 'board:' + id; b.textContent = titleCase(D.boards[id].title);
      placesEl.appendChild(b);
    });
    hint.textContent = 'This browser cannot show the 360° view, so here is the counter. Choose a menu below.';
    return new Promise((ok) => { const img = $('#flat'); img.onload = img.onerror = ok; img.src = img.dataset.src; if (img.complete && img.naturalWidth) ok(); });
  }

  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  let loaded;
  try { if (Pano && !/[?&]flat\b/.test(location.search)) pano = new Pano(canvas); } catch (e) { pano = null; }
  if (pano) {
    body.classList.add('is-3d');
    pano.onlost = () => { location.reload(); };
    layout();
    view.fov = baseFov() * (reduce ? 1 : 1.12);
    buildPins();
    loaded = ensure(here.id, false).then(() => { ensure(here.id, true); kick(); }, showFlat);
  } else {
    layout();
    loaded = showFlat();
  }
  const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(1600)]) : wait(0);
  Promise.all([loaded, fonts, wait(reduce ? 0 : 700)]).then(() => {
    body.classList.remove('is-loading');
    if (pano) {
      turnTo(view.yaw, view.pitch, baseFov(), reduce ? 1 : 1600);   // a slow breath in as the room appears
      setTimeout(preloadNext, 1200);
    }
    setTimeout(() => body.classList.add('is-ready'), reduce ? 0 : 900);
  });
})();
