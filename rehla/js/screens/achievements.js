import { getState, update } from '../store.js';
import { today, num, esc, lastNDays, addDays, parseKey } from '../util.js';
import { pageHead, progressBar, ring, celebrate } from '../ui.js';
import { art } from '../art.js';
import * as S from '../stats.js';

export default {
  render() {
    const pts = S.totalPoints();
    const lvl = S.level(pts);
    const streak = S.streak();
    const best = S.bestStreak();
    const badges = S.badges();
    const got = badges.filter((b) => b.got);
    const week = S.periodSummary(lastNDays(7));
    const lastWeek = S.periodSummary(lastNDays(7, addDays(today(), -7)));
    const d = parseKey(today());
    const monthKeys = lastNDays(d.getDate());
    const month = S.periodSummary(monthKeys);
    const s = getState();
    const weekHighlights = highlights(lastNDays(7));
    return pageHead('إنجازاتي', { back: false, sub: 'بنحتفل بالاستمرار، مش بالكمال 🌸' }) + `
    <section class="card level-card">
      <div class="lv-art">${art('trophy')}</div>
      <div class="grow"><small class="muted">مستواك</small><h2>${lvl.icon} ${lvl.name}</h2>
        <b class="pts">${num(pts)} <small>نقطة</small></b>
        ${lvl.next ? `${progressBar(lvl.pct, 'var(--yellow-d)')}<small class="muted">فاضل ${num(lvl.next - pts)} نقطة لـ ${lvl.nextName}</small>` : '<small>وصلت لأعلى مستوى ✨</small>'}</div>
    </section>
    <section class="grid3">
      <div class="card stat center"><span class="big-emoji">🔥</span><b>${num(streak)}</b><small>أيام ورا بعض</small></div>
      <div class="card stat center"><span class="big-emoji">🏔️</span><b>${num(best)}</b><small>أطول سلسلة</small></div>
      <div class="card stat center"><span class="big-emoji">🌿</span><b>${num(S.successfulDays())}</b><small>يوم ناجح</small></div>
    </section>
    <p class="muted small center">اليوم الناجح = خلّصت نص مهامك أو أكتر. يوم فاتك؟ عادي خالص، السلسلة بتبدأ تاني من بكرة 💚</p>

    <section class="card"><h2>إنجازات الأسبوع ده</h2>
      <div class="row between"><div>${ring(week.avg, 70, 8)}</div>
      <div class="grow col gap-s pad-s">
        <div class="kv"><span>أيام ناجحة</span><b>${num(week.good)}/${num(S.activeKeys(lastNDays(7)).length)}</b></div>
        <div class="kv"><span>نقاط الأسبوع</span><b>${num(week.pts)}</b></div>
        <div class="kv"><span>مقارنة بالأسبوع اللي فات</span><b>${trend(week.avg, lastWeek.avg)}</b></div></div></div>
      ${weekHighlights.length ? `<ul class="insights">${weekHighlights.map((h) => `<li>${h}</li>`).join('')}</ul>` : ''}
    </section>
    <section class="card"><h2>إنجازات الشهر ده</h2>
      <div class="grid3 mini-stats"><div><b>${num(month.good)}</b><small>يوم ناجح</small></div><div><b>${num(month.pts)}</b><small>نقطة</small></div><div><b>${num(Math.round(month.avg * 100))}٪</b><small>متوسط الإنجاز</small></div></div>
    </section>

    <div class="row between mt"><h2>شاراتي</h2><small class="muted">${num(got.length)} من ${num(badges.length)}</small></div>
    <section class="badges">${badges.map((b) => `<div class="badge ${b.got ? 'got' : ''}" style="--bc:${b.color}">
      <span class="b-ic">${b.icon}</span><b>${esc(b.title)}</b><small>${esc(b.desc)}</small>
      ${b.got ? '<small class="ok">✓ اتفتحت</small>' : progressBar(b.cur / b.target, 'var(--green)') + `<small>${num(b.cur)}/${num(b.target)}</small>`}</div>`).join('')}</section>

    <section class="card"><h2>مكافآت التحديات 🏅</h2>
      ${s.challenges.filter((c) => c.done).length ? `<div class="chips">${s.challenges.filter((c) => c.done).map((c) => `<span class="chip on">${c.icon || '🏅'} ${esc(c.title)} · ${c.length >= 30 ? '+١٥٠' : '+٣٠'}</span>`).join('')}</div>` : '<p class="muted">خلّص تحدي ٧ أيام وخد +٣٠ نقطة، أو ٣٠ يوم وخد +١٥٠ 🏆 <a href="#/journey" class="link">ابدأ تحدي</a></p>'}
    </section>
    <section class="card"><h2>إزاي بتجمع نقط؟</h2>
      <ul class="points-list">
        <li>🕌 صلاة: ٤–١٥ نقطة حسب الحالة</li><li>📖 كل صفحة قرآن: ٢</li><li>📿 مجموعة أذكار كاملة: ١٠</li>
        <li>🌱 عادة: ٥</li><li>💧 هدف المية: ٥ · 🏃 تمرين: ٥+</li><li>✍️ تدوينة: ٥ · 💗 تسجيل مشاعر: ٣</li>
        <li>🎯 هدف قريب: ٥٠ · بعيد: ١٠٠</li><li>🌿 يوم ناجح: +١٠ · يوم كامل: +١٠ كمان</li>
      </ul></section>`;
  },
  mount() {
    // احتفال بالشارات الجديدة مرة واحدة بس
    const s = getState();
    const fresh = S.badges().filter((b) => b.got && !s.seenBadges.includes(b.id));
    if (fresh.length) {
      update((st) => { st.seenBadges.push(...fresh.map((b) => b.id)); }, { silent: true });
      setTimeout(() => celebrate(`شارة جديدة: ${fresh[0].icon} ${fresh[0].title}`), 300);
    }
  },
};

function trend(a, b) {
  const d = Math.round((a - b) * 100);
  if (d > 0) return `<span class="up">▲ ${num(d)}٪</span>`;
  if (d < 0) return `<span class="flat">${num(-d)}٪ أقل — عادي، كمّل</span>`;
  return 'زي ما هو';
}

function highlights(keys) {
  const out = [];
  const pr = S.prayerStats(keys);
  if (pr.done) out.push(`🕌 صليت ${num(pr.done)} صلاة${pr.jamaa ? `، منهم ${num(pr.jamaa)} في جماعة` : ''}`);
  const q = keys.reduce((a, k) => a + S.quranPages(getState().days[k] || {}), 0);
  if (q) out.push(`📖 قريت ${num(q)} صفحة قرآن`);
  const h = S.healthStats(keys);
  if (h.sessions) out.push(`💪 اتمرنت ${num(h.sessions)} مرة (${num(h.mins)} دقيقة)`);
  const hd = getState().habits.reduce((a, x) => a + keys.filter((k) => S.habitDone(x, k)).length, 0);
  if (hd) out.push(`🌱 عملت عاداتك ${num(hd)} مرة`);
  return out;
}

