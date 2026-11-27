import { getState, update, getUserId } from '../store.js';
import { today, num, esc, uid, fmtDate, relDay, parseKey, dkey, compressImage } from '../util.js';
import { pageHead, sheet, toast, confirmBox, empty, segmented } from '../ui.js';
import { icon } from '../art.js';
import { MONTHS, DAY_SHORT } from '../data/content.js';
import { currentUser } from '../cloud.js';

let view = 'list';
let query = '';
let pickedDay = null;
let calMonth = null;
let unlocked = false;

export async function pinHash(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('rehla-journal:' + getUserId() + ':' + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  render(params) {
    const s = getState();
    if (s.settings.journalPin && !unlocked) {
      return pageHead('يومياتي') + `<section class="card lock-card center">${icon('lock', 40)}<h2>يومياتك مقفولة</h2><p class="muted">اكتب الرقم السري بتاعك</p>
        <form id="unlock" class="col gap-s"><input id="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" class="pin-input" aria-label="الرقم السري"><button class="btn primary">افتح</button></form></section>`;
    }
    if (params[0] === 'new') return editor(null);
    if (params[0] && params[1] === 'edit') return editor(s.journal.find((j) => j.id === params[0]));
    if (params[0]) return entryView(params[0]);
    const head = pageHead('يومياتي', { sub: 'اكتب اللي في قلبك ✍️', actions: `<a class="icon-btn soft" href="#/journal/new" aria-label="تدوينة جديدة">${icon('plus')}</a>` });
    const seg = segmented([['list', 'كل اليوميات'], ['cal', 'بالتقويم']], view, 'v');
    let list = [...s.journal].sort((a, b) => (b.date + b.createdAt > a.date + a.createdAt ? 1 : -1));
    let body = '';
    if (view === 'list') {
      const q = query.trim();
      if (q) list = list.filter((j) => (j.title + ' ' + j.body).includes(q));
      body = `<label class="search">${icon('search', 18)}<input id="q" type="search" placeholder="دوّر في يومياتك…" value="${esc(query)}" aria-label="بحث"></label>
        <div id="results">${results(list, q)}</div>`;
    } else {
      body = cal(list) + (pickedDay ? `<h3 class="mt">${fmtDate(pickedDay)}</h3>${results(list.filter((j) => j.date === pickedDay), '', true)}` : '<p class="muted small center">اختار يوم من التقويم</p>');
    }
    return head + seg + body + `<a class="fab" href="#/journal/new${view === 'cal' && pickedDay ? '' : ''}" aria-label="تدوينة جديدة">${icon('edit', 24)}</a>`;
  },
  mount(el, params) {
    const s = getState();
    const uf = el.querySelector('#unlock');
    if (uf) {
      uf.onsubmit = async (e) => {
        e.preventDefault();
        if ((await pinHash(el.querySelector('#pin').value)) === s.settings.journalPin) { unlocked = true; update(() => {}); }
        else { toast('الرقم غلط', 'err'); el.querySelector('#pin').value = ''; }
      };
      return;
    }
    if (params[0] === 'new' || params[1] === 'edit') return mountEditor(el, params[1] === 'edit' ? params[0] : null);
    const q = el.querySelector('#q');
    if (q) q.addEventListener('input', () => {
      query = q.value;
      const list = [...getState().journal].sort((a, b) => (b.date + b.createdAt > a.date + a.createdAt ? 1 : -1)).filter((j) => !query.trim() || (j.title + ' ' + j.body).includes(query.trim()));
      el.querySelector('#results').innerHTML = results(list, query.trim());
    });
    el.addEventListener('click', async (e) => {
      const v = e.target.closest('[data-seg-v]')?.dataset.segV;
      if (v) { view = v; return update(() => {}); }
      const d = e.target.closest('[data-day]')?.dataset.day;
      if (d) { pickedDay = d; return update(() => {}); }
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'cal-prev' || a === 'cal-next') {
        const m = parseKey(calMonth || today()); m.setDate(1); m.setMonth(m.getMonth() + (a === 'cal-prev' ? -1 : 1));
        if (dkey(m) <= today()) { calMonth = dkey(m); update(() => {}); }
      }
      if (a === 'del') {
        if (await confirmBox('تمسح التدوينة دي؟ مش هينفع نرجعها.', { danger: true, ok: 'امسح' })) {
          update((st) => { st.journal = st.journal.filter((j) => j.id !== params[0]); });
          location.hash = '#/journal'; toast('اتمسحت');
        }
      }
    });
  },
};

function highlight(text, q) {
  const t = esc(text);
  if (!q) return t;
  return t.split(esc(q)).join(`<mark>${esc(q)}</mark>`);
}

function results(list, q, compact = false) {
  if (!list.length) return q ? empty(`مفيش نتايج لـ "${q}"`) : compact ? '<p class="muted small center">مفيش حاجة مكتوبة اليوم ده — <a href="#/journal/new" class="link">اكتب دلوقتي</a></p>' : empty('صفحتك الأولى مستنياك ✍️ اكتب أي حاجة في بالك', '<a class="btn primary" href="#/journal/new">اكتب أول تدوينة</a>');
  return `<div class="col gap">${list.map((j) => `<a href="#/journal/${j.id}" class="card journal-item">
    ${j.image ? `<img src="${j.image}" alt="" loading="lazy">` : ''}
    <div><small class="muted">${relDay(j.date)}</small><b>${highlight(j.title || 'من غير عنوان', q)}</b>
    <p>${highlight(j.body.slice(0, 120), q)}${j.body.length > 120 ? '…' : ''}</p></div></a>`).join('')}</div>`;
}

function cal(list) {
  const base = calMonth || today();
  const d = parseKey(base);
  const y = d.getFullYear(), m = d.getMonth();
  const has = new Set(list.map((j) => j.date));
  const first = new Date(y, m, 1);
  const n = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<span></span>');
  for (let i = 1; i <= n; i++) {
    const k = dkey(new Date(y, m, i));
    cells.push(`<button class="cal-cell ${has.has(k) ? 'has' : ''} ${k === pickedDay ? 'picked' : ''} ${k === today() ? 'today' : ''}" data-day="${k}" ${k > today() ? 'disabled' : ''}>${num(i)}</button>`);
  }
  return `<section class="card"><div class="row between">
    <button class="icon-btn sm" data-act="cal-prev" aria-label="الشهر اللي فات">${icon('back', 16)}</button><b>${MONTHS[m]} ${num(y)}</b>
    <button class="icon-btn sm flip" data-act="cal-next" aria-label="الشهر الجاي">${icon('back', 16)}</button></div>
    <div class="cal-grid head">${DAY_SHORT.map((x) => `<span>${x}</span>`).join('')}</div><div class="cal-grid">${cells.join('')}</div></section>`;
}

function entryView(id) {
  const j = getState().journal.find((x) => x.id === id);
  if (!j) return pageHead('يومياتي') + empty('التدوينة دي مش موجودة', '<a class="btn primary" href="#/journal">ارجع ليومياتك</a>');
  return pageHead(j.title || 'من غير عنوان', { sub: fmtDate(j.date), actions: `<a class="icon-btn soft" href="#/journal/${j.id}/edit" aria-label="عدّل">${icon('edit')}</a>` }) + `
    <article class="card paper">${j.image ? `<img class="entry-img" src="${j.image}" alt="صورة التدوينة">` : ''}<div class="entry-body">${esc(j.body).replace(/\n/g, '<br>')}</div>
    ${j.updatedAt && j.updatedAt !== j.createdAt ? `<p class="muted small mt">اتعدلت ${relDay(dkey(new Date(j.updatedAt)))}</p>` : ''}</article>
    <button class="btn danger-ghost block mt" data-act="del">${icon('trash', 18)} امسح التدوينة</button>`;
}

const PROMPTS = ['إيه أحلى حاجة حصلت النهارده؟', 'إيه اللي اتعلمته النهارده؟', 'تلات حاجات ممتن ليهم…', 'إيه اللي شاغل بالك؟', 'بكرة عايز تعمل إيه؟'];

function editor(j) {
  const draft = !j ? JSON.parse(sessionStorage.getItem('rehla.jdraft') || 'null') : null;
  const v = j || draft || { title: '', body: '', date: pickedDay || today(), image: '' };
  return pageHead(j ? 'عدّل التدوينة' : 'تدوينة جديدة', { sub: fmtDate(v.date || today()) }) + `
  <form id="jf" class="card paper col gap" novalidate>
    <input id="t" class="title-input" maxlength="80" placeholder="العنوان (اختياري)" value="${esc(v.title)}" aria-label="العنوان">
    <div class="chips">${PROMPTS.map((p) => `<button type="button" class="chip" data-prompt="${esc(p)}">${p}</button>`).join('')}</div>
    <textarea id="b" rows="10" maxlength="20000" placeholder="اكتب اللي في قلبك…" aria-label="النص">${esc(v.body)}</textarea>
    <div class="row between"><label class="field row gap-s"><span>${icon('cal', 16)} اليوم</span><input id="dt" type="date" value="${v.date}" max="${today()}"></label><small class="muted" id="cnt">${num(v.body.length)} حرف</small></div>
    <div id="imgbox">${v.image ? `<div class="img-prev"><img src="${v.image}" alt=""><button type="button" class="icon-btn sm" id="rmimg" aria-label="شيل الصورة">${icon('x', 16)}</button></div>` : ''}</div>
    <label class="btn soft">${icon('image', 18)} ${v.image ? 'غيّر الصورة' : 'ضيف صورة'}<input type="file" accept="image/*" id="img" hidden></label>
    <button class="btn primary block">${icon('check', 18)} احفظ</button>
    ${currentUser() ? '<p class="muted small center">👀 المشرف المسؤول عنك بيقدر يشوف يومياتك</p>' : ''}
  </form>`;
}

function mountEditor(el, id) {
  const j = id ? getState().journal.find((x) => x.id === id) : null;
  const draft = !j ? JSON.parse(sessionStorage.getItem('rehla.jdraft') || 'null') : null;
  let image = j?.image || draft?.image || '';
  const f = el.querySelector('#jf');
  if (!f) return;
  const b = f.querySelector('#b');
  const saveDraft = () => { if (!j) try { sessionStorage.setItem('rehla.jdraft', JSON.stringify({ title: f.querySelector('#t').value, body: b.value, date: f.querySelector('#dt').value, image: '' })); } catch {} };
  b.addEventListener('input', () => { f.querySelector('#cnt').textContent = num(b.value.length) + ' حرف'; saveDraft(); });
  f.querySelector('#t').addEventListener('input', saveDraft);
  f.querySelectorAll('[data-prompt]').forEach((c) => (c.onclick = () => { b.value += (b.value && !b.value.endsWith('\n') ? '\n\n' : '') + c.dataset.prompt + '\n'; b.focus(); saveDraft(); }));
  const paintImg = () => {
    f.querySelector('#imgbox').innerHTML = image ? `<div class="img-prev"><img src="${image}" alt=""><button type="button" class="icon-btn sm" id="rmimg" aria-label="شيل الصورة">${icon('x', 16)}</button></div>` : '';
    f.querySelector('#rmimg')?.addEventListener('click', () => { image = ''; paintImg(); });
  };
  paintImg();
  f.querySelector('#img').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15e6) return toast('الصورة كبيرة أوي', 'err');
    try { image = await compressImage(file); paintImg(); } catch { toast('مقدرناش نفتح الصورة دي', 'err'); }
  };
  f.onsubmit = (e) => {
    e.preventDefault();
    const title = f.querySelector('#t').value.trim();
    const body = b.value.trim();
    const date = f.querySelector('#dt').value || today();
    if (!body && !title) return toast('اكتب حاجة الأول ✍️', 'err');
    if (date > today()) return toast('مينفعش تكتب ليوم لسه مجاش', 'err');
    let nid = id;
    update((s) => {
      if (j) Object.assign(s.journal.find((x) => x.id === id), { title, body, date, image, updatedAt: Date.now() });
      else { nid = 'j' + uid(); s.journal.unshift({ id: nid, title, body, date, image, createdAt: Date.now(), updatedAt: Date.now() }); }
    }, { silent: true });
    sessionStorage.removeItem('rehla.jdraft');
    toast(j ? 'اتعدلت ✓' : 'اتحفظت في يومياتك ✍️');
    location.replace('#/journal/' + nid);
  };
}

export const lockJournal = () => { unlocked = false; };
