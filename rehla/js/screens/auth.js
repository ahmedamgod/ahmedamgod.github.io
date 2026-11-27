import * as auth from '../auth.js';
import * as cloud from '../cloud.js';
import { logo } from '../art.js';
import { formError, toast } from '../ui.js';
import { esc } from '../util.js';

let mode = 'welcome';
const lastEmail = () => { try { return localStorage.getItem('rehla.lastEmail') || ''; } catch { return ''; } };

export const CONSENT_TEXT = `رحلة فيها مشرفين بيتابعوا المشتركين عشان يساعدوهم ويدعموهم.
لما تعمل حساب، المشرف المسؤول عنك ومدير البرنامج هيقدروا يشوفوا كل بياناتك في التطبيق: صلواتك وقرايتك وأذكارك، وعاداتك، وصحتك، ومشاعرك، و<b>يومياتك كاملة</b>، وأهدافك وإنجازاتك.
ممكن كمان يبعتولك رسايل جوه التطبيق.`;

export function consentBox() {
  return `<div class="consent">
    <p class="consent-title">👀 قبل ما تكمّل — مهم تعرف</p>
    <p>${CONSENT_TEXT.replace(/\n/g, '<br>')}</p>
    <label class="consent-check"><input type="checkbox" name="consent" required> <span>فهمت، وموافق إن المشرف يتابع بياناتي ويومياتي</span></label>
  </div>`;
}

export default {
  render() {
    return `<section class="auth">
      <div class="auth-logo">${logo(220, true)}</div>
      <h1 class="sr-only">رحلة</h1>
      <p class="brand-sub">كل يوم خطوة صغيرة تقربك من النسخة الأحلى منك 🌱</p>
      ${mode === 'welcome' ? `<div class="col gap auth-actions">
        <button class="btn primary block lg" data-m="register">ابدأ رحلتك</button>
        <button class="btn soft block lg" data-m="login">عندي حساب</button>
        <button class="btn ghost block" data-guest>جرّب كضيف</button>
        <p class="muted small center">وضع الضيف بيحفظ على الجهاز بس، ومن غير متابعة من مشرف.</p></div>`
      : mode === 'forgot' ? `<form class="card auth-form" id="ff" novalidate>
        <h2>نسيت الباسورد؟</h2><p class="muted small center">اكتب إيميلك وهنبعتلك رابط تعمل منه باسورد جديد</p>
        <label class="field"><span>الإيميل</span><input name="e" type="email" autocomplete="email" dir="ltr" required></label>
        <button class="btn primary block lg" type="submit">ابعتلي الرابط</button>
        <button class="link block center muted mt-s" type="button" data-m="login">رجوع</button></form>`
      : `<form class="card auth-form" id="af" novalidate>
        <h2>${mode === 'login' ? 'أهلاً بيك تاني 👋' : 'حساب جديد'}</h2>
        ${mode === 'register' ? '<label class="field"><span>اسمك</span><input name="n" maxlength="30" autocomplete="name" required></label>' : ''}
        <label class="field"><span>الإيميل</span><input name="e" type="email" autocomplete="email" dir="ltr" required ${mode === 'login' && lastEmail() ? `value="${esc(lastEmail())}"` : ''}></label>
        <label class="field"><span>الباسورد</span><input name="p" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" dir="ltr" required minlength="6"></label>
        ${mode === 'register' ? consentBox() : ''}
        <button class="btn primary block lg" type="submit">${mode === 'login' ? 'ادخل' : 'اعمل الحساب'}</button>
        ${mode === 'login' ? '<button class="link block center mt-s" type="button" data-m="forgot">نسيت الباسورد؟</button>' : ''}
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
    const ff = el.querySelector('#ff');
    if (ff) ff.onsubmit = async (e) => {
      e.preventDefault();
      if (!auth.validEmail(ff.e.value.trim())) return formError(ff, 'الإيميل مش مظبوط');
      try { await cloud.resetPassword(ff.e.value); toast('بعتنالك رابط على الإيميل 📧 (بص في الـ Spam كمان)'); mode = 'login'; rerender(); }
      catch (err) { formError(ff, cloud.arError(err)); }
    };
    const f = el.querySelector('#af');
    if (!f) return;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const btn = f.querySelector('[type=submit]');
      const email = f.e.value.trim();
      if (!auth.validEmail(email)) return formError(f, 'الإيميل مش مظبوط');
      if (f.p.value.length < 6) return formError(f, 'الباسورد لازم يكون ٦ حروف على الأقل');
      btn.disabled = true; btn.textContent = 'لحظة…';
      try {
        const user = mode === 'login'
          ? await cloud.login({ email, password: f.p.value })
          : await cloud.register({ name: f.n.value, email, password: f.p.value, consent: f.consent.checked });
        mode = 'welcome';
        try { localStorage.setItem('rehla.lastEmail', user.email); } catch {}
        onDone({ id: user.uid, guest: false, email: user.email, cloud: true });
      } catch (err) {
        formError(f, cloud.arError(err));
        btn.disabled = false; btn.textContent = mode === 'login' ? 'ادخل' : 'اعمل الحساب';
      }
    };
  },
};
