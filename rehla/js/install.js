// تثبيت رحلة كتطبيق على الموبايل
import { icon } from './art.js';

let deferred = null;
const KEY = 'rehla.installHide';

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPrompt = () => !!deferred;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  window.dispatchEvent(new Event('rehla:installable'));
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  window.dispatchEvent(new Event('rehla:installed'));
});

export async function promptInstall() {
  if (!deferred) return 'unavailable';
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome;
}

function hidden() {
  try { return Date.now() < +(localStorage.getItem(KEY) || 0); } catch { return false; }
}
export function hideBanner(days = 7) {
  try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch {}
}

// كارت التثبيت في الرئيسية — بيظهر بس لو التطبيق مش متثبت
export function installBanner() {
  if (isStandalone() || hidden()) return '';
  if (!deferred && !isIOS()) return '';
  return `<section class="card install-card" id="install-card">
    <img src="icons/icon-192.png" alt="" width="52" height="52">
    <div class="grow"><b>ثبّت رحلة على موبايلك</b>
      <small>${deferred ? 'يفتح زي أي تطبيق ويشتغل من غير نت' : 'دوس زرار المشاركة ⬆️ وبعدين "إضافة إلى الشاشة الرئيسية"'}</small></div>
    ${deferred ? '<button class="btn primary sm" data-install>تثبيت</button>' : ''}
    <button class="icon-btn sm" data-install-hide aria-label="مش دلوقتي">${icon('x', 16)}</button>
  </section>`;
}

export function installHelp() {
  if (isStandalone()) return '<p class="ok">✓ رحلة متثبتة على جهازك كتطبيق</p>';
  if (deferred) return '<button class="btn primary block" data-install>ثبّت التطبيق دلوقتي</button>';
  if (isIOS()) return '<p class="small">من Safari: دوس زرار المشاركة ⬆️ ← "إضافة إلى الشاشة الرئيسية".</p>';
  return '<p class="small">من Chrome: افتح القايمة ⋮ ← "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".</p>';
}
