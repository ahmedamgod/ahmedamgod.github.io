import { getState, update, day, peekDay } from '../store.js';
import { today, num, esc, uid, relDay, lastNDays, parseKey, fmtTime, nowHM } from '../util.js';
import { pageHead, sheet, toast, celebrate, confirmBox, empty, barChart, progressBar, ring } from '../ui.js';
import { icon } from '../art.js';
import { EXERCISE_TYPES, DAY_SHORT } from '../data/content.js';
import * as S from '../stats.js';

export default {
  render() {
    const s = getState();
    const st = s.settings;
    const d = peekDay(today());
    const water = d.water || 0;
    const mins = S.workoutMins(d);
    const keys = lastNDays(7);
    const wk = S.healthStats(keys);
    const lbl = keys.map((k) => DAY_SHORT[parseKey(k).getDay()]);
    const hist = Object.entries(s.days).flatMap(([k, x]) => (x.workouts || []).map((w) => ({ ...w, k }))).sort((a, b) => (b.k + b.at > a.k + a.at ? 1 : -1)).slice(0, 15);
    return pageHead('صحتي ولياقتي', { sub: 'جسمك أمانة… خلي بالك منه 💪', actions: `<button class="icon-btn soft" data-act="goals" aria-label="الأهداف">${icon('gear')}</button>` }) + `
    <section class="grid3 health-rings">
      <div class="card hr c-sky">${ring(st.waterGoal ? water / st.waterGoal : 0, 66, 7, '#7FB3D9', '💧')}<b>${num(water)}/${num(st.waterGoal)}</b><small>كوباية</small></div>
      <div class="card hr c-green">${ring(st.exerciseGoal ? mins / st.exerciseGoal : 0, 66, 7, 'var(--green)', '🏃')}<b>${num(mins)}/${num(st.exerciseGoal)}</b><small>دقيقة</small></div>
      <div class="card hr c-lav">${ring(st.sleepGoal ? (d.sleep || 0) / st.sleepGoal : 0, 66, 7, '#A994CF', '🌙')}<b>${num(d.sleep || 0)}/${num(st.sleepGoal)}</b><small>ساعة نوم</small></div>
    </section>

    <section class="card water-card">
      <div class="row between"><h2>المية 💧</h2><small class="muted">${water >= st.waterGoal ? 'وصلت لهدفك! 🎉' : `فاضل ${num(Math.max(0, st.waterGoal - water))}`}</small></div>
      <div class="glasses">${Array.from({ length: Math.max(st.waterGoal, water) }, (_, i) => `<button class="glass ${i < water ? 'full' : ''}" data-glass="${i}" aria-label="كوباية ${i + 1}"><svg viewBox="0 0 30 40" aria-hidden="true"><path d="M4 4 H26 L23 37 H7 Z" fill="none" stroke="currentColor" stroke-width="2"/><path class="wf" d="M6 14 H24 L22.4 35 H7.6 Z"/></svg></button>`).join('')}</div>
      <div class="row gap"><button class="btn ghost grow" data-act="w-" ${water ? '' : 'disabled'}>− كوباية</button><button class="btn primary grow" data-act="w+">+ كوباية</button></div>
    </section>

    <section class="card">
      <div class="row between"><h2>النوم 🌙</h2>${d.sleep ? `<small class="muted">${d.sleepBed ? fmtTime(d.sleepBed) + ' ← ' + fmtTime(d.sleepWake) : ''}</small>` : ''}</div>
      ${d.sleep ? `<div class="big-progress"><b>${num(d.sleep)}</b><span>ساعة امبارح بالليل</span></div>${progressBar(d.sleep / st.sleepGoal, '#A994CF')}` : '<p class="muted">نمت كام ساعة امبارح؟</p>'}
      <button class="btn soft block mt" data-act="sleep">${d.sleep ? 'عدّل' : 'سجّل نومك'}</button>
    </section>

    <section class="card">
      <div class="row between"><h2>التمرين 🏃</h2><button class="btn primary sm" data-act="workout">${icon('plus', 16)} تمرين</button></div>
      ${(d.workouts || []).length ? `<ul class="list">${d.workouts.map((w) => wRow(w, today())).join('')}</ul>` : '<p class="muted">لسه متمرنتش النهارده — حتى ١٠ دقايق مشي بيفرقوا 🌿</p>'}
    </section>

    <section class="card"><div class="row between"><h2>الأسبوع ده</h2><small class="muted">${num(wk.sessions)} تمرين · ${num(wk.mins)} دقيقة</small></div>
      <h3 class="small">دقايق التمرين</h3>${barChart(keys.map((k) => S.workoutMins(peekDay(k))), lbl, { goal: st.exerciseGoal, color: '#91AA62' })}
      <h3 class="small mt">كوبايات المية</h3>${barChart(keys.map((k) => peekDay(k).water || 0), lbl, { goal: st.waterGoal, color: '#9CC7E4' })}
      <h3 class="small mt">ساعات النوم</h3>${barChart(keys.map((k) => peekDay(k).sleep || 0), lbl, { goal: st.sleepGoal, color: '#C3B3E0', fmt: (v) => num(+v.toFixed(1)) })}
      <div class="grid3 mt mini-stats"><div><b>${num(wk.waterAvg.toFixed(1))}</b><small>متوسط مية</small></div><div><b>${num(wk.sleepAvg.toFixed(1))}</b><small>متوسط نوم</small></div><div><b>${num(Math.round(wk.mins / 7))}</b><small>دقيقة/يوم</small></div></div>
    </section>

    <section class="card"><h2>سجل التمارين</h2>
      ${hist.length ? `<ul class="list">${hist.map((w) => wRow(w, w.k, true)).join('')}</ul>` : empty('سجل تمارينك هيظهر هنا')}
    </section>
    <p class="muted small center">رحلة مش تطبيق طبي — لو عندك أي ظروف صحية استشير دكتور قبل ما تبدأ نظام رياضي.</p>`;
  },
  mount(el) {
    el.addEventListener('click', async (e) => {
      const g = e.target.closest('[data-glass]');
      if (g) return setWater(+g.dataset.glass + 1 === (peekDay(today()).water || 0) ? +g.dataset.glass : +g.dataset.glass + 1);
      const a = e.target.closest('[data-act]');
      const act = a?.dataset.act;
      if (act === 'w+') setWater((peekDay(today()).water || 0) + 1);
      if (act === 'w-') setWater(Math.max(0, (peekDay(today()).water || 0) - 1));
      if (act === 'sleep') sleepSheet();
      if (act === 'workout') workoutSheet();
      if (act === 'goals') goalsSheet();
      if (act === 'delw' && await confirmBox('تمسح التمرين ده؟', { danger: true, ok: 'امسح' })) update(() => { const d = day(a.dataset.k); d.workouts = d.workouts.filter((w) => w.id !== a.dataset.id); });
    });
  },
};

function wRow(w, k, showDay = false) {
  return `<li class="row between"><span><b>${esc(w.type)}</b> · ${num(w.mins)} دقيقة ${w.note ? `<small class="muted block">${esc(w.note)}</small>` : ''}${showDay ? `<small class="muted block">${relDay(k)}</small>` : ''}</span>
    <button class="icon-btn sm" data-act="delw" data-k="${k}" data-id="${w.id}" aria-label="امسح">${icon('trash', 16)}</button></li>`;
}

function setWater(n) {
  const goal = getState().settings.waterGoal;
  const before = peekDay(today()).water || 0;
  n = Math.max(0, Math.min(40, n));
  update(() => { day().water = n; });
  navigator.vibrate?.(8);
  if (before < goal && n >= goal) celebrate('وصلت لهدف المية النهارده 💧');
}

function sleepSheet() {
  const d = peekDay(today());
  sheet({
    title: 'نومك امبارح',
    body: `<div class="grid2"><label class="field"><span>نمت الساعة</span><input type="time" id="bed" value="${d.sleepBed || '23:00'}"></label>
      <label class="field"><span>صحيت الساعة</span><input type="time" id="wake" value="${d.sleepWake || '07:00'}"></label></div>
      <p class="center big-num" id="calc"></p>
      <label class="field"><span>أو اكتب عدد الساعات</span><input type="number" id="h" step="0.5" min="0" max="24" value="${d.sleep || ''}"></label>
      <button class="btn primary block mt" id="s">احفظ</button>${d.sleep ? '<button class="btn ghost block mt-s" id="clr">امسح</button>' : ''}`,
    onMount(b, close) {
      const calc = () => {
        const [bh, bm] = b.querySelector('#bed').value.split(':').map(Number);
        const [wh, wm] = b.querySelector('#wake').value.split(':').map(Number);
        if (isNaN(bh) || isNaN(wh)) return;
        let m = wh * 60 + wm - (bh * 60 + bm);
        if (m <= 0) m += 1440;
        const h = Math.round((m / 60) * 2) / 2;
        b.querySelector('#h').value = h;
        b.querySelector('#calc').textContent = num(h) + ' ساعة';
      };
      b.querySelector('#bed').oninput = calc; b.querySelector('#wake').oninput = calc;
      if (!d.sleep) calc();
      b.querySelector('#s').onclick = () => {
        const h = parseFloat(b.querySelector('#h').value);
        if (!(h > 0 && h <= 24)) return toast('عدد الساعات من ٠ لـ ٢٤', 'err');
        update(() => { const x = day(); x.sleep = h; x.sleepBed = b.querySelector('#bed').value; x.sleepWake = b.querySelector('#wake').value; });
        close(); toast(h >= getState().settings.sleepGoal ? 'نوم حلو! 😴🌙' : 'اتسجل — حاول تنام بدري شوية النهارده 🌙');
      };
      b.querySelector('#clr')?.addEventListener('click', () => { update(() => { const x = day(); delete x.sleep; delete x.sleepBed; delete x.sleepWake; }); close(); });
    },
  });
}

function workoutSheet() {
  sheet({
    title: 'تمرين جديد',
    body: `<form id="f" novalidate><div class="field"><span>النوع</span><div class="chips" id="types">${EXERCISE_TYPES.map((t, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-t="${t}">${t}</button>`).join('')}</div></div>
      <label class="field"><span>المدة بالدقايق *</span><input id="m" type="number" inputmode="numeric" min="1" max="600" value="20" required></label>
      <div class="chips">${[10, 20, 30, 45, 60].map((n) => `<button type="button" class="chip" data-m="${n}">${num(n)}</button>`).join('')}</div>
      <label class="field mt"><span>ملاحظة (اختياري)</span><input id="n" maxlength="100" placeholder="مثلاً: ٣ كيلو في النادي"></label>
      <button class="btn primary block mt">احفظ</button></form>`,
    onMount(b, close) {
      let type = EXERCISE_TYPES[0];
      b.querySelectorAll('[data-t]').forEach((x) => (x.onclick = () => { b.querySelectorAll('[data-t]').forEach((y) => y.classList.remove('on')); x.classList.add('on'); type = x.dataset.t; }));
      b.querySelectorAll('[data-m]').forEach((x) => (x.onclick = () => { b.querySelector('#m').value = x.dataset.m; }));
      b.querySelector('#f').onsubmit = (e) => {
        e.preventDefault();
        const mins = parseInt(b.querySelector('#m').value, 10);
        if (!(mins >= 1 && mins <= 600)) return toast('المدة من ١ لـ ٦٠٠ دقيقة', 'err');
        const goal = getState().settings.exerciseGoal;
        const before = S.workoutMins(peekDay(today()));
        update(() => { day().workouts.push({ id: 'w' + uid(), type, mins, note: b.querySelector('#n').value.trim(), at: nowHM() }); });
        close();
        if (before < goal && before + mins >= goal) celebrate('وصلت لهدف التمرين! 💪'); else toast('عاش يا بطل 💪');
      };
    },
  });
}

function goalsSheet() {
  const st = getState().settings;
  sheet({
    title: 'أهدافي الصحية اليومية',
    body: `<label class="field"><span>كوبايات المية</span><input id="w" type="number" min="0" max="30" value="${st.waterGoal}"></label>
      <label class="field"><span>دقايق التمرين</span><input id="e" type="number" min="0" max="600" value="${st.exerciseGoal}"></label>
      <label class="field"><span>ساعات النوم</span><input id="s" type="number" min="0" max="14" step="0.5" value="${st.sleepGoal}"></label>
      <button class="btn primary block mt" id="ok">احفظ</button>`,
    onMount(b, close) {
      b.querySelector('#ok').onclick = () => {
        const w = parseInt(b.querySelector('#w').value, 10), e = parseInt(b.querySelector('#e').value, 10), s = parseFloat(b.querySelector('#s').value);
        if (!(w >= 0 && w <= 30) || !(e >= 0 && e <= 600) || !(s >= 0 && s <= 14)) return toast('في رقم مش مظبوط', 'err');
        update((x) => { x.settings.waterGoal = w; x.settings.exerciseGoal = e; x.settings.sleepGoal = s; });
        close(); toast('اتحفظت ✓');
      };
    },
  });
}
