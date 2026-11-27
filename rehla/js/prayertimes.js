// حساب مواقيت الصلاة فلكياً — طريقة الهيئة المصرية العامة للمساحة (الفجر ١٩.٥°، العشاء ١٧.٥°، العصر شافعي)
// ده تقريبي حسب الموقع؛ تقدر تظبط أي وقت بالدقايق من الإعدادات.
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

function sunPosition(jd) {
  const D = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * D, 360);
  const q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360);
  const e = 23.439 - 0.00000036 * D;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  const eqt = q / 15 - fix(RA, 24);
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
  return { decl, eqt };
}

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

export function computeTimes(date, lat, lng, offsets = {}) {
  const tz = -date.getTimezoneOffset() / 60;
  const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
  const mid = (t) => fix(12 - sunPosition(jd + t).eqt, 24);
  const angleTime = (angle, t, ccw) => {
    const { decl } = sunPosition(jd + t);
    const noon = mid(t);
    const v = (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat)));
    const h = deg(Math.acos(Math.max(-1, Math.min(1, v)))) / 15;
    return noon + (ccw ? -h : h);
  };
  const asrTime = (t) => {
    const { decl } = sunPosition(jd + t);
    const a = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - decl))))));
    return angleTime(a, t, false);
  };
  const raw = {
    fajr: angleTime(19.5, 5 / 24, true),
    dhuhr: mid(12 / 24) + 1 / 60,
    asr: asrTime(13 / 24),
    maghrib: angleTime(0.833, 18 / 24, false) + 1 / 60,
    isha: angleTime(17.5, 18 / 24, false),
  };
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    let t = v + tz - lng / 15 + (offsets[k] || 0) / 60;
    t = fix(t, 24);
    let h = Math.floor(t);
    let m = Math.round((t - h) * 60);
    if (m === 60) { h = (h + 1) % 24; m = 0; }
    out[k] = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return out;
}
