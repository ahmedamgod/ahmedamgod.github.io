import { getState, update } from '../store.js';
import { today, addDays, num, esc, uid, fmtTime, parseKey, lastNDays, fmtShort, relDay } from '../util.js';
import { pageHead, sheet, toast, celebrate, progressBar, confirmBox, segmented, empty, ring } from '../ui.js';
import { icon } from '../art.js';
import { HABIT_ICONS, HABIT_COLORS, DEFAULT_HABITS, DAY_NAMES, DAY_SHORT } from '../data/content.js';
import * as S from '../stats.js';

let tab = 'today';

const schedText = (h) => {
  const s = h.schedule || { type: 'daily' };
  if (s.type === 'weekly') return (s.days || []).length === 7 ? 'كل يوم' : (s.days || []).map((d) => DAY_NAMES[d]).join('، ');
  if (s.type === 'interval') return s.every === 1 ? 'كل يوم' : `كل ${num(s.every)} أيام`;
  return 'كل يوم';
};

export default {
  render(params) {
    if (params[0]) return detail(params[0]);
    const s = getState();
    const k = today();
    const active = s.habits.filter((h) => h.status === 'active');
    const due = active.filter((h) => S.habitDue(h, k));
    const doneN = due.filter((h) => S.habitDone(h, k)).length;
    const head = pageHead('عاداتي', { sub: 'العادات الصغيرة بتعمل فرق كبير 🌱', actions: `<button class="icon-btn soft" data-act="add" aria-label="عادة جديدة">${icon('plus')}</button>` });
    const seg = segmented([['today', 'النهارده'], ['all', 'كل العادات'], ['paused', 'متوقفة وأرشيف']], tab, 'tab');
    let body = '';
    if (tab === 'today') {
      body = due.length ? `<section class="card row between"><div><h2>${num(doneN)} من ${num(due.length)}</h2><small class="muted">${doneN === due.length ? 'خلصتهم كلهم! 🌸' : 'كل علامة خطوة 💚'}</small></div>${ring(doneN / due.length, 60, 7)}</section>
        <div class="col gap">${due.map((h) => habitRow(h, k)).join('')}</div>`
        : empty(active.length ? 'مفيش عادات مطلوبة النهارده — استمتع بيومك 🌿' : 'لسه مضفتش عادات. ابدأ بعادة واحدة صغيرة!', `<button class="btn primary" data-act="add">${icon('plus', 18)} ضيف عادة</button>`);
      const notToday = active.filter((h) => !S.habitDue(h, k));
      if (notToday.length) body += `<h3 class="mt">مش مطلوبة النهارده</h3><div class="col gap">${notToday.map((h) => habitRow(h, k, true)).join('')}</div>`;
    } else if (tab === 'all') {
      body = active.length ? `<div class="col gap">${active.map((h) => habitCard(h)).join('')}</div>` : empty('مفيش عادات شغالة', `<button class="btn primary" data-act="add">${icon('plus', 18)} ضيف عادة</button>`);
    } else {
      const other = s.habits.filter((h) => h.status !== 'active');
      body = other.length ? `<div class="col gap">${other.map((h) => habitCard(h)).join('')}</div>` : empty('مفيش عادات متوقفة أو في الأرشيف');
    }
    return head + seg + body + `<button class="fab" data-act="add" aria-label="عادة جديدة">${icon('plus', 26)}</button>`;
  },
  mount(el, params) {
    el.addEventListener('click', async (e) => {
      const seg = e.target.closest('[data-seg-v]')?.dataset.segV;
      if (seg) { tab = seg; return update(() => {}); }
      const a = e.target.closest('[data-act]');
      const act = a?.dataset.act;
      if (act === 'add') return addFlow();
      if (act === 'toggle') return toggle(a.dataset.id, a.dataset.day || today());
      if (act === 'value') return valueSheet(a.dataset.id, a.dataset.day || today());
      if (act === 'edit') return habitForm(getState().habits.find((h) => h.id === a.dataset.id));
      if (act === 'status') return setStatus(a.dataset.id, a.dataset.v);
      if (act === 'delete') {
        if (await confirmBox('تمسح العادة دي وكل تاريخها؟ مش هينفع نرجعها.', { danger: true, ok: 'امسح' })) {
          update((s) => { s.habits = s.habits.filter((h) => h.id !== a.dataset.id); });
          location.hash = '#/habits'; toast('اتمسحت');
        }
      }
    });
  },
};

function habitRow(h, k, muted = false) {
  const done = S.habitDone(h, k);
  const v = h.log?.[k];
  const st = S.habitStats(h, lastNDays(30));
  const measurable = h.goal > 0;
  return `<article class="habit-row ${done ? 'done' : ''} ${muted ? 'muted-row' : ''}" style="--hc:${h.color}">
    <a href="#/habits/${h.id}" class="h-ic" aria-label="تفاصيل ${esc(h.name)}">${h.icon}</a>
    <a href="#/habits/${h.id}" class="h-body"><b>${esc(h.name)}</b>
      <small>${measurable ? `${num(typeof v === 'number' ? v : 0)}/${num(h.goal)} ${esc(h.unit)}` : esc(h.desc || schedText(h))}${st.streak > 1 ? ` · 🔥 ${num(st.streak)}` : ''}${h.reminder ? ' · ⏰ ' + fmtTime(h.reminder) : ''}</small>
      ${measurable ? progressBar((typeof v === 'number' ? v : 0) / h.goal, 'var(--green)') : ''}</a>
    ${muted ? '' : measurable
      ? `<button class="h-check val" data-act="value" data-id="${h.id}" aria-label="سجّل">${done ? icon('check', 20) : icon('plus', 20)}</button>`
      : `<button class="h-check ${done ? 'on' : ''}" data-act="toggle" data-id="${h.id}" aria-pressed="${done}" aria-label="${done ? 'شيل العلامة' : 'خلصتها'}">${icon('check', 20)}</button>`}
  </article>`;
}

function habitCard(h) {
  const st = S.habitStats(h, lastNDays(30));
  const statusL = { active: '', paused: '⏸️ متوقفة', archived: '🗄️ في الأرشيف' }[h.status];
  return `<a href="#/habits/${h.id}" class="card habit-card" style="--hc:${h.color}">
    <span class="h-ic">${h.icon}</span>
    <div class="grow"><b>${esc(h.name)}</b><small class="muted">${schedText(h)} ${statusL ? '· ' + statusL : ''}</small>${progressBar(st.pct)}</div>
    <small>${num(Math.round(st.pct * 100))}٪</small></a>`;
}

function detail(id) {
  const h = getState().habits.find((x) => x.id === id);
  if (!h) return pageHead('العادة') + empty('العادة دي مش موجودة', '<a class="btn primary" href="#/habits">ارجع لعاداتي</a>');
  const keys30 = lastNDays(30);
  const st = S.habitStats(h, keys30);
  const totalDone = Object.keys(h.log || {}).filter((k) => S.habitDone(h, k)).length;
  const missed = st.due - st.done;
  // خريطة ١٢ أسبوع
  const weeks = 12;
  const end = today();
  const start = addDays(end, -((weeks - 1) * 7 + parseKey(end).getDay()));
  const cells = [];
  for (let k = start; k <= end; k = addDays(k, 1)) {
    const due = S.habitDue(h, k);
    const done = S.habitDone(h, k);
    const part = typeof h.log?.[k] === 'number' && h.goal ? Math.min(1, h.log[k] / h.goal) : 0;
    cells.push(`<i class="hm ${done ? 'd' : part ? 'p' : due ? 'm' : 'n'}" title="${fmtShort(k)}"></i>`);
  }
  const hist = lastNDays(14).reverse();
  return pageHead(h.name, { sub: h.desc ? esc(h.desc) : schedText(h), actions: `<button class="icon-btn soft" data-act="edit" data-id="${h.id}" aria-label="عدّل">${icon('edit')}</button>` }) + `
  <section class="card habit-hero" style="--hc:${h.color}"><span class="h-ic big">${h.icon}</span>
    <div class="grid3 grow">
      <div><b>${num(st.streak)}</b><small>🔥 ورا بعض</small></div>
      <div><b>${num(Math.round(st.pct * 100))}٪</b><small>آخر ٣٠ يوم</small></div>
      <div><b>${num(totalDone)}</b><small>مرة إجمالي</small></div>
    </div></section>
  <section class="card"><div class="row between"><h2>آخر ١٢ أسبوع</h2><small class="muted">${num(st.done)} اتعملت · ${num(missed)} فاتت</small></div>
    <div class="heatmap" style="--rows:7">${cells.join('')}</div>
    <div class="cal-legend"><i class="hm d"></i><span>اتعملت</span><i class="hm p"></i><span>جزء</span><i class="hm m"></i><span>فاتت</span><i class="hm n"></i><span>مش مطلوبة</span></div>
    ${missed ? '<p class="muted small">اللي فات فات — المهم الخطوة الجاية 💚</p>' : ''}
  </section>
  <section class="card"><h2>السجل</h2><p class="muted small">تقدر تعلّم على أيام فاتت لو نسيت تسجلها</p>
    <ul class="list">${hist.map((k) => {
      const due = S.habitDue(h, k), done = S.habitDone(h, k), v = h.log?.[k];
      if (!due && v == null) return '';
      return `<li class="row between"><span>${relDay(k)} ${typeof v === 'number' ? `· ${num(v)} ${esc(h.unit)}` : ''}</span>
        ${h.goal > 0 ? `<button class="chip ${done ? 'on' : ''}" data-act="value" data-id="${h.id}" data-day="${k}">${done ? '✓' : 'سجّل'}</button>`
          : `<button class="h-check sm ${done ? 'on' : ''}" data-act="toggle" data-id="${h.id}" data-day="${k}" aria-label="علّم">${icon('check', 16)}</button>`}</li>`;
    }).join('')}</ul></section>
  <section class="card col gap-s">
    ${h.status === 'active' ? `<button class="btn soft" data-act="status" data-id="${h.id}" data-v="paused">${icon('pause', 18)} وقّفها مؤقتاً</button>` : `<button class="btn primary" data-act="status" data-id="${h.id}" data-v="active">${icon('play', 18)} رجّعها تشتغل</button>`}
    ${h.status !== 'archived' ? `<button class="btn ghost" data-act="status" data-id="${h.id}" data-v="archived">${icon('archive', 18)} حطها في الأرشيف</button>` : ''}
    <button class="btn danger-ghost" data-act="delete" data-id="${h.id}">${icon('trash', 18)} امسح العادة</button>
  </section>`;
}

function toggle(id, k) {
  let nowDone = false, allDone = false;
  update((s) => {
    const h = s.habits.find((x) => x.id === id);
    h.log ||= {};
    if (h.log[k]) delete h.log[k]; else { h.log[k] = true; nowDone = true; }
    const due = s.habits.filter((x) => S.habitDue(x, today()));
    allDone = k === today() && due.length > 1 && due.every((x) => S.habitDone(x, today()));
  });
  navigator.vibrate?.(10);
  if (allDone) celebrate('كل عادات النهارده خلصت! 🌸');
  else if (nowDone) toast('برافو! خطوة كمان 💚');
}

function valueSheet(id, k) {
  const h = getState().habits.find((x) => x.id === id);
  const cur = typeof h.log?.[k] === 'number' ? h.log[k] : 0;
  const step = h.goal >= 20 ? 5 : 1;
  sheet({
    title: `${h.icon} ${h.name}`,
    body: `<p class="muted center">${relDay(k)} · الهدف ${num(h.goal)} ${esc(h.unit)}</p>
      <div class="stepper"><button class="icon-btn soft" data-d="-${step}" aria-label="قلل">−</button>
      <input id="v" type="number" inputmode="numeric" min="0" max="100000" value="${cur}" aria-label="القيمة"><button class="icon-btn soft" data-d="${step}" aria-label="زوّد">+</button></div>
      <div class="chips center">${[h.goal, Math.round(h.goal / 2)].filter((x, i, a) => x > 0 && a.indexOf(x) === i).map((x) => `<button class="chip" data-set="${x}">${num(x)}</button>`).join('')}</div>
      <button class="btn primary block mt" id="s">احفظ</button>`,
    onMount(b, close) {
      const inp = b.querySelector('#v');
      b.querySelectorAll('[data-d]').forEach((x) => (x.onclick = () => { inp.value = Math.max(0, (+inp.value || 0) + +x.dataset.d); }));
      b.querySelectorAll('[data-set]').forEach((x) => (x.onclick = () => { inp.value = x.dataset.set; }));
      b.querySelector('#s').onclick = () => {
        const v = parseFloat(inp.value);
        if (!(v >= 0 && v <= 100000)) return toast('رقم مش مظبوط', 'err');
        const was = S.habitDone(h, k);
        update((s) => { const x = s.habits.find((y) => y.id === id); x.log ||= {}; if (v === 0) delete x.log[k]; else x.log[k] = v; });
        close();
        if (!was && v >= h.goal) celebrate(`وصلت لهدف ${h.name}! 🎯`); else toast('اتسجل ✓');
      };
    },
  });
}

function setStatus(id, v) {
  update((s) => { const h = s.habits.find((x) => x.id === id); h.status = v; });
  toast({ active: 'رجعت تشتغل 🌱', paused: 'وقفناها مؤقتاً — ارجعلها وقت ما تحب', archived: 'اتحطت في الأرشيف' }[v]);
}

function addFlow() {
  const existing = new Set(getState().habits.map((h) => h.name));
  sheet({
    title: 'عادة جديدة',
    body: `<p class="muted small">اختار من الأمثلة أو اعمل عادتك الخاصة بالظبط زي ما إنت عايز</p>
      <button class="btn primary block" id="custom">${icon('plus', 18)} عادة خاصة بيّا</button>
      <div class="templates mt">${DEFAULT_HABITS.map((t, i) => `<button class="tpl" data-i="${i}" style="--hc:${t.color}" ${existing.has(t.name) ? 'disabled' : ''}><span>${t.icon}</span><b>${t.name}</b><small>${existing.has(t.name) ? 'موجودة ✓' : t.desc}</small></button>`).join('')}</div>`,
    onMount(b, close) {
      b.querySelector('#custom').onclick = () => { close(); setTimeout(() => habitForm(null), 200); };
      b.querySelectorAll('[data-i]').forEach((x) => (x.onclick = () => { close(); setTimeout(() => habitForm(null, DEFAULT_HABITS[x.dataset.i]), 200); }));
    },
  });
}

export function habitForm(h, tpl = null) {
  const v = h || { name: tpl?.name || '', icon: tpl?.icon || '🌿', color: tpl?.color || HABIT_COLORS[0], desc: tpl?.desc || '', goal: tpl?.goal || 0, unit: tpl?.unit || '', reminder: '', schedule: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6], every: 2 } };
  const sc = v.schedule || { type: 'daily' };
  sheet({
    title: h ? 'عدّل العادة' : 'عادة جديدة',
    body: `<form id="hf" novalidate>
      <label class="field"><span>اسم العادة *</span><input id="n" maxlength="40" value="${esc(v.name)}" required placeholder="مثلاً: أقرا ورد، أتمشى…"></label>
      <div class="field"><span>الأيقونة</span><div class="icon-pick">${HABIT_ICONS.map((ic) => `<button type="button" class="${ic === v.icon ? 'on' : ''}" data-ic="${ic}">${ic}</button>`).join('')}</div>
        <input id="ic-custom" maxlength="4" placeholder="أو حط إيموجي من عندك" class="mt-s"></div>
      <div class="field"><span>اللون</span><div class="color-pick">${HABIT_COLORS.map((c) => `<button type="button" class="${c === v.color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="لون"></button>`).join('')}</div></div>
      <label class="field"><span>وصف (اختياري)</span><input id="d" maxlength="80" value="${esc(v.desc)}"></label>
      <div class="field"><span>بتتعمل إمتى؟</span>
        <div class="seg sm" id="st">${[['daily', 'كل يوم'], ['weekly', 'أيام معينة'], ['interval', 'كل كام يوم']].map(([x, l]) => `<button type="button" data-v="${x}" class="${sc.type === x ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div id="wd" class="weekdays mt-s" ${sc.type === 'weekly' ? '' : 'hidden'}>${DAY_SHORT.map((l, i) => `<button type="button" data-wd="${i}" class="${(sc.days || []).includes(i) ? 'on' : ''}" aria-label="${DAY_NAMES[i]}">${l}</button>`).join('')}</div>
        <label id="iv" class="row gap-s mt-s" ${sc.type === 'interval' ? '' : 'hidden'}>كل <input id="every" type="number" min="1" max="30" value="${sc.every || 2}" class="w-sm"> أيام</label>
      </div>
      <div class="grid2"><label class="field"><span>هدف رقمي (اختياري)</span><input id="g" type="number" min="0" max="100000" value="${v.goal || ''}" placeholder="مثلاً ١٠"></label>
        <label class="field"><span>الوحدة</span><input id="u" maxlength="15" value="${esc(v.unit)}" placeholder="صفحة، دقيقة…"></label></div>
      <label class="field"><span>تذكير (اختياري)</span><input id="r" type="time" value="${v.reminder || ''}"></label>
      <button class="btn primary block mt">${h ? 'احفظ التعديلات' : 'ضيف العادة'}</button></form>`,
    onMount(b, close) {
      let icon_ = v.icon, color = v.color, type = sc.type;
      const days = new Set(sc.days || [0, 1, 2, 3, 4, 5, 6]);
      b.querySelectorAll('[data-ic]').forEach((x) => (x.onclick = () => { b.querySelectorAll('[data-ic]').forEach((y) => y.classList.remove('on')); x.classList.add('on'); icon_ = x.dataset.ic; }));
      b.querySelectorAll('[data-c]').forEach((x) => (x.onclick = () => { b.querySelectorAll('[data-c]').forEach((y) => y.classList.remove('on')); x.classList.add('on'); color = x.dataset.c; }));
      b.querySelectorAll('#st [data-v]').forEach((x) => (x.onclick = () => {
        b.querySelectorAll('#st [data-v]').forEach((y) => y.classList.remove('on')); x.classList.add('on'); type = x.dataset.v;
        b.querySelector('#wd').hidden = type !== 'weekly'; b.querySelector('#iv').hidden = type !== 'interval';
      }));
      b.querySelectorAll('[data-wd]').forEach((x) => (x.onclick = () => { const i = +x.dataset.wd; days.has(i) ? days.delete(i) : days.add(i); x.classList.toggle('on'); }));
      b.querySelector('#hf').onsubmit = (e) => {
        e.preventDefault();
        const name = b.querySelector('#n').value.trim();
        const custom = b.querySelector('#ic-custom').value.trim();
        const goal = parseFloat(b.querySelector('#g').value) || 0;
        const every = parseInt(b.querySelector('#every').value, 10);
        if (!name) return toast('اكتب اسم العادة', 'err');
        if (getState().habits.some((x) => x.name === name && x.id !== h?.id)) return toast('فيه عادة بنفس الاسم', 'err');
        if (type === 'weekly' && !days.size) return toast('اختار يوم واحد على الأقل', 'err');
        if (type === 'interval' && !(every >= 1 && every <= 30)) return toast('من يوم لـ ٣٠ يوم', 'err');
        if (goal < 0) return toast('الهدف مينفعش يكون بالسالب', 'err');
        const data = {
          name, icon: custom || icon_, color, desc: b.querySelector('#d').value.trim(), goal, unit: b.querySelector('#u').value.trim(),
          reminder: b.querySelector('#r').value, schedule: { type, days: [...days].sort(), every: every || 2 },
        };
        update((s) => {
          if (h) Object.assign(s.habits.find((x) => x.id === h.id), data);
          else s.habits.push({ id: 'h' + uid(), ...data, status: 'active', createdAt: today(), log: {} });
        });
        close(); toast(h ? 'اتعدلت ✓' : 'اتضافت! يلا بينا 🌱');
      };
    },
  });
}
