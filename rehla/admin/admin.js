// لوحة إدارة رحلة: المدير والمشرفين
import * as cloud from '../js/cloud.js';
import { viewState } from '../js/store.js';
import * as S from '../js/stats.js';
import { today, num, esc, lastNDays, parseKey, fmtDate, fmtShort, relDay, dkey, fmtTime, addDays, setDigits } from '../js/util.js';
import { toast, sheet, confirmBox, ring, progressBar, lineChart, barChart, donut, formError } from '../js/ui.js';
import { icon, logo } from '../js/art.js';
import { MOODS, PRAYERS, DAY_SHORT } from '../js/data/content.js';
import { SURAHS, TOTAL_PAGES } from '../js/data/quran.js';

const { fs, db } = cloud;
const main = document.getElementById('main');
setDigits(true);
document.documentElement.dataset.theme = 'light';

let me = null;        // { uid, email, name, role }
let users = [];       // [{ uid, ...doc }]
let staff = [];       // [{ uid, role, email, name }]
let filter = 'all';
let search = '';
const cacheState = new Map();

const isOwner = () => me?.role === 'owner';
const moodOf = (id) => MOODS.find((m) => m.id === id);
const daysSince = (ms) => (ms ? Math.floor((Date.now() - ms) / 864e5) : 999);
const staffName = (uid) => { const s = staff.find((x) => x.uid === uid); return s ? s.name || s.email : '—'; };

function lastSeen(ms) {
  if (!ms) return 'ولا مرة';
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 2) return 'دلوقتي';
  if (m < 60) return `من ${num(m)} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `من ${num(h)} ساعة`;
  return relDay(dkey(new Date(ms)));
}

// تنبيهات المتابعة لكل مستخدم
function alertsFor(u) {
  const out = [];
  const sm = u.summary || {};
  const idle = daysSince(u.lastActive);
  if (u.disabled) out.push(['⏸️', 'الحساب متوقف', 'gray']);
  if (idle >= 3 && idle < 999) out.push(['😶', `مفتحش من ${num(idle)} أيام`, 'orange']);
  if ((sm.lowMoods7 || 0) >= 2 || (sm.mood7 != null && sm.mood7 <= 2.3)) out.push(['💔', 'مزاجه تعبان الأسبوع ده', 'red']);
  if (sm.day === today() && new Date().getHours() >= 18 && (sm.completion || 0) < 25) out.push(['🌧️', 'إنجاز ضعيف النهارده', 'orange']);
  if (sm.day && sm.day !== today() && idle < 3 && (sm.avgCompletion7 || 0) < 25) out.push(['📉', 'إنجاز قليل الأسبوع ده', 'orange']);
  return out;
}

// ================= تحميل =================
async function loadUsers() {
  const q = isOwner() ? fs.collection(db, 'users') : fs.query(fs.collection(db, 'users'), fs.where('supervisorId', '==', me.uid));
  const snap = await fs.getDocs(q);
  users = snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
}
async function loadStaff() {
  const snap = await fs.getDocs(fs.collection(db, 'staff'));
  staff = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}
async function loadUserState(uid, force = false) {
  if (!force && cacheState.has(uid)) return cacheState.get(uid);
  const st = await cloud.pullState(uid);
  cacheState.set(uid, st);
  return st;
}

// ================= الهيكل =================
function shell(active, body) {
  const tabs = [['', 'الإحصائيات', 'chart'], ['users', 'المشتركين', 'user']];
  if (isOwner()) tabs.push(['staff', 'المشرفين', 'heart'], ['broadcast', 'إعلانات', 'bell']);
  return `<header class="ad-head">
      <div class="row gap-s">${logo(44, false)}<div><b>لوحة إدارة رحلة</b><small>${esc(me.name || me.email)} · ${isOwner() ? 'المدير' : 'مشرف'}</small></div></div>
      <div class="row gap-s"><a class="icon-btn soft" href="../" aria-label="افتح التطبيق">${icon('home', 20)}</a><button class="icon-btn soft" data-act="logout" aria-label="خروج">${icon('logout', 20)}</button></div>
    </header>
    <nav class="ad-tabs">${tabs.map(([r, l, ic]) => `<a href="#/${r}" class="${active === r ? 'on' : ''}">${icon(ic, 18)}<span>${l}</span></a>`).join('')}</nav>
    <div class="ad-body">${body}</div>`;
}

async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const [name, a, b] = parts;
  window.scrollTo(0, 0);
  try {
    if (name === 'u' && a) return await renderUser(a, b || 'overview');
    if (name === 'users') return renderUsers();
    if (name === 'staff' && isOwner()) return renderStaff();
    if (name === 'broadcast' && isOwner()) return await renderBroadcast();
    return renderDashboard();
  } catch (e) {
    console.error(e);
    main.innerHTML = shell('', `<div class="empty"><p>مقدرناش نجيب البيانات: ${esc(cloud.arError(e))}</p><button class="btn primary" onclick="location.reload()">جرّب تاني</button></div>`);
  }
}

// ================= الإحصائيات =================
function renderDashboard() {
  const t = today();
  const n = users.length;
  const activeToday = users.filter((u) => u.summary?.day === t || daysSince(u.lastActive) === 0);
  const active7 = users.filter((u) => daysSince(u.lastActive) < 7);
  const idle3 = users.filter((u) => daysSince(u.lastActive) >= 3 && !u.disabled);
  const todays = users.filter((u) => u.summary?.day === t);
  const avg = (arr, f) => (arr.length ? arr.reduce((x, u) => x + (f(u) || 0), 0) / arr.length : 0);
  const avgComp = avg(todays, (u) => u.summary.completion);
  const avgPray = avg(todays, (u) => u.summary.prayersToday);
  const avgStreak = avg(users, (u) => u.summary?.streak);
  const avg7 = avg(active7, (u) => u.summary?.avgCompletion7);
  const moodCounts = {};
  users.forEach((u) => { const m = u.summary?.lastMood; if (m && daysSince(parseKey(m.date).getTime()) < 7) moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1; });
  const buckets = [0, 0, 0, 0, 0];
  todays.forEach((u) => { buckets[Math.min(4, Math.floor((u.summary.completion || 0) / 20.01))]++; });
  const needs = users.map((u) => ({ u, al: alertsFor(u) })).filter((x) => x.al.length && !x.u.disabled).slice(0, 8);
  const newUsers = users.filter((u) => daysSince(u.createdAt) < 7).length;
  main.innerHTML = shell('', `
    <section class="ad-kpis">
      ${kpi('👥', num(n), 'مشترك', newUsers ? `+${num(newUsers)} الأسبوع ده` : '')}
      ${kpi('🟢', num(activeToday.length), 'نشطين النهارده', n ? `${num(Math.round((activeToday.length / n) * 100))}٪` : '')}
      ${kpi('📅', num(active7.length), 'نشطين آخر ٧ أيام', '')}
      ${kpi('😶', num(idle3.length), 'مفتحوش من ٣ أيام+', '', idle3.length ? 'warn' : '')}
    </section>
    <section class="grid2">
      <div class="card center">${ring(avgComp / 100, 84, 9)}<p class="small muted">متوسط إنجاز النهارده</p></div>
      <div class="card center">${ring(avg7 / 100, 84, 9, 'var(--pink-d)')}<p class="small muted">متوسط إنجاز الأسبوع</p></div>
    </section>
    <section class="grid3 mini-stats">
      <div><b>${num(avgPray.toFixed(1))}</b><small>صلوات/مشترك النهارده</small></div>
      <div><b>${num(avgStreak.toFixed(1))}</b><small>متوسط الأيام ورا بعض</small></div>
      <div><b>${num(users.reduce((a, u) => a + (u.summary?.journalCount || 0), 0))}</b><small>تدوينة إجمالي</small></div>
    </section>
    ${needs.length ? `<section class="card"><div class="row between"><h2>محتاجين متابعة 🔔</h2><a class="link" href="#/users" data-filter="alerts">الكل</a></div>
      <ul class="ad-list">${needs.map(({ u, al }) => userRow(u, al)).join('')}</ul></section>` : '<section class="card all-done">🌸 مفيش حد محتاج متابعة عاجلة دلوقتي</section>'}
    <section class="card"><h2>توزيع إنجاز النهارده</h2>
      ${todays.length ? barChart(buckets, ['٠–٢٠٪', '٢٠–٤٠٪', '٤٠–٦٠٪', '٦٠–٨٠٪', '٨٠–١٠٠٪'], { color: (v, i) => ['#F2C4BC', '#FBD9B5', '#F7E6A8', '#B9CD92', '#91AA62'][i] }) : '<p class="muted">لسه محدش سجّل حاجة النهارده</p>'}
    </section>
    <section class="card"><h2>مشاعر المشتركين (آخر ٧ أيام)</h2>
      ${Object.keys(moodCounts).length ? donut(MOODS.map((m) => ({ label: m.emoji + ' ' + m.label, value: moodCounts[m.id] || 0, color: m.color }))) : '<p class="muted">مفيش تسجيلات مشاعر</p>'}
    </section>
    ${isOwner() && staff.length ? `<section class="card"><h2>المشرفين</h2>${staff.filter((s) => s.role === 'supervisor').map((s) => {
      const mine = users.filter((u) => u.supervisorId === s.uid);
      return `<div class="kv"><span>${esc(s.name || s.email)}</span>${progressBar(mine.length ? mine.filter((u) => daysSince(u.lastActive) < 7).length / mine.length : 0)}<b>${num(mine.length)}</b></div>`;
    }).join('') || '<p class="muted">مفيش مشرفين لسه</p>'}
      <p class="muted small">الرقم = عدد المشتركين، والشريط = نسبة النشطين آخر أسبوع</p></section>` : ''}
    <p class="muted small center">آخر تحديث للبيانات: ${lastSeen(Date.now())} · <button class="link" data-act="refresh">↻ حدّث</button></p>`);
}
const kpi = (ic, v, l, sub, cls = '') => `<div class="card kpi ${cls}"><span>${ic}</span><b>${v}</b><small>${l}</small>${sub ? `<em>${sub}</em>` : ''}</div>`;

function userRow(u, al = alertsFor(u)) {
  const sm = u.summary || {};
  const isToday = sm.day === today();
  const mo = sm.lastMood && moodOf(sm.lastMood.mood);
  return `<li><a href="#/u/${u.uid}" class="ad-user">
    <span class="ad-av">${u.avatar ? `<img src="${u.avatar}" alt="">` : esc((u.name || '؟').slice(0, 1))}</span>
    <div class="grow"><b>${esc(u.name || 'من غير اسم')}</b>${u.disabled ? ' <small class="tag gray">متوقف</small>' : ''}
      <small class="muted block">${lastSeen(u.lastActive)}${isOwner() && u.supervisorId ? ' · ' + esc(staffName(u.supervisorId)) : ''}</small>
      ${al.length ? `<div class="tags">${al.map(([e, t, c]) => `<span class="tag ${c}">${e} ${t}</span>`).join('')}</div>` : ''}</div>
    <div class="ad-mini">${ring(isToday ? (sm.completion || 0) / 100 : 0, 42, 5)}<small>🔥${num(sm.streak || 0)} ${mo ? mo.emoji : ''}</small></div>
  </a></li>`;
}

// ================= المشتركين =================
function renderUsers() {
  const t = today();
  let list = users;
  if (filter === 'alerts') list = list.filter((u) => alertsFor(u).length);
  if (filter === 'today') list = list.filter((u) => u.summary?.day === t || daysSince(u.lastActive) === 0);
  if (filter === 'idle') list = list.filter((u) => daysSince(u.lastActive) >= 3);
  if (filter === 'unassigned') list = list.filter((u) => !u.supervisorId);
  if (filter === 'disabled') list = list.filter((u) => u.disabled);
  const q = search.trim().toLowerCase();
  if (q) list = list.filter((u) => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
  const f = [['all', 'الكل'], ['alerts', 'محتاجين متابعة'], ['today', 'نشطين النهارده'], ['idle', 'مختفيين'], ...(isOwner() ? [['unassigned', 'من غير مشرف'], ['disabled', 'متوقفين']] : [])];
  main.innerHTML = shell('users', `
    <label class="search">${icon('search', 18)}<input id="q" type="search" placeholder="دوّر بالاسم أو الإيميل…" value="${esc(search)}" aria-label="بحث"></label>
    <div class="chips">${f.map(([v, l]) => `<button class="chip ${filter === v ? 'on' : ''}" data-filter="${v}">${l}</button>`).join('')}</div>
    <p class="muted small mt-s">${num(list.length)} مشترك</p>
    ${list.length ? `<ul class="ad-list card">${list.map((u) => userRow(u)).join('')}</ul>` : '<div class="empty"><p>مفيش مشتركين هنا</p></div>'}`);
  const qi = main.querySelector('#q');
  qi.addEventListener('input', () => { search = qi.value; const pos = qi.selectionStart; renderUsers(); const n = main.querySelector('#q'); n.focus(); n.setSelectionRange(pos, pos); });
}

// ================= صفحة المستخدم =================
async function renderUser(uid, tab) {
  const u = users.find((x) => x.uid === uid) || { uid, ...(await cloud.getUserDoc(uid)) };
  main.innerHTML = shell('users', '<div class="empty"><p>بنجيب بيانات المشترك…</p></div>');
  const st = await loadUserState(uid);
  const al = alertsFor(u);
  const head = `<section class="card ad-profile">
      <a href="#/users" class="icon-btn sm" aria-label="رجوع">${icon('back', 18)}</a>
      <span class="ad-av lg">${u.avatar ? `<img src="${u.avatar}" alt="">` : esc((u.name || '؟').slice(0, 1))}</span>
      <div class="grow"><h2>${esc(u.name || 'من غير اسم')}</h2><small class="muted block" dir="ltr" style="text-align:right">${esc(u.email || '')}</small>
        <small class="muted block">آخر ظهور: ${lastSeen(u.lastActive)} · معانا من ${u.createdAt ? fmtShort(dkey(new Date(u.createdAt))) : '—'}</small>
        <small class="muted block">المشرف: ${u.supervisorId ? esc(staffName(u.supervisorId)) : 'مفيش'}${u.consentAt ? ' · ✓ وافق على المتابعة' : ''}</small>
        ${al.length ? `<div class="tags">${al.map(([e, t, c]) => `<span class="tag ${c}">${e} ${t}</span>`).join('')}</div>` : ''}</div>
    </section>
    <div class="row gap-s wrap ad-actions">
      <button class="btn primary sm" data-act="msg" data-uid="${uid}">📩 رسالة</button>
      <button class="btn soft sm" data-act="note" data-uid="${uid}">📝 ملاحظاتي</button>
      ${isOwner() ? `<button class="btn soft sm" data-act="assign" data-uid="${uid}">👤 المشرف</button>
        <button class="btn ghost sm" data-act="toggle-disable" data-uid="${uid}">${u.disabled ? '▶️ فعّل الحساب' : '⏸️ وقّف الحساب'}</button>
        <button class="btn danger-ghost sm" data-act="delete-user" data-uid="${uid}">🗑️ امسح بياناته</button>` : ''}
      <button class="btn ghost sm" data-act="reload-user" data-uid="${uid}">↻</button>
    </div>`;
  const tabs = [['overview', 'نظرة عامة'], ['journal', 'اليوميات'], ['mood', 'المشاعر'], ['worship', 'العبادات'], ['habits', 'العادات والصحة'], ['goals', 'الأهداف'], ['messages', 'الرسايل']];
  const nav = `<div class="seg ad-utabs">${tabs.map(([v, l]) => `<a href="#/u/${uid}/${v}" class="${v === tab ? 'on' : ''}">${l}</a>`).join('')}</div>`;
  let body;
  if (!st) body = '<div class="empty"><p>المشترك ده لسه مبدأش يستخدم التطبيق أو بياناته لسه موصلتش للسيرفر.</p></div>';
  else {
    viewState(st);
    if (tab === 'journal') body = uJournal(st);
    else if (tab === 'mood') body = uMood(st);
    else if (tab === 'worship') body = uWorship(st);
    else if (tab === 'habits') body = uHabits(st);
    else if (tab === 'goals') body = uGoals(st);
    else if (tab === 'messages') body = await uMessages(uid);
    else body = uOverview(st);
  }
  main.innerHTML = shell('users', head + nav + body);
}

function uOverview(st) {
  const k = today();
  const keys14 = lastNDays(14).filter((x) => x >= (st.createdAt || x));
  const comp = keys14.map((x) => S.completion(x));
  const pts = S.totalPoints();
  const lvl = S.level(pts);
  const q = S.quranTotals();
  const pr7 = S.prayerStats(lastNDays(7));
  const h7 = S.healthStats(lastNDays(7));
  const items = S.dayItems(k);
  return `
  <section class="grid3 mini-stats">
    <div><b>${num(Math.round(S.completion(k) * 100))}٪</b><small>إنجاز النهارده</small></div>
    <div><b>${num(S.streak())}</b><small>🔥 ورا بعض</small></div>
    <div><b>${num(pts)}</b><small>${lvl.icon} ${lvl.name}</small></div>
    <div><b>${num(S.successfulDays())}</b><small>يوم ناجح</small></div>
    <div><b>${num(S.missedRecent())}</b><small>فاتوا آخر أسبوع</small></div>
    <div><b>${num(S.badges().filter((b) => b.got).length)}</b><small>شارة</small></div>
  </section>
  <section class="card"><h2>الإنجاز آخر أسبوعين</h2>${comp.length > 1 ? lineChart(comp, keys14.map((x) => num(parseKey(x).getDate()))) : '<p class="muted">لسه بيانات قليلة</p>'}</section>
  <section class="card"><h2>مهام النهارده</h2><ul class="todo">${items.map((i) => `<li class="${i.done ? 'done' : ''}"><span class="dot g-${i.group}"></span>${esc(i.label)}<span class="go">${i.done ? '✓' : '—'}</span></li>`).join('')}</ul></section>
  <section class="grid2">
    <div class="card"><h3>🕌 الصلاة (٧ أيام)</h3><b class="big-num">${num(Math.round(pr7.pct * 100))}٪</b>${progressBar(pr7.pct)}<small class="muted">${num(pr7.jamaa)} في جماعة</small></div>
    <div class="card"><h3>📖 القرآن</h3><b class="big-num">${num(q.current)}</b><small class="muted"> / ${num(TOTAL_PAGES)} صفحة</small>${progressBar(q.current / TOTAL_PAGES)}<small class="muted">${num(q.pace.toFixed(1))} صفحة/يوم${q.khatmat ? ` · ${num(q.khatmat)} ختمة` : ''}</small></div>
    <div class="card"><h3>💪 الصحة (٧ أيام)</h3><small class="block">🏃 ${num(h7.mins)} دقيقة · ${num(h7.sessions)} تمرين</small><small class="block">💧 ${num(h7.waterAvg.toFixed(1))} كوباية/يوم</small><small class="block">🌙 ${num(h7.sleepAvg.toFixed(1))} ساعة نوم</small></div>
    <div class="card"><h3>💗 آخر إحساس</h3>${st.moods[0] ? `<b class="big-emoji">${moodOf(st.moods[0].mood)?.emoji}</b><small class="block">${moodOf(st.moods[0].mood)?.label} · ${relDay(st.moods[0].date)}</small>` : '<small class="muted">مسجلش</small>'}</div>
  </section>
  ${st.profile.goals ? `<section class="card"><h3>🎯 أهدافه الشخصية</h3><p class="pre">${esc(st.profile.goals)}</p></section>` : ''}`;
}

function uJournal(st) {
  const list = [...st.journal].sort((a, b) => (b.date + (b.createdAt || 0) > a.date + (a.createdAt || 0) ? 1 : -1));
  if (!list.length) return '<div class="empty"><p>مكتبش يوميات لسه</p></div>';
  return `<p class="muted small">${num(list.length)} تدوينة</p>` + list.map((j) => `<article class="card paper ad-journal">
    <small class="muted">${fmtDate(j.date)}${j.updatedAt && j.createdAt && j.updatedAt - j.createdAt > 60000 ? ' · اتعدلت' : ''}</small>
    <h3>${esc(j.title || 'من غير عنوان')}</h3>
    ${j.image ? `<img class="entry-img" src="${j.image}" alt="">` : ''}
    <div class="entry-body">${esc(j.body).replace(/\n/g, '<br>')}</div></article>`).join('');
}

function uMood(st) {
  const keys = lastNDays(30);
  const ms = S.moodStats(keys);
  if (!st.moods.length) return '<div class="empty"><p>مسجلش مشاعر لسه</p></div>';
  return `<section class="card"><h3>المزاج آخر ٣٠ يوم</h3>${lineChart(ms.byDay, keys.map((k) => num(parseKey(k).getDate())), { min: 1, max: 5, color: '#E58FA0', fmtY: (v) => (v >= 4.5 ? '😊' : v >= 2.5 ? '😐' : '😔') })}</section>
    <section class="card"><h3>التوزيع</h3>${donut(MOODS.map((m) => ({ label: m.emoji + ' ' + m.label, value: ms.counts[m.id] || 0, color: m.color })))}</section>
    ${Object.keys(ms.reasons).length ? `<section class="card"><h3>الأسباب</h3><div class="chips">${Object.entries(ms.reasons).sort((a, b) => b[1] - a[1]).map(([r, c]) => `<span class="chip">${esc(r)} · ${num(c)}</span>`).join('')}</div>
      ${ms.topNeg ? `<p class="small mt-s">💔 أكتر سبب في الأيام الصعبة: <b>${esc(ms.topNeg)}</b></p>` : ''}${ms.topPos ? `<p class="small">🌼 أكتر سبب في الأيام الحلوة: <b>${esc(ms.topPos)}</b></p>` : ''}</section>` : ''}
    <section class="card"><h3>كل التسجيلات</h3><div class="mood-timeline">${st.moods.slice(0, 60).map((m) => { const mo = moodOf(m.mood) || MOODS[0]; return `<div class="mood-entry" style="--mc:${mo.color}"><span class="me-emoji">${mo.emoji}</span><div class="grow"><b>${mo.label}</b> <small class="muted">${relDay(m.date)} ${fmtTime(m.time)}</small>${m.reasons?.length ? `<div class="tags">${m.reasons.map((r) => `<span>${esc(r)}</span>`).join('')}</div>` : ''}${m.note ? `<p>${esc(m.note)}</p>` : ''}</div></div>`; }).join('')}</div></section>`;
}

function uWorship(st) {
  const keys = lastNDays(14);
  const grid = `<div class="ad-pgrid"><span></span>${keys.map((k) => `<span class="h">${num(parseKey(k).getDate())}</span>`).join('')}
    ${PRAYERS.map((p) => `<span class="pn">${p.name}</span>${keys.map((k) => { const r = st.days[k]?.prayers?.[p.id]; return `<i class="${r ? 'p-' + r.status : k < (st.createdAt || '') ? 'na' : ''}" title="${r ? r.status : ''}"></i>`; }).join('')}`).join('')}</div>`;
  const pr30 = S.prayerStats(lastNDays(30));
  const qp = keys.map((k) => S.quranPages(st.days[k] || {}));
  const az = (t) => keys.filter((k) => S.azkarDone(st.days[k] || {}, t)).length;
  const recentQ = Object.entries(st.days).filter(([, d]) => d.quran?.length).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 8);
  return `<section class="card"><h3>الصلوات آخر ١٤ يوم</h3>${grid}
      <div class="cal-legend"><i class="p-jamaa"></i><span>جماعة</span><i class="p-ontime"></i><span>في وقتها</span><i class="p-late"></i><span>متأخرة</span><i class="p-qada"></i><span>قضاء</span><i></i><span>مش متسجلة</span></div></section>
    <section class="card"><h3>كل صلاة (٣٠ يوم)</h3>${PRAYERS.map((p) => { const v = pr30.total ? pr30.per[p.id] / (pr30.total / 5) : 0; return `<div class="kv"><span>${p.name}</span>${progressBar(v)}<b>${num(Math.round(v * 100))}٪</b></div>`; }).join('')}</section>
    <section class="card"><h3>📖 صفحات القرآن (١٤ يوم)</h3>${barChart(qp, keys.map((k) => num(parseKey(k).getDate())), { goal: st.settings.quranGoal || null })}
      ${recentQ.length ? `<ul class="list">${recentQ.map(([k, d]) => d.quran.map((r) => `<li>${relDay(k)}: ${num(r.pages)} صفحة${r.surah ? ' · ' + esc(SURAHS[r.surah - 1]?.name) + (r.ayah ? ' ' + num(r.ayah) : '') : ''}</li>`).join('')).join('')}</ul>` : ''}</section>
    <section class="grid3 mini-stats"><div><b>${num(az('morning'))}/${num(14)}</b><small>أذكار الصباح</small></div><div><b>${num(az('evening'))}/${num(14)}</b><small>أذكار المساء</small></div><div><b>${num(az('prayer'))}/${num(14)}</b><small>بعد الصلاة</small></div></section>`;
}

function uHabits(st) {
  const keys = lastNDays(14);
  const hs = st.habits.filter((h) => h.status !== 'archived');
  const h14 = S.healthStats(keys);
  return `<section class="card"><h3>العادات (١٤ يوم)</h3>${hs.length ? hs.map((h) => {
      const s2 = S.habitStats(h, keys);
      return `<div class="ad-habit"><div class="row between"><span>${h.icon} ${esc(h.name)} ${h.status === 'paused' ? '<small class="tag gray">متوقفة</small>' : ''}</span><b>${s2.due ? num(s2.done) + '/' + num(s2.due) : '—'}</b></div>
        <div class="ad-dots">${keys.map((k) => `<i class="${S.habitDone(h, k) ? 'd' : S.habitDue(h, k) ? 'm' : ''}"></i>`).join('')}</div></div>`;
    }).join('') : '<p class="muted">مفيش عادات</p>'}</section>
    <section class="card"><h3>💪 التمرين (دقايق)</h3>${barChart(keys.map((k) => S.workoutMins(st.days[k] || {})), keys.map((k) => num(parseKey(k).getDate())), { goal: st.settings.exerciseGoal })}</section>
    <section class="card"><h3>💧 المية</h3>${barChart(keys.map((k) => st.days[k]?.water || 0), keys.map((k) => num(parseKey(k).getDate())), { goal: st.settings.waterGoal, color: '#9CC7E4' })}</section>
    <section class="card"><h3>🌙 النوم</h3>${barChart(keys.map((k) => st.days[k]?.sleep || 0), keys.map((k) => num(parseKey(k).getDate())), { goal: st.settings.sleepGoal, color: '#C3B3E0', fmt: (v) => num(+v.toFixed(1)) })}
      <small class="muted">متوسط ${num(h14.sleepAvg.toFixed(1))} ساعة</small></section>`;
}

function uGoals(st) {
  const g = st.goals, c = st.challenges;
  if (!g.length && !c.length) return '<div class="empty"><p>محطش أهداف ولا تحديات لسه</p></div>';
  return `${g.length ? `<section class="card"><h3>🎯 الأهداف</h3>${g.map((x) => { const p = x.done ? 1 : x.steps?.length ? x.steps.filter((s) => s.done).length / x.steps.length : 0; return `<div class="ad-goal"><div class="row between"><b>${esc(x.title)}</b><small>${x.done ? '✓ اتحقق' : x.term === 'long' ? 'بعيد' : 'قريب'}</small></div>${progressBar(p)}${x.why ? `<small class="muted">ليه: ${esc(x.why)}</small>` : ''}${x.steps?.length ? `<ul class="steps">${x.steps.map((s) => `<li class="${s.done ? 'done' : ''}">${s.done ? '✓' : '○'} <span>${esc(s.text)}</span></li>`).join('')}</ul>` : ''}</div>`; }).join('')}</section>` : ''}
    ${c.length ? `<section class="card"><h3>🏅 التحديات</h3>${c.map((x) => `<div class="kv"><span>${x.icon || '🏅'} ${esc(x.title)} (${num(x.length)} يوم)</span>${progressBar(Object.keys(x.log || {}).length / x.length)}<b>${x.done ? '🏆' : num(Object.keys(x.log || {}).length)}</b></div>`).join('')}</section>` : ''}`;
}

async function uMessages(uid) {
  const [inbox, note] = await Promise.all([
    fs.getDocs(fs.query(fs.collection(db, 'users', uid, 'inbox'), fs.orderBy('at', 'desc'), fs.limit(50))),
    fs.getDoc(fs.doc(db, 'notes', uid)),
  ]);
  const msgs = inbox.docs.map((d) => ({ id: d.id, ...d.data() }));
  return `<section class="card"><div class="row between"><h3>📝 ملاحظات المشرف</h3><button class="link" data-act="note" data-uid="${uid}">تعديل</button></div>
      <p class="pre">${note.exists() && note.data().text ? esc(note.data().text) : '<span class="muted">مفيش ملاحظات — المشترك مش بيشوفها</span>'}</p></section>
    <section class="card"><div class="row between"><h3>📩 الرسايل المبعوتة</h3><button class="btn primary sm" data-act="msg" data-uid="${uid}">رسالة جديدة</button></div>
      ${msgs.length ? `<ul class="list">${msgs.map((m) => `<li><b>${esc(m.title)}</b> <small class="muted">${lastSeen(m.at)} · ${esc(m.fromName || '')} · ${m.read ? '✓✓ اتقرت' : '✓ لسه'}</small><p class="small pre">${esc(m.body)}</p></li>`).join('')}</ul>` : '<p class="muted">مبعتلوش رسايل لسه</p>'}</section>`;
}

// ================= المشرفين =================
function renderStaff() {
  const sup = staff.filter((s) => s.role === 'supervisor');
  const owners = staff.filter((s) => s.role === 'owner');
  main.innerHTML = shell('staff', `
    <section class="card"><h2>إضافة مشرف</h2><p class="muted small">لازم يكون عامل حساب في رحلة الأول بنفس الإيميل</p>
      <form id="sf" class="col gap-s" novalidate><input name="e" type="email" dir="ltr" placeholder="email@example.com" required>
      <div class="seg sm" id="role"><button type="button" class="on" data-v="supervisor">مشرف</button><button type="button" data-v="owner">مدير</button></div>
      <button class="btn primary">إضافة</button></form></section>
    <section class="card"><h2>المشرفين (${num(sup.length)})</h2>
      ${sup.length ? `<ul class="list">${sup.map((s) => staffRow(s)).join('')}</ul>` : '<p class="muted">مفيش مشرفين لسه</p>'}</section>
    ${owners.length ? `<section class="card"><h2>مديرين إضافيين</h2><ul class="list">${owners.map((s) => staffRow(s)).join('')}</ul></section>` : ''}
    <p class="muted small">المدير بيشوف كل المشتركين ويقدر يعيّن مشرفين ويبعت إعلانات. المشرف بيشوف المشتركين اللي معاه بس ويبعتلهم رسايل.</p>`);
  let role = 'supervisor';
  main.querySelectorAll('#role [data-v]').forEach((b) => (b.onclick = () => { main.querySelectorAll('#role [data-v]').forEach((x) => x.classList.remove('on')); b.classList.add('on'); role = b.dataset.v; }));
  const f = main.querySelector('#sf');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const email = f.e.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return formError(f, 'الإيميل مش مظبوط');
    const found = users.find((u) => (u.email || '').toLowerCase() === email);
    if (!found) return formError(f, 'مفيش مشترك بالإيميل ده — خليه يعمل حساب في رحلة الأول');
    try {
      await fs.setDoc(fs.doc(db, 'staff', found.uid), { role, email, name: found.name || '', at: Date.now(), by: me.uid });
      await loadStaff(); toast(`${found.name || email} بقى ${role === 'owner' ? 'مدير' : 'مشرف'} ✓`); renderStaff();
    } catch (err) { formError(f, cloud.arError(err)); }
  };
}
function staffRow(s) {
  const mine = users.filter((u) => u.supervisorId === s.uid);
  return `<li class="row between"><div><b>${esc(s.name || s.email)}</b><small class="muted block" dir="ltr" style="text-align:right">${esc(s.email)}</small><small class="muted">${num(mine.length)} مشترك</small></div>
    ${s.uid === me.uid ? '<small class="muted">إنت</small>' : `<button class="btn danger-ghost sm" data-act="remove-staff" data-uid="${s.uid}">شيل</button>`}</li>`;
}

// ================= الإعلانات =================
async function renderBroadcast() {
  const snap = await fs.getDocs(fs.query(fs.collection(db, 'broadcasts'), fs.orderBy('at', 'desc'), fs.limit(30)));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  main.innerHTML = shell('broadcast', `
    <section class="card"><h2>📢 إعلان لكل المشتركين</h2><p class="muted small">بيظهر في إشعارات التطبيق عند كل الناس</p>
      <form id="bf" class="col gap-s" novalidate><input name="t" maxlength="80" placeholder="العنوان (مثلاً: رمضان كريم 🌙)" required>
      <textarea name="b" rows="4" maxlength="1000" placeholder="الرسالة…"></textarea><button class="btn primary">ابعت للكل</button></form></section>
    <section class="card"><h2>الإعلانات اللي اتبعتت</h2>${list.length ? `<ul class="list">${list.map((m) => `<li class="row between"><div><b>${esc(m.title)}</b><small class="muted block">${lastSeen(m.at)} · ${esc(m.byName || '')}</small><p class="small pre">${esc(m.body || '')}</p></div><button class="icon-btn sm" data-act="del-bc" data-id="${m.id}" aria-label="امسح">${icon('trash', 16)}</button></li>`).join('')}</ul>` : '<p class="muted">مفيش إعلانات</p>'}</section>`);
  const f = main.querySelector('#bf');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const title = f.t.value.trim(), body = f.b.value.trim();
    if (!title) return formError(f, 'اكتب العنوان');
    if (!(await confirmBox(`الإعلان هيوصل لكل المشتركين (${users.length}). تبعت؟`, { ok: 'ابعت' }))) return;
    try { await fs.addDoc(fs.collection(db, 'broadcasts'), { title, body, at: Date.now(), by: me.uid, byName: me.name || me.email }); toast('اتبعت للكل 📢'); renderBroadcast(); }
    catch (err) { formError(f, cloud.arError(err)); }
  };
}

// ================= الأكشنز =================
function msgSheet(uid) {
  const u = users.find((x) => x.uid === uid);
  sheet({
    title: `رسالة لـ ${u?.name || ''}`,
    body: `<form id="mf" class="col gap-s" novalidate><input name="t" maxlength="80" placeholder="العنوان" value="رسالة من المشرف" required>
      <textarea name="b" rows="5" maxlength="2000" placeholder="اكتب رسالتك… (بتظهرله في إشعارات التطبيق)"></textarea>
      <div class="chips">${['عامل إيه؟ وحشتنا 🌿', 'برافو عليك! كمّل كده 💪', 'لاحظت إنك مختفي، محتاج حاجة؟', 'أنا هنا لو حابب تتكلم 🤍'].map((t) => `<button type="button" class="chip" data-q="${esc(t)}">${t}</button>`).join('')}</div>
      <button class="btn primary">ابعت</button></form>`,
    onMount(b, close) {
      const f = b.querySelector('#mf');
      b.querySelectorAll('[data-q]').forEach((c) => (c.onclick = () => { f.b.value = c.dataset.q; }));
      f.onsubmit = async (e) => {
        e.preventDefault();
        if (!f.b.value.trim()) return formError(f, 'اكتب الرسالة');
        try {
          await fs.addDoc(fs.collection(db, 'users', uid, 'inbox'), { title: f.t.value.trim() || 'رسالة من المشرف', body: f.b.value.trim(), from: me.uid, fromName: me.name || me.email, at: Date.now(), read: false });
          close(); toast('اتبعتت 📩'); if (location.hash.endsWith('/messages')) route();
        } catch (err) { formError(f, cloud.arError(err)); }
      };
    },
  });
}

async function noteSheet(uid) {
  const n = await fs.getDoc(fs.doc(db, 'notes', uid));
  sheet({
    title: 'ملاحظاتي عن المشترك',
    body: `<p class="muted small">الملاحظات دي للمشرفين والمدير بس، المشترك مش بيشوفها.</p>
      <textarea id="nt" rows="8" maxlength="5000">${esc(n.exists() ? n.data().text || '' : '')}</textarea><button class="btn primary block mt" id="sv">احفظ</button>`,
    onMount(b, close) {
      b.querySelector('#sv').onclick = async () => {
        try { await fs.setDoc(fs.doc(db, 'notes', uid), { text: b.querySelector('#nt').value, updatedAt: Date.now(), by: me.uid }); close(); toast('اتحفظت ✓'); if (location.hash.endsWith('/messages')) route(); }
        catch (err) { toast(cloud.arError(err), 'err'); }
      };
    },
  });
}

function assignSheet(uid) {
  const u = users.find((x) => x.uid === uid);
  const sup = staff.filter((s) => s.role === 'supervisor' || s.role === 'owner');
  sheet({
    title: 'المشرف المسؤول',
    body: `<div class="col gap-s">${[{ uid: '', name: 'من غير مشرف' }, ...sup].map((s) => `<button class="btn ${u?.supervisorId === (s.uid || null) || (!u?.supervisorId && !s.uid) ? 'primary' : 'ghost'} block" data-s="${s.uid}">${esc(s.name || s.email)}</button>`).join('')}</div>
      ${!sup.length ? '<p class="muted small mt-s">ضيف مشرفين الأول من صفحة "المشرفين"</p>' : ''}`,
    onMount(b, close) {
      b.querySelectorAll('[data-s]').forEach((x) => (x.onclick = async () => {
        try { await fs.updateDoc(fs.doc(db, 'users', uid), { supervisorId: x.dataset.s || null }); u.supervisorId = x.dataset.s || null; close(); toast('اتغيّر ✓'); route(); }
        catch (err) { toast(cloud.arError(err), 'err'); }
      }));
    },
  });
}

document.addEventListener('click', async (e) => {
  const f = e.target.closest('[data-filter]');
  if (f) { filter = f.dataset.filter; if (location.hash !== '#/users') location.hash = '#/users'; else renderUsers(); return; }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const uid = a.dataset.uid;
  const act = a.dataset.act;
  if (act === 'logout') { await cloud.logout(); location.reload(); }
  if (act === 'refresh') { await Promise.all([loadUsers(), isOwner() ? loadStaff() : null]); cacheState.clear(); route(); toast('اتحدّثت ✓'); }
  if (act === 'msg') msgSheet(uid);
  if (act === 'note') noteSheet(uid);
  if (act === 'assign') assignSheet(uid);
  if (act === 'reload-user') { await loadUserState(uid, true); route(); }
  if (act === 'toggle-disable') {
    const u = users.find((x) => x.uid === uid);
    if (!(await confirmBox(u.disabled ? 'ترجّع الحساب يشتغل؟' : 'توقّف الحساب؟ المشترك مش هيقدر يستخدم التطبيق لحد ما ترجّعه.', { danger: !u.disabled }))) return;
    try { await fs.updateDoc(fs.doc(db, 'users', uid), { disabled: !u.disabled }); u.disabled = !u.disabled; toast('اتغيّر ✓'); route(); } catch (err) { toast(cloud.arError(err), 'err'); }
  }
  if (act === 'delete-user') {
    if (!(await confirmBox('هيتمسح كل بيانات المشترك ده من السيرفر (يومياته وعباداته وكل حاجة). مش هينفع ترجّعها. متأكد؟', { danger: true, ok: 'امسح' }))) return;
    try {
      for (const sub of ['journal', 'inbox', 'data']) {
        const snap = await fs.getDocs(fs.collection(db, 'users', uid, sub));
        const b = fs.writeBatch(db); snap.docs.forEach((d) => b.delete(d.ref)); if (snap.size) await b.commit();
      }
      await fs.deleteDoc(fs.doc(db, 'notes', uid)).catch(() => {});
      await fs.deleteDoc(fs.doc(db, 'users', uid));
      users = users.filter((x) => x.uid !== uid); cacheState.delete(uid);
      toast('اتمسحت بياناته. لو عايز تمسح الحساب نفسه: Firebase Console ← Authentication', 'info');
      location.hash = '#/users';
    } catch (err) { toast(cloud.arError(err), 'err'); }
  }
  if (act === 'remove-staff') {
    if (!(await confirmBox('تشيل الصلاحيات من الشخص ده؟ المشتركين اللي معاه هيفضلوا متعيّنين ليه لحد ما تغيّرهم.', { danger: true, ok: 'شيل' }))) return;
    try { await fs.deleteDoc(fs.doc(db, 'staff', uid)); await loadStaff(); renderStaff(); toast('اتشالت ✓'); } catch (err) { toast(cloud.arError(err), 'err'); }
  }
  if (act === 'del-bc') {
    if (!(await confirmBox('تمسح الإعلان ده؟', { danger: true, ok: 'امسح' }))) return;
    try { await fs.deleteDoc(fs.doc(db, 'broadcasts', a.dataset.id)); renderBroadcast(); } catch (err) { toast(cloud.arError(err), 'err'); }
  }
});

// ================= الدخول =================
function loginView(msg = '') {
  main.innerHTML = `<section class="auth"><div class="auth-logo">${logo(160, true)}</div>
    <form class="card auth-form" id="lf" novalidate><h2>لوحة الإدارة</h2>
      ${msg ? `<p class="form-error">${msg}</p>` : ''}
      <label class="field"><span>الإيميل</span><input name="e" type="email" dir="ltr" autocomplete="email" required></label>
      <label class="field"><span>الباسورد</span><input name="p" type="password" dir="ltr" autocomplete="current-password" required></label>
      <button class="btn primary block lg">ادخل</button>
      <a class="link block center mt-s" href="../">ارجع للتطبيق</a></form></section>`;
  const f = main.querySelector('#lf');
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { await cloud.login({ email: f.e.value, password: f.p.value }); start(); } catch (err) { formError(f, cloud.arError(err)); }
  };
}

function verifyView(user) {
  main.innerHTML = `<section class="onboard"><h1>أكّد إيميلك الأول 📧</h1>
    <p class="muted">عشان الأمان، صلاحيات المدير بتشتغل بعد تأكيد الإيميل <b dir="ltr">${esc(user.email)}</b>. افتح الرسالة اللي بعتناها ودوس على الرابط (بص في الـ Spam كمان)، وبعدين ارجع هنا.</p>
    <button class="btn primary" id="done">أكّدت ✓</button><button class="btn soft" id="again">ابعت الرسالة تاني</button><button class="link muted" data-act="logout">خروج</button></section>`;
  main.querySelector('#again').onclick = async () => { try { await cloud.resendVerification(); toast('بعتناها تاني 📧'); } catch (e) { toast(cloud.arError(e), 'err'); } };
  main.querySelector('#done').onclick = async () => { await user.reload(); await user.getIdToken(true); start(); };
}

async function start() {
  const user = cloud.currentUser() || (await cloud.firstUser());
  if (!user) return loginView();
  const ownerByEmail = cloud.isOwnerEmail(user.email);
  if (ownerByEmail && !user.emailVerified) return verifyView(user);
  let role = ownerByEmail ? 'owner' : null;
  try {
    const sd = await fs.getDoc(fs.doc(db, 'staff', user.uid));
    if (sd.exists()) role = role || sd.data().role;
    if (ownerByEmail && !sd.exists()) await fs.setDoc(fs.doc(db, 'staff', user.uid), { role: 'owner', email: user.email, name: user.displayName || '', at: Date.now(), by: user.uid });
  } catch (e) { console.warn(e); }
  if (!role) {
    main.innerHTML = `<section class="onboard"><h1>مش مسموحلك تدخل هنا</h1><p class="muted">الحساب <b dir="ltr">${esc(user.email)}</b> مش مدير ولا مشرف. لو المفروض يكون مشرف، اطلب من المدير يضيفك.</p>
      <a class="btn primary" href="../">ارجع للتطبيق</a><button class="link muted" data-act="logout">خروج بحساب تاني</button></section>`;
    return;
  }
  me = { uid: user.uid, email: user.email, name: user.displayName || '', role };
  main.innerHTML = '<div class="empty"><p>بنجيب البيانات…</p></div>';
  try { await Promise.all([loadUsers(), loadStaff()]); }
  catch (e) { main.innerHTML = `<div class="empty"><p>مقدرناش نجيب البيانات: ${esc(cloud.arError(e))}</p><p class="muted small">اتأكد إن قواعد الحماية (firestore.rules) متحطوطة في Firebase.</p></div>`; return; }
  route();
}

window.addEventListener('hashchange', () => { if (me) route(); });
start();

