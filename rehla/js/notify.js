// منبهات وتذكيرات: بتشتغل طول ما التطبيق مفتوح أو في الخلفية على الموبايل (حسب نظام التشغيل)
import { getState, update, notify as pushInApp, peekDay } from './store.js';
import { today, nowHM, addDays } from './util.js';
import { computeTimes } from './prayertimes.js';
import { PRAYERS } from './data/content.js';
import { habitDue, habitDone, completion, azkarDone } from './stats.js';
import { toast } from './ui.js';

let timer = null;

export function prayerTimes(date = new Date()) {
  const s = getState().settings;
  return computeTimes(date, s.location.lat, s.location.lng, s.prayerOffsets);
}

export function nextPrayer() {
  const t = prayerTimes();
  const now = nowHM();
  const p = PRAYERS.find((x) => t[x.id] > now);
  if (p) return { ...p, at: t[p.id], tomorrow: false };
  const tt = prayerTimes(new Date(Date.now() + 864e5));
  return { ...PRAYERS[0], at: tt.fajr, tomorrow: true };
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function systemNotify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: 'ar', dir: 'rtl' });
    else new Notification(title, { body, tag, dir: 'rtl' });
    return true;
  } catch { return false; }
}

function fire(key, title, body, link) {
  const s = getState();
  const k = today();
  if (s.notifLog[k]?.includes(key)) return;
  update((st) => {
    st.notifLog[k] = [...(st.notifLog[k] || []), key];
    // نخلي سجل آخر ٣ أيام بس
    for (const d of Object.keys(st.notifLog)) if (d < addDays(k, -3)) delete st.notifLog[d];
    pushInApp(title, body, link);
  });
  systemNotify(title, body, key).then((ok) => { if (!ok && !document.hidden) toast(title + ' — ' + body, 'info'); });
}

function within(hm, now, mins = 20) {
  const toM = (x) => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
  const d = toM(now) - toM(hm);
  return d >= 0 && d <= mins;
}

export function tick() {
  const s = getState();
  if (!s?.onboarded) return;
  const n = s.settings.notif;
  if (!n.enabled) return;
  const now = nowHM();
  const d = peekDay(today());
  if (n.prayers) {
    const t = prayerTimes();
    for (const p of PRAYERS) {
      if (within(t[p.id], now) && !d.prayers?.[p.id]) fire('pr:' + p.id, `حان وقت صلاة ${p.name} ${p.emoji}`, 'قوم صلّي واطمّن قلبك، وعلّم عليها في رحلة.', 'worship');
    }
  }
  if (n.azkar) {
    if (within('07:00', now, 60) && !azkarDone(d, 'morning')) fire('az:m', 'أذكار الصباح ☀️', 'ابدأ يومك بذكر الله — دقايق قليلة بس.', 'worship/azkar/morning');
    if (within('16:30', now, 60) && !azkarDone(d, 'evening')) fire('az:e', 'أذكار المساء 🌙', 'ختام حلو لنهارك.', 'worship/azkar/evening');
  }
  if (n.habits) {
    for (const h of s.habits) {
      if (h.reminder && habitDue(h, today()) && !habitDone(h, today()) && within(h.reminder, now)) fire('h:' + h.id, `${h.icon} ${h.name}`, h.desc || 'وقت عادتك الحلوة — خطوة صغيرة!', 'habits');
    }
  }
  if (n.daily && within('21:00', now, 90) && completion(today()) < 0.5) {
    fire('daily', 'لسه فيه وقت 🌿', 'خطوة واحدة صغيرة النهارده كفاية تكمّل بيها رحلتك.', 'home');
  }
}

export function startScheduler() {
  clearInterval(timer);
  tick();
  timer = setInterval(tick, 30000);
}
