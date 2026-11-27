import { getState, update } from '../store.js';
import { today, num, esc, uid, relDay, lastNDays, fmtTime, pad, parseKey } from '../util.js';
import { pageHead, toast, confirmBox, empty, segmented, lineChart, donut, chips, bindChips, chipValue } from '../ui.js';
import { icon } from '../art.js';
import { MOODS, MOOD_REASONS, MOOD_SUPPORT, DAY_NAMES, DAY_SHORT } from '../data/content.js';
import * as S from '../stats.js';

let period = 7;
let picked = null;

export default {
  render() {
    const s = getState();
    const keys = lastNDays(period);
    const ms = S.moodStats(keys);
    const todays = s.moods.filter((m) => m.date === today());
    const mo = picked && MOODS.find((m) => m.id === picked);
    return pageHead('مشاعري', { sub: 'كل مشاعرك مقبولة هنا 💗' }) + `
    <section class="card">
      <h2>حاسس بإيه دلوقتي؟</h2>
      <div class="mood-grid">${MOODS.map((m) => `<button class="mood-btn ${picked === m.id ? 'on' : ''}" data-mood="${m.id}" style="--mc:${m.color}" aria-pressed="${picked === m.id}"><span>${m.emoji}</span><small>${m.label}</small></button>`).join('')}</div>
      ${mo ? `<div class="mood-form" id="mf">
        <p class="support-msg">${esc(MOOD_SUPPORT[mo.id])}</p>
        <h3>إيه السبب؟ <small class="muted">(اختياري)</small></h3>
        ${chips(MOOD_REASONS, [], 'reasons', true)}
        <label class="field mt"><span>عايز تكتب حاجة؟</span><textarea id="note" rows="3" maxlength="1000" placeholder="اكتب براحتك…"></textarea></label>
        <button class="btn primary block" data-act="save">سجّل ${mo.emoji}</button></div>` : ''}
    </section>
    ${todays.length ? `<section class="card"><h2>النهارده</h2><div class="mood-timeline">${todays.map((m) => entry(m)).join('')}</div></section>` : ''}
    <div class="row between mt"><h2>رحلة مشاعرك</h2>${segmented([['7', 'أسبوع'], ['30', 'شهر']], String(period), 'p')}</div>
    ${ms.list.length ? `
      <section class="card"><h3>المزاج يوم بيوم</h3>
        ${lineChart(ms.byDay.map((v) => (v == null ? null : v)), keys.map((k) => (period === 7 ? DAY_SHORT[parseKey(k).getDay()] : num(parseKey(k).getDate()))), { min: 1, max: 5, color: '#E58FA0', fmtY: (v) => (v >= 4.5 ? '😊' : v >= 2.5 ? '😐' : '😔') })}
      </section>
      <section class="card"><h3>توزيع مشاعرك</h3>${donut(MOODS.map((m) => ({ label: m.emoji + ' ' + m.label, value: ms.counts[m.id] || 0, color: m.color })))}</section>
      <section class="card"><h3>أنماط لاحظناها 🔍</h3><ul class="insights">${patterns(ms).map((p) => `<li>${p}</li>`).join('')}</ul>
        <p class="muted small">دي ملاحظات بسيطة من تسجيلاتك، مش تشخيص. لو حاسس إنك محتاج دعم، كلّم حد بتثق فيه أو متخصص.</p></section>`
      : empty('لسه مفيش تسجيلات في الفترة دي. سجّل مشاعرك وهنوريك الأنماط 💗')}
    ${history(s)}`;
  },
  mount(el) {
    bindChips(el);
    el.addEventListener('click', async (e) => {
      const m = e.target.closest('[data-mood]')?.dataset.mood;
      if (m) { picked = picked === m ? null : m; update(() => {}); setTimeout(() => el.querySelector('#mf')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50); return; }
      const p = e.target.closest('[data-seg-v]')?.dataset.segV;
      if (p) { period = +p; return update(() => {}); }
      const a = e.target.closest('[data-act]');
      if (a?.dataset.act === 'save') {
        const reasons = chipValue(el.querySelector('[data-chips=reasons]'));
        const note = el.querySelector('#note').value.trim();
        const d = new Date();
        const mo = MOODS.find((x) => x.id === picked);
        update((s) => { s.moods.unshift({ id: 'm' + uid(), mood: picked, reasons, note, date: today(), time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, at: Date.now() }); });
        picked = null;
        update(() => {});
        toast(`اتسجل ${mo.emoji} شكراً إنك شاركت مشاعرك`);
      }
      if (a?.dataset.act === 'del' && await confirmBox('تمسح التسجيل ده؟', { danger: true, ok: 'امسح' })) {
        update((s) => { s.moods = s.moods.filter((x) => x.id !== a.dataset.id); });
      }
    });
  },
};

function entry(m) {
  const mo = MOODS.find((x) => x.id === m.mood) || MOODS[0];
  return `<div class="mood-entry" style="--mc:${mo.color}"><span class="me-emoji">${mo.emoji}</span>
    <div class="grow"><b>${mo.label}</b> <small class="muted">${fmtTime(m.time)}</small>
    ${m.reasons?.length ? `<div class="tags">${m.reasons.map((r) => `<span>${esc(r)}</span>`).join('')}</div>` : ''}
    ${m.note ? `<p>${esc(m.note)}</p>` : ''}</div>
    <button class="icon-btn sm" data-act="del" data-id="${m.id}" aria-label="امسح">${icon('trash', 16)}</button></div>`;
}

function history(s) {
  const older = s.moods.filter((m) => m.date !== today()).slice(0, 20);
  if (!older.length) return '';
  const byDay = {};
  older.forEach((m) => (byDay[m.date] ||= []).push(m));
  return `<section class="card"><h2>اللي فات</h2>${Object.entries(byDay).map(([k, list]) => `<h3 class="small muted mt">${relDay(k)}</h3><div class="mood-timeline">${list.map(entry).join('')}</div>`).join('')}</section>`;
}

function patterns(ms) {
  const out = [];
  const top = Object.entries(ms.counts).sort((a, b) => b[1] - a[1])[0];
  if (top) { const m = MOODS.find((x) => x.id === top[0]); out.push(`أكتر إحساس سجلته: <b>${m.emoji} ${m.label}</b> (${num(top[1])} مرة)`); }
  if (ms.topPos) out.push(`غالباً بتحس إنك أحسن لما يكون السبب <b>${esc(ms.topPos)}</b> 🌼`);
  if (ms.topNeg) out.push(`<b>${esc(ms.topNeg)}</b> بيظهر كتير في الأيام الصعبة — ممكن يستاهل شوية اهتمام`);
  const wk = ms.wkAvg.map((v, i) => [v, i]).filter(([v]) => v != null);
  if (wk.length >= 3) {
    const best = wk.sort((a, b) => b[0] - a[0])[0];
    out.push(`يوم <b>${DAY_NAMES[best[1]]}</b> غالباً بيكون أحلى أيامك`);
  }
  const vals = ms.byDay.filter((v) => v != null);
  if (vals.length >= 4) {
    const h = Math.floor(vals.length / 2);
    const a = vals.slice(0, h).reduce((x, y) => x + y, 0) / h;
    const b = vals.slice(h).reduce((x, y) => x + y, 0) / (vals.length - h);
    if (b - a > 0.4) out.push('مزاجك في تحسن الفترة دي ما شاء الله 📈');
    else if (a - b > 0.4) out.push('الأيام الأخيرة كانت أتقل شوية — خد بالك من نفسك وارتاح 🤍');
  }
  if (!out.length) out.push('سجّل أكتر وهنقدر نلاحظ أنماط أوضح');
  return out;
}
