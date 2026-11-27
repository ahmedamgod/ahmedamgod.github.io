import * as db from './db.js';
import { today, uid } from './util.js';

export const SCHEMA = 1;

export function emptyState(name = '') {
  return {
    schema: SCHEMA,
    createdAt: today(),
    onboarded: false,
    profile: { name, avatar: '', bio: '', goals: '' },
    settings: {
      theme: 'auto',
      digits: 'arabic',
      notif: { enabled: false, prayers: true, azkar: true, habits: true, daily: true },
      location: { lat: 30.0444, lng: 31.2357, label: 'القاهرة' },
      prayerOffsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      quranGoal: 4,
      waterGoal: 8,
      sleepGoal: 8,
      exerciseGoal: 30,
      assistant: true,
      journalPrivate: true,
      hideStats: false,
    },
    days: {},
    habits: [],
    journal: [],
    moods: [],
    goals: [],
    challenges: [],
    customAzkar: [],
    notifications: [],
    notifLog: {},
    seenBadges: [],
    quran: { khatmat: 0 },
  };
}

let state = null;
let userId = null;
let saveTimer = null;
const listeners = new Set();
const changeListeners = new Set();
// بيتنادى مع كل تعديل حتى الصامت (للمزامنة)
export function onChange(fn) { changeListeners.add(fn); return () => changeListeners.delete(fn); }
const bc = 'BroadcastChannel' in self ? new BroadcastChannel('rehla-sync') : null;

export const getState = () => state;
export const getUserId = () => userId;
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => fn(state));

function migrate(s) {
  const base = emptyState();
  const out = { ...base, ...s };
  out.settings = { ...base.settings, ...(s.settings || {}) };
  out.settings.notif = { ...base.settings.notif, ...(s.settings?.notif || {}) };
  out.profile = { ...base.profile, ...(s.profile || {}) };
  out.schema = SCHEMA;
  return out;
}

export async function load(id, nameIfNew = '') {
  userId = id;
  const s = await db.get('state:' + id);
  state = s ? migrate(s) : emptyState(nameIfNew);
  if (!s) await db.set('state:' + id, state);
  return state;
}

export async function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!state || !userId) return;
  try {
    await db.set('state:' + userId, state);
    bc?.postMessage({ type: 'saved', userId, at: Date.now() });
  } catch (e) {
    window.dispatchEvent(new CustomEvent('rehla:save-error', { detail: e }));
  }
}

// كل التعديلات بتعدي من هنا: نعدّل، نحفظ، ونعيد الرسم
export function update(fn, { silent = false } = {}) {
  fn(state);
  state.updatedAt = Date.now();
  changeListeners.forEach((f) => f());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
  if (!silent) emit();
}

// مزامنة بين التابات المفتوحة على نفس الجهاز
bc?.addEventListener('message', async (e) => {
  if (e.data?.type === 'saved' && e.data.userId === userId && !saveTimer) {
    const s = await db.get('state:' + userId);
    if (s) { state = migrate(s); emit(); }
  }
});

export function day(k = today()) {
  if (!state.days[k]) state.days[k] = {};
  const d = state.days[k];
  d.prayers ||= {};
  d.azkar ||= {};
  d.quran ||= [];
  d.workouts ||= [];
  return d;
}
export const peekDay = (k) => state.days[k] || {};

export function notify(title, body, link = '') {
  state.notifications.unshift({ id: uid(), title, body, link, at: Date.now(), read: false });
  state.notifications = state.notifications.slice(0, 60);
}

export async function removeUserData(id) { await db.del('state:' + id); }

export function exportJSON() {
  return JSON.stringify({ app: 'rehla', exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  const s = data?.state;
  if (!s || typeof s !== 'object' || !s.days || !Array.isArray(s.habits)) throw new Error('الملف ده مش نسخة احتياطية من رحلة');
  state = migrate(s);
  emit();
  return flush();
}

export async function replaceState(s) { state = migrate(s); await flush(); emit(); }

// للوحة الأدمن: نعرض بيانات مستخدم تاني في الذاكرة بس، من غير أي حفظ
export function viewState(s) { userId = null; state = migrate(s); return state; }
