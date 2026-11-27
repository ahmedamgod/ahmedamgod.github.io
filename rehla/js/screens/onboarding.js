import { getState, update, flush } from '../store.js';
import { today, uid, esc, num } from '../util.js';
import { logo, art } from '../art.js';
import { DEFAULT_HABITS } from '../data/content.js';
import { formError, backable, closeTopSheet, discardLayers } from '../ui.js';

let step = 0;
export const resetOnboarding = () => { step = 0; };
const picked = new Set([0, 1, 3]);
let quranGoal = 4;

export default {
  render() {
    const s = getState();
    const dots = `<div class="ob-dots">${[0, 1, 2].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
    if (step === 0) return `<section class="onboard">${dots}<div class="ob-art">${logo(110)}</div>
      <h1>أهلاً بيك في رحلة 🌿</h1><p class="muted">نبدأ بإسمك؟</p>
      <form id="f" class="col gap" novalidate><input id="n" class="big-input" maxlength="30" placeholder="اسمك" value="${esc(s.profile.name)}" autocomplete="given-name" aria-label="اسمك">
      <button class="btn primary block lg">يلا</button></form></section>`;
    if (step === 1) return `<section class="onboard">${dots}<div class="ob-art small">${art('habits')}</div>
      <h1>اختار عادات تبدأ بيها</h1><p class="muted">تقدر تعدّل أو تضيف عاداتك الخاصة بعدين</p>
      <div class="templates">${DEFAULT_HABITS.map((h, i) => `<button class="tpl ${picked.has(i) ? 'on' : ''}" data-i="${i}" style="--hc:${h.color}" aria-pressed="${picked.has(i)}"><span>${h.icon}</span><b>${h.name}</b><small>${h.desc}</small></button>`).join('')}</div>
      <div class="row gap mt"><button class="btn ghost" data-back>رجوع</button><button class="btn primary grow lg" data-next>كمّل (${num(picked.size)})</button></div></section>`;
    return `<section class="onboard">${dots}<div class="ob-art small">${art('worship')}</div>
      <h1>وردك اليومي من القرآن</h1><p class="muted">كام صفحة في اليوم تقدر تستمر عليهم؟</p>
      <div class="chips center">${[1, 2, 4, 10, 20].map((n) => `<button class="chip ${n === quranGoal ? 'on' : ''}" data-q="${n}">${num(n)} ${n === 1 ? 'صفحة' : 'صفحات'}</button>`).join('')}</div>
      <p class="muted small center">${quranGoal === 20 ? 'يعني ختمة كل شهر 🌟' : `يعني ختمة كل ${num(Math.ceil(604 / quranGoal))} يوم تقريباً`}</p>
      <div class="row gap mt"><button class="btn ghost" data-back>رجوع</button><button class="btn primary grow lg" data-finish>ابدأ رحلتي 🚀</button></div></section>`;
  },
  mount(el, onDone) {
    const rerender = () => { el.innerHTML = this.render(); this.mount(el, onDone); };
    const f = el.querySelector('#f');
    if (f) f.onsubmit = (e) => {
      e.preventDefault();
      const n = el.querySelector('#n').value.trim();
      if (!n) return formError(f, 'اكتب اسمك عشان نعرف ننده عليك 😊');
      update((s) => { s.profile.name = n; }, { silent: true });
      backable(() => { step = 0; rerender(); });
      step = 1; rerender();
    };
    el.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; picked.has(i) ? picked.delete(i) : picked.add(i); rerender(); }));
    el.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { quranGoal = +b.dataset.q; rerender(); }));
    el.querySelector('[data-back]')?.addEventListener('click', () => closeTopSheet());
    el.querySelector('[data-next]')?.addEventListener('click', () => { backable(() => { step = 1; rerender(); }); step = 2; rerender(); });
    el.querySelector('[data-finish]')?.addEventListener('click', async () => {
      update((s) => {
        s.settings.quranGoal = quranGoal;
        for (const i of picked) {
          const t = DEFAULT_HABITS[i];
          if (s.habits.some((h) => h.name === t.name)) continue;
          s.habits.push({ id: 'h' + uid(), name: t.name, icon: t.icon, color: t.color, desc: t.desc, goal: t.goal, unit: t.unit, reminder: '', schedule: { type: 'daily', days: [0, 1, 2, 3, 4, 5, 6], every: 1 }, status: 'active', createdAt: today(), log: {} });
        }
        s.onboarded = true;
        s.createdAt = today();
      }, { silent: true });
      await flush();
      step = 0;
      discardLayers();
      onDone();
    });
  },
};
