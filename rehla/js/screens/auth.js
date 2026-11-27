import * as auth from '../auth.js';
import { logo, heroScene } from '../art.js';
import { formError } from '../ui.js';
import { esc } from '../util.js';

let mode = 'welcome';

export default {
  render() {
    const accs = auth.accounts();
    return `<section class="auth">
      <div class="auth-hero">${heroScene()}<div class="auth-logo">${logo(92)}</div></div>
      <h1 class="brand-title">رحلة</h1>
      <p class="brand-sub">كل يوم خطوة صغيرة تقربك من النسخة الأحلى منك 🌱</p>
      ${mode === 'welcome' ? `<div class="col gap auth-actions">
        <button class="btn primary block lg" data-m="register">ابدأ رحلتك</button>
        <button class="btn soft block lg" data-m="login">عندي حساب</button>
        <button class="btn ghost block" data-guest>ادخل كضيف</button>
        <p class="muted small center">بياناتك كلها بتتحفظ على جهازك وبس 🔒</p></div>`
      : `<form class="card auth-form" id="af" novalidate>
        <h2>${mode === 'login' ? 'أهلاً بيك تاني 👋' : 'حساب جديد'}</h2>
        ${mode === 'register' ? '<label class="field"><span>اسمك</span><input name="n" maxlength="30" autocomplete="name" required></label>' : ''}
        <label class="field"><span>الإيميل</span><input name="e" type="email" autocomplete="email" dir="ltr" required ${mode === 'login' && accs.length === 1 ? `value="${esc(accs[0].email)}"` : ''}></label>
        <label class="field"><span>الباسورد</span><input name="p" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" dir="ltr" required minlength="6"></label>
        <button class="btn primary block lg" type="submit">${mode === 'login' ? 'ادخل' : 'اعمل الحساب'}</button>
        <button class="link block center mt-s" type="button" data-m="${mode === 'login' ? 'register' : 'login'}">${mode === 'login' ? 'معنديش حساب — اعمل واحد' : 'عندي حساب — ادخل'}</button>
        <button class="link block center muted" type="button" data-m="welcome">رجوع</button>
      </form>`}
      <p class="tagline">رحلتك تبدأ بخطوة… استمر ❤️</p>
    </section>`;
  },
  mount(el, onDone) {
    const rerender = () => { el.innerHTML = this.render(); this.mount(el, onDone); };
    el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { mode = b.dataset.m; rerender(); }));
    el.querySelector('[data-guest]')?.addEventListener('click', () => onDone(auth.loginGuest()));
    const f = el.querySelector('#af');
    if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'لحظة…';
      try {
        const acc = mode === 'login'
          ? await auth.login({ email: f.e.value, password: f.p.value })
          : await auth.register({ name: f.n.value, email: f.e.value, password: f.p.value });
        onDone({ id: acc.id, guest: false });
      } catch (err) {
        formError(f, err.message === 'crypto' ? 'المتصفح ده مش بيدعم التشفير — جرّب Chrome أو ادخل كضيف' : err.message);
        btn.disabled = false; btn.textContent = mode === 'login' ? 'ادخل' : 'اعمل الحساب';
      }
    };
  },
};
