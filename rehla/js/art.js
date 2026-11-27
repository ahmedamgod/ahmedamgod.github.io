// رسومات SVG بطابع الألوان المائية — مستوحاة من الصورة المرجعية لرحلة
// (فلاتر #wc و #wcs والـ gradients متعرفين في index.html)

let uidN = 0;
const nid = (p) => `${p}${++uidN}`;

const flower = (x, y, c = '#F5CDD2', s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    ${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-5" rx="3.6" ry="5.4" fill="${c}" transform="rotate(${r})"/>`).join('')}
    <circle r="2.6" fill="#F2C94C"/>
  </g>`;
const leaf = (x, y, r = 0, c = '#8DB36A', s = 1) =>
  `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 0 C 5 -7 13 -8 18 -6 C 14 0 7 4 0 0 Z" fill="${c}"/>
   <path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M1 -1 C 7 -4 12 -5 16 -5.5" stroke="#fff" stroke-opacity=".45" stroke-width=".8" fill="none"/>`;
const heart = (x, y, s = 1, c = '#F29BB0') =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 3 C -6 -1 -6 -6 -3 -7 C -1.5 -7.6 -.4 -6.6 0 -5.6 C .4 -6.6 1.5 -7.6 3 -7 C 6 -6 6 -1 0 3Z" fill="${c}"/>`;
const butterfly = (x, y, s = 1, c1 = '#F7C46A', c2 = '#F29A5C') => `
  <g class="bfly" transform="translate(${x} ${y}) scale(${s})">
    <g class="wing">
      <path d="M0 0 C -8 -12 -18 -9 -15 0 C -17 7 -7 10 0 2 Z" fill="${c1}" stroke="${c2}" stroke-width="1"/>
      <path d="M0 0 C 8 -12 18 -9 15 0 C 17 7 7 10 0 2 Z" fill="${c1}" stroke="${c2}" stroke-width="1"/>
    </g>
    <path d="M0 -5 L0 6" stroke="#6b4a2f" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M0 -5 C -2 -9 -4 -10 -5 -10 M0 -5 C 2 -9 4 -10 5 -10" stroke="#6b4a2f" stroke-width=".8" fill="none"/>
  </g>`;
const lotus = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C -14 -4 -22 -14 -22 -22 C -12 -20 -4 -12 0 0Z" fill="#F6B3C2"/>
    <path d="M0 0 C 14 -4 22 -14 22 -22 C 12 -20 4 -12 0 0Z" fill="#F6B3C2"/>
    <path d="M0 0 C -10 -8 -12 -22 -8 -32 C -2 -24 1 -12 0 0Z" fill="#F08FA8"/>
    <path d="M0 0 C 10 -8 12 -22 8 -32 C 2 -24 -1 -12 0 0Z" fill="#F08FA8"/>
    <path d="M0 0 C -6 -12 -5 -28 0 -38 C 5 -28 6 -12 0 0Z" fill="#F7A9BC"/>
    <path d="M0 -4 C -2 -14 -2 -26 0 -34" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" fill="none"/>
  </g>`;
const laurel = (x, y, s = 1, flip = false) => `
  <g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
    <path d="M0 0 C -14 -16 -16 -40 -6 -60" stroke="#6E9A4A" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${[[-3, -6, -150], [-8, -16, -165], [-11, -27, -180], [-11, -38, 165], [-9, -49, 150]].map(([lx, ly, r]) => leaf(lx, ly, r, '#7FAA58', .8)).join('')}
    ${[[-2, -10, -20], [-6, -21, -5], [-8, -32, 10], [-7, -43, 25]].map(([lx, ly, r]) => leaf(lx, ly, r, '#9CC27A', .75)).join('')}
  </g>`;

// ===== الشعار =====
export function logo(size = 56, withText = size >= 110) {
  const c = nid('lc');
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <clipPath id="${c}"><circle cx="100" cy="96" r="70"/></clipPath>
      <radialGradient id="${c}s" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#FFF3C4"/><stop offset=".55" stop-color="#FDF7E6"/><stop offset="1" stop-color="#EEF5E4"/></radialGradient>
    </defs>
    ${laurel(42, 150, 1.25)}${laurel(158, 150, 1.25, true)}
    <circle cx="100" cy="96" r="72" fill="#FFFDF5" stroke="#B9D19A" stroke-width="3"/>
    <g clip-path="url(#${c})">
      <rect x="20" y="20" width="160" height="160" fill="url(#${c}s)"/>
      <g stroke="#F6C94F" stroke-width="3" stroke-linecap="round">${[-70, -45, -20, 0, 20, 45, 70].map((a) => `<line x1="${100 + Math.sin((a * Math.PI) / 180) * 34}" y1="${78 - Math.cos((a * Math.PI) / 180) * 34}" x2="${100 + Math.sin((a * Math.PI) / 180) * 46}" y2="${78 - Math.cos((a * Math.PI) / 180) * 46}"/>`).join('')}</g>
      <circle cx="100" cy="80" r="24" fill="#F9D261"/>
      <path d="M20 96 C 50 72 78 82 100 92 C 126 74 156 76 180 92 L180 180 L20 180Z" fill="#B8D48E"/>
      <path d="M20 112 C 56 96 92 112 122 104 C 148 98 166 102 180 108 L180 180 L20 180Z" fill="#8FBF63"/>
      <path d="M84 180 C 88 150 128 140 112 120 C 104 110 96 106 106 96" stroke="#FFF6DF" stroke-width="12" fill="none" stroke-linecap="round"/>
      ${leaf(44, 112, -40, '#6E9A4A', 1.3)}${leaf(40, 120, -100, '#7FAA58', 1.2)}
    </g>
    ${lotus(146, 114, .95)}
    ${leaf(130, 118, -20, '#7FAA58', 1.2)}${leaf(160, 116, 200, '#7FAA58', 1.1)}
    ${butterfly(170, 22, .9)}
    <path d="M178 30 C 186 40 182 50 176 56" stroke="#9BBF7A" stroke-dasharray="2 3" fill="none"/>
    ${withText ? `<text x="100" y="152" text-anchor="middle" class="logo-text">رحلة</text>
      <path d="M62 160 C 86 168 116 168 140 158" stroke="#F6C94F" stroke-width="4" fill="none" stroke-linecap="round"/>` : ''}
    ${heart(100, 182, 1.1)}
  </svg>`;
}

// ===== خلفية المشهد (سما، سحاب، تلال، غصون، قلوب) =====
export function scene() {
  const branch = (x, y, s, flip, rot) => `
    <g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(${rot})">
      <path d="M0 0 C 30 10 60 30 96 70" stroke="#8A6A48" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M40 18 C 46 6 52 0 60 -4" stroke="#8A6A48" stroke-width="2" fill="none"/>
      ${[[14, 4, 20], [26, 9, 80], [38, 16, 10], [50, 26, 90], [62, 36, 20], [74, 48, 100], [86, 60, 30], [54, 0, -20], [60, -4, 40]].map(([lx, ly, r], i) => leaf(lx, ly, r, i % 2 ? '#8DB86A' : '#A9CB84', 1.35)).join('')}
    </g>`;
  const plant = (x, y, s, flip) => `
    <g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">
      <path d="M0 0 C 4 -30 2 -60 -6 -90" stroke="#6E9A4A" stroke-width="2.5" fill="none"/>
      ${[[0, -14, -60], [1, -26, -120], [1, -38, -55], [-1, -50, -125], [-2, -62, -60], [-4, -74, -120], [-5, -86, -80]].map(([lx, ly, r], i) => leaf(lx, ly, r, i % 2 ? '#7FAA58' : '#9CC27A', 1.4)).join('')}
    </g>`;
  const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".9"><ellipse cx="0" cy="0" rx="26" ry="10"/><ellipse cx="-10" cy="-6" rx="12" ry="9"/><ellipse cx="8" cy="-9" rx="14" ry="11"/></g>`;
  return `<svg viewBox="0 0 400 860" preserveAspectRatio="xMidYMin slice" width="100%" height="100%">
    <defs>
      <linearGradient id="scsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#CFE5F4"/><stop offset=".28" stop-color="#F3F2DF"/><stop offset=".5" stop-color="#FCF3D7"/><stop offset="1" stop-color="#EEF3D6"/>
      </linearGradient>
      <radialGradient id="scsun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF1B8" stop-opacity=".9"/><stop offset="1" stop-color="#FFF1B8" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="400" height="860" fill="url(#scsky)"/>
    <circle cx="200" cy="150" r="160" fill="url(#scsun)"/>
    ${cloud(70, 70, 1.2)}${cloud(330, 110, 1)}${cloud(250, 40, .7)}${cloud(120, 190, .8)}
    <path d="M0 330 C 60 290 120 300 180 320 C 250 280 330 290 400 320 L400 420 L0 420Z" fill="#F4E7B4" opacity=".7"/>
    <path d="M0 360 C 80 330 150 350 220 345 C 290 340 350 350 400 340 L400 450 L0 450Z" fill="#E6EBC0" opacity=".7"/>
    <path d="M0 760 C 90 730 180 750 260 740 C 330 732 370 740 400 735 L400 860 L0 860Z" fill="#D8E6B4" opacity=".8"/>
    ${branch(-10, -8, 1.1, false, 20)}${branch(410, 40, 1, true, 10)}
    ${plant(12, 870, 1.25, false)}${plant(388, 870, 1.25, true)}${plant(40, 870, .8, true)}${plant(360, 870, .8, false)}
    <g class="floaty">${heart(110, 140, 1.6)}${heart(318, 196, 1.4)}${heart(36, 300, 1.1, '#F6B3C2')}${heart(372, 420, 1.2, '#F6B3C2')}</g>
  </svg>`;
}
export const heroScene = () => `<div class="hero-scene">${scene()}</div>`;

// ===== رسومات الكروت =====
const ICONS = {
  worship: () => `<svg viewBox="0 0 120 100" aria-hidden="true">
    ${leaf(14, 86, -70, '#8DB86A', 1.5)}${leaf(18, 88, -120, '#A9CB84', 1.3)}${leaf(102, 88, -110, '#8DB86A', 1.3)}
    <g stroke-linecap="round">
      <path d="M28 92 L88 40" stroke="#8B5A2B" stroke-width="8"/><path d="M28 92 L88 40" stroke="#B07A45" stroke-width="4"/>
      <path d="M92 92 L32 40" stroke="#8B5A2B" stroke-width="8"/><path d="M92 92 L32 40" stroke="#C08A52" stroke-width="4"/>
      <path d="M22 93 H40 M80 93 H98" stroke="#8B5A2B" stroke-width="5"/>
    </g>
    <path d="M14 44 C 34 34 50 36 60 44 L60 66 C 50 58 34 56 14 66 Z" fill="#7A4A22"/>
    <path d="M106 44 C 86 34 70 36 60 44 L60 66 C 70 58 86 56 106 66 Z" fill="#7A4A22"/>
    <path d="M17 41 C 35 31 50 33 60 41 L60 63 C 50 55 35 53 17 62 Z" fill="#FFF8E6" stroke="#D9BF8E" stroke-width="1"/>
    <path d="M103 41 C 85 31 70 33 60 41 L60 63 C 70 55 85 53 103 62 Z" fill="#FFFDF3" stroke="#D9BF8E" stroke-width="1"/>
    <g stroke="#C9B48E" stroke-width="1.3" stroke-linecap="round" fill="none">
      <path d="M24 44 C 36 39 46 40 55 45 M24 49 C 36 44 46 45 55 50 M24 54 C 36 49 46 50 55 55"/>
      <path d="M96 44 C 84 39 74 40 65 45 M96 49 C 84 44 74 45 65 50 M96 54 C 84 49 74 50 65 55"/>
    </g>
    <path d="M60 41 V64" stroke="#C9A06A" stroke-width="1.2"/>
    <path d="M66 60 L66 74 L69 71 L72 74 L72 60" fill="#E0566F"/>
    ${heart(104, 26, 1, '#F6B3C2')}
  </svg>`,
  habits: () => `<svg viewBox="0 0 120 100" aria-hidden="true">
    <path d="M8 92 C 30 60 90 60 112 92 Z" fill="#8B5E3C"/>
    <path d="M14 86 C 36 64 84 64 106 86 C 84 74 36 74 14 86Z" fill="#A87650"/>
    <circle cx="40" cy="80" r="2" fill="#6E4628"/><circle cx="78" cy="78" r="2.4" fill="#6E4628"/><circle cx="60" cy="86" r="1.8" fill="#6E4628"/>
    <path d="M60 70 C 60 56 59 46 58 34" stroke="#5F8F3E" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M58 44 C 44 46 28 38 24 22 C 40 18 56 28 58 44Z" fill="#7FB54F"/>
    <path d="M58 44 C 46 38 36 30 28 24" stroke="#5F8F3E" stroke-width="1.4" fill="none"/>
    <path d="M59 36 C 70 22 88 16 100 22 C 94 38 76 44 59 36Z" fill="#94C764"/>
    <path d="M60 36 C 72 30 84 25 96 23" stroke="#5F8F3E" stroke-width="1.4" fill="none"/>
    ${leaf(16, 90, -70, '#8DB86A', 1)}${leaf(20, 92, -110, '#A9CB84', .9)}${leaf(100, 90, -110, '#8DB86A', 1)}${leaf(104, 92, -60, '#A9CB84', .9)}
  </svg>`,
  journal: () => `<svg viewBox="0 0 120 100" aria-hidden="true">
    ${leaf(14, 86, -60, '#8DB86A', 1.5)}${leaf(16, 88, -110, '#A9CB84', 1.2)}
    <g transform="rotate(-6 58 52)">
      <rect x="30" y="16" width="56" height="72" rx="8" fill="#F4A9B8"/>
      <rect x="34" y="18" width="52" height="68" rx="6" fill="#F8C3CD"/>
      <rect x="40" y="26" width="40" height="50" rx="4" fill="#FFF5F3"/>
      ${[22, 32, 42, 52, 62, 72, 80].map((y) => `<circle cx="32" cy="${y}" r="3.2" fill="none" stroke="#B9A6A8" stroke-width="1.6"/>`).join('')}
      ${heart(60, 46, 2.1, '#F07A97')}
      <path d="M46 62 H74 M46 68 H68" stroke="#F2C3CC" stroke-width="1.8" stroke-linecap="round"/>
    </g>
    <g transform="rotate(35 92 44)"><rect x="88" y="14" width="8" height="50" rx="3" fill="#4C7FC4"/><rect x="88" y="14" width="8" height="10" rx="3" fill="#2F5C9A"/><path d="M88 64 L92 74 L96 64Z" fill="#F3D9B0"/><path d="M91 70 L92 74 L93 70Z" fill="#333"/></g>
    ${heart(100, 22, .9, '#F6B3C2')}
  </svg>`,
  emotions: () => `<svg viewBox="0 0 120 100" aria-hidden="true">
    <g stroke="#F7C95A" stroke-width="3" stroke-linecap="round">
      <path d="M60 6 V14 M26 18 L32 24 M94 18 L88 24 M12 46 H20 M100 46 H108 M24 76 L30 72 M96 76 L90 72"/>
    </g>
    <path d="M60 90 C 22 68 20 36 38 28 C 48 24 56 30 60 38 C 64 30 72 24 82 28 C 100 36 98 68 60 90Z" fill="#F7A2B4"/>
    <path d="M42 34 C 36 38 34 46 36 52" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M45 52 C 48 56 52 56 55 52 M65 52 C 68 56 72 56 75 52" stroke="#6b3a45" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M52 64 C 56 69 64 69 68 64" stroke="#6b3a45" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="42" cy="61" rx="5" ry="3" fill="#F57D98" opacity=".55"/><ellipse cx="78" cy="61" rx="5" ry="3" fill="#F57D98" opacity=".55"/>
  </svg>`,
  health: () => `<svg viewBox="0 0 120 100" aria-hidden="true">
    <g>
      <rect x="10" y="50" width="62" height="8" rx="4" fill="#5B6E8C"/>
      <rect x="8" y="36" width="12" height="36" rx="5" fill="#3E6FC2"/><rect x="18" y="40" width="9" height="28" rx="4" fill="#5C8BD8"/>
      <rect x="62" y="36" width="12" height="36" rx="5" fill="#3E6FC2"/><rect x="55" y="40" width="9" height="28" rx="4" fill="#5C8BD8"/>
      <path d="M11 40 V66" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
    </g>
    <g>
      <rect x="86" y="10" width="14" height="8" rx="2" fill="#2F5C9A"/>
      <path d="M84 22 C 84 18 102 18 102 22 L104 30 V86 C 104 90 82 90 82 86 V30Z" fill="#CFE8F7" stroke="#8EC1E3" stroke-width="1.5"/>
      <path d="M83 48 H103 V86 C 103 89 83 89 83 86Z" fill="#A9D5F0" opacity=".8"/>
      <rect x="82" y="40" width="22" height="12" fill="#5DA7DA" opacity=".8"/>
      <path d="M88 26 V80" stroke="#fff" stroke-opacity=".7" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <ellipse cx="60" cy="92" rx="48" ry="4" fill="#8EB5D6" opacity=".25"/>
  </svg>`,
  journey: () => `<svg viewBox="0 0 120 100" aria-hidden="true">
    <path d="M0 50 C 20 34 40 40 58 44 C 76 32 98 30 120 40 V100 H0Z" fill="#E4EDCB"/>
    <path d="M0 62 C 30 50 60 58 84 54 C 100 51 112 52 120 56 V100 H0Z" fill="#A9CB84"/>
    <path d="M0 78 C 30 70 70 78 120 72 V100 H0Z" fill="#8DB86A"/>
    <path d="M40 100 C 44 84 78 82 70 70 C 64 62 74 56 90 50" stroke="#F6E3BF" stroke-width="9" fill="none" stroke-linecap="round"/>
    <g><rect x="17" y="54" width="3" height="16" fill="#7A5A3A"/><circle cx="18" cy="48" r="10" fill="#6FA34B"/><circle cx="13" cy="52" r="6" fill="#88B862"/>
    <rect x="101" y="56" width="3" height="14" fill="#7A5A3A"/><circle cx="102" cy="50" r="9" fill="#6FA34B"/><circle cx="107" cy="54" r="5.5" fill="#88B862"/></g>
    <path d="M92 50 V22" stroke="#6b4a2f" stroke-width="2"/><path d="M92 22 L108 27 L92 33Z" fill="#F28CA6"/>
    ${flower(30, 88, '#F6B3C2', .9)}${flower(96, 86, '#fff', .8)}
  </svg>`,
  lotus: () => `<svg viewBox="0 0 110 110" aria-hidden="true">
    <path d="M60 108 C 58 86 56 70 56 56" stroke="#6E9A4A" stroke-width="3" fill="none"/>
    ${leaf(58, 92, -150, '#7FAA58', 2.2)}${leaf(58, 82, -20, '#9CC27A', 2)}
    ${lotus(56, 60, 1.25)}
    <g transform="translate(26 40) scale(.6) rotate(-18)">${lotus(0, 0, 1)}</g>
    <path d="M26 46 C 30 64 40 80 52 100" stroke="#6E9A4A" stroke-width="2" fill="none"/>
    ${heart(92, 30, 1, '#F6B3C2')}${leaf(84, 50, -40, '#A9CB84', 1)}
  </svg>`,
  plant: () => `<svg viewBox="0 0 120 100" aria-hidden="true">
    <ellipse cx="60" cy="90" rx="40" ry="6" fill="#91AA62" opacity=".18"/>
    <path d="M60 82 C 60 66 60 52 60 38" stroke="#5F8F3E" stroke-width="3" fill="none"/>
    <path d="M60 60 C 44 60 34 48 34 38 C 48 38 60 46 60 60Z" fill="#7FB54F"/>
    <path d="M60 50 C 76 50 86 38 86 30 C 72 30 60 38 60 50Z" fill="#94C764"/>
    <path d="M44 82 H76 L72 98 H48Z" fill="#E9B8A0"/>
    ${flower(60, 34, '#F5CDD2', 1.1)}${butterfly(94, 30, .6)}
  </svg>`,
  trophy: () => `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="40" r="30" fill="#F7E6A8" opacity=".6"/>
    <path d="M26 20 H54 V30 a14 14 0 0 1 -28 0Z" fill="#F2C94C"/>
    <path d="M26 24 H18 a8 8 0 0 0 10 10 M54 24 H62 a8 8 0 0 1 -10 10" stroke="#E0B23C" stroke-width="3" fill="none"/>
    <rect x="36" y="44" width="8" height="10" fill="#E0B23C"/><rect x="28" y="54" width="24" height="7" rx="3" fill="#91AA62"/>
    ${flower(18, 58, '#F5CDD2', .7)}${flower(62, 58, '#FFFFFF', .7)}
  </svg>`,
};
export const art = (name) => (ICONS[name] ? ICONS[name]() : '');

// ===== أيقونات خطية =====
const LINE = {
  home: '<path d="M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4Z"/>',
  trophy: '<path d="M7 4 H17 V8 a5 5 0 0 1 -10 0Z M7 6 H4 a3 3 0 0 0 4 4 M17 6 H20 a3 3 0 0 1 -4 4 M12 13 V17 M8 20 H16 M9 17 H15 V20 H9Z"/>',
  chart: '<path d="M4 20 V10 M10 20 V4 M16 20 V13 M20 20 H3"/>',
  heart: '<path d="M12 20 C 4 14 3 9 5.5 6.5 C 8 4 11 5.5 12 7.5 C 13 5.5 16 4 18.5 6.5 C 21 9 20 14 12 20Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20 C 5 15 19 15 20 20"/>',
  bell: '<path d="M6 16 V11 a6 6 0 0 1 12 0 V16 L20 18 H4Z M10 21 H14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9"/>',
  back: '<path d="M9 5 L16 12 L9 19"/>',
  plus: '<path d="M12 5 V19 M5 12 H19"/>',
  check: '<path d="M5 12.5 L10 17 L19 7"/>',
  x: '<path d="M6 6 L18 18 M18 6 L6 18"/>',
  edit: '<path d="M4 20 L5 15 L16 4 L20 8 L9 19Z M14 6 L18 10"/>',
  trash: '<path d="M5 7 H19 M9 7 V4 H15 V7 M7 7 L8 20 H16 L17 7"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16 L20 20"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10 H20 M8 3 V7 M16 3 V7"/>',
  reset: '<path d="M5 12 a7 7 0 1 0 2 -5 M5 4 V8 H9"/>',
  play: '<path d="M8 5 L19 12 L8 19Z"/>',
  pause: '<path d="M8 5 V19 M16 5 V19"/>',
  archive: '<path d="M4 5 H20 V9 H4Z M5 9 V19 H19 V9 M10 13 H14"/>',
  spark: '<path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2Z"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M5 18 L10 13 L14 16 L16 14 L20 18"/>',
  download: '<path d="M12 4 V15 M7 10 L12 15 L17 10 M5 20 H19"/>',
  upload: '<path d="M12 15 V4 M7 9 L12 4 L17 9 M5 20 H19"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11 V8 a4 4 0 0 1 8 0 V11"/>',
  moon: '<path d="M19 14 A8 8 0 1 1 10 5 A6 6 0 0 0 19 14Z"/>',
  pin: '<path d="M12 21 C 7 15 6 12 6 10 a6 6 0 0 1 12 0 C 18 12 17 15 12 21Z"/><circle cx="12" cy="10" r="2"/>',
  logout: '<path d="M14 4 H19 V20 H14 M10 8 L6 12 L10 16 M6 12 H15"/>',
  wind: '<path d="M3 9 H14 a3 3 0 1 0 -3 -3 M3 14 H18 a3 3 0 1 1 -3 3 M3 19 H9"/>',
};
export function icon(name, size = 22) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE[name] || ''}</svg>`;
}

// أيقونات مليانة (زي شريط التنقل في الصورة المرجعية)
const SOLID = {
  home: '<path d="M12 2.8 L22 11.2 C22.5 11.6 22.2 12.4 21.6 12.4 H20 V20.5 C20 21.3 19.3 22 18.5 22 H14.5 V15.5 H9.5 V22 H5.5 C4.7 22 4 21.3 4 20.5 V12.4 H2.4 C1.8 12.4 1.5 11.6 2 11.2Z"/>',
  trophy: '<path d="M6 3 H18 V9 a6 6 0 0 1 -12 0Z"/><path d="M6 5 H3 V7 a4 4 0 0 0 4 4 M18 5 H21 V7 a4 4 0 0 1 -4 4" fill="none" stroke="currentColor" stroke-width="2"/><rect x="10.5" y="14" width="3" height="4"/><rect x="7" y="18" width="10" height="3.5" rx="1.2"/>',
  chart: '<rect x="3" y="12" width="4.5" height="9" rx="1.5"/><rect x="9.75" y="4" width="4.5" height="17" rx="1.5"/><rect x="16.5" y="8" width="4.5" height="13" rx="1.5"/>',
  heart: '<path d="M12 21 C 3.5 15 2 10 4.5 6.6 C 7 3.4 10.6 4.6 12 7 C 13.4 4.6 17 3.4 19.5 6.6 C 22 10 20.5 15 12 21Z"/>',
  user: '<circle cx="12" cy="7.5" r="4.5"/><path d="M3.5 21 C 3.5 15.5 7.5 13.5 12 13.5 C 16.5 13.5 20.5 15.5 20.5 21Z"/>',
  bell: '<path d="M12 2.5 C 8 2.5 5.5 5.5 5.5 9.5 V14.5 L3.5 17 V18 H20.5 V17 L18.5 14.5 V9.5 C 18.5 5.5 16 2.5 12 2.5Z"/><path d="M9.5 19.5 a2.5 2.5 0 0 0 5 0Z"/>',
  gear: '<path fill-rule="evenodd" d="M10.3 2 h3.4 l.5 2.6 a7.6 7.6 0 0 1 1.9 1.1 l2.5-.9 1.7 2.9-2 1.7 a7.7 7.7 0 0 1 0 2.2 l2 1.7-1.7 2.9-2.5-.9 a7.6 7.6 0 0 1-1.9 1.1 l-.5 2.6 h-3.4 l-.5-2.6 a7.6 7.6 0 0 1-1.9-1.1 l-2.5.9-1.7-2.9 2-1.7 a7.7 7.7 0 0 1 0-2.2 l-2-1.7 1.7-2.9 2.5.9 a7.6 7.6 0 0 1 1.9-1.1Z M12 8.6 a3.4 3.4 0 1 0 0 6.8 a3.4 3.4 0 1 0 0-6.8Z" transform="translate(0 0.9)"/>',
};
export function solid(name, size = 24) {
  return `<svg class="ic solid" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${SOLID[name] || ''}</svg>`;
}
