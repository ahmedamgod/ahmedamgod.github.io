import * as store from './store.js';
import * as auth from './auth.js';
import { setDigits } from './util.js';
import { icon } from './art.js';
import { toast, closeTopSheet } from './ui.js';
import { startScheduler } from './notify.js';

import home from './screens/home.js';
import worship from './screens/worship.js';
import habits from './screens/habits.js';
import journal from './screens/journal.js';
import mood from './screens/mood.js';
import health from './screens/health.js';
import journey from './screens/journey.js';
import achievements from './screens/achievements.js';
import reports from './screens/reports.js';
import support from './screens/support.js';
import profile from './screens/profile.js';
import notifications from './screens/notifications.js';
import authScreen from './screens/auth.js';
import onboarding from './screens/onboarding.js';

const ROUTES = { home, worship, habits, journal, mood, health, journey, achievements, reports, support, profile, notifications };
const TABS = [
  ['achievements', 'إنجازاتي', 'trophy'],
  ['reports', 'تقاريري', 'chart'],
  ['home', 'الرئيسية', 'home'],
  ['support', 'الدعم', 'heart'],
  ['profile', 'حسابي', 'user'],
];

const main = document.getElementById('main');
const nav = document.getElementById('nav');
let current = null;
const scrollMem = {};

export function go(path) { location.hash = '#/' + path; }

function parse() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  return { name: parts[0], params: parts.slice(1).map(decodeURIComponent) };
}

function renderNav(name) {
  const isTab = TABS.some(([n]) => n === name);
  nav.hidden = !isTab;
  document.body.classList.toggle('has-nav', isTab);
  nav.innerHTML = TABS.map(([n, l, ic]) => `<a href="#/${n}" class="${n === name ? 'on' : ''} ${n === 'home' ? 'home-tab' : ''}" ${n === name ? 'aria-current="page"' : ''}>
    <span class="nav-ic">${icon(ic, n === 'home' ? 26 : 22)}</span><span>${l}</span></a>`).join('');
}

export function render({ keepScroll = false } = {}) {
  const { name, params } = parse();
  const screen = ROUTES[name] || home;
  const key = location.hash;
  if (!keepScroll && current) scrollMem[current] = window.scrollY;
  const el = document.createElement('div');
  el.className = 'screen screen-' + name + (keepScroll ? '' : ' enter');
  try {
    el.innerHTML = screen.render(params);
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="empty"><p>حصلت مشكلة وإحنا بنفتح الصفحة دي 😕</p><button class="btn primary" onclick="location.hash='#/home'">ارجع للرئيسية</button></div>`;
  }
  main.replaceChildren(el);
  renderNav(name);
  try { screen.mount?.(el, params); } catch (e) { console.error(e); }
  if (keepScroll) return;
  window.scrollTo(0, key === current ? scrollMem[key] || 0 : 0);
  current = key;
  const h1 = el.querySelector('h1');
  if (h1) document.title = h1.textContent + ' · رحلة';
}

function applyTheme() {
  const s = store.getState()?.settings;
  const t = s?.theme || 'auto';
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]').content = dark ? '#1F241B' : '#FFF9EB';
  setDigits((s?.digits || 'arabic') === 'arabic');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// تنقل عام بالـ data attributes
document.addEventListener('click', (e) => {
  const n = e.target.closest('[data-nav]');
  if (!n) return;
  e.preventDefault();
  const to = n.dataset.nav;
  if (to === 'back') history.length > 1 ? history.back() : go('home');
  else go(to);
});

window.addEventListener('hashchange', () => { while (closeTopSheet()); if (store.getState()?.onboarded) render(); });
window.addEventListener('rehla:save-error', () => toast('مقدرناش نحفظ — ممكن مساحة الجهاز مليانة', 'err'));
window.addEventListener('online', () => toast('رجع النت 🌿'));
window.addEventListener('offline', () => toast('إنت أوفلاين — كل حاجة بتتحفظ على جهازك عادي', 'info'));

let unsub = null;
export async function startSession(session) {
  const acc = auth.accounts().find((a) => a.id === session.id);
  await store.load(session.id, acc?.name || '');
  applyTheme();
  unsub?.();
  unsub = store.subscribe(() => { applyTheme(); if (store.getState().onboarded) render({ keepScroll: true }); });
  if (!store.getState().onboarded) {
    nav.hidden = true;
    const el = document.createElement('div');
    el.className = 'screen enter';
    el.innerHTML = onboarding.render();
    main.replaceChildren(el);
    onboarding.mount(el, () => { if (!location.hash || location.hash === '#/') location.hash = '#/home'; render(); startScheduler(); });
    return;
  }
  render();
  startScheduler();
}

export function showAuth() {
  unsub?.();
  nav.hidden = true;
  document.body.classList.remove('has-nav');
  const el = document.createElement('div');
  el.className = 'screen enter';
  el.innerHTML = authScreen.render();
  main.replaceChildren(el);
  authScreen.mount(el, (session) => startSession(session));
}

async function boot() {
  document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const s = auth.currentSession();
  if (s && (s.guest || auth.accounts().some((a) => a.id === s.id))) await startSession(s);
  else showAuth();
  document.getElementById('splash')?.classList.add('hide');
  setTimeout(() => document.getElementById('splash')?.remove(), 600);
}

window.addEventListener('pagehide', () => store.flush());
document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); else if (store.getState()?.onboarded) render({ keepScroll: true }); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

boot();
