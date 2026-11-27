import { getState, update, day, peekDay } from '../store.js';
import { today, addDays, fmtDate, fmtTime, num, esc, nowHM, uid, parseKey, dkey, fmtShort, lastNDays, relDay } from '../util.js';
import { pageHead, sheet, toast, celebrate, ring, progressBar, confirmBox, segmented, empty } from '../ui.js';
import { icon } from '../art.js';
import { PRAYERS, PRAYER_STATUS, MONTHS, DAY_SHORT } from '../data/content.js';
import { AZKAR } from '../data/azkar.js';
import { SURAHS, TOTAL_PAGES } from '../data/quran.js';
import * as S from '../stats.js';
import { prayerTimes } from '../notify.js';

let viewDay = null;
let calMonth = null;

export default {
  render(params) {
    const tab = params[0] || 'prayer';
    const head = pageHead('عباداتي', { sub: 'قلبك يرتاح بالقرب 🤍' });
    const seg = segmented([['prayer', 'الصلاة'], ['quran', 'القرآن'], ['azkar', 'الأذكار']], tab, 'tab');
    let body = '';
    if (tab === 'quran') body = quranView();
    else if (tab === 'azkar') body = params[1] ? azkarSetView(params[1]) : azkarList();
    else body = prayerView();
    return head + seg + body;
  },
  mount(el, params) {
    el.querySelector('[data-seg]')?.addEventListener('click', (e) => {
      const v = e.target.closest('[data-seg-v]')?.dataset.segV;
      if (v) location.hash = '#/worship/' + v;
    });
    const tab = params[0] || 'prayer';
    if (tab === 'quran') mountQuran(el);
    else if (tab === 'azkar') mountAzkar(el, params[1]);
    else mountPrayer(el);
  },
};

// ================= الصلاة =================
function prayerView() {
  const k = viewDay || today();
  const d = peekDay(k);
  const times = prayerTimes(parseKey(k));
  const doneN = Object.keys(d.prayers || {}).length;
  const month = S.prayerStats(monthKeys());
  const week = S.prayerStats(lastNDays(7));
  const loc = getState().settings.location;
  return `
  <div class="day-switch">
    <button class="icon-btn" data-act="prev" aria-label="اليوم اللي قبله">${icon('back')}</button>
    <div><b>${k === today() ? 'النهارده' : relDay(k)}</b><small>${fmtDate(k)}</small></div>
    <button class="icon-btn flip" data-act="next" ${k >= today() ? 'disabled' : ''} aria-label="اليوم اللي بعده">${icon('back')}</button>
  </div>
  <section class="card">
    <div class="row between"><h2>صلوات اليوم</h2>${ring(doneN / 5, 54, 6, 'var(--green)', num(doneN) + '/' + num(5))}</div>
    <ul class="prayer-list">
      ${PRAYERS.map((p) => {
        const r = d.prayers?.[p.id];
        const st = r && PRAYER_STATUS.find((x) => x.id === r.status);
        return `<li class="${r ? 'done' : ''}">
          <button class="prayer-row" data-pr="${p.id}">
            <span class="pr-emoji">${p.emoji}</span>
            <span class="pr-name"><b>${p.name}</b><small>${fmtTime(times[p.id])}</small></span>
            <span class="pr-status">${r ? `${esc(st?.label || '')} · ${fmtTime(r.time)}` : 'علّم عليها'}</span>
            <span class="check ${r ? 'on' : ''}">${icon('check', 18)}</span>
          </button></li>`;
      }).join('')}
    </ul>
    <button class="link small mt" data-act="loc">${icon('pin', 16)} المواقيت حسب: ${esc(loc.label)} — غيّر</button>
  </section>
  <section class="grid2">
    <div class="card stat"><small>الأسبوع ده</small><b>${num(Math.round(week.pct * 100))}٪</b>${progressBar(week.pct)}<small>${num(week.done)} من ${num(week.total)}</small></div>
    <div class="card stat"><small>الشهر ده</small><b>${num(Math.round(month.pct * 100))}٪</b>${progressBar(month.pct, 'var(--pink-d)')}<small>${num(month.jamaa)} في جماعة</small></div>
  </section>
  <section class="card">
    <h2>كل صلاة لوحدها (الشهر ده)</h2>
    ${PRAYERS.map((p) => { const v = month.total ? month.per[p.id] / (month.total / 5) : 0; return `<div class="kv"><span>${p.name}</span>${progressBar(v)}<b>${num(Math.round(v * 100))}٪</b></div>`; }).join('')}
  </section>
  ${calendar()}
  <a href="#/profile/settings" class="card row between link-card"><span>${icon('bell', 18)} تذكير بمواعيد الصلاة</span><small class="muted">${getState().settings.notif.enabled && getState().settings.notif.prayers ? 'شغال ✓' : 'شغّله من الإعدادات'}</small></a>`;
}

function monthKeys(base = today()) {
  const d = parseKey(base);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const out = [];
  for (let x = new Date(first); x.getMonth() === d.getMonth() && dkey(x) <= today(); x.setDate(x.getDate() + 1)) out.push(dkey(x));
  return out.length ? out : [base];
}

function calendar() {
  const base = calMonth || today();
  const d = parseKey(base);
  const y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<span></span>');
  for (let i = 1; i <= days; i++) {
    const k = dkey(new Date(y, m, i));
    const n = Object.keys(peekDay(k).prayers || {}).length;
    const fut = k > today();
    cells.push(`<button class="cal-cell lv${n} ${k === today() ? 'today' : ''}" ${fut ? 'disabled' : ''} data-day="${k}" title="${num(n)} صلوات">${num(i)}</button>`);
  }
  return `<section class="card">
    <div class="row between"><h2>تقويم الالتزام</h2>
      <div class="row gap-s"><button class="icon-btn sm" data-act="cal-prev" aria-label="الشهر اللي فات">${icon('back', 16)}</button>
      <b class="small">${MONTHS[m]} ${num(y)}</b>
      <button class="icon-btn sm flip" data-act="cal-next" aria-label="الشهر الجاي">${icon('back', 16)}</button></div></div>
    <div class="cal-grid head">${DAY_SHORT.map((x) => `<span>${x}</span>`).join('')}</div>
    <div class="cal-grid">${cells.join('')}</div>
    <div class="cal-legend"><span>أقل</span>${[0, 1, 2, 3, 4, 5].map((i) => `<i class="lv${i}"></i>`).join('')}<span>الخمسة</span></div>
  </section>`;
}

function mountPrayer(el) {
  el.addEventListener('click', (e) => {
    const pr = e.target.closest('[data-pr]')?.dataset.pr;
    if (pr) return prayerSheet(pr);
    const dd = e.target.closest('[data-day]')?.dataset.day;
    if (dd) { viewDay = dd; update(() => {}); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const a = e.target.closest('[data-act]')?.dataset.act;
    const k = viewDay || today();
    if (a === 'prev') { viewDay = addDays(k, -1); update(() => {}); }
    if (a === 'next' && k < today()) { viewDay = addDays(k, 1); update(() => {}); }
    if (a === 'cal-prev' || a === 'cal-next') {
      const d = parseKey(calMonth || today());
      d.setDate(1); d.setMonth(d.getMonth() + (a === 'cal-prev' ? -1 : 1));
      if (dkey(d) <= today()) { calMonth = dkey(d); update(() => {}); }
    }
    if (a === 'loc') locationSheet();
  });
}

function prayerSheet(id) {
  const k = viewDay || today();
  const p = PRAYERS.find((x) => x.id === id);
  const r = peekDay(k).prayers?.[id];
  sheet({
    title: 'صلاة ' + p.name,
    body: `<p class="muted">صليتها إزاي؟</p>
      <div class="status-grid">${PRAYER_STATUS.map((s) => `<button class="status-opt ${r?.status === s.id ? 'on' : ''}" data-s="${s.id}">${s.label}<small>+${num(s.pts)}</small></button>`).join('')}</div>
      <label class="field mt"><span>الساعة كام؟</span><input type="time" id="pt" value="${r?.time || (k === today() ? nowHM() : prayerTimes(parseKey(k))[id])}"></label>
      <button class="btn primary block mt" id="ok">تمام ✓</button>
      ${r ? '<button class="btn ghost block mt-s" id="undo">شيل العلامة</button>' : ''}`,
    onMount(b, close) {
      let sel = r?.status || 'ontime';
      b.querySelectorAll('[data-s]').forEach((x) => { if (x.dataset.s === sel) x.classList.add('on'); x.onclick = () => { b.querySelectorAll('[data-s]').forEach((y) => y.classList.remove('on')); x.classList.add('on'); sel = x.dataset.s; }; });
      b.querySelector('#ok').onclick = () => {
        const time = b.querySelector('#pt').value || nowHM();
        let all = false;
        update(() => { const d = day(k); d.prayers[id] = { status: sel, time }; all = Object.keys(d.prayers).length === 5; });
        close();
        if (all) celebrate('الخمس صلوات كاملين! ربنا يتقبل 🤍'); else toast('ربنا يتقبل 🤍');
      };
      b.querySelector('#undo')?.addEventListener('click', () => { update(() => { delete day(k).prayers[id]; }); close(); });
    },
  });
}

function locationSheet() {
  const s = getState().settings;
  sheet({
    title: 'موقع حساب المواقيت',
    body: `<p class="muted small">المواقيت بتتحسب بطريقة الهيئة المصرية العامة للمساحة. ممكن يكون فيه فرق دقيقة أو اتنين عن مسجدك — ظبطه بالدقايق تحت.</p>
      <button class="btn soft block" id="geo">${icon('pin', 18)} استخدم موقعي الحالي</button>
      <div class="grid2 mt"><label class="field"><span>خط العرض</span><input id="lat" type="number" step="0.0001" value="${s.location.lat}"></label>
      <label class="field"><span>خط الطول</span><input id="lng" type="number" step="0.0001" value="${s.location.lng}"></label></div>
      <label class="field"><span>اسم المكان</span><input id="lbl" value="${esc(s.location.label)}" maxlength="40"></label>
      <h3 class="mt">تظبيط بالدقايق (+/-)</h3>
      <div class="grid5">${PRAYERS.map((p) => `<label class="field"><span>${p.name}</span><input type="number" data-off="${p.id}" value="${s.prayerOffsets[p.id] || 0}" min="-30" max="30"></label>`).join('')}</div>
      <button class="btn primary block mt" id="save">احفظ</button>`,
    onMount(b, close) {
      b.querySelector('#geo').onclick = () => {
        if (!navigator.geolocation) return toast('الجهاز مش بيدعم تحديد الموقع', 'err');
        navigator.geolocation.getCurrentPosition(
          (pos) => { b.querySelector('#lat').value = pos.coords.latitude.toFixed(4); b.querySelector('#lng').value = pos.coords.longitude.toFixed(4); b.querySelector('#lbl').value = 'موقعي'; toast('تمام، جبنا موقعك 📍'); },
          () => toast('مقدرناش نوصل لموقعك — اكتبه بإيدك', 'err'), { timeout: 10000 });
      };
      b.querySelector('#save').onclick = () => {
        const lat = parseFloat(b.querySelector('#lat').value), lng = parseFloat(b.querySelector('#lng').value);
        if (!(lat >= -66 && lat <= 66) || !(lng >= -180 && lng <= 180)) return toast('الإحداثيات مش مظبوطة', 'err');
        update((st) => {
          st.settings.location = { lat, lng, label: b.querySelector('#lbl').value.trim() || 'موقعي' };
          b.querySelectorAll('[data-off]').forEach((i) => { st.settings.prayerOffsets[i.dataset.off] = Math.max(-30, Math.min(30, parseInt(i.value, 10) || 0)); });
        });
        close(); toast('اتحفظ ✓');
      };
    },
  });
}

// ================= القرآن =================
function quranView() {
  const s = getState();
  const q = S.quranTotals();
  const d = peekDay(today());
  const tp = S.quranPages(d);
  const goal = s.settings.quranGoal;
  const recent = Object.entries(s.days).filter(([, x]) => x.quran?.length).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
  const weekly = lastNDays(7).map((k) => S.quranPages(peekDay(k)));
  return `
  <section class="card quran-hero">
    ${ring(q.current / TOTAL_PAGES, 110, 11, 'var(--green)', `${num(q.current)}<small>/${num(TOTAL_PAGES)}</small>`)}
    <div class="col">
      <h2>ختمتك الحالية</h2>
      <p class="muted small">${q.khatmat ? `ختمت ${num(q.khatmat)} مرة قبل كده ما شاء الله 🌟<br>` : ''}
      ${q.pace ? `متوسطك الفعلي ${num(q.pace.toFixed(1))} صفحة في اليوم` : 'سجّل قرايتك وهنحسبلك معاد الختمة'}</p>
      ${q.eta ? `<p class="eta">لو كمّلت كده هتختم بعد <b>${num(q.eta)}</b> يوم تقريباً</p>` : ''}
      ${q.current >= TOTAL_PAGES ? '<button class="btn primary sm" data-act="khatma">الحمد لله ختمت! 🌟</button>' : ''}
    </div>
  </section>
  <section class="card">
    <div class="row between"><h2>ورد النهارده</h2><button class="link" data-act="goal">الهدف: ${num(goal)} صفحات ✎</button></div>
    <div class="big-progress"><b>${num(tp)}</b><span>من ${num(goal)} صفحة</span></div>
    ${progressBar(goal ? tp / goal : 0)}
    <div class="row gap mt">${[1, 2, 5, 10].map((n) => `<button class="chip" data-quick="${n}">+${num(n)}</button>`).join('')}</div>
    <button class="btn primary block mt" data-act="add">${icon('plus', 18)} سجّل قراية بالتفصيل</button>
    ${q.lastRec ? `<p class="muted small mt">آخر مكان وقفت عنده: سورة ${esc(SURAHS[q.lastRec.surah - 1]?.name)}${q.lastRec.ayah ? '، آية ' + num(q.lastRec.ayah) : ''}</p>` : ''}
  </section>
  <section class="card">
    <h2>آخر ٧ أيام</h2>
    <div class="mini-bars">${weekly.map((v, i) => `<div><span style="height:${Math.min(100, (v / Math.max(goal, ...weekly, 1)) * 100)}%"></span><small>${DAY_SHORT[parseKey(lastNDays(7)[i]).getDay()]}</small></div>`).join('')}</div>
  </section>
  <section class="card">
    <h2>سجل القراية</h2>
    ${recent.length ? `<ul class="list">${recent.map(([k, x]) => x.quran.map((r) => `<li class="row between">
        <span><b>${num(r.pages)} صفحة</b> ${r.surah ? '· ' + esc(SURAHS[r.surah - 1]?.name) + (r.ayah ? ' ' + num(r.ayah) : '') : ''}<small class="muted block">${relDay(k)}</small></span>
        <button class="icon-btn sm" data-del="${k}|${r.id}" aria-label="امسح">${icon('trash', 16)}</button></li>`).join('')).join('')}</ul>` : empty('لسه مسجلتش قراية. ابدأ ولو بصفحة واحدة 🌱')}
  </section>`;
}

function mountQuran(el) {
  el.addEventListener('click', async (e) => {
    const q = e.target.closest('[data-quick]')?.dataset.quick;
    if (q) return addReading({ pages: +q });
    const del = e.target.closest('[data-del]')?.dataset.del;
    if (del) {
      const [k, id] = del.split('|');
      if (await confirmBox('تمسح التسجيل ده؟', { danger: true, ok: 'امسح' })) update(() => { const d = day(k); d.quran = d.quran.filter((r) => r.id !== id); });
      return;
    }
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'add') readingSheet();
    if (a === 'goal') goalSheet();
    if (a === 'khatma') {
      update((s) => { const t = S.quranTotals(); s.quran.khatmat = (s.quran.khatmat || 0) + 1; s.quran.pagesAtKhatma = t.total; s.quran.khatmaDates = [...(s.quran.khatmaDates || []), today()]; });
      celebrate('مبروك الختمة! اللهم تقبّل 🌟');
    }
  });
}

function addReading(r) {
  const before = S.quranPages(peekDay(today()));
  const goal = getState().settings.quranGoal;
  update(() => { day().quran.push({ id: uid(), at: Date.now(), surah: r.surah || null, ayah: r.ayah || null, pages: r.pages }); });
  const after = before + r.pages;
  if (goal && before < goal && after >= goal) celebrate('خلّصت وردك النهارده 📖');
  else toast(`+${num(r.pages)} صفحة ✓`);
  if (S.quranTotals().current >= TOTAL_PAGES) toast('وصلت لآخر المصحف! دوس "ختمت" 🌟', 'info');
}

function readingSheet() {
  const last = S.quranTotals().lastRec;
  sheet({
    title: 'سجّل قرايتك',
    body: `<form id="f" novalidate>
      <label class="field"><span>السورة</span><select id="su">${SURAHS.map((s) => `<option value="${s.n}" ${last?.surah === s.n ? 'selected' : ''}>${num(s.n)}. ${s.name}</option>`).join('')}</select></label>
      <div class="grid2"><label class="field"><span>وقفت عند آية</span><input id="ay" type="number" inputmode="numeric" min="1" placeholder="اختياري"></label>
      <label class="field"><span>عدد الصفحات *</span><input id="pg" type="number" inputmode="numeric" min="1" max="604" required value="1"></label></div>
      <p class="muted small" id="hint"></p>
      <button class="btn primary block mt">احفظ</button></form>`,
    onMount(b, close) {
      const su = b.querySelector('#su'), ay = b.querySelector('#ay');
      const hint = () => { const s = SURAHS[su.value - 1]; ay.max = s.ayat; b.querySelector('#hint').textContent = `سورة ${s.name}: ${num(s.ayat)} آية، بتبدأ من صفحة ${num(s.page)}`; };
      su.onchange = hint; hint();
      b.querySelector('#f').onsubmit = (e) => {
        e.preventDefault();
        const pages = parseInt(b.querySelector('#pg').value, 10);
        const s = SURAHS[su.value - 1];
        const ayah = ay.value ? parseInt(ay.value, 10) : null;
        if (!(pages >= 1 && pages <= 604)) return toast('عدد الصفحات من ١ لـ ٦٠٤', 'err');
        if (ayah && (ayah < 1 || ayah > s.ayat)) return toast(`سورة ${s.name} فيها ${num(s.ayat)} آية بس`, 'err');
        addReading({ surah: s.n, ayah, pages });
        close();
      };
    },
  });
}

function goalSheet() {
  const g = getState().settings.quranGoal;
  sheet({
    title: 'هدف الورد اليومي',
    body: `<p class="muted small">ابدأ بهدف صغير تقدر تستمر عليه. ٢٠ صفحة في اليوم = ختمة كل شهر.</p>
      <div class="chips">${[1, 2, 4, 5, 10, 20].map((n) => `<button class="chip ${n === g ? 'on' : ''}" data-n="${n}">${num(n)}</button>`).join('')}</div>
      <label class="field mt"><span>صفحات في اليوم</span><input id="g" type="number" min="0" max="604" value="${g}"></label>
      <p class="muted small" id="calc"></p>
      <button class="btn primary block mt" id="s">احفظ</button>`,
    onMount(b, close) {
      const inp = b.querySelector('#g');
      const calc = () => { const v = +inp.value; b.querySelector('#calc').textContent = v > 0 ? `يعني ختمة كل ${num(Math.ceil(TOTAL_PAGES / v))} يوم تقريباً` : 'من غير هدف يومي'; };
      inp.oninput = calc; calc();
      b.querySelectorAll('[data-n]').forEach((c) => (c.onclick = () => { inp.value = c.dataset.n; calc(); }));
      b.querySelector('#s').onclick = () => {
        const v = parseInt(inp.value, 10);
        if (!(v >= 0 && v <= 604)) return toast('رقم من ٠ لـ ٦٠٤', 'err');
        update((s) => { s.settings.quranGoal = v; }); close();
      };
    },
  });
}

// ================= الأذكار =================
function azkarList() {
  const s = getState();
  const d = peekDay(today());
  const sets = ['morning', 'evening', 'prayer'];
  const colors = { morning: 'c-yellow', evening: 'c-blue', prayer: 'c-green' };
  const em = { morning: '☀️', evening: '🌙', prayer: '🤲' };
  return `<section class="col gap">
    ${sets.map((t) => { const p = S.azkarProgress(d, t); return `<a href="#/worship/azkar/${t}" class="card azkar-set ${colors[t]}">
      <span class="az-em">${em[t]}</span><div class="grow"><b>${AZKAR[t].title}</b><small>${AZKAR[t].hint}</small>${progressBar(p)}</div>
      ${p >= 1 ? '<span class="check on">' + icon('check', 18) + '</span>' : `<small>${num(Math.round(p * 100))}٪</small>`}</a>`; }).join('')}
    <a href="#/worship/azkar/custom" class="card azkar-set c-pink"><span class="az-em">📿</span><div class="grow"><b>أذكاري الخاصة</b><small>${num(s.customAzkar.length)} ذكر</small></div><span class="go">${icon('back', 18)}</span></a>
  </section>
  <p class="muted small center mt">النصوص من الأحاديث الصحيحة (حصن المسلم). الآيات بنذكر موضعها عشان تقراها من المصحف.</p>`;
}

function azkarSetView(type) {
  const d = peekDay(today());
  if (type === 'custom') {
    const list = getState().customAzkar;
    const c = d.azkar?.custom || {};
    return `<div class="row between mt"><h2>أذكاري الخاصة</h2><button class="btn soft sm" data-act="add-custom">${icon('plus', 16)} ذكر جديد</button></div>
    ${list.length ? `<div class="col gap">${list.map((it) => zikrCard({ ...it, ref: '' }, c[it.id] || 0, true)).join('')}</div>` : empty('ضيف الأذكار اللي بتحب تقولها كل يوم 📿')}`;
  }
  const set = AZKAR[type];
  if (!set) return empty('مش لاقيين الأذكار دي');
  const c = d.azkar?.[type] || {};
  const p = S.azkarProgress(d, type);
  return `<div class="row between mt"><a href="#/worship/azkar" class="link">${icon('back', 16)} كل الأذكار</a><button class="link" data-act="reset-set">ابدأ من الأول</button></div>
    <section class="card row between"><div><h2>${set.title}</h2><small class="muted">${set.hint}</small></div>${ring(p, 58, 6)}</section>
    <div class="col gap">${set.items.map((it) => zikrCard(it, c[it.id] || 0)).join('')}</div>`;
}

function zikrCard(it, n, custom = false) {
  const done = n >= it.count;
  return `<article class="card zikr ${done ? 'done' : ''}" data-z="${it.id}">
    <p class="${it.quran ? 'zikr-quran' : 'dhikr-text'}">${esc(it.text)}</p>
    ${it.ref ? `<p class="ref">${esc(it.ref)}</p>` : ''}
    <div class="row between">
      ${custom ? `<button class="icon-btn sm" data-delz="${it.id}" aria-label="امسح">${icon('trash', 16)}</button>` : '<span></span>'}
      <button class="z-count" data-tapz="${it.id}" aria-label="عدّ">${done ? icon('check', 18) + ' تمام' : `<b>${num(n)}</b> / ${num(it.count)}`}</button>
    </div></article>`;
}

function mountAzkar(el, type) {
  el.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'add-custom') return customSheet();
    if (a === 'reset-set' && await confirmBox('ترجّع عدّاد الأذكار دي للصفر؟')) return update(() => { day().azkar[type] = {}; });
    const dz = e.target.closest('[data-delz]')?.dataset.delz;
    if (dz) { if (await confirmBox('تمسح الذكر ده؟', { danger: true, ok: 'امسح' })) update((s) => { s.customAzkar = s.customAzkar.filter((x) => x.id !== dz); }); return; }
    const z = e.target.closest('[data-tapz]')?.dataset.tapz || (e.target.closest('.zikr') && !e.target.closest('button') ? e.target.closest('.zikr').dataset.z : null);
    if (!z) return;
    const items = type === 'custom' ? getState().customAzkar : AZKAR[type].items;
    const it = items.find((x) => x.id === z);
    if (!it) return;
    const key = type === 'custom' ? 'custom' : type;
    let finishedItem = false, finishedSet = false;
    update(() => {
      const d = day();
      d.azkar[key] ||= {};
      const cur = d.azkar[key][z] || 0;
      if (cur >= it.count) return;
      d.azkar[key][z] = cur + 1;
      finishedItem = cur + 1 >= it.count;
      if (type !== 'custom') finishedSet = S.azkarDone(d, type);
    }, { silent: true });
    navigator.vibrate?.(8);
    const card = el.querySelector(`[data-z="${z}"]`);
    const n = peekDay(today()).azkar[key][z];
    card.querySelector('.z-count').innerHTML = n >= it.count ? icon('check', 18) + ' تمام' : `<b>${num(n)}</b> / ${num(it.count)}`;
    card.classList.toggle('done', n >= it.count);
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
    if (finishedSet) { celebrate(`خلّصت ${AZKAR[type].title} ✨`); update(() => {}); }
    else if (finishedItem) {
      const next = card.nextElementSibling;
      if (next) setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  });
}

function customSheet() {
  sheet({
    title: 'ذكر جديد',
    body: `<form id="f" novalidate><label class="field"><span>الذكر *</span><textarea id="t" rows="3" maxlength="400" required placeholder="مثلاً: لا إله إلا أنت سبحانك إني كنت من الظالمين"></textarea></label>
      <label class="field"><span>كام مرة في اليوم؟</span><input id="c" type="number" min="1" max="10000" value="33"></label>
      <button class="btn primary block mt">ضيف</button></form>`,
    onMount(b, close) {
      b.querySelector('#f').onsubmit = (e) => {
        e.preventDefault();
        const text = b.querySelector('#t').value.trim();
        const count = parseInt(b.querySelector('#c').value, 10);
        if (!text) return toast('اكتب الذكر الأول', 'err');
        if (!(count >= 1 && count <= 10000)) return toast('العدد من ١ لـ ١٠٠٠٠', 'err');
        update((s) => { s.customAzkar.push({ id: 'c' + uid(), text, count }); });
        close(); toast('اتضاف ✓');
      };
    },
  });
}

