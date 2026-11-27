// مساعد شخصي بيحلل بياناتك على جهازك (مفيش أي بيانات بتطلع برّه)
import { getState, peekDay } from './store.js';
import { today, lastNDays, num, esc, hashStr } from './util.js';
import { PRAYERS, MOODS } from './data/content.js';
import * as S from './stats.js';

export function summary() {
  const s = getState();
  const k = today();
  const d = peekDay(k);
  const items = S.dayItems(k);
  const done = items.filter((i) => i.done);
  const lines = [];
  const pr = Object.keys(d.prayers || {}).length;
  lines.push(pr ? `🕌 صليت ${num(pr)} من ٥ صلوات` : '🕌 لسه معلّمتش على أي صلاة النهارده');
  const qp = S.quranPages(d);
  if (qp) lines.push(`📖 قريت ${num(qp)} صفحة قرآن`);
  const az = ['morning', 'evening'].filter((t) => S.azkarDone(d, t));
  if (az.length) lines.push(`📿 خلّصت ${az.length === 2 ? 'أذكار الصباح والمساء' : az[0] === 'morning' ? 'أذكار الصباح' : 'أذكار المساء'}`);
  const hd = s.habits.filter((h) => S.habitDone(h, k));
  if (hd.length) lines.push(`🌱 عملت ${hd.map((h) => esc(h.name)).join('، ')}`);
  if (d.water) lines.push(`💧 شربت ${num(d.water)} كوباية مية`);
  if (S.workoutMins(d)) lines.push(`💪 اتمرنت ${num(S.workoutMins(d))} دقيقة`);
  const m = s.moods.find((x) => x.date === k);
  if (m) { const mo = MOODS.find((x) => x.id === m.mood); lines.push(`💗 حاسس إنك ${mo.label} ${mo.emoji}`); }
  if (s.journal.some((j) => j.date === k)) lines.push('✍️ كتبت في يومياتك');
  return { pct: items.length ? done.length / items.length : 0, done: done.length, total: items.length, lines, points: S.dayPoints(k) };
}

export function neglected() {
  const s = getState();
  const keys = lastNDays(7).filter((k) => k < today());
  const out = [];
  for (const h of s.habits.filter((x) => x.status === 'active')) {
    const due = keys.filter((k) => S.habitDue(h, k));
    if (due.length < 2) continue;
    const done = due.filter((k) => S.habitDone(h, k)).length;
    if (done / due.length < 0.4) out.push({ h, done, due: due.length });
  }
  return out;
}

export function suggestions() {
  const s = getState();
  const keys = lastNDays(7);
  const out = [];
  // القرآن
  const qAvg = keys.reduce((a, k) => a + S.quranPages(peekDay(k)), 0) / 7;
  const goal = s.settings.quranGoal;
  if (goal && qAvg < goal * 0.5) out.push({ ic: '📖', t: `متوسط قرايتك ${num(qAvg.toFixed(1))} صفحة في اليوم وهدفك ${num(goal)}. جرّب هدف ${num(Math.max(1, Math.ceil(qAvg) + 1))} صفحات الأول وزوّد بالراحة.` });
  else if (qAvg >= goal && goal) out.push({ ic: '📖', t: `ما شاء الله، بتحقق وردك! لو حابب، زوّد صفحة واحدة بس (${num(goal + 1)}).` });
  else if (!goal) out.push({ ic: '📖', t: 'إيه رأيك تحط ورد صغير — صفحتين بس في اليوم؟' });
  // الصلاة
  const pr = S.prayerStats(keys.filter((k) => k < today()));
  if (pr.total) {
    const weakest = PRAYERS.map((p) => [p, pr.per[p.id]]).sort((a, b) => a[1] - b[1])[0];
    if (weakest[1] < (pr.total / 5) * 0.7) out.push({ ic: '🕌', t: `صلاة ${weakest[0].name} محتاجة اهتمام شوية (${num(weakest[1])} من ${num(pr.total / 5)} أيام). شغّل تذكيرها من الإعدادات.` });
  }
  // المية
  const wAvg = keys.reduce((a, k) => a + (peekDay(k).water || 0), 0) / 7;
  if (s.settings.waterGoal && wAvg < s.settings.waterGoal * 0.6) out.push({ ic: '💧', t: `متوسطك ${num(wAvg.toFixed(1))} كوباية. حط كوباية جنبك وإنت قاعد، واشرب واحدة بعد كل صلاة.` });
  // الرياضة
  const h = S.healthStats(keys);
  if (h.sessions < 2) out.push({ ic: '🚶', t: 'مشي ١٠ دقايق بعد الأكل بداية ممتازة — ابدأ بيها النهارده.' });
  // النوم
  if (h.sleepAvg && h.sleepAvg < s.settings.sleepGoal - 1) out.push({ ic: '🌙', t: `متوسط نومك ${num(h.sleepAvg.toFixed(1))} ساعة. جرّب تبعد عن الموبايل نص ساعة قبل النوم.` });
  // المشاعر
  const ms = S.moodStats(keys);
  if (ms.topNeg) out.push({ ic: '💗', t: `"${esc(ms.topNeg)}" ظاهر كتير في أيامك الصعبة. اكتب عنه في يومياتك يمكن يوضح الصورة.` });
  if (!s.moods.length) out.push({ ic: '💗', t: 'سجّل مشاعرك مرة في اليوم — هيساعدك تفهم نفسك أكتر.' });
  // العادات
  if (!s.habits.length) out.push({ ic: '🌱', t: 'ابدأ بعادة واحدة بس صغيرة جداً لدرجة إنك متقدرش تقول لأ.' });
  if (!s.goals.filter((g) => !g.done).length) out.push({ ic: '🎯', t: 'حط هدف واحد للشهر ده وقسّمه ٣ خطوات.' });
  return out.slice(0, 5);
}

export function dailyGoals() {
  const s = getState();
  const keys = lastNDays(7).filter((k) => k < today());
  const out = [];
  const pr = S.prayerStats(keys);
  out.push(pr.pct >= 0.9 ? 'حافظ على الخمس صلوات زي ما إنت 🤍' : 'الخمس صلوات في وقتهم');
  const qAvg = keys.length ? keys.reduce((a, k) => a + S.quranPages(peekDay(k)), 0) / keys.length : 0;
  out.push(`${num(Math.max(1, Math.min(s.settings.quranGoal || 2, Math.ceil(qAvg) + 1)))} صفحات قرآن`);
  const w = keys.length ? keys.reduce((a, k) => a + (peekDay(k).water || 0), 0) / keys.length : 0;
  out.push(`${num(Math.min(s.settings.waterGoal, Math.max(4, Math.ceil(w) + 1)))} كوبايات مية`);
  const neg = neglected()[0];
  if (neg) out.push(`${neg.h.icon} ${esc(neg.h.name)} ولو بنسخة صغيرة`);
  else out.push('١٥ دقيقة حركة');
  out.push('أذكار الصباح أو المساء');
  return out;
}

export function motivation() {
  const s = getState();
  const name = s.profile.name ? esc(s.profile.name) : 'يا بطل';
  const st = S.streak();
  const best = S.bestStreak();
  const sum = summary();
  const pool = [];
  if (st >= 3) pool.push(`${name}، بقالك ${num(st)} أيام ورا بعض! الاستمرار ده هو السر 🔥`);
  if (st && st === best && st > 2) pool.push(`دي أطول سلسلة ليك لحد دلوقتي يا ${name} — كمّل وكسّر رقمك 🏔️`);
  if (sum.pct >= 1) pool.push(`خلصت كل حاجة النهارده يا ${name}! خد وقت ترتاح فيه، إنت تستاهل 🌸`);
  else if (sum.pct >= 0.5) pool.push(`عدّيت نص اليوم بنجاح يا ${name} 🌿 خطوة كمان وتبقى عملت يوم حلو.`);
  else if (sum.done) pool.push(`${name}، عملت ${num(sum.done)} حاجات النهارده — وده مش قليل. كمّل بهدوء 💚`);
  else pool.push(`${name}، النهارده صفحة جديدة. ابدأ بأصغر حاجة: كوباية مية أو ذكر 🌱`);
  if (!st && best) pool.push(`السلسلة وقفت؟ عادي خالص يا ${name}. قبل كده عملت ${num(best)} أيام، يعني تقدر تعمل تاني 💪`);
  return pool[hashStr(today() + (s.profile.name || '')) % pool.length];
}

export function tomorrowNote() {
  const n = neglected();
  if (!n.length) return null;
  return `بكرة جرّب ترجع لـ ${n.map((x) => x.h.icon + ' ' + esc(x.h.name)).join(' و ')} — نسخة صغيرة منها كفاية.`;
}

