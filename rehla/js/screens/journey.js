import { getState, update } from '../store.js';
import { today, num, esc, uid, addDays, daysBetween, fmtShort, fmtDate, relDay, dkey } from '../util.js';
import { pageHead, sheet, toast, celebrate, confirmBox, empty, segmented, progressBar, ring } from '../ui.js';
import { icon, art } from '../art.js';

let tab = 'goals';

const CHALLENGE_IDEAS = [
  { title: 'أصلي الفجر في وقته', icon: '🌄' }, { title: 'أمشي ١٠ آلاف خطوة', icon: '🚶' }, { title: 'من غير سكر', icon: '🍎' },
  { title: 'أقرا ١٠ صفحات', icon: '📖' }, { title: 'أنام قبل ١١', icon: '🌙' }, { title: 'من غير سوشيال قبل النوم', icon: '📵' },
  { title: 'أكتب ٣ حاجات ممتن ليها', icon: '🙏' }, { title: 'أشرب ٨ كوبايات مية', icon: '💧' },
];

const goalPct = (g) => (g.done ? 1 : g.steps?.length ? g.steps.filter((s) => s.done).length / g.steps.length : 0);
const chPct = (c) => Object.keys(c.log || {}).length / c.length;

export default {
  render(params) {
    if (params[0] === 'goal' && params[1]) return goalDetail(params[1]);
    const s = getState();
    const head = pageHead('رحلتي', { sub: 'كل خطوة بتقربك من حلمك 🏔️', actions: `<button class="icon-btn soft" data-act="${tab === 'challenges' ? 'add-ch' : 'add-goal'}" aria-label="جديد">${icon('plus')}</button>` });
    const seg = segmented([['goals', 'أهدافي'], ['challenges', 'التحديات'], ['timeline', 'رحلتي'], ['archive', 'اللي خلص']], tab, 't');
    let body = '';
    if (tab === 'goals') {
      const active = s.goals.filter((g) => !g.done);
      const short = active.filter((g) => g.term === 'short'), long = active.filter((g) => g.term === 'long');
      body = active.length ? `${short.length ? `<h3>أهداف قريبة 🌱</h3><div class="col gap">${short.map(goalCard).join('')}</div>` : ''}
        ${long.length ? `<h3 class="mt">أهداف بعيدة 🏔️</h3><div class="col gap">${long.map(goalCard).join('')}</div>` : ''}`
        : empty('حط هدف واحد بس… وقسّمه لخطوات صغيرة', `<button class="btn primary" data-act="add-goal">${icon('plus', 18)} هدف جديد</button>`);
    } else if (tab === 'challenges') {
      const active = s.challenges.filter((c) => !c.done && !c.ended);
      body = (active.length ? `<div class="col gap">${active.map(chCard).join('')}</div>` : empty('ابدأ تحدي ٧ أيام — بداية سهلة وحلوة 🏅')) +
        `<button class="btn primary block mt" data-act="add-ch">${icon('plus', 18)} تحدي جديد</button>`;
    } else if (tab === 'timeline') body = timeline();
    else {
      const gd = s.goals.filter((g) => g.done), cd = s.challenges.filter((c) => c.done || c.ended);
      body = gd.length || cd.length ? `${gd.length ? `<h3>أهداف اتحققت 🎯</h3><div class="col gap">${gd.map(goalCard).join('')}</div>` : ''}
        ${cd.length ? `<h3 class="mt">تحديات خلصت 🏅</h3><div class="col gap">${cd.map(chCard).join('')}</div>` : ''}` : empty('أول ما تحقق هدف أو تخلّص تحدي هيظهر هنا 🌟');
    }
    return head + seg + body;
  },
  mount(el, params) {
    el.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-seg-v]')?.dataset.segV;
      if (t) { tab = t; return update(() => {}); }
      const a = e.target.closest('[data-act]');
      const act = a?.dataset.act;
      const id = a?.dataset.id;
      if (act === 'add-goal') goalForm();
      if (act === 'edit-goal') goalForm(getState().goals.find((g) => g.id === id));
      if (act === 'add-ch') challengeForm();
      if (act === 'step') toggleStep(params[1], a.dataset.step);
      if (act === 'add-step') addStep(el, params[1]);
      if (act === 'del-step') update((s) => { const g = s.goals.find((x) => x.id === params[1]); g.steps = g.steps.filter((x) => x.id !== a.dataset.step); });
      if (act === 'goal-done') {
        update((s) => { const g = s.goals.find((x) => x.id === id); g.done = !g.done; g.doneAt = g.done ? today() : null; });
        if (getState().goals.find((x) => x.id === id).done) celebrate('حققت هدفك! فخورين بيك 🎯');
      }
      if (act === 'del-goal' && await confirmBox('تمسح الهدف ده؟', { danger: true, ok: 'امسح' })) { update((s) => { s.goals = s.goals.filter((g) => g.id !== id); }); location.hash = '#/journey'; }
      if (act === 'ch-today') checkChallenge(id);
      if (act === 'ch-end' && await confirmBox('تنهي التحدي ده؟ هيتحفظ في الأرشيف باللي عملته.')) update((s) => { s.challenges.find((c) => c.id === id).ended = today(); });
      if (act === 'ch-del' && await confirmBox('تمسح التحدي ده؟', { danger: true, ok: 'امسح' })) update((s) => { s.challenges = s.challenges.filter((c) => c.id !== id); });
    });
  },
};

function goalCard(g) {
  const p = goalPct(g);
  const left = g.deadline ? daysBetween(today(), g.deadline) : null;
  return `<a href="#/journey/goal/${g.id}" class="card goal-card ${g.done ? 'done' : ''}">
    ${ring(p, 52, 6, g.term === 'long' ? 'var(--pink-d)' : 'var(--green)')}
    <div class="grow"><b>${esc(g.title)}</b>
    <small class="muted">${g.done ? '✓ اتحقق ' + relDay(g.doneAt) : `${num(g.steps?.filter((s) => s.done).length || 0)}/${num(g.steps?.length || 0)} خطوات`}${!g.done && left != null ? ` · ${left >= 0 ? 'فاضل ' + num(left) + ' يوم' : 'عدى المعاد — مفيش مشكلة، كمّل'}` : ''}</small></div>
    <span class="go">${icon('back', 18)}</span></a>`;
}

function goalDetail(id) {
  const g = getState().goals.find((x) => x.id === id);
  if (!g) return pageHead('الهدف') + empty('الهدف ده مش موجود', '<a class="btn primary" href="#/journey">ارجع</a>');
  return pageHead(g.title, { sub: (g.term === 'long' ? 'هدف بعيد 🏔️' : 'هدف قريب 🌱') + (g.deadline ? ' · لحد ' + fmtShort(g.deadline) : ''), actions: `<button class="icon-btn soft" data-act="edit-goal" data-id="${g.id}" aria-label="عدّل">${icon('edit')}</button>` }) + `
    <section class="card row gap">${ring(goalPct(g), 80, 8)}<div class="grow">${g.desc ? `<p>${esc(g.desc)}</p>` : ''}${g.why ? `<p class="muted small">ليه مهم: ${esc(g.why)}</p>` : ''}</div></section>
    <section class="card"><h2>الخطوات</h2>
      <ul class="steps">${(g.steps || []).map((s) => `<li class="${s.done ? 'done' : ''}"><button class="h-check sm ${s.done ? 'on' : ''}" data-act="step" data-step="${s.id}" aria-label="علّم">${icon('check', 16)}</button><span class="grow">${esc(s.text)}</span><button class="icon-btn sm" data-act="del-step" data-step="${s.id}" aria-label="امسح">${icon('x', 14)}</button></li>`).join('')}</ul>
      <div class="row gap-s mt"><input id="ns" class="grow" maxlength="100" placeholder="خطوة صغيرة جديدة…" aria-label="خطوة جديدة"><button class="btn soft" data-act="add-step">${icon('plus', 18)}</button></div>
    </section>
    <button class="btn ${g.done ? 'ghost' : 'primary'} block" data-act="goal-done" data-id="${g.id}">${g.done ? 'رجّعه هدف شغال' : '🎯 حققته!'}</button>
    <button class="btn danger-ghost block mt-s" data-act="del-goal" data-id="${g.id}">${icon('trash', 18)} امسح الهدف</button>`;
}

function chCard(c) {
  const end = addDays(c.start, c.length - 1);
  const dayN = Math.min(c.length, daysBetween(c.start, today()) + 1);
  const doneToday = !!c.log?.[today()];
  const active = !c.done && !c.ended && today() <= end;
  const dots = Array.from({ length: c.length }, (_, i) => { const k = addDays(c.start, i); return `<i class="${c.log?.[k] ? 'on' : k < today() ? 'miss' : ''} ${k === today() ? 'now' : ''}"></i>`; }).join('');
  return `<article class="card challenge ${c.length >= 30 ? 'c30' : 'c7'}">
    <div class="row between"><div class="row gap-s"><span class="ch-ic">${c.icon || '🏅'}</span><div><b>${esc(c.title)}</b><small class="muted block">تحدي ${num(c.length)} ${c.length >= 30 ? 'يوم' : 'أيام'} · ${c.done ? 'خلص 🏆' : c.ended ? 'انتهى' : 'اليوم ' + num(Math.max(1, dayN))}</small></div></div>
    ${ring(chPct(c), 46, 5)}</div>
    <div class="ch-dots ${c.length >= 30 ? 'many' : ''}">${dots}</div>
    ${active ? `<button class="btn ${doneToday ? 'ghost' : 'primary'} block mt-s" data-act="ch-today" data-id="${c.id}">${doneToday ? '✓ عملته النهارده (دوس تلغي)' : 'عملته النهارده ✓'}</button>` : ''}
    ${!c.done && !c.ended && today() > end ? `<p class="muted small">التحدي خلص وقته — عملت ${num(Object.keys(c.log || {}).length)} من ${num(c.length)}. كل يوم عملته مكسب 💚</p><button class="btn soft block" data-act="ch-end" data-id="${c.id}">حطه في الأرشيف</button>` : ''}
    <div class="row gap-s mt-s">${active ? `<button class="link small" data-act="ch-end" data-id="${c.id}">إنهاء</button>` : ''}<button class="link small danger" data-act="ch-del" data-id="${c.id}">مسح</button></div>
  </article>`;
}

function checkChallenge(id) {
  let finished = false;
  update((s) => {
    const c = s.challenges.find((x) => x.id === id);
    c.log ||= {};
    if (c.log[today()]) delete c.log[today()];
    else {
      c.log[today()] = true;
      if (Object.keys(c.log).length >= c.length) { c.done = true; c.doneAt = today(); finished = true; }
    }
  });
  if (finished) celebrate('خلّصت التحدي! إنت بطل 🏆'); else toast('يوم كمان في التحدي 💪');
}

function timeline() {
  const s = getState();
  const ev = [];
  ev.push({ k: s.createdAt, ic: '🌱', t: 'بداية رحلتك' });
  s.goals.forEach((g) => { ev.push({ k: dkey(new Date(g.createdAt)), ic: '🎯', t: 'حطيت هدف: ' + g.title }); if (g.done) ev.push({ k: g.doneAt, ic: '🏆', t: 'حققت: ' + g.title, big: true }); });
  s.challenges.forEach((c) => { ev.push({ k: c.start, ic: c.icon || '🏅', t: 'بدأت تحدي: ' + c.title }); if (c.done) ev.push({ k: c.doneAt, ic: '🏅', t: 'خلّصت تحدي: ' + c.title, big: true }); });
  s.habits.forEach((h) => ev.push({ k: h.createdAt, ic: h.icon, t: 'بدأت عادة: ' + h.name }));
  if (s.journal.length) { const f = [...s.journal].sort((a, b) => (a.date > b.date ? 1 : -1))[0]; ev.push({ k: f.date, ic: '✍️', t: 'أول تدوينة في يومياتك' }); }
  (s.quran.khatmaDates || []).forEach((k) => ev.push({ k, ic: '🌟', t: 'ختمة قرآن', big: true }));
  ev.sort((a, b) => (a.k < b.k ? 1 : -1));
  return `<section class="timeline">${ev.map((e) => `<div class="tl-item ${e.big ? 'big' : ''}"><span class="tl-dot">${e.ic}</span><div><small class="muted">${fmtDate(e.k, false)}</small><p>${esc(e.t)}</p></div></div>`).join('')}</section>
    <div class="center mt">${art('journey')}<p class="muted small">كل خطوة بتتكتب في رحلتك</p></div>`;
}

function toggleStep(gid, sid) {
  update((s) => { const g = s.goals.find((x) => x.id === gid); const st = g.steps.find((x) => x.id === sid); st.done = !st.done; });
  const g = getState().goals.find((x) => x.id === gid);
  if (!g.done && g.steps.length && g.steps.every((x) => x.done)) toast('كل الخطوات خلصت! دوس "حققته" 🎯', 'info');
}

function addStep(el, gid) {
  const inp = el.querySelector('#ns');
  const text = inp.value.trim();
  if (!text) return toast('اكتب الخطوة', 'err');
  update((s) => { const g = s.goals.find((x) => x.id === gid); g.steps ||= []; g.steps.push({ id: uid(), text, done: false }); });
}

function goalForm(g = null) {
  sheet({
    title: g ? 'عدّل الهدف' : 'هدف جديد',
    body: `<form id="f" novalidate>
      <label class="field"><span>الهدف *</span><input id="t" maxlength="80" required value="${esc(g?.title || '')}" placeholder="مثلاً: أحفظ جزء عم"></label>
      <div class="seg sm" id="term"><button type="button" data-v="short" class="${(g?.term || 'short') === 'short' ? 'on' : ''}">قريب 🌱</button><button type="button" data-v="long" class="${g?.term === 'long' ? 'on' : ''}">بعيد 🏔️</button></div>
      <label class="field mt"><span>وصف (اختياري)</span><textarea id="d" rows="2" maxlength="300">${esc(g?.desc || '')}</textarea></label>
      <label class="field"><span>ليه الهدف ده مهم ليك؟</span><input id="w" maxlength="150" value="${esc(g?.why || '')}"></label>
      <label class="field"><span>معاد تقريبي (اختياري)</span><input id="dl" type="date" min="${today()}" value="${g?.deadline || ''}"></label>
      ${g ? '' : '<label class="field"><span>أول خطوات (كل خطوة في سطر)</span><textarea id="st" rows="3" placeholder="أحفظ سورة النبأ&#10;أراجعها كل يوم"></textarea></label>'}
      <button class="btn primary block mt">${g ? 'احفظ' : 'يلا نبدأ 🚀'}</button></form>`,
    onMount(b, close) {
      let term = g?.term || 'short';
      b.querySelectorAll('#term [data-v]').forEach((x) => (x.onclick = () => { b.querySelectorAll('#term [data-v]').forEach((y) => y.classList.remove('on')); x.classList.add('on'); term = x.dataset.v; }));
      b.querySelector('#f').onsubmit = (e) => {
        e.preventDefault();
        const title = b.querySelector('#t').value.trim();
        if (!title) return toast('اكتب الهدف', 'err');
        const data = { title, term, desc: b.querySelector('#d').value.trim(), why: b.querySelector('#w').value.trim(), deadline: b.querySelector('#dl').value || null };
        update((s) => {
          if (g) Object.assign(s.goals.find((x) => x.id === g.id), data);
          else {
            const steps = (b.querySelector('#st').value || '').split('\n').map((x) => x.trim()).filter(Boolean).map((text) => ({ id: uid(), text, done: false }));
            s.goals.unshift({ id: 'g' + uid(), ...data, steps, done: false, createdAt: Date.now() });
          }
        });
        close(); toast(g ? 'اتعدل ✓' : 'هدف جديد في رحلتك 🎯');
      };
    },
  });
}

function challengeForm() {
  sheet({
    title: 'تحدي جديد',
    body: `<form id="f" novalidate>
      <div class="seg sm" id="len"><button type="button" data-v="7" class="on">٧ أيام</button><button type="button" data-v="30">٣٠ يوم</button></div>
      <label class="field mt"><span>التحدي *</span><input id="t" maxlength="60" required placeholder="اكتب تحديك أو اختار من تحت"></label>
      <div class="chips">${CHALLENGE_IDEAS.map((c, i) => `<button type="button" class="chip" data-i="${i}">${c.icon} ${c.title}</button>`).join('')}</div>
      <label class="field mt"><span>يبدأ من</span><input id="sd" type="date" value="${today()}" min="${addDays(today(), -6)}" max="${addDays(today(), 7)}"></label>
      <button class="btn primary block mt">ابدأ التحدي 🏅</button></form>`,
    onMount(b, close) {
      let len = 7, ic = '🏅';
      b.querySelectorAll('#len [data-v]').forEach((x) => (x.onclick = () => { b.querySelectorAll('#len [data-v]').forEach((y) => y.classList.remove('on')); x.classList.add('on'); len = +x.dataset.v; }));
      b.querySelectorAll('[data-i]').forEach((x) => (x.onclick = () => { const c = CHALLENGE_IDEAS[x.dataset.i]; b.querySelector('#t').value = c.title; ic = c.icon; }));
      b.querySelector('#f').onsubmit = (e) => {
        e.preventDefault();
        const title = b.querySelector('#t').value.trim();
        const start = b.querySelector('#sd').value || today();
        if (!title) return toast('اكتب التحدي', 'err');
        update((s) => { s.challenges.unshift({ id: 'c' + uid(), title, icon: ic, length: len, start, log: {}, done: false, createdAt: Date.now() }); });
        tab = 'challenges';
        close(); toast('التحدي بدأ! إنت قدها 💪');
      };
    },
  });
}
