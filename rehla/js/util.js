import { DAY_NAMES, MONTHS } from './data/content.js';

export const pad = (n) => String(n).padStart(2, '0');
export const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => dkey();
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

let useArabicDigits = true;
export function setDigits(arabic) { useArabicDigits = arabic; }
const AR = '٠١٢٣٤٥٦٧٨٩';
export function num(v) {
  const s = String(v);
  return useArabicDigits ? s.replace(/[0-9]/g, (c) => AR[c]) : s;
}
export function fmtTime(hm) {
  if (!hm) return '';
  let [h, m] = hm.split(':').map(Number);
  const p = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return num(`${h}:${pad(m)}`) + ' ' + p;
}
export function fmtDate(k, withDay = true) {
  const d = parseKey(k);
  return (withDay ? DAY_NAMES[d.getDay()] + '، ' : '') + num(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + num(d.getFullYear());
}
export function fmtShort(k) { const d = parseKey(k); return num(d.getDate()) + ' ' + MONTHS[d.getMonth()]; }
export function relDay(k) {
  const diff = daysBetween(k, today());
  if (diff === 0) return 'النهارده';
  if (diff === 1) return 'امبارح';
  if (diff === 2) return 'أول امبارح';
  return fmtShort(k);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function range(startKey, endKey) {
  const out = [];
  for (let k = startKey; k <= endKey; k = addDays(k, 1)) out.push(k);
  return out;
}
export function lastNDays(n, end = today()) { return range(addDays(end, -(n - 1)), end); }

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'ليلتك هادية';
  if (h < 12) return 'صباح الفل';
  if (h < 17) return 'نهارك سعيد';
  return 'مساء الورد';
}

// صورة → dataURL مضغوطة (عشان التخزين على الجهاز)
export function compressImage(file, max = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('type'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });
}

export function hashStr(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
