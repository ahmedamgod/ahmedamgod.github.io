import { icon, art } from './art.js';
import { esc, num } from './util.js';

// ---------- Toast ----------
export function toast(msg, type = 'ok') {
  const host = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.setAttribute('role', 'status');
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

// ---------- Bottom sheet / modal ----------
let sheetStack = [];
export function sheet({ title, body, onMount, wide = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg" data-close></div>
    <section class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-handle"></div>
      <header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="قفل">${icon('x')}</button></header>
      <div class="sheet-body">${body}</div>
    </section>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => {
    wrap.classList.remove('open');
    sheetStack = sheetStack.filter((s) => s !== close);
    setTimeout(() => wrap.remove(), 250);
  };
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  sheetStack.push(close);
  const first = wrap.querySelector('input,textarea,select');
  if (first && !('ontouchstart' in window)) setTimeout(() => first.focus(), 260);
  onMount?.(wrap.querySelector('.sheet-body'), close);
  return close;
}
export const closeTopSheet = () => { const c = sheetStack[sheetStack.length - 1]; if (c) { c(); return true; } return false; };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTopSheet(); });

export function confirmBox(message, { ok = 'أيوه', cancel = 'لأ', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    sheet({
      title: 'متأكد؟',
      body: `<p class="muted center">${esc(message)}</p>
        <div class="row gap mt"><button class="btn ${danger ? 'danger' : 'primary'} grow" data-ok>${esc(ok)}</button><button class="btn ghost grow" data-close>${esc(cancel)}</button></div>`,
      onMount(el, close) {
        el.querySelector('[data-ok]').onclick = () => { done = true; resolve(true); close(); };
        const obs = new MutationObserver(() => { if (!el.isConnected) { obs.disconnect(); if (!done) resolve(false); } });
        obs.observe(document.body, { childList: true });
      },
    });
  });
}

// ---------- Celebration ----------
export function celebrate(text = 'برافو عليك! 🎉') {
  const c = document.createElement('div');
  c.className = 'celebrate';
  const petals = ['🌸', '🌼', '🍃', '✨', '🦋', '💚'];
  c.innerHTML = Array.from({ length: 22 }, (_, i) => `<span style="--x:${Math.random() * 100}%;--d:${0.6 + Math.random() * 1.2}s;--r:${Math.random() * 360}deg">${petals[i % petals.length]}</span>`).join('') + `<div class="cel-msg">${esc(text)}</div>`;
  document.body.appendChild(c);
  navigator.vibrate?.(30);
  setTimeout(() => c.remove(), 2400);
}

// ---------- Building blocks ----------
export function pageHead(title, { back = true, actions = '', sub = '' } = {}) {
  return `<header class="page-head">
    ${back ? `<button class="icon-btn" data-nav="back" aria-label="رجوع">${icon('back')}</button>` : '<span></span>'}
    <div class="ph-title"><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
    <div class="ph-actions">${actions || '<span class="icon-btn ghost-slot"></span>'}</div>
  </header>`;
}

export function empty(text, cta = '') {
  return `<div class="empty">${art('plant')}<p>${esc(text)}</p>${cta}</div>`;
}

export function progressBar(p, color = 'var(--green)') {
  const v = Math.max(0, Math.min(1, p || 0));
  return `<div class="pbar" role="progressbar" aria-valuenow="${Math.round(v * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${v * 100}%;background:${color}"></span></div>`;
}

export function ring(p, size = 64, stroke = 7, color = 'var(--green)', label = null) {
  const v = Math.max(0, Math.min(1, p || 0));
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--track)" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - v)}" transform="rotate(-90 ${size / 2} ${size / 2})" class="ring-fg"/>
    </svg><b>${label ?? num(Math.round(v * 100)) + '٪'}</b></div>`;
}

// رسم أعمدة بسيط (RTL: أقدم يوم على اليمين)
export function barChart(values, labels, { max = null, color = 'var(--green)', height = 130, fmt = (v) => num(Math.round(v)), goal = null } = {}) {
  const m = max ?? Math.max(1, ...values, goal || 0);
  const n = values.length;
  const showEvery = n > 14 ? Math.ceil(n / 7) : 1;
  return `<div class="chart bars" style="--h:${height}px" role="img" aria-label="رسم بياني">
    ${goal ? `<div class="goal-line" style="bottom:${(goal / m) * 100}%"><span>${fmt(goal)}</span></div>` : ''}
    <div class="bars-row">
      ${values.map((v, i) => `<div class="bar-col" title="${esc(labels[i])}: ${fmt(v)}">
        <div class="bar-val">${v && n <= 10 ? fmt(v) : ''}</div>
        <div class="bar" style="height:${Math.max(v ? 4 : 0, (v / m) * 100)}%;background:${typeof color === 'function' ? color(v, i) : color}"></div>
        <div class="bar-lbl">${i % showEvery === 0 ? esc(labels[i]) : ''}</div></div>`).join('')}
    </div></div>`;
}

export function lineChart(values, labels, { min = 0, max = 1, color = '#91AA62', height = 120, fmtY = (v) => num(Math.round(v * 100)) + '٪' } = {}) {
  const W = 320, H = height, P = 18;
  const n = values.length;
  const xs = (i) => (n === 1 ? W / 2 : W - P - (i * (W - 2 * P)) / (n - 1));
  const ys = (v) => H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
  const pts = values.map((v, i) => (v == null ? null : [xs(i), ys(v)]));
  let d = '', area = '';
  const segs = [];
  let cur = [];
  pts.forEach((p) => { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } });
  if (cur.length) segs.push(cur);
  for (const s of segs) {
    d += 'M' + s.map((p) => p.map((x) => x.toFixed(1)).join(' ')).join(' L');
    if (s.length > 1) area += `M${s[0][0].toFixed(1)} ${H - P} L` + s.map((p) => p.map((x) => x.toFixed(1)).join(' ')).join(' L') + ` L${s[s.length - 1][0].toFixed(1)} ${H - P}Z`;
  }
  const every = Math.ceil(n / 7);
  return `<div class="chart line"><svg viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="رسم خطي">
    <defs><linearGradient id="lg${color.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${[0, 0.5, 1].map((t) => `<line x1="${P}" x2="${W - P}" y1="${ys(min + t * (max - min))}" y2="${ys(min + t * (max - min))}" stroke="var(--track)" stroke-dasharray="3 4"/>
      <text x="${W - 2}" y="${ys(min + t * (max - min)) + 3}" class="axis" text-anchor="end">${fmtY(min + t * (max - min))}</text>`).join('')}
    <path d="${area}" fill="url(#lg${color.slice(1)})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p) => (p ? `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="var(--card)" stroke="${color}" stroke-width="2"/>` : '')).join('')}
    ${labels.map((l, i) => (i % every === 0 ? `<text x="${xs(i)}" y="${H + 10}" class="axis" text-anchor="middle">${esc(l)}</text>` : '')).join('')}
  </svg></div>`;
}

export function donut(parts, size = 130) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = size / 2 - 12, C = 2 * Math.PI * r;
  let off = 0;
  const segs = parts.filter((p) => p.value > 0).map((p) => {
    const len = (p.value / total) * C;
    const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="20" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    off += len;
    return s;
  });
  return `<div class="donut-wrap"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="توزيع">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="20"/>${segs.join('')}</svg>
    <ul class="legend">${parts.filter((p) => p.value > 0).map((p) => `<li><i style="background:${p.color}"></i>${esc(p.label)} <b>${num(Math.round((p.value / total) * 100))}٪</b></li>`).join('')}</ul></div>`;
}

export function chips(options, selected, name, multi = false) {
  return `<div class="chips" data-chips="${name}" data-multi="${multi}">${options.map((o) => {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    const on = multi ? (selected || []).includes(v) : selected === v;
    return `<button type="button" class="chip ${on ? 'on' : ''}" data-v="${esc(v)}" aria-pressed="${on}">${l}</button>`;
  }).join('')}</div>`;
}
export function bindChips(root, onChange) {
  root.querySelectorAll('[data-chips]').forEach((g) => {
    g.addEventListener('click', (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      const multi = g.dataset.multi === 'true';
      if (!multi) g.querySelectorAll('.chip').forEach((c) => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
      b.classList.toggle('on', multi ? undefined : true);
      b.setAttribute('aria-pressed', b.classList.contains('on'));
      onChange?.(g.dataset.chips, chipValue(g));
    });
  });
}
export function chipValue(g) {
  const on = [...g.querySelectorAll('.chip.on')].map((c) => c.dataset.v);
  return g.dataset.multi === 'true' ? on : on[0] ?? null;
}

export function formError(form, msg) {
  let e = form.querySelector('.form-error');
  if (!e) { e = document.createElement('p'); e.className = 'form-error'; e.setAttribute('role', 'alert'); form.appendChild(e); }
  e.textContent = msg;
}

export function segmented(options, value, name) {
  return `<div class="seg" role="tablist" data-seg="${name}">${options.map(([v, l]) => `<button role="tab" class="${v === value ? 'on' : ''}" aria-selected="${v === value}" data-seg-v="${v}">${l}</button>`).join('')}</div>`;
}
