import { getState, update, day, peekDay } from '../store.js';
import { today, fmtDate, greeting, num, esc, hashStr, fmtTime, relDay } from '../util.js';
import { logo, heroScene, art, icon } from '../art.js';
import { ring, celebrate, sheet, toast } from '../ui.js';
import * as S from '../stats.js';
import { DAILY_DHIKR } from '../data/azkar.js';
import { MESSAGES, MOODS, PRAYERS } from '../data/content.js';
import { nextPrayer } from '../notify.js';

let msgShift = 0;

const dailyDhikr = () => DAILY_DHIKR[hashStr(today()) % DAILY_DHIKR.length];

function cardInfo() {
  const s = getState();
  const k = today();
  const d = peekDay(k);
  const prayers = Object.keys(d.prayers || {}).length;
  const due = s.habits.filter((h) => S.habitDue(h, k));
  const hd = due.filter((h) => S.habitDone(h, k)).length;
  const lastJ = s.journal[0];
  const lastMood = s.moods.find((m) => m.date === k);
  const mo = lastMood && MOODS.find((m) => m.id === lastMood.mood);
  const activeGoals = s.goals.filter((g) => !g.done).length + s.challenges.filter((c) => !c.done).length;
  return {
    worship: `${num(prayers)}/${num(5)} صلوات`,
    habits: due.length ? `${num(hd)} من ${num(due.length)} النهارده` : 'ضيف أول عادة',
    journal: lastJ ? 'آخر تدوينة ' + relDay(lastJ.date) : 'اكتب أول صفحة',
    emotions: mo ? `${mo.emoji} ${mo.label}` : 'حاسس بإيه؟',
    health: `💧 ${num(d.water || 0)}/${num(s.settings.waterGoal)}`,
    journey: activeGoals ? `${num(activeGoals)} شغالين` : 'حط هدف جديد',
  };
}

const CARDS = [
  ['worship', 'عباداتي', 'worship', 'c-green'],
  ['habits', 'عاداتي', 'habits', 'c-yellow'],
  ['journal', 'يومياتي', 'journal', 'c-blue'],
  ['mood', 'مشاعري', 'emotions', 'c-pink'],
  ['health', 'صحتي ولياقتي', 'health', 'c-sky'],
  ['journey', 'رحلتي', 'journey', 'c-peach'],
];

export default {
  render() {
    const s = getState();
    const k = today();
    const d = peekDay(k);
    const comp = S.completion(k);
    const items = S.dayItems(k);
    const pts = S.totalPoints();
    const streak = S.streak();
    const missed = S.missedRecent();
    const info = cardInfo();
    const unread = s.notifications.filter((n) => !n.read).length;
    const dz = dailyDhikr();
    const target = d.dhikr?.target || dz.count;
    const count = d.dhikr?.count || 0;
    const msg = MESSAGES[(hashStr(k) + msgShift) % MESSAGES.length];
    const np = nextPrayer();
    const left = items.filter((i) => !i.done);
    const name = s.profile.name;
    const lvl = S.level(pts);

    return `
    <section class="home-top">
      ${heroScene()}
      <div class="topbar">
        <div class="brand">${logo(46)}<div><b>رحلة</b><small>خطوة كل يوم</small></div></div>
        <div class="row gap-s">
          <a href="#/notifications" class="icon-btn soft" aria-label="الإشعارات${unread ? ' — ' + unread + ' جديدة' : ''}">${icon('bell')}${unread ? `<span class="badge-dot">${num(Math.min(unread, 99))}</span>` : ''}</a>
          <a href="#/profile/settings" class="icon-btn soft" aria-label="الإعدادات">${icon('gear')}</a>
        </div>
      </div>
      <div class="greet">
        <h1>${greeting()}${name ? ' يا ' + esc(name) : ''} 🌿</h1>
        <p>${fmtDate(k)}</p>
      </div>
    </section>

    <section class="card summary">
      <div class="sum-ring">${ring(comp, 84, 9)}<small>إنجاز النهارده</small></div>
      <div class="sum-grid">
        <a href="#/achievements" class="sum-item"><span class="si-ic y">⭐</span><b>${num(pts)}</b><small>نقطة · ${lvl.icon} ${lvl.name}</small></a>
        <a href="#/achievements" class="sum-item"><span class="si-ic p">🔥</span><b>${num(streak)}</b><small>يوم ورا بعض</small></a>
        <a href="#/reports" class="sum-item"><span class="si-ic b">🌧️</span><b>${num(missed)}</b><small>فاتوا الأسبوع ده</small></a>
        <div class="sum-item"><span class="si-ic g">✅</span><b>${num(items.length - left.length)}/${num(items.length)}</b><small>مهام النهارده</small></div>
      </div>
    </section>

    <section class="grid2 features">
      ${CARDS.map(([route, title, a, c], i) => `
        <a href="#/${route}" class="feature ${c}" style="--i:${i}">
          <div class="f-art">${art(a)}</div>
          <b>${title}</b><small>${info[a]}</small>
        </a>`).join('')}
    </section>

    <section class="card dhikr ${count >= target ? 'done' : ''}" id="dhikr-card">
      <div class="row between"><h2>ذكر النهارده 📿</h2><button class="link" data-act="target">الهدف: ${num(target)} ✎</button></div>
      <p class="dhikr-text">${esc(dz.text)}</p>
      <p class="ref">${esc(dz.ref)}</p>
      <div class="dhikr-row">
        <button class="counter-btn" data-act="tap" aria-label="عدّ">
          <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" stroke="var(--track)" stroke-width="7" fill="none"/>
          <circle class="cprog" cx="50" cy="50" r="44" stroke="var(--green)" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="${276.5 * (1 - Math.min(1, count / target))}" transform="rotate(-90 50 50)"/></svg>
          <span class="cnum">${num(count)}</span><small>من ${num(target)}</small>
        </button>
        <div class="col gap-s">
          <button class="btn primary" data-act="focus">${icon('play', 18)} ابدأ</button>
          <button class="btn ghost" data-act="reset">${icon('reset', 18)} من الأول</button>
        </div>
      </div>
    </section>

    <section class="card next-prayer">
      <div><small>الصلاة الجاية</small><b>${np.emoji} ${np.name}</b></div>
      <div class="np-time">${fmtTime(np.at)}${np.tomorrow ? '<small>بكرة</small>' : ''}</div>
      <a class="btn soft sm" href="#/worship">${PRAYERS.filter((p) => d.prayers?.[p.id]).length === 5 ? 'خلصت الخمسة ✨' : 'سجّل صلاتك'}</a>
    </section>

    ${left.length ? `<section class="card">
      <div class="row between"><h2>فاضلك النهارده</h2><small class="muted">${num(left.length)} حاجات</small></div>
      <ul class="todo">${left.slice(0, 6).map((it) => `<li><a href="#/${linkFor(it)}"><span class="dot g-${it.group}"></span>${esc(it.label)}<span class="go">${icon('back', 16)}</span></a></li>`).join('')}</ul>
      ${left.length > 6 ? `<p class="muted small center">و${num(left.length - 6)} كمان…</p>` : ''}
    </section>` : `<section class="card all-done">🌸 خلّصت كل مهام النهارده! يوم جميل.</section>`}

    <section class="card motivate">
      <span class="quote">“</span>
      <p>${esc(msg)}</p>
      <button class="link" data-act="msg">رسالة تانية ↻</button>
    </section>

    ${s.settings.assistant ? `<a class="card assistant-teaser" href="#/support/assistant">
      <span class="as-ic">${icon('spark', 24)}</span><div><b>مساعدك الشخصي</b><small>ملخص يومك واقتراحات على قدّك</small></div><span class="go">${icon('back', 18)}</span>
    </a>` : ''}
    <p class="tagline">رحلتك تبدأ بخطوة… استمر ❤️</p>`;
  },

  mount(el) {
    const dz = dailyDhikr();
    const card = el.querySelector('#dhikr-card');
    const paint = () => {
      const d = peekDay(today());
      const t = d.dhikr?.target || dz.count;
      const c = d.dhikr?.count || 0;
      card.querySelector('.cnum').textContent = num(c);
      card.querySelector('.cprog').style.strokeDashoffset = 276.5 * (1 - Math.min(1, c / t));
      card.classList.toggle('done', c >= t);
    };
    const tap = () => {
      let reached = false;
      update((s) => {
        const d = day();
        d.dhikr ||= { count: 0, target: dz.count };
        d.dhikr.count++;
        if (!d.dhikr.done && d.dhikr.count >= (d.dhikr.target || dz.count)) { d.dhikr.done = true; reached = true; }
      }, { silent: true });
      navigator.vibrate?.(8);
      paint();
      const b = card.querySelector('.counter-btn');
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      if (reached) celebrate('ما شاء الله! كمّلت ذكر النهارده 📿');
      return reached;
    };
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (!a) return;
      if (a === 'tap') tap();
      if (a === 'reset') { update((s) => { const d = day(); d.dhikr = { count: 0, target: d.dhikr?.target || dz.count, done: d.dhikr?.done }; }, { silent: true }); paint(); toast('رجعنا للصفر 🌱'); }
      if (a === 'msg') { msgShift++; update(() => {}); }
      if (a === 'target') targetSheet(dz);
      if (a === 'focus') focusMode(dz, tap);
    });
  },
};

function linkFor(it) {
  if (it.group === 'prayer' || it.group === 'quran') return 'worship';
  if (it.group === 'azkar') return 'worship/azkar/' + it.key.split(':')[1];
  if (it.group === 'habit') return 'habits';
  if (it.group === 'health') return 'health';
  if (it.group === 'challenge') return 'journey';
  return 'home';
}

function targetSheet(dz) {
  const cur = peekDay(today()).dhikr?.target || dz.count;
  sheet({
    title: 'هدف التكرار',
    body: `<div class="chips">${[33, 100, 300, 1000].map((n) => `<button class="chip ${n === cur ? 'on' : ''}" data-n="${n}">${num(n)}</button>`).join('')}</div>
      <label class="field mt"><span>أو اكتب رقم</span><input type="number" inputmode="numeric" min="1" max="10000" value="${cur}" id="tg"></label>
      <button class="btn primary block mt" id="save">احفظ</button>`,
    onMount(b, close) {
      b.querySelectorAll('[data-n]').forEach((c) => (c.onclick = () => { b.querySelector('#tg').value = c.dataset.n; }));
      b.querySelector('#save').onclick = () => {
        const v = parseInt(b.querySelector('#tg').value, 10);
        if (!(v >= 1 && v <= 10000)) return toast('اكتب رقم من ١ لـ ١٠٠٠٠', 'err');
        update(() => { const d = day(); d.dhikr ||= { count: 0 }; d.dhikr.target = v; d.dhikr.done = d.dhikr.count >= v; });
        close();
      };
    },
  });
}

function focusMode(dz, tap) {
  const ov = document.createElement('div');
  ov.className = 'focus-mode';
  const paint = () => {
    const d = peekDay(today());
    ov.querySelector('.fm-num').textContent = num(d.dhikr?.count || 0);
    ov.querySelector('.fm-of').textContent = 'من ' + num(d.dhikr?.target || dz.count);
  };
  ov.innerHTML = `<button class="icon-btn fm-close" aria-label="قفل">${icon('x')}</button>
    <p class="dhikr-text">${esc(dz.text)}</p>
    <div class="fm-num">٠</div><div class="fm-of"></div>
    <p class="muted">اضغط في أي حتة عشان تعدّ</p>`;
  document.body.appendChild(ov);
  paint();
  ov.addEventListener('click', (e) => {
    if (e.target.closest('.fm-close')) { ov.remove(); update(() => {}); return; }
    tap(); paint();
    ov.classList.remove('pulse'); void ov.offsetWidth; ov.classList.add('pulse');
  });
}
