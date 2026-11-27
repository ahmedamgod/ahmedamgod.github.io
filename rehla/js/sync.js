// مزامنة بيانات المستخدم مع Firebase: الجهاز هو الأساس (يشتغل أوفلاين)، والسيرفر بياخد نسخة أول ما النت يرجع
import * as cloud from './cloud.js';
import { getState, onChange, replaceState, update } from './store.js';
import * as S from './stats.js';
import { today, lastNDays } from './util.js';
import { MOODS } from './data/content.js';
import { APP_VERSION } from './update.js';

let uid = null;
let timer = null;
let lastHash = '';
let journalMap = {};
let unsubs = [];
let pushing = false;
const seenMsgs = new Set();

const LOCAL_ONLY = ['journal', 'notifications', 'notifLog', 'updatedAt'];

function snapshot(s) {
  const o = {};
  for (const [k, v] of Object.entries(s)) if (!LOCAL_ONLY.includes(k)) o[k] = v;
  return o;
}

export function summary() {
  const s = getState();
  const k = today();
  const d = s.days[k] || {};
  const lastMood = s.moods[0];
  const keys7 = lastNDays(7);
  const moods7 = s.moods.filter((m) => keys7.includes(m.date));
  const score = (m) => MOODS.find((x) => x.id === m.mood)?.score || 3;
  const pts = S.totalPoints();
  return {
    day: k,
    completion: Math.round(S.completion(k) * 100),
    streak: S.streak(),
    bestStreak: S.bestStreak(),
    points: pts,
    level: S.level(pts).name,
    prayersToday: Object.keys(d.prayers || {}).length,
    quranToday: S.quranPages(d),
    waterToday: d.water || 0,
    missed7: S.missedRecent(),
    activeDays7: keys7.filter((x) => S.completion(x) > 0).length,
    avgCompletion7: Math.round((keys7.reduce((a, x) => a + S.completion(x), 0) / 7) * 100),
    lastMood: lastMood ? { mood: lastMood.mood, date: lastMood.date, time: lastMood.time || '' } : null,
    mood7: moods7.length ? +(moods7.reduce((a, m) => a + score(m), 0) / moods7.length).toFixed(2) : null,
    lowMoods7: moods7.filter((m) => score(m) <= 2).length,
    journalCount: s.journal.length,
    lastJournal: s.journal.map((j) => j.date).sort().pop() || null,
    habitsActive: s.habits.filter((h) => h.status === 'active').length,
    goalsActive: s.goals.filter((g) => !g.done).length,
    appVersion: APP_VERSION,
  };
}

async function pushNow() {
  if (!uid || pushing || !navigator.onLine) return;
  const s = getState();
  if (!s?.onboarded) return;
  const snap = snapshot(s);
  const json = JSON.stringify(snap);
  const changed = s.journal.filter((j) => journalMap[j.id] !== (j.updatedAt || 0));
  const ids = new Set(s.journal.map((j) => j.id));
  const removed = Object.keys(journalMap).filter((id) => !ids.has(id));
  const sum = summary();
  const sumKey = JSON.stringify(sum);
  if (json + sumKey === lastHash && !changed.length && !removed.length) return;
  pushing = true;
  try {
    await cloud.pushState(uid, snap, s.updatedAt || Date.now(), sum);
    await cloud.pushJournal(uid, changed, removed);
    lastHash = json + sumKey;
    changed.forEach((j) => { journalMap[j.id] = j.updatedAt || 0; });
    removed.forEach((id) => delete journalMap[id]);
    window.dispatchEvent(new CustomEvent('rehla:synced', { detail: Date.now() }));
  } catch (e) {
    console.warn('sync push failed', e);
  } finally {
    pushing = false;
  }
}

export function schedulePush(ms = 2500) {
  clearTimeout(timer);
  timer = setTimeout(pushNow, ms);
}
export const flushSync = () => { clearTimeout(timer); return pushNow(); };

function addMessage(m, kind) {
  const id = kind + ':' + m.id;
  const s = getState();
  if ((s.dismissed || []).includes(id)) return false;
  if (s.notifications.some((n) => n.id === id)) {
    // تحديث حالة القراية من السيرفر
    if (kind === 'in' && m.read) {
      const n = s.notifications.find((x) => x.id === id);
      if (n && !n.read) update((st) => { st.notifications.find((x) => x.id === id).read = true; });
    }
    return false;
  }
  const at = typeof m.at === 'number' ? m.at : m.at?.toMillis?.() || Date.now();
  update((st) => {
    st.notifications.unshift({ id, title: m.title || (kind === 'bc' ? 'إعلان' : 'رسالة من المشرف'), body: m.body || '', from: m.fromName || '', link: 'notifications', at, read: !!m.read, kind });
    st.notifications.sort((a, b) => b.at - a.at);
    st.notifications = st.notifications.slice(0, 80);
  });
  return !m.read && Date.now() - at < 3 * 864e5;
}

export async function startSync(userId) {
  stopSync();
  uid = userId;
  // ١. نجيب نسخة السيرفر ونقارن
  try {
    const remote = await cloud.pullState(uid);
    const local = getState();
    if (remote && (!local.onboarded || (remote.updatedAt || 0) > (local.updatedAt || 0))) {
      remote.notifications = local.notifications;
      remote.notifLog = local.notifLog;
      await replaceState(remote);
    }
    journalMap = Object.fromEntries((remote?.journal || []).map((j) => [j.id, j.updatedAt || 0]));
    if (remote) lastHash = '';
  } catch (e) {
    console.warn('sync pull failed', e);
  }
  // ٢. أي تغيير يتبعت
  unsubs.push(onChange(() => schedulePush()));
  schedulePush(500);
  const online = () => schedulePush(300);
  const hide = () => { if (document.hidden) flushSync(); };
  addEventListener('online', online);
  document.addEventListener('visibilitychange', hide);
  unsubs.push(() => removeEventListener('online', online), () => document.removeEventListener('visibilitychange', hide));
  // ٣. رسايل المشرف والإعلانات وحالة الحساب
  unsubs.push(cloud.watchInbox(uid, (msgs) => {
    const fresh = msgs.filter((m) => addMessage(m, 'in') && !seenMsgs.has(m.id));
    fresh.forEach((m) => seenMsgs.add(m.id));
    if (fresh.length) window.dispatchEvent(new CustomEvent('rehla:message', { detail: fresh[0] }));
  }));
  unsubs.push(cloud.watchBroadcasts((list) => {
    const fresh = list.filter((m) => addMessage(m, 'bc') && !seenMsgs.has('bc' + m.id));
    fresh.forEach((m) => seenMsgs.add('bc' + m.id));
    if (fresh.length) window.dispatchEvent(new CustomEvent('rehla:message', { detail: fresh[0] }));
  }));
  unsubs.push(cloud.watchUserDoc(uid, (d) => {
    if (d?.disabled) window.dispatchEvent(new Event('rehla:disabled'));
  }));
}

export function stopSync() {
  clearTimeout(timer);
  unsubs.forEach((u) => { try { u(); } catch {} });
  unsubs = [];
  uid = null;
  lastHash = '';
  journalMap = {};
}

export const markRead = (notifId) => { if (uid && notifId?.startsWith('in:')) cloud.markInboxRead(uid, notifId.slice(3)); };
