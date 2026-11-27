import { getState, update, day, peekDay } from '../store.js';
import { today, fmtDate, greeting, num, esc, hashStr, fmtTime } from '../util.js';
import { logo, art, icon, solid } from '../art.js';
import { celebrate, sheet, toast, progressBar, backable } from '../ui.js';
import * as S from '../stats.js';
import { DAILY_DHIKR } from '../data/azkar.js';
import { MESSAGES, MOODS, PRAYERS } from '../data/content.js';
import { nextPrayer } from '../notify.js';
import { installBanner } from '../install.js';
import { hasUpdate } from '../update.js';

let msgShift = 0;

const dailyDhikr = () => DAILY_DHIKR[hashStr(today()) % DAILY_DHIKR.length];

// شارة صغيرة فوق كل كارت بحالة النهارده
function cardBadges() {
  const s = getState();
  const k = today();
  const d = peekDay(k);
  const prayers = Object.keys(d.prayers || {}).length;
  const due = s.habits.filter((h) => S.habitDue(h, k));
  const hd = due.filter((h) => S.habitDone(h, k)).length;
  const wroteToday = s.journal.some((j) => j.date === k);
  const mood = s.moods.find((m) => m.date === k);
  const mo = mood && MOODS.find((m) => m.id === mood.mood);
  const active = s.goals.filter((g) => !g.done).length + s.challenges.filter((c) => !c.done && !c.ended).length;
  return {
    worship: [`${num(prayers)}/${num(5)}`, prayers === 5],
    habits: due.length ? [`${num(hd)}/${num(due.length)}`, hd === due.length] : null,
    journal: wroteToday ? ['✓', true] : null,
    emotions: mo ? [mo.emoji, true] : null,
    health: [`💧${num(d.water || 0)}`, (d.water || 0) >= s.settings.waterGoal],
    journey: active ? [num(active), false] : null,
  };
}

// نفس ترتيب الصورة المرجعية (من اليمين للشمال)
const CARDS = [
  ['journal', 'يومياتي', 'journal', 'k-pink'],
  ['habits', 'عاداتي', 'habits', 'k-cream'],
  ['worship', 'عباداتي', 'worship', 'k-peach'],
  ['journey', 'رحلتي', 'journey', 'k-yellow'],
  ['health', 'صحتي ولياقتي', 'health', 'k-blue'],
  ['mood', 'مشاعري', 'emotions', 'k-rose'],
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
    const good = S.successfulDays();
    const badges = cardBadges();
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
    <section class="home-head">
      <a href="#/notifications" class="round-btn" aria-label="الإشعارات${unread ? ' — ' + unread + ' جديدة' : ''}">${solid('bell', 26)}${unread ? `<span class="badge-dot">${num(Math.min(unread, 99))}</span>` : ''}</a>
      <div class="hh-logo">${logo(190, true)}</div>
      <a href="#/profile/settings" class="round-btn" aria-label="الإعدادات${hasUpdate() ? ' — فيه تحديث' : ''}">${solid('gear', 26)}${hasUpdate() ? '<span class="badge-dot upd">✨</span>' : ''}</a>
    </section>
    ${hasUpdate() ? '<button class="update-pill" data-apply-update>✨ فيه تحديث جديد — دوس هنا تحدّث</button>' : ''}
    <p class="hello">${greeting()}${name ? ' يا ' + esc(name) : ''} 🌿 <span>${fmtDate(k)}</span></p>

    <section class="hh-cards">
      <a href="#/achievements" class="days-card">
        <small>أيام النجاح الكاملة</small>
        <div class="dc-num"><b>${num(good)}</b><span class="star">⭐</span></div>
        <small class="dc-miss"><i>!</i> واللي فاتوا: ${num(missed)}</small>
      </a>
      <div class="bubble-card"><p>كل يوم خطوة صغيرة..<br>تقربك من النسخة الأجمل من نفسك <span class="hrt">🤍</span></p></div>
    </section>

    <a href="#/reports" class="today-strip">
      <div class="ts-row"><b>إنجاز النهارده ${num(Math.round(comp * 100))}٪</b><span>${num(items.length - left.length)}/${num(items.length)} مهام</span></div>
      ${progressBar(comp)}
      <div class="ts-row small"><span>🔥 ${num(streak)} يوم ورا بعض</span><span>⭐ ${num(pts)} نقطة · ${lvl.icon} ${lvl.name}</span></div>
    </a>

    ${installBanner()}

    <section class="grid3 features">
      ${CARDS.map(([route, title, a, c], i) => {
        const b = badges[a];
        return `<a href="#/${route}" class="feature ${c}" style="--i:${i}">
          ${b ? `<span class="f-badge ${b[1] ? 'ok' : ''}">${b[0]}</span>` : ''}
          <div class="f-art">${art(a)}</div>
          <div class="f-foot"><b>${title}</b><span class="chev">${icon('back', 14)}</span></div>
        </a>`;
      }).join('')}
    </section>

    <section class="card dhikr-card ${count >= target ? 'done' : ''}" id="dhikr-card">
      <div class="dk-art">${art('lotus')}</div>
      <div class="dk-body">
        <h2>أذكاري اليوم <span class="fl">🌸</span></h2>
        <p class="dk-text">${esc(dz.text)}</p>
        <p class="dk-count">(${num(target)} مرة)</p>
        <button class="btn primary pill" data-act="focus">${icon('play', 16)} ${count ? 'كمّل' : 'ابدأ الآن'}</button>
      </div>
      <div class="dk-progress">
        ${progressBar(count / target)}
        <div class="row between small"><span class="dk-n"><b class="cnum">${num(count)}</b> من ${num(target)}</span>
          <span class="row gap-s"><button class="link" data-act="target">الهدف ✎</button><button class="link" data-act="reset">${icon('reset', 14)} من الأول</button></span></div>
      </div>
    </section>

    <button class="motivate-pill" data-act="msg" aria-label="رسالة تانية"><span class="dash r"></span>${esc(msg)} <span class="hrt">❤️</span><span class="dash l"></span></button>

    <section class="card next-prayer">
      <div><small>الصلاة الجاية</small><b>${np.emoji} ${np.name}</b></div>
      <div class="np-time">${fmtTime(np.at)}${np.tomorrow ? '<small>بكرة</small>' : ''}</div>
      <a class="btn soft sm" href="#/worship">${PRAYERS.filter((p) => d.prayers?.[p.id]).length === 5 ? 'خلصت الخمسة ✨' : 'سجّل صلاتك'}</a>
    </section>

    ${left.length ? `<section class="card">
      <div class="row between"><h2>فاضلك النهارده</h2><small class="muted">${num(left.length)} حاجات</small></div>
      <ul class="todo">${left.slice(0, 5).map((it) => `<li><a href="#/${linkFor(it)}"><span class="dot g-${it.group}"></span>${esc(it.label)}<span class="go">${icon('back', 16)}</span></a></li>`).join('')}</ul>
      ${left.length > 5 ? `<p class="muted small center">و${num(left.length - 5)} كمان…</p>` : ''}
    </section>` : `<section class="card all-done">🌸 خلّصت كل مهام النهارده! يوم جميل.</section>`}

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
      card.querySelector('.pbar span').style.width = Math.min(100, (c / t) * 100) + '%';
      card.classList.toggle('done', c >= t);
    };
    const tap = () => {
      let reached = false;
      update(() => {
        const d = day();
        d.dhikr ||= { count: 0, target: dz.count };
        d.dhikr.count++;
        if (!d.dhikr.done && d.dhikr.count >= (d.dhikr.target || dz.count)) { d.dhikr.done = true; reached = true; }
      }, { silent: true });
      navigator.vibrate?.(8);
      paint();
      if (reached) celebrate('ما شاء الله! كمّلت ذكر النهارده 📿');
    };
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (!a) return;
      if (a === 'reset') { update(() => { const d = day(); d.dhikr = { count: 0, target: d.dhikr?.target || dz.count, done: d.dhikr?.done }; }, { silent: true }); paint(); toast('رجعنا للصفر 🌱'); }
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
  const R = 120, C = 2 * Math.PI * R;
  const paint = () => {
    const d = peekDay(today());
    const t = d.dhikr?.target || dz.count, c = d.dhikr?.count || 0;
    ov.querySelector('.fm-num').textContent = num(c);
    ov.querySelector('.fm-of').textContent = 'من ' + num(t);
    ov.querySelector('.fm-ring').style.strokeDashoffset = C * (1 - Math.min(1, c / t));
  };
  ov.innerHTML = `<button class="icon-btn fm-close" aria-label="قفل">${icon('x')}</button>
    <p class="dhikr-text">${esc(dz.text)}</p>
    <button class="fm-tap" aria-label="عدّ">
      <svg viewBox="0 0 260 260" aria-hidden="true"><circle cx="130" cy="130" r="${R}" stroke="var(--track)" stroke-width="12" fill="none"/>
      <circle class="fm-ring" cx="130" cy="130" r="${R}" stroke="var(--green)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${C}" transform="rotate(-90 130 130)"/></svg>
      <span class="fm-num">٠</span><span class="fm-of"></span></button>
    <p class="muted">اضغط على الدايرة أو في أي حتة عشان تعدّ</p>`;
  document.body.appendChild(ov);
  paint();
  const close = backable(() => { ov.remove(); update(() => {}); });
  ov.addEventListener('click', (e) => {
    if (e.target.closest('.fm-close')) { close(); return; }
    tap(); paint();
    ov.classList.remove('pulse'); void ov.offsetWidth; ov.classList.add('pulse');
  });
}
