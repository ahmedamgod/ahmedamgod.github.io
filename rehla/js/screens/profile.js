import { getState, update, getUserId, exportJSON, importJSON, removeUserData, flush, replaceState } from '../store.js';
import * as auth from '../auth.js';
import { num, esc, compressImage, today, fmtDate } from '../util.js';
import { pageHead, sheet, toast, confirmBox, segmented, formError } from '../ui.js';
import { icon } from '../art.js';
import * as S from '../stats.js';
import { requestPermission, tick } from '../notify.js';
import { pinHash, lockJournal } from './journal.js';
import * as db from '../db.js';
import { installHelp } from '../install.js';
import { APP_VERSION, hasUpdate, checkNow } from '../update.js';

export default {
  render(params) {
    if (params[0] === 'settings') return settings();
    const s = getState();
    const ses = auth.currentSession();
    const acc = auth.accounts().find((a) => a.id === ses?.id);
    const pts = S.totalPoints();
    const lvl = S.level(pts);
    return pageHead('حسابي', { back: false, actions: `<a class="icon-btn soft" href="#/profile/settings" aria-label="الإعدادات">${icon('gear')}</a>` }) + `
    <section class="card profile-card">
      <label class="avatar" aria-label="غيّر الصورة">${s.profile.avatar ? `<img src="${s.profile.avatar}" alt="صورتك">` : `<span>${esc((s.profile.name || '؟').slice(0, 1))}</span>`}
        <input type="file" accept="image/*" id="av" hidden><i>${icon('image', 14)}</i></label>
      <div class="grow"><h2>${esc(s.profile.name || 'ضيف')}</h2><small class="muted">${ses?.guest ? 'وضع الضيف' : esc(acc?.email || '')}</small>
        <p class="small">${lvl.icon} ${lvl.name} · ${num(pts)} نقطة</p></div>
      <button class="icon-btn soft" data-act="edit" aria-label="عدّل البروفايل">${icon('edit')}</button>
    </section>
    ${s.profile.bio ? `<p class="card muted">${esc(s.profile.bio)}</p>` : ''}
    <section class="card"><div class="row between"><h2>أهدافي الشخصية 🎯</h2><button class="link" data-act="edit">عدّل</button></div>
      ${s.profile.goals ? `<p class="pre">${esc(s.profile.goals)}</p>` : '<p class="muted">اكتب إنت عايز توصل لإيه من رحلتك…</p>'}
      <a href="#/journey" class="link small">أهدافي التفصيلية في "رحلتي" ←</a></section>
    <section class="grid3"><div class="card stat center"><b>${num(S.successfulDays())}</b><small>يوم ناجح</small></div>
      <div class="card stat center"><b>${num(S.bestStreak())}</b><small>أطول سلسلة</small></div>
      <div class="card stat center"><b>${num(S.badges().filter((b) => b.got).length)}</b><small>شارة</small></div></section>
    <p class="muted small center">معانا من ${fmtDate(s.createdAt, false)} 🌱</p>

    ${ses?.guest ? `<section class="card c-yellow"><h2>إنت داخل كضيف</h2><p class="small">اعمل حساب عشان تحمي بياناتك بباسورد. كل اللي سجلته هيتنقل معاك.</p>
      <button class="btn primary block" data-act="upgrade">اعمل حساب</button></section>` : ''}

    <section class="card menu">
      <a href="#/profile/settings">${icon('gear', 20)} الإعدادات<span class="go">${icon('back', 16)}</span></a>
      <button data-act="export">${icon('download', 20)} تصدير بياناتي (نسخة احتياطية)</button>
      <label>${icon('upload', 20)} استرجاع نسخة احتياطية<input type="file" accept="application/json,.json" id="imp" hidden></label>
      ${!ses?.guest ? `<button data-act="pw">${icon('lock', 20)} غيّر الباسورد</button>` : ''}
      <button data-act="logout">${icon('logout', 20)} ${ses?.guest ? 'خروج من وضع الضيف' : 'تسجيل خروج'}</button>
      <button data-act="delete" class="danger">${icon('trash', 20)} امسح الحساب وكل البيانات</button>
    </section>
    <p class="tagline">رحلتك تبدأ بخطوة… استمر ❤️</p>`;
  },
  mount(el, params) {
    if (params[0] === 'settings') return mountSettings(el);
    el.querySelector('#av')?.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { const img = await compressImage(f, 300, 0.8); update((s) => { s.profile.avatar = img; }); toast('صورة حلوة 😍'); } catch { toast('مقدرناش نفتح الصورة', 'err'); }
    });
    el.querySelector('#imp')?.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (!(await confirmBox('الاسترجاع هيستبدل كل بياناتك الحالية بالنسخة دي. تكمل؟', { ok: 'استرجع' }))) return;
      try { await importJSON(await f.text()); toast('رجعنا بياناتك ✓'); } catch (err) { toast(err.message?.includes('رحلة') ? err.message : 'الملف ده مش سليم', 'err'); }
    });
    el.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'edit') editProfile();
      if (a === 'export') doExport();
      if (a === 'upgrade') upgradeSheet();
      if (a === 'pw') pwSheet();
      if (a === 'logout') {
        const ses = auth.currentSession();
        if (ses?.guest && !(await confirmBox('بيانات الضيف هتفضل محفوظة على الجهاز ده، وتقدر ترجعلها لما تدخل كضيف تاني.', { ok: 'اخرج' }))) return;
        await flush(); auth.logout(); location.hash = ''; location.reload();
      }
      if (a === 'delete') deleteSheet();
    });
  },
};

function editProfile() {
  const p = getState().profile;
  sheet({
    title: 'عدّل بياناتك',
    body: `<form id="f" novalidate><label class="field"><span>اسمك *</span><input id="n" maxlength="30" value="${esc(p.name)}" required></label>
      <label class="field"><span>نبذة عنك</span><input id="b" maxlength="120" value="${esc(p.bio)}" placeholder="مثلاً: بحاول أكون أحسن كل يوم"></label>
      <label class="field"><span>أهدافي الشخصية</span><textarea id="g" rows="4" maxlength="800">${esc(p.goals)}</textarea></label>
      ${p.avatar ? '<button type="button" class="btn ghost block" id="rm">شيل الصورة</button>' : ''}
      <button class="btn primary block mt">احفظ</button></form>`,
    onMount(b, close) {
      b.querySelector('#rm')?.addEventListener('click', () => { update((s) => { s.profile.avatar = ''; }); close(); });
      b.querySelector('#f').onsubmit = (e) => {
        e.preventDefault();
        const name = b.querySelector('#n').value.trim();
        if (!name) return formError(b.querySelector('#f'), 'الاسم مطلوب');
        update((s) => { s.profile.name = name; s.profile.bio = b.querySelector('#b').value.trim(); s.profile.goals = b.querySelector('#g').value.trim(); });
        close(); toast('اتحفظ ✓');
      };
    },
  });
}

function doExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rehla-backup-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('نزّلنا نسختك الاحتياطية 📦');
}

function upgradeSheet() {
  sheet({
    title: 'حساب جديد',
    body: authForm(getState().profile.name),
    onMount(b, close) {
      b.querySelector('#f').onsubmit = async (e) => {
        e.preventDefault();
        const f = b.querySelector('#f');
        try {
          const data = getState();
          const acc = await auth.register({ name: f.n.value, email: f.e.value, password: f.p.value });
          await db.set('state:' + acc.id, data);
          await removeUserData('guest');
          close(); toast('اتعمل حسابك وكل بياناتك اتنقلت ✓');
          setTimeout(() => location.reload(), 600);
        } catch (err) { formError(f, err.message === 'crypto' ? 'المتصفح ده مش بيدعم التشفير' : err.message); }
      };
    },
  });
}
const authForm = (name = '') => `<form id="f" novalidate>
  <label class="field"><span>الاسم</span><input name="n" id="n" value="${esc(name)}" maxlength="30" autocomplete="name" required></label>
  <label class="field"><span>الإيميل</span><input name="e" id="e" type="email" autocomplete="email" required dir="ltr"></label>
  <label class="field"><span>الباسورد (٦ حروف أو أكتر)</span><input name="p" id="p" type="password" autocomplete="new-password" minlength="6" required dir="ltr"></label>
  <button class="btn primary block mt">اعمل الحساب</button></form>`;

function pwSheet() {
  sheet({
    title: 'غيّر الباسورد',
    body: `<form id="f" novalidate><label class="field"><span>الباسورد الحالي</span><input id="o" type="password" autocomplete="current-password" dir="ltr"></label>
      <label class="field"><span>الباسورد الجديد</span><input id="n" type="password" autocomplete="new-password" dir="ltr"></label>
      <label class="field"><span>أكّد الباسورد الجديد</span><input id="c" type="password" autocomplete="new-password" dir="ltr"></label>
      <button class="btn primary block mt">غيّر</button></form>`,
    onMount(b, close) {
      const f = b.querySelector('#f');
      f.onsubmit = async (e) => {
        e.preventDefault();
        if (f.querySelector('#n').value !== f.querySelector('#c').value) return formError(f, 'الباسورد الجديد مش متطابق');
        try { await auth.changePassword(getUserId(), f.querySelector('#o').value, f.querySelector('#n').value); close(); toast('اتغير ✓'); } catch (err) { formError(f, err.message); }
      };
    },
  });
}

function deleteSheet() {
  sheet({
    title: 'مسح الحساب',
    body: `<p>ده هيمسح <b>كل</b> بياناتك من الجهاز ده: عباداتك، عاداتك، يومياتك، ومشاعرك. مش هينفع نرجعها.</p>
      <p class="muted small">ننصحك تاخد نسخة احتياطية الأول.</p>
      <button class="btn soft block" id="bk">${icon('download', 18)} خد نسخة احتياطية</button>
      <label class="field mt"><span>اكتب كلمة <b>امسح</b> عشان تأكد</span><input id="c" autocomplete="off"></label>
      <button class="btn danger block mt" id="go" disabled>امسح كل حاجة</button>`,
    onMount(b) {
      b.querySelector('#bk').onclick = doExport;
      const c = b.querySelector('#c'), go = b.querySelector('#go');
      c.oninput = () => { go.disabled = c.value.trim() !== 'امسح'; };
      go.onclick = async () => {
        const id = getUserId();
        await removeUserData(id);
        if (id !== 'guest') auth.removeAccount(id); else auth.logout();
        sessionStorage.clear();
        location.hash = ''; location.reload();
      };
    },
  });
}

// ================= الإعدادات =================
function toggle(id, on, label, sub = '') {
  return `<label class="switch-row"><span>${label}${sub ? `<small class="muted block">${sub}</small>` : ''}</span><input type="checkbox" role="switch" data-set="${id}" ${on ? 'checked' : ''}><i></i></label>`;
}

function settings() {
  const s = getState().settings;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  return pageHead('الإعدادات') + `
  <section class="card"><h2>📱 التطبيق</h2>
    <div class="row between update-row"><span>الإصدار <b>${num(APP_VERSION)}</b></span>
      ${hasUpdate() ? '<button class="btn primary sm" data-apply-update>✨ حدّث للإصدار الجديد</button>' : '<button class="btn soft sm" data-act="check-update">↻ دوّر على تحديث</button>'}</div>
    ${installHelp()}</section>
  <section class="card"><h2>الشكل</h2>
    <div class="field"><span>الوضع</span>${segmented([['light', '☀️ فاتح'], ['dark', '🌙 غامق'], ['auto', '⚙️ زي الجهاز']], s.theme, 'theme')}</div>
    <div class="field"><span>اللغة</span><p class="small">العربية (العامية المصرية) 🇪🇬</p></div>
    <div class="field"><span>شكل الأرقام</span>${segmented([['arabic', '١٢٣'], ['latin', '123']], s.digits, 'digits')}</div>
  </section>
  <section class="card"><h2>الإشعارات والتذكيرات</h2>
    ${perm === 'unsupported' ? '<p class="muted small">المتصفح ده مش بيدعم الإشعارات — هنعرض التذكيرات جوه التطبيق.</p>' : perm === 'denied' ? '<p class="form-error">الإشعارات مقفولة من إعدادات المتصفح. افتحها من إعدادات الموقع عشان توصلك.</p>' : ''}
    ${toggle('notif.enabled', s.notif.enabled, 'شغّل التذكيرات')}
    <div class="${s.notif.enabled ? '' : 'disabled-group'}">
      ${toggle('notif.prayers', s.notif.prayers, '🕌 مواعيد الصلاة')}
      ${toggle('notif.azkar', s.notif.azkar, '📿 أذكار الصباح والمساء', '٧ الصبح و ٤:٣٠ العصر')}
      ${toggle('notif.habits', s.notif.habits, '🌱 تذكيرات العادات', 'في المعاد اللي حددته لكل عادة')}
      ${toggle('notif.daily', s.notif.daily, '🌿 تذكير آخر اليوم', '٩ بالليل لو لسه فاضل حاجات')}
      <button class="btn soft block mt-s" data-act="test">جرّب إشعار</button>
    </div>
  </section>
  <section class="card"><h2>الخصوصية</h2>
    ${toggle('journalLock', !!s.journalPin, '🔒 قفل اليوميات برقم سري')}
    ${s.journalPin ? '<button class="link small" data-act="lock-now">اقفل اليوميات دلوقتي</button>' : ''}
    <p class="muted small">كل بياناتك على جهازك بس. مفيش أي حاجة بتتبعت لسيرفر.</p>
  </section>
  <section class="card"><h2>المساعد</h2>${toggle('assistant', s.assistant, '✨ المساعد الشخصي', 'ملخصات واقتراحات من بياناتك')}</section>
  <section class="card"><h2>البيانات</h2>
    <p class="muted small">المزامنة بين التابات المفتوحة على نفس الجهاز تلقائية. للنقل لجهاز تاني: صدّر نسخة احتياطية واسترجعها هناك.</p>
    <a href="#/profile" class="btn soft block">${icon('download', 18)} التصدير والاسترجاع من "حسابي"</a>
    <button class="btn danger-ghost block mt-s" data-act="reset">ابدأ رحلتي من الأول (امسح التسجيلات)</button>
  </section>
  <p class="muted small center">رحلة · الإصدار ${num(APP_VERSION)}</p>`;
}

function mountSettings(el) {
  el.addEventListener('click', async (e) => {
    const sg = e.target.closest('[data-seg]');
    const v = e.target.closest('[data-seg-v]')?.dataset.segV;
    if (sg && v) { update((s) => { s.settings[sg.dataset.seg] = v; }); return; }
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'test') {
      const p = await requestPermission();
      if (p === 'granted') {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) reg.showNotification('رحلة 🌿', { body: 'الإشعارات شغالة تمام!', icon: 'icons/icon-192.png', dir: 'rtl', lang: 'ar' });
        else new Notification('رحلة 🌿', { body: 'الإشعارات شغالة تمام!' });
      } else toast('الإشعارات مش مسموحة — هنعرض التذكيرات جوه التطبيق', 'info');
    }
    if (a === 'check-update') {
      const btn = e.target.closest('[data-act]');
      btn.disabled = true; btn.textContent = 'بيدوّر…';
      const r = await checkNow();
      if (r === 'latest') toast('عندك آخر إصدار ✓');
      else if (r === 'offline') toast('مفيش نت دلوقتي — جرّب تاني', 'err');
      else if (r === 'unsupported') toast('المتصفح ده مش بيدعم التحديث التلقائي — اعمل تحديث للصفحة', 'info');
      else toast('لقينا تحديث جديد! دوس "حدّث" ✨');
      update(() => {});
    }
    if (a === 'lock-now') { lockJournal(); toast('اتقفلت 🔒'); }
    if (a === 'reset' && await confirmBox('هيتمسح كل تسجيلاتك (صلاة، عادات، يوميات…) بس هيفضل اسمك وإعداداتك. متأكد؟', { danger: true, ok: 'امسح' })) {
      const s = getState();
      const { emptyState } = await import('../store.js');
      const fresh = emptyState(s.profile.name);
      fresh.profile = s.profile; fresh.settings = s.settings; fresh.onboarded = true;
      await replaceState(fresh);
      toast('بدأنا صفحة جديدة 🌱');
    }
  });
  el.addEventListener('change', async (e) => {
    const k = e.target.dataset.set;
    if (!k) return;
    const on = e.target.checked;
    if (k === 'journalLock') {
      if (on) return pinSheet(e.target);
      if (!(await confirmBox('تشيل القفل من اليوميات؟'))) { e.target.checked = true; return; }
      return update((s) => { delete s.settings.journalPin; });
    }
    if (k === 'notif.enabled' && on) {
      const p = await requestPermission();
      if (p !== 'granted') toast('مش هتوصلك إشعارات برّه التطبيق، بس هنفكرك جوّاه', 'info');
    }
    update((s) => {
      const [a, b] = k.split('.');
      if (b) s.settings[a][b] = on; else s.settings[a] = on;
    });
    if (k.startsWith('notif')) tick();
  });
}

function pinSheet(checkbox) {
  let saved = false;
  sheet({
    title: 'رقم سري لليوميات',
    body: `<form id="f" novalidate><label class="field"><span>رقم سري (٤ أرقام أو أكتر)</span><input id="p" type="password" inputmode="numeric" maxlength="8" class="pin-input" autocomplete="off"></label>
      <label class="field"><span>أكّده</span><input id="c" type="password" inputmode="numeric" maxlength="8" class="pin-input" autocomplete="off"></label>
      <p class="muted small">لو نسيته، هتقدر تشيله من الإعدادات بعد ما تدخل حسابك.</p>
      <button class="btn primary block mt">احفظ</button></form>`,
    onMount(b, close) {
      const f = b.querySelector('#f');
      const obs = new MutationObserver(() => { if (!b.isConnected) { obs.disconnect(); if (!saved) checkbox.checked = false; } });
      obs.observe(document.body, { childList: true });
      f.onsubmit = async (e) => {
        e.preventDefault();
        const p = f.querySelector('#p').value;
        if (!/^\d{4,8}$/.test(p)) return formError(f, 'الرقم لازم يكون من ٤ لـ ٨ أرقام');
        if (p !== f.querySelector('#c').value) return formError(f, 'الرقمين مش زي بعض');
        const h = await pinHash(p);
        saved = true;
        update((s) => { s.settings.journalPin = h; });
        close(); toast('يومياتك بقت مقفولة 🔒');
      };
    },
  });
}
