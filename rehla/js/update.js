// التحديثات: لما ينزل إصدار جديد بيظهر شريط "فيه تحديث جديد"، وتقدر كمان تدوّر يدوي من الإعدادات
export const APP_VERSION = '1.5.5';

let reg = null;
let waiting = null;
let userRequested = false;

const emit = () => window.dispatchEvent(new Event('rehla:update'));
export const hasUpdate = () => !!waiting;

function setWaiting(w) {
  waiting = w;
  showBar();
  emit();
}

function track(sw) {
  if (!sw) return;
  sw.addEventListener('statechange', () => {
    if (sw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(sw);
  });
}

export async function initUpdates() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try {
    reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
  } catch { return; }
  if (!reg) return;
  if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
  track(reg.installing);
  reg.addEventListener('updatefound', () => track(reg.installing));
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (userRequested) location.reload();
    else if (hadController && !waiting) setWaiting(navigator.serviceWorker.controller); // الإصدار الجديد اشتغل — نعرض "حدّث"
  });
  // دوّر على تحديث كل شوية ولما ترجع للتطبيق
  setInterval(() => reg.update().catch(() => {}), 30 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
}

export function applyUpdate() {
  userRequested = true;
  const bar = document.getElementById('update-bar');
  if (bar) bar.querySelector('button').textContent = 'بيحدّث…';
  if (waiting && waiting.state === 'installed') waiting.postMessage({ type: 'SKIP_WAITING' });
  else { location.reload(); return; }
  setTimeout(() => location.reload(), 4000); // احتياطي
}

// زرار "دوّر على تحديث" — بيرجع: found | latest | offline | unsupported
export async function checkNow() {
  if (!reg) return 'unsupported';
  if (waiting) return 'found';
  if (!navigator.onLine) return 'offline';
  try { await reg.update(); } catch { return 'offline'; }
  const sw = reg.installing;
  if (sw) {
    await new Promise((res) => {
      const t = setTimeout(res, 20000);
      sw.addEventListener('statechange', () => { if (sw.state === 'installed' || sw.state === 'redundant') { clearTimeout(t); res(); } });
    });
  }
  if (reg.waiting && navigator.serviceWorker.controller) { setWaiting(reg.waiting); return 'found'; }
  return waiting ? 'found' : 'latest';
}

function showBar() {
  if (document.getElementById('update-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'update-bar';
  bar.setAttribute('role', 'status');
  bar.innerHTML = `<span class="ub-ic">✨</span><span class="grow">فيه تحديث جديد لرحلة</span><button class="btn primary sm" type="button">حدّث دلوقتي</button>`;
  bar.querySelector('button').onclick = applyUpdate;
  document.body.appendChild(bar);
}
