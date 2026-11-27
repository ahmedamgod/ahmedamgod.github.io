// كل الأرقام بتتحسب من بيانات المستخدم الحقيقية — مفيش أي أرقام ثابتة
import { getState, peekDay } from './store.js';
import { today, addDays, daysBetween, range, parseKey } from './util.js';
import { PRAYERS, PRAYER_STATUS, MOODS } from './data/content.js';
import { AZKAR } from './data/azkar.js';
import { TOTAL_PAGES } from './data/quran.js';

const SUCCESS = 0.5; // اليوم الناجح = نص المهام أو أكتر (الاستمرار مش الكمال)

export function habitDue(h, k) {
  if (h.status !== 'active') return false;
  const start = h.createdAt || '2000-01-01';
  if (k < start) return false;
  const s = h.schedule || { type: 'daily' };
  if (s.type === 'weekly') return (s.days || []).includes(parseKey(k).getDay());
  if (s.type === 'interval') return daysBetween(start, k) % Math.max(1, s.every || 1) === 0;
  return true;
}
export function habitDone(h, k) {
  const v = h.log?.[k];
  if (v == null || v === false) return false;
  if (h.goal > 0 && typeof v === 'number') return v >= h.goal;
  return !!v;
}

export const azkarDone = (d, type) => {
  const items = AZKAR[type].items;
  const c = d.azkar?.[type] || {};
  return items.every((it) => (c[it.id] || 0) >= it.count);
};
export const azkarProgress = (d, type) => {
  const items = AZKAR[type].items;
  const c = d.azkar?.[type] || {};
  const total = items.reduce((a, it) => a + it.count, 0);
  const done = items.reduce((a, it) => a + Math.min(it.count, c[it.id] || 0), 0);
  return done / total;
};
export const quranPages = (d) => (d.quran || []).reduce((a, r) => a + (+r.pages || 0), 0);
export const workoutMins = (d) => (d.workouts || []).reduce((a, w) => a + (+w.mins || 0), 0);

// المهام المطلوبة في يوم معين
export function dayItems(k) {
  const s = getState();
  const d = peekDay(k);
  const st = s.settings;
  const items = [];
  for (const p of PRAYERS) items.push({ key: 'p:' + p.id, group: 'prayer', label: 'صلاة ' + p.name, done: !!d.prayers?.[p.id] });
  items.push({ key: 'az:morning', group: 'azkar', label: 'أذكار الصباح', done: azkarDone(d, 'morning') });
  items.push({ key: 'az:evening', group: 'azkar', label: 'أذكار المساء', done: azkarDone(d, 'evening') });
  if (st.quranGoal > 0) items.push({ key: 'quran', group: 'quran', label: 'ورد القرآن', done: quranPages(d) >= st.quranGoal });
  if (st.waterGoal > 0) items.push({ key: 'water', group: 'health', label: 'شرب المية', done: (d.water || 0) >= st.waterGoal });
  for (const h of s.habits) if (habitDue(h, k)) items.push({ key: 'h:' + h.id, group: 'habit', label: h.name, done: habitDone(h, k) });
  for (const c of s.challenges) if (k >= c.start && k <= addDays(c.start, c.length - 1) && k <= (c.doneAt || c.ended || '9999')) items.push({ key: 'c:' + c.id, group: 'challenge', label: c.title, done: !!c.log?.[k] });
  return items;
}

export function completion(k) {
  const items = dayItems(k);
  if (!items.length) return 0;
  return items.filter((i) => i.done).length / items.length;
}

const startKey = () => getState().createdAt || today();
// الأيام من أول الرحلة بس (منحسبش أيام قبل التسجيل كأنها فاتت)
export function activeKeys(keys) { const st = startKey(); const out = keys.filter((k) => k >= st); return out; }

export function streak() {
  let k = today();
  let n = 0;
  if (completion(k) < SUCCESS) k = addDays(k, -1); // النهارده لسه بدري
  while (k >= startKey() && completion(k) >= SUCCESS) { n++; k = addDays(k, -1); }
  return n;
}

export function bestStreak() {
  let best = 0, cur = 0;
  for (const k of range(startKey(), today())) {
    if (completion(k) >= SUCCESS) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return best;
}

export function successfulDays() {
  return range(startKey(), today()).filter((k) => completion(k) >= SUCCESS).length;
}

// الحاجات اللي فاتت آخر ٧ أيام (من غير النهارده) — للتعويض، مش للعقاب
export function missedRecent(n = 7) {
  let c = 0;
  for (let i = 1; i <= n; i++) {
    const k = addDays(today(), -i);
    if (k < startKey()) break;
    c += dayItems(k).filter((x) => !x.done).length;
  }
  return c;
}

export function dayPoints(k) {
  const s = getState();
  const d = peekDay(k);
  let p = 0;
  for (const pr of PRAYERS) {
    const r = d.prayers?.[pr.id];
    if (r) p += PRAYER_STATUS.find((x) => x.id === r.status)?.pts || 10;
  }
  for (const t of ['morning', 'evening', 'prayer']) if (azkarDone(d, t)) p += 10;
  p += quranPages(d) * 2;
  if ((d.water || 0) >= s.settings.waterGoal && s.settings.waterGoal) p += 5;
  if (d.sleep) p += 3;
  p += (d.workouts || []).length * 5 + Math.floor(workoutMins(d) / 10);
  if (d.dhikr?.done) p += 5;
  for (const h of s.habits) if (habitDone(h, k)) p += 5;
  for (const c of s.challenges) if (c.log?.[k]) p += 5;
  if (completion(k) >= SUCCESS) p += 10;
  if (completion(k) >= 1) p += 10;
  return p;
}

export function totalPoints() {
  const s = getState();
  let p = 0;
  for (const k of Object.keys(s.days)) p += dayPoints(k);
  // أيام فيها عادات أو تحديات بس من غير سجل يوم
  const extra = new Set();
  s.habits.forEach((h) => Object.keys(h.log || {}).forEach((k) => !s.days[k] && extra.add(k)));
  s.challenges.forEach((c) => Object.keys(c.log || {}).forEach((k) => !s.days[k] && extra.add(k)));
  extra.forEach((k) => { p += dayPoints(k); });
  p += s.journal.length * 5;
  p += s.moods.length * 3;
  for (const g of s.goals) {
    p += (g.steps || []).filter((x) => x.done).length * 5;
    if (g.done) p += g.term === 'long' ? 100 : 50;
  }
  p += s.challenges.filter((c) => c.done).reduce((a, c) => a + (c.length >= 30 ? 150 : 30), 0);
  p += (s.quran.khatmat || 0) * 200;
  return p;
}

export function level(points) {
  const levels = [
    [0, 'بذرة', '🌱'], [150, 'برعم', '🌿'], [500, 'زهرة', '🌸'], [1200, 'شجرة', '🌳'],
    [2500, 'بستان', '🏡'], [5000, 'جبل', '⛰️'], [10000, 'نجمة', '⭐'],
  ];
  let i = 0;
  while (i + 1 < levels.length && points >= levels[i + 1][0]) i++;
  const [min, name, icon] = levels[i];
  const next = levels[i + 1];
  return { name, icon, min, next: next ? next[0] : null, nextName: next?.[1], pct: next ? (points - min) / (next[0] - min) : 1 };
}

// القرآن: إجمالي الصفحات من أول الختمة الحالية
export function quranTotals() {
  const s = getState();
  let total = 0;
  const perDay = [];
  for (const [k, d] of Object.entries(s.days)) {
    const p = quranPages(d);
    if (p) { total += p; perDay.push([k, p]); }
  }
  const khatmat = s.quran.khatmat || 0;
  const inCurrent = Math.max(0, total - (s.quran.pagesAtKhatma || 0));
  const current = Math.min(TOTAL_PAGES, inCurrent);
  const firstDay = perDay.map(([k]) => k).sort()[0];
  const days = firstDay ? daysBetween(firstDay, today()) + 1 : 0;
  const pace = days ? total / days : 0; // متوسط فعلي صفحة/يوم
  const left = TOTAL_PAGES - current;
  const eta = pace > 0 ? Math.ceil(left / pace) : null;
  const last = Object.entries(s.days).filter(([, d]) => d.quran?.length).sort((a, b) => (a[0] < b[0] ? 1 : -1))[0];
  const lastRec = last ? last[1].quran[last[1].quran.length - 1] : null;
  return { total, current, khatmat, pace, eta, left, lastRec };
}

export function prayerStats(keys) {
  keys = activeKeys(keys);
  const per = Object.fromEntries(PRAYERS.map((p) => [p.id, 0]));
  let done = 0, jamaa = 0, ontime = 0;
  for (const k of keys) {
    const d = peekDay(k);
    for (const p of PRAYERS) {
      const r = d.prayers?.[p.id];
      if (r) { per[p.id]++; done++; if (r.status === 'jamaa') jamaa++; if (r.status === 'jamaa' || r.status === 'ontime') ontime++; }
    }
  }
  const total = keys.length * 5;
  return { per, done, total, pct: total ? done / total : 0, jamaa, ontime };
}

export function moodStats(keys) {
  const s = getState();
  const set = new Set(keys);
  const list = s.moods.filter((m) => set.has(m.date));
  const counts = {};
  const reasons = {};
  for (const m of list) {
    counts[m.mood] = (counts[m.mood] || 0) + 1;
    for (const r of m.reasons || []) reasons[r] = (reasons[r] || 0) + 1;
  }
  const byDay = keys.map((k) => {
    const ms = list.filter((m) => m.date === k);
    if (!ms.length) return null;
    return ms.reduce((a, m) => a + (MOODS.find((x) => x.id === m.mood)?.score || 3), 0) / ms.length;
  });
  // أنماط: أكتر سبب مرتبط بالمشاعر الحلوة والصعبة
  const pos = {}, neg = {};
  for (const m of list) {
    const sc = MOODS.find((x) => x.id === m.mood)?.score || 3;
    const bucket = sc >= 4 ? pos : sc <= 2 ? neg : null;
    if (bucket) for (const r of m.reasons || []) bucket[r] = (bucket[r] || 0) + 1;
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0];
  // الأيام في الأسبوع
  const wk = Array(7).fill(0).map(() => []);
  for (const m of list) wk[parseKey(m.date).getDay()].push(MOODS.find((x) => x.id === m.mood)?.score || 3);
  const wkAvg = wk.map((a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null));
  return { list, counts, reasons, byDay, topPos: top(pos), topNeg: top(neg), wkAvg };
}

export function habitStats(h, keys) {
  let due = 0, done = 0;
  for (const k of keys) {
    const isDue = habitDue(h, k) || (h.log?.[k] != null);
    if (!isDue) continue;
    due++;
    if (habitDone(h, k)) done++;
  }
  // streak للعادة
  let st = 0;
  let k = today();
  if (habitDue(h, k) && !habitDone(h, k)) k = addDays(k, -1);
  let guard = 0;
  while (guard++ < 2000 && k >= (h.createdAt || today())) {
    if (habitDue(h, k)) { if (habitDone(h, k)) st++; else break; }
    k = addDays(k, -1);
  }
  return { due, done, pct: due ? done / due : 0, streak: st };
}

export function healthStats(keys) {
  let water = 0, sleep = 0, sleepDays = 0, mins = 0, sessions = 0, waterDays = 0;
  const types = {};
  for (const k of keys) {
    const d = peekDay(k);
    if (d.water) { water += d.water; waterDays++; }
    if (d.sleep) { sleep += d.sleep; sleepDays++; }
    for (const w of d.workouts || []) { mins += +w.mins || 0; sessions++; types[w.type] = (types[w.type] || 0) + (+w.mins || 0); }
  }
  return { water, waterAvg: waterDays ? water / waterDays : 0, sleepAvg: sleepDays ? sleep / sleepDays : 0, mins, sessions, types };
}

// شارات — كلها بتكافئ الاستمرار
export function badges() {
  const s = getState();
  const allKeys = Object.keys(s.days);
  const prayersDone = allKeys.reduce((a, k) => a + Object.keys(s.days[k].prayers || {}).length, 0);
  const fullPrayerDays = allKeys.filter((k) => Object.keys(s.days[k].prayers || {}).length === 5).length;
  const azkarSets = allKeys.reduce((a, k) => a + ['morning', 'evening', 'prayer'].filter((t) => azkarDone(s.days[k], t)).length, 0);
  const q = quranTotals();
  const habitDays = s.habits.reduce((a, h) => a + Object.keys(h.log || {}).filter((k) => habitDone(h, k)).length, 0);
  const best = bestStreak();
  const workouts = allKeys.reduce((a, k) => a + (s.days[k].workouts || []).length, 0);
  const waterDays = allKeys.filter((k) => (s.days[k].water || 0) >= s.settings.waterGoal).length;
  const goalsDone = s.goals.filter((g) => g.done).length;
  const ch7 = s.challenges.filter((c) => c.done && c.length < 30).length;
  const ch30 = s.challenges.filter((c) => c.done && c.length >= 30).length;
  const B = (id, icon, title, desc, cur, target, color) => ({ id, icon, title, desc, cur: Math.min(cur, target), target, got: cur >= target, color });
  return [
    B('first', '👣', 'أول خطوة', 'سجّل أول إنجاز ليك', totalPoints() > 0 ? 1 : 0, 1, '#DDE8CB'),
    B('pray50', '🕌', 'قلبه متعلق', '٥٠ صلاة متسجلة', prayersDone, 50, '#DCEBF5'),
    B('pray500', '🌙', 'محافظ على صلاته', '٥٠٠ صلاة متسجلة', prayersDone, 500, '#E7DDF2'),
    B('fullday7', '✨', 'يوم كامل', '٧ أيام بالخمس صلوات', fullPrayerDays, 7, '#F7E6A8'),
    B('azkar10', '📿', 'لسانه رطب بذكر الله', 'خلّص ١٠ مجموعات أذكار', azkarSets, 10, '#F5CDD2'),
    B('quran50', '📖', 'صاحب ورد', 'اقرا ٥٠ صفحة', q.total, 50, '#DDE8CB'),
    B('khatma', '🌟', 'ختمة', 'ختمت القرآن', q.khatmat, 1, '#F7E6A8'),
    B('streak3', '🔥', 'بداية حلوة', '٣ أيام ناجحة ورا بعض', best, 3, '#FBD9B5'),
    B('streak7', '🌈', 'أسبوع استمرار', '٧ أيام ناجحة ورا بعض', best, 7, '#DCEBF5'),
    B('streak30', '🏔️', 'شهر استمرار', '٣٠ يوم ناجح ورا بعض', best, 30, '#E7DDF2'),
    B('habit30', '🌿', 'عاداته بتكبر', '٣٠ مرة إنجاز عادة', habitDays, 30, '#D4ECE4'),
    B('journal5', '✍️', 'بيكتب حكايته', '٥ يوميات', s.journal.length, 5, '#F5CDD2'),
    B('mood10', '💗', 'فاهم نفسه', 'سجّل مشاعرك ١٠ مرات', s.moods.length, 10, '#F5CDD2'),
    B('workout10', '💪', 'جسمه نشيط', '١٠ تمارين', workouts, 10, '#DCEBF5'),
    B('water7', '💧', 'مترطب', '٧ أيام وصلت هدف المية', waterDays, 7, '#DCEBF5'),
    B('goal1', '🎯', 'حقق هدف', 'خلّص أول هدف', goalsDone, 1, '#F7E6A8'),
    B('ch7', '🏅', 'بطل الأسبوع', 'خلّص تحدي ٧ أيام', ch7, 1, '#FBD9B5'),
    B('ch30', '🏆', 'بطل الشهر', 'خلّص تحدي ٣٠ يوم', ch30, 1, '#F7E6A8'),
  ];
}

export function periodSummary(keys) {
  keys = activeKeys(keys);
  const comp = keys.map((k) => completion(k));
  const avg = comp.length ? comp.reduce((a, b) => a + b, 0) / comp.length : 0;
  const pts = keys.reduce((a, k) => a + dayPoints(k), 0);
  const good = comp.filter((c) => c >= SUCCESS).length;
  return { comp, avg, pts, good };
}

export const isSuccess = (c) => c >= SUCCESS;
