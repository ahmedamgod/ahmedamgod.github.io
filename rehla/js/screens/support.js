import { getState } from '../store.js';
import { num, esc } from '../util.js';
import { pageHead, segmented, ring, empty } from '../ui.js';
import { icon } from '../art.js';
import * as A from '../assistant.js';

let breathTimer = null;

const FAQ = [
  ['بياناتي بتتحفظ فين؟ ومين بيشوفها؟', 'لو عندك حساب: بياناتك بتتحفظ على جهازك وعلى سيرفر رحلة (Firebase)، والمشرف المسؤول عنك ومدير البرنامج يقدروا يشوفوا كل بياناتك، ومنها يومياتك ومشاعرك، عشان يتابعوك ويدعموك. لو إنت ضيف: بياناتك على الجهاز بس ومحدش بيشوفها.'],
  ['ينفع أدخل من موبايل تاني؟', 'أيوه، ادخل بنفس الإيميل والباسورد وهتلاقي كل بياناتك.'],
  ['إزاي أنزّل التطبيق على الموبايل؟', 'افتح رحلة من Chrome على أندرويد، ودوس على "تثبيت التطبيق" أو من القايمة اختار "إضافة للشاشة الرئيسية". هيشتغل زي أي تطبيق وأوفلاين.'],
  ['التذكيرات مش بتوصل؟', 'لازم تشغّل الإشعارات من الإعدادات وتوافق على الإذن. التذكيرات بتشتغل طول ما التطبيق مفتوح أو شغال في الخلفية، وبعض الموبايلات بتقفل التطبيقات في الخلفية لتوفير البطارية.'],
  ['يوم فاتني… السلسلة راحت؟', 'السلسلة بتعد الأيام الناجحة ورا بعض، بس نقطك وشاراتك محفوظة دايماً. يوم واحد مش بيمسح مجهودك، ابدأ من تاني وبس 💚'],
  ['إيه هو "اليوم الناجح"؟', 'اليوم اللي تخلّص فيه نص مهامك أو أكتر. إحنا بنكافئ الاستمرار مش الكمال.'],
  ['مواقيت الصلاة مظبوطة؟', 'بتتحسب فلكياً بطريقة الهيئة المصرية العامة للمساحة حسب موقعك. ممكن يكون فيه فرق دقيقة أو اتنين؛ تقدر تظبط كل صلاة من "عباداتي ← غيّر الموقع".'],
  ['نصوص الأذكار منين؟', 'من الأحاديث الصحيحة المشهورة (حصن المسلم). الآيات بنذكر اسمها وموضعها عشان تقراها من المصحف مباشرة، ومفيش أي نص قرآني متعدّل.'],
  ['المساعد بيدّي فتاوى أو نصايح طبية؟', 'لأ. المساعد بيحلل تسجيلاتك بس ويقترح خطوات صغيرة. مش بديل عن دكتور أو متخصص أو عالم.'],
];

export default {
  render(params) {
    const tab = params[0] || 'assistant';
    const head = pageHead('الدعم', { back: false, sub: 'إحنا معاك في كل خطوة 🤝' });
    const seg = segmented([['assistant', 'المساعد'], ['breathe', 'اهدى شوية'], ['faq', 'أسئلة']], tab, 't');
    let body = '';
    if (tab === 'breathe') body = breathe();
    else if (tab === 'faq') body = `<section class="faq">${FAQ.map(([q, a]) => `<details class="card"><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
      <section class="card center"><p class="muted">رحلة معمولة بحب عشان تساعدك تكون أحسن نسخة منك 🌿</p></section>`;
    else body = assistant();
    return head + seg + body;
  },
  mount(el, params) {
    el.querySelector('[data-seg]')?.addEventListener('click', (e) => {
      const v = e.target.closest('[data-seg-v]')?.dataset.segV;
      if (v) location.hash = '#/support/' + v;
    });
    clearInterval(breathTimer);
    if ((params[0] || '') === 'breathe') mountBreathe(el);
  },
};

function assistant() {
  const s = getState();
  if (!s.settings.assistant) return empty('المساعد مقفول. تقدر تشغله من الإعدادات.', '<a class="btn primary" href="#/profile/settings">الإعدادات</a>');
  const sm = A.summary();
  const sug = A.suggestions();
  const neg = A.neglected();
  const goals = A.dailyGoals();
  const tn = A.tomorrowNote();
  return `
  <section class="card assistant-msg"><span class="as-ic">${icon('spark', 22)}</span><p>${A.motivation()}</p></section>
  <section class="card"><div class="row between"><h2>ملخص يومك</h2>${ring(sm.pct, 54, 6)}</div>
    <ul class="insights">${sm.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    <p class="muted small">${num(sm.done)} من ${num(sm.total)} مهام · ${num(sm.points)} نقطة النهارده</p></section>
  <section class="card"><h2>أهداف واقعية للنهارده 🎯</h2><p class="muted small">على أساس متوسطك الفعلي آخر أسبوع</p>
    <ol class="goals-list">${goals.map((g) => `<li>${g}</li>`).join('')}</ol></section>
  ${neg.length ? `<section class="card"><h2>عادات محتاجة شوية حب 🌱</h2>
    ${neg.map((x) => `<a href="#/habits/${x.h.id}" class="kv link-row"><span>${x.h.icon} ${esc(x.h.name)}</span><small class="muted">${num(x.done)} من ${num(x.due)} آخر أسبوع</small></a>`).join('')}
    ${tn ? `<p class="muted small mt">${tn}</p>` : ''}</section>` : ''}
  <section class="card"><h2>اقتراحات بسيطة 💡</h2>
    ${sug.length ? `<ul class="sugs">${sug.map((x) => `<li><span>${x.ic}</span><p>${x.t}</p></li>`).join('')}</ul>` : '<p class="muted">ماشي كويس جداً! كمّل كده 🌸</p>'}</section>
  <p class="muted small center">المساعد بيحلل تسجيلاتك على جهازك بس. الاقتراحات دي مش نصيحة طبية ولا فتوى.</p>`;
}

function breathe() {
  return `<section class="card breathe-card center">
    <h2>تمرين تنفس ٤-٤-٦</h2><p class="muted small">لو حاسس بقلق أو ضغط، جرّب دقيقتين بس</p>
    <div class="breath-circle" id="bc"><span id="bt">جاهز؟</span></div>
    <p class="big-num" id="bn"></p>
    <button class="btn primary" id="bstart">${icon('play', 18)} ابدأ</button>
    <p class="muted small mt" id="cycles"></p>
  </section>
  <section class="card"><h2>حاجات صغيرة ممكن تساعد</h2><ul class="sugs">
    <li><span>💧</span><p>اشرب كوباية مية ببطء</p></li><li><span>🚶</span><p>اتمشى ٥ دقايق بعيد عن الشاشة</p></li>
    <li><span>🤲</span><p>ادعي بقلبك وقول اللي جواك</p></li><li><span>✍️</span><p><a class="link" href="#/journal/new">اكتب اللي شاغلك في يومياتك</a></p></li>
    <li><span>📞</span><p>كلّم حد بتحبه وبتثق فيه</p></li></ul>
    <p class="muted small">لو الضغط أو الحزن مستمر أو صعب عليك، متترددش تطلب مساعدة من متخصص — ده قوة مش ضعف 🤍</p></section>`;
}

function mountBreathe(el) {
  const btn = el.querySelector('#bstart');
  const bc = el.querySelector('#bc'), bt = el.querySelector('#bt'), bn = el.querySelector('#bn');
  const phases = [['شهيق', 4, 'in'], ['اكتم', 4, 'hold'], ['زفير', 6, 'out']];
  let running = false, cycles = 0;
  btn.onclick = () => {
    if (running) { running = false; clearInterval(breathTimer); bc.className = 'breath-circle'; bt.textContent = 'جاهز؟'; bn.textContent = ''; btn.innerHTML = icon('play', 18) + ' ابدأ'; return; }
    running = true; cycles = 0;
    btn.innerHTML = icon('pause', 18) + ' وقّف';
    let pi = 0, left = phases[0][1];
    const show = () => { bc.className = 'breath-circle ' + phases[pi][2]; bc.style.setProperty('--dur', phases[pi][1] + 's'); bt.textContent = phases[pi][0]; bn.textContent = num(left); };
    show();
    breathTimer = setInterval(() => {
      if (!el.isConnected) return clearInterval(breathTimer);
      left--;
      if (left <= 0) {
        pi = (pi + 1) % 3;
        if (pi === 0) { cycles++; el.querySelector('#cycles').textContent = `${num(cycles)} دورات ✓`; navigator.vibrate?.(20); }
        left = phases[pi][1];
      }
      show();
    }, 1000);
  };
}
