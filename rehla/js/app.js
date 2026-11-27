import * as store from './store.js';
import * as auth from './auth.js';
import { setDigits } from './util.js';
import { solid, scene } from './art.js';
import { toast, closeTopSheet } from './ui.js';
import { startScheduler } from './notify.js';
import { promptInstall, hideBanner, isStandalone } from './install.js';
import { initUpdates, applyUpdate } from './update.js';
import * as cloud from './cloud.js';
import { startSync, stopSync, flushSync } from './sync.js';
import { consentBox, resetAuthMode } from './screens/auth.js';
import { resetOnboarding } from './screens/onboarding.js';
import { systemNotify } from './notify.js';
import * as db from './db.js';
import { formError, backable, discardLayers } from './ui.js';
import { esc } from './util.js';
import { termsHtml } from './data/terms.js';
import { sheet as openSheet } from './ui.js';

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
// نفس ترتيب الصورة المرجعية: حسابي على اليمين وإنجازاتي على الشمال
const TABS = [
  ['profile', 'حسابي', 'user'],
  ['support', 'الدعم', 'heart'],
  ['home', 'الرئيسية', 'home'],
  ['reports', 'تقاريري', 'chart'],
  ['achievements', 'إنجازاتي', 'trophy'],
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
  document.body.dataset.route = name;
  nav.innerHTML = TABS.map(([n, l, ic]) => `<a href="#/${n}" class="${n === name ? 'on' : ''} ${n === 'home' ? 'home-tab' : ''}" ${n === name ? 'aria-current="page"' : ''}>
    <span class="nav-ic">${solid(ic, n === 'home' ? 30 : 26)}</span><span class="nav-l">${l}</span></a>`).join('');
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

window.addEventListener('hashchange', () => { while (closeTopSheet({ noHistory: true })); if (store.getState()?.onboarded) render(); });
// الشروط والأحكام
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-terms]')) return;
  e.preventDefault();
  openSheet({ title: 'الشروط والأحكام', body: termsHtml() + '<button class="btn primary block mt" data-close>تمام</button>' });
});

// التثبيت كتطبيق
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-install]')) {
    const r = await promptInstall();
    if (r === 'accepted') toast('رحلة بتتثبت على موبايلك 🌿');
    else if (r === 'unavailable') toast('من قايمة المتصفح اختار "تثبيت التطبيق"', 'info');
    if (store.getState()?.onboarded) render({ keepScroll: true });
  }
  if (e.target.closest('[data-apply-update]')) applyUpdate();
  if (e.target.closest('[data-install-hide]')) { hideBanner(); document.getElementById('install-card')?.remove(); }
});
const rerenderIfReady = () => { if (store.getState()?.onboarded) render({ keepScroll: true }); };
window.addEventListener('rehla:installable', rerenderIfReady);
window.addEventListener('rehla:installed', () => { toast('اتثبتت! هتلاقي رحلة على الشاشة الرئيسية 🎉'); rerenderIfReady(); });
document.documentElement.classList.toggle('standalone', isStandalone());
// لو حصل أي خطأ، نوري رسالة بدل ما التطبيق يقف ساكت
const shownErrors = new Set();
function reportError(msg) {
  const m = String(msg || '').slice(0, 140);
  if (!m || shownErrors.has(m) || /ResizeObserver|Script error/.test(m)) return;
  shownErrors.add(m);
  console.error(m);
  toast('حصلت مشكلة: ' + m + ' — جرّب تقفل التطبيق وتفتحه', 'err');
}
window.addEventListener('error', (e) => reportError(e.message));
window.addEventListener('unhandledrejection', (e) => { const r = e.reason; if (r?.code?.startsWith?.('auth/') || r?.name === 'FirebaseError') return; reportError(r?.message || r); });
window.addEventListener('rehla:save-error', () => toast('مقدرناش نحفظ — ممكن مساحة الجهاز مليانة', 'err'));
window.addEventListener('online', () => toast('رجع النت 🌿'));
window.addEventListener('offline', () => toast('إنت أوفلاين — كل حاجة بتتحفظ على جهازك عادي', 'info'));

let unsub = null;
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r('timeout'), ms))]);

function screenOnly(html) {
  nav.hidden = true;
  document.body.classList.remove('has-nav');
  const el = document.createElement('div');
  el.className = 'screen enter';
  el.innerHTML = html;
  main.replaceChildren(el);
  return el;
}

// لازم المستخدم يوافق على المتابعة قبل ما يكمّل
function consentGate(user) {
  return new Promise((resolve) => {
    const el = screenOnly(`<section class="onboard"><h1>أهلاً بيك في رحلة 🌿</h1>
      <form id="cf" class="card col gap" novalidate>${consentBox()}<button class="btn primary block lg">موافق، يلا نبدأ</button>
      <button type="button" class="link center muted" id="out">خروج</button></form></section>`);
    const f = el.querySelector('#cf');
    el.querySelector('#out').onclick = async () => { await cloud.logout(); location.reload(); };
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!f.consent.checked) return formError(f, 'لازم توافق عشان تكمّل');
      try { await cloud.giveConsent(user.uid, user.displayName || '', user.email); resolve(); }
      catch (err) { formError(f, cloud.arError(err)); }
    };
  });
}

function showDisabled() {
  stopSync();
  const el = screenOnly(`<section class="onboard"><h1>حسابك متوقف مؤقتاً ⏸️</h1>
    <p class="muted">المشرف وقّف حسابك. كلّمه عشان تعرف السبب وترجع تكمّل رحلتك.</p>
    <button class="btn ghost" id="out">خروج</button></section>`);
  el.querySelector('#out').onclick = async () => { await cloud.logout(); location.reload(); };
}
window.addEventListener('rehla:disabled', showDisabled);
window.addEventListener('rehla:message', (e) => {
  const m = e.detail || {};
  toast(`📩 ${m.title || 'رسالة جديدة'}`, 'info');
  systemNotify(m.title || 'رسالة من المشرف', m.body || '', 'msg-' + (m.id || ''));
});

export async function startSession(session) {
  discardLayers();
  const acc = auth.accounts().find((a) => a.id === session.id);
  if (session.cloud) {
    const real = cloud.currentUser();
    const user = real || { uid: session.id, email: session.email || '', displayName: session.name || '' };
    if (real) auth.rememberCloudUser(real);
    // ١. نفتح على طول من البيانات المحفوظة على الموبايل
    await store.load(user.uid, user.displayName || '');
    if (!store.getState().onboarded) {
      // لو كان عنده حساب قديم على الجهاز بنفس الإيميل، ننقل بياناته
      const old = auth.accounts().find((a) => a.email === (user.email || '').toLowerCase());
      const oldState = old && (await db.get('state:' + old.id));
      if (oldState?.onboarded) await store.replaceState(oldState);
    }
    // ٢. السيرفر: حالة الحساب + المزامنة
    const docP = cloud.getUserDoc(user.uid).catch(() => 'offline');
    const checkDoc = async (doc) => {
      if (doc && typeof doc === 'object' && doc.disabled) { showDisabled(); return false; }
      if (doc === null || (doc && typeof doc === 'object' && !doc.consentAt)) { await consentGate(user); return 'consent'; }
      return true;
    };
    if (!real) {
      // لسه Firebase بيتأكد من الدخول (نت بطيء): نفتح من البيانات المحفوظة، ونتأكد في الخلفية
      cloud.firstUser().then((u) => {
        if (!u) { auth.logout(); stopSync(); resetAuthMode(); showAuth(); return; }
        if (u.uid !== user.uid) { location.reload(); return; }
        auth.rememberCloudUser(u);
        startSync(u.uid);
        docP.then(async (doc) => { const r = await checkDoc(doc); if (r === 'consent') render(); });
      });
    } else if (!store.getState().onboarded) {
      // أول مرة على الجهاز ده: نستنى السيرفر شوية عشان لو عنده بيانات قبل كده منطلبش منه يبدأ من الأول
      const doc = await withTimeout(docP, 6000);
      if ((await checkDoc(doc)) === false) return;
      await withTimeout(startSync(user.uid), 6000);
    } else {
      // بيفتح على طول، والسيرفر في الخلفية
      startSync(user.uid);
      docP.then(async (doc) => { const r = await checkDoc(doc); if (r === 'consent') render(); });
    }
  } else {
    stopSync();
    await store.load(session.id, acc?.name || '');
  }
  applyTheme();
  unsub?.();
  unsub = store.subscribe(() => { applyTheme(); if (store.getState().onboarded) render({ keepScroll: true }); });
  if (!store.getState().onboarded) {
    nav.hidden = true;
    // الرجوع من أول خطوة بيرجّعك لشاشة البداية (والبيانات بتفضل محفوظة)
    resetOnboarding();
    backable(async () => {
      stopSync();
      await store.flush();
      if (!session.guest) { try { await cloud.logout(); } catch {} }
      auth.logout();
      resetAuthMode();
      showAuth();
    });
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

export async function signOutAll() {
  try { await flushSync(); } catch {}
  stopSync();
  await store.flush();
  try { await cloud.logout(); } catch {}
  auth.logout();
  location.hash = '';
  location.reload();
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
  document.getElementById('scene').innerHTML = scene();
  document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const s = auth.currentSession();
  if (s?.guest) await startSession(s);
  else {
    const cached = auth.cachedCloudUser();
    const user = await withTimeout(cloud.firstUser(), cached ? 1500 : 6000);
    if (user && user !== 'timeout') await startSession({ id: user.uid, guest: false, email: user.email, cloud: true });
    else if (cached?.uid) await startSession({ id: cached.uid, guest: false, email: cached.email, name: cached.name, cloud: true });
    else showAuth();
  }
  document.getElementById('splash')?.classList.add('hide');
  setTimeout(() => document.getElementById('splash')?.remove(), 600);
}

window.addEventListener('pagehide', () => { store.flush(); flushSync(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); else if (store.getState()?.onboarded) render({ keepScroll: true }); });

initUpdates();
window.addEventListener('rehla:update', () => { if (store.getState()?.onboarded) render({ keepScroll: true }); });

boot();
