import { getState, peekDay, update } from '../store.js';
import { today, num, esc, lastNDays, parseKey, fmtShort } from '../util.js';
import { pageHead, segmented, barChart, lineChart, donut, progressBar, ring, empty } from '../ui.js';
import { PRAYERS, MOODS, DAY_SHORT } from '../data/content.js';
import { TOTAL_PAGES } from '../data/quran.js';
import * as S from '../stats.js';

let period = 'week';

export default {
  render() {
    const s = getState();
    const n = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const keys = S.activeKeys(lastNDays(n));
    const lbl = keys.map((k) => (n === 7 ? DAY_SHORT[parseKey(k).getDay()] : num(parseKey(k).getDate())));
    const sum = S.periodSummary(keys);
    const pr = S.prayerStats(keys);
    const q = S.quranTotals();
    const qPages = keys.map((k) => S.quranPages(peekDay(k)));
    const h = S.healthStats(keys);
    const ms = S.moodStats(keys);
    const habits = s.habits.filter((x) => x.status !== 'archived');
    const readingHabits = s.habits.filter((x) => /قرا|كتاب|صفح/.test(x.name + x.unit));
    const readPages = keys.reduce((a, k) => a + readingHabits.reduce((b, x) => b + (typeof x.log?.[k] === 'number' ? x.log[k] : 0), 0), 0);
    const hasData = Object.keys(s.days).length || s.habits.some((x) => Object.keys(x.log || {}).length) || s.moods.length;
    const head = pageHead('تقاريري', { back: false, sub: 'كل الأرقام دي من تسجيلاتك إنت 📊' });
    const seg = segmented([['day', 'النهارده'], ['week', 'الأسبوع'], ['month', 'الشهر']], period, 'p');
    if (!hasData) return head + seg + empty('أول ما تبدأ تسجل، تقاريرك هتظهر هنا بالتفصيل 🌱', '<a class="btn primary" href="#/home">يلا نبدأ</a>');

    const dayItems = S.dayItems(today());
    return head + seg + `
    <section class="card report-hero">
      ${ring(period === 'day' ? S.completion(today()) : sum.avg, 96, 10)}
      <div class="grow"><h2>${period === 'day' ? 'إنجاز النهارده' : 'متوسط الإنجاز'}</h2>
      ${period === 'day' ? `<p class="muted">${num(dayItems.filter((i) => i.done).length)} من ${num(dayItems.length)} مهمة</p>` : `<p class="muted">${num(sum.good)} يوم ناجح من ${num(keys.length)}</p>`}
      <p><b>${num(sum.pts)}</b> نقطة ${period === 'day' ? 'النهارده' : 'في الفترة دي'}</p></div>
    </section>

    ${period === 'day' ? `<section class="card"><h2>تفاصيل النهارده</h2><ul class="todo">${dayItems.map((i) => `<li class="${i.done ? 'done' : ''}"><span class="dot g-${i.group}"></span>${esc(i.label)}<span class="go">${i.done ? '✓' : '—'}</span></li>`).join('')}</ul></section>`
    : `<section class="card"><h2>نسبة الإنجاز اليومية</h2>${lineChart(sum.comp, lbl)}</section>`}

    <section class="card"><div class="row between"><h2>🕌 الالتزام بالصلاة</h2><b>${num(Math.round(pr.pct * 100))}٪</b></div>
      ${PRAYERS.map((p) => { const v = keys.length ? pr.per[p.id] / keys.length : 0; return `<div class="kv"><span>${p.name}</span>${progressBar(v)}<b>${num(pr.per[p.id])}/${num(keys.length)}</b></div>`; }).join('')}
      <div class="grid2 mini-stats mt"><div><b>${num(pr.ontime)}</b><small>في وقتها أو جماعة</small></div><div><b>${num(pr.jamaa)}</b><small>في جماعة</small></div></div>
    </section>

    <section class="card"><div class="row between"><h2>📖 القرآن</h2><small class="muted">${num(qPages.reduce((a, b) => a + b, 0))} صفحة</small></div>
      ${n > 1 ? barChart(qPages, lbl, { goal: s.settings.quranGoal || null }) : ''}
      <div class="kv mt"><span>الختمة الحالية</span>${progressBar(q.current / TOTAL_PAGES)}<b>${num(Math.round((q.current / TOTAL_PAGES) * 100))}٪</b></div>
      ${q.eta ? `<p class="muted small">بمعدلك الفعلي (${num(q.pace.toFixed(1))} صفحة/يوم) هتختم بعد ${num(q.eta)} يوم</p>` : ''}
    </section>

    <section class="card"><h2>🌱 العادات</h2>
      ${habits.length ? habits.map((x) => { const st = S.habitStats(x, keys); return `<div class="kv"><span>${x.icon} ${esc(x.name)}</span>${progressBar(st.pct)}<b>${st.due ? num(st.done) + '/' + num(st.due) : '—'}</b></div>`; }).join('') : '<p class="muted">مفيش عادات لسه</p>'}
    </section>

    ${readingHabits.length ? `<section class="card"><h2>📚 القراية</h2><div class="big-progress"><b>${num(readPages)}</b><span>صفحة كتب في الفترة دي</span></div></section>` : ''}

    <section class="card"><h2>💪 الرياضة والصحة</h2>
      ${n > 1 ? barChart(keys.map((k) => S.workoutMins(peekDay(k))), lbl, { goal: s.settings.exerciseGoal, color: '#91AA62' }) : ''}
      <div class="grid3 mini-stats mt"><div><b>${num(h.sessions)}</b><small>تمرين</small></div><div><b>${num(h.mins)}</b><small>دقيقة</small></div><div><b>${num(h.waterAvg.toFixed(1))}</b><small>متوسط مية</small></div></div>
      ${Object.keys(h.types).length ? donut(Object.entries(h.types).map(([t, v], i) => ({ label: t, value: v, color: ['#91AA62', '#9CC7E4', '#F3A9B4', '#F2C94C', '#C3B3E0', '#FBC69A', '#A8D5C2', '#D9B99B', '#B9CD92', '#E0A5B5'][i % 10] })), 110) : ''}
      ${h.sleepAvg ? `<p class="muted small">متوسط نومك ${num(h.sleepAvg.toFixed(1))} ساعة</p>` : ''}
    </section>

    <section class="card"><h2>💗 المشاعر</h2>
      ${ms.list.length ? `${n > 1 ? lineChart(ms.byDay, lbl, { min: 1, max: 5, color: '#E58FA0', fmtY: (v) => (v >= 4.5 ? '😊' : v >= 2.5 ? '😐' : '😔') }) : ''}
        ${donut(MOODS.map((m) => ({ label: m.emoji + ' ' + m.label, value: ms.counts[m.id] || 0, color: m.color })), 110)}`
        : '<p class="muted">مفيش تسجيلات مشاعر في الفترة دي</p>'}
    </section>

    <section class="card"><h2>🏆 إنجازاتك الشخصية</h2>
      <div class="grid3 mini-stats"><div><b>${num(S.totalPoints())}</b><small>نقطة كلية</small></div><div><b>${num(S.bestStreak())}</b><small>أطول سلسلة</small></div><div><b>${num(S.badges().filter((b) => b.got).length)}</b><small>شارة</small></div></div>
      <div class="grid3 mini-stats mt"><div><b>${num(s.goals.filter((g) => g.done).length)}</b><small>هدف اتحقق</small></div><div><b>${num(s.challenges.filter((c) => c.done).length)}</b><small>تحدي خلص</small></div><div><b>${num(s.journal.length)}</b><small>تدوينة</small></div></div>
    </section>
    <p class="muted small center">بيانات من ${fmtShort(keys[0])} لـ ${fmtShort(keys[keys.length - 1])}</p>`;
  },
  mount(el) {
    el.querySelector('[data-seg]')?.addEventListener('click', (e) => {
      const v = e.target.closest('[data-seg-v]')?.dataset.segV;
      if (v) { period = v; update(() => {}); }
    });
  },
};
