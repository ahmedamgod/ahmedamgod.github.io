// رسومات SVG بطابع ألوان مائية (الفلتر #wc والـ gradients متعرفين في index.html)

const flower = (x, y, c = '#F5CDD2', s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" filter="url(#wcs)">
    ${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="0" cy="-5" rx="3.6" ry="5.4" fill="${c}" transform="rotate(${r})"/>`).join('')}
    <circle r="2.6" fill="#F2C94C"/>
  </g>`;
const leaf = (x, y, r = 0, c = '#A9BF7E', s = 1) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s})" d="M0 0 C 4 -6 10 -7 14 -6 C 12 -1 7 3 0 0 Z" fill="${c}" opacity=".9"/>`;
const butterfly = (x, y, c = '#F5CDD2', s = 1) => `
  <g class="bfly" transform="translate(${x} ${y}) scale(${s})">
    <g class="wing"><path d="M0 0 C -7 -9 -14 -6 -11 1 C -13 7 -5 8 0 2 Z" fill="${c}" opacity=".9"/>
    <path d="M0 0 C 7 -9 14 -6 11 1 C 13 7 5 8 0 2 Z" fill="${c}" opacity=".75"/></g>
    <path d="M0 -3 L0 5" stroke="#7a6a58" stroke-width="1.2" stroke-linecap="round"/>
  </g>`;

export function logo(size = 56) {
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <defs><clipPath id="lc"><circle cx="32" cy="32" r="30"/></clipPath></defs>
    <circle cx="32" cy="32" r="30" fill="url(#sky)"/>
    <g clip-path="url(#lc)">
      <circle cx="32" cy="36" r="11" fill="#F7D57A" opacity=".9" filter="url(#wcs)"/>
      <path d="M-4 44 C 10 32 22 36 32 40 C 44 30 56 30 70 40 L70 70 L-4 70 Z" fill="#B9CD92" filter="url(#wcs)"/>
      <path d="M-4 50 C 14 42 30 50 44 46 C 54 44 62 46 70 50 L70 70 L-4 70 Z" fill="#91AA62"/>
      <path d="M28 64 C 30 56 40 54 36 49 C 33 46 30 46 33 42" stroke="#FFF4DA" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      ${flower(14, 52, '#F5CDD2', .7)}${flower(50, 54, '#FFFFFF', .6)}${flower(56, 47, '#F5CDD2', .5)}
    </g>
    <circle cx="32" cy="32" r="30" fill="none" stroke="#91AA62" stroke-width="1.5" opacity=".5"/>
  </svg>`;
}

export function heroScene() {
  return `<svg class="hero-scene" viewBox="0 0 360 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <circle cx="250" cy="78" r="30" fill="#F7D57A" opacity=".75" filter="url(#wc)"/>
    <path d="M0 98 C 50 60 90 70 130 86 C 170 54 220 50 260 80 C 300 60 330 66 360 80 L360 150 L0 150Z" fill="#DCE7C6" filter="url(#wc)"/>
    <path d="M0 112 C 60 92 110 104 170 100 C 230 96 300 104 360 96 L360 150 L0 150Z" fill="#B9CD92" filter="url(#wc)"/>
    <path d="M0 128 C 70 116 130 124 190 120 C 260 116 310 124 360 118 L360 150 L0 150Z" fill="#91AA62" opacity=".85"/>
    <path d="M150 150 C 160 132 210 128 196 116 C 186 108 214 104 236 98" stroke="#FFF4DA" stroke-width="7" fill="none" stroke-linecap="round" opacity=".95"/>
    <g filter="url(#wcs)">
      <rect x="52" y="86" width="3" height="18" fill="#8a6f52"/><circle cx="53" cy="80" r="12" fill="#A9BF7E"/><circle cx="46" cy="86" r="8" fill="#91AA62"/>
      <rect x="300" y="78" width="3" height="20" fill="#8a6f52"/><circle cx="301" cy="72" r="13" fill="#A9BF7E"/><circle cx="309" cy="78" r="8" fill="#91AA62"/>
    </g>
    ${flower(30, 128, '#F5CDD2')}${flower(80, 134, '#FFFFFF', .8)}${flower(120, 130, '#F7E6A8', .9)}
    ${flower(260, 132, '#F5CDD2', .9)}${flower(320, 128, '#FFFFFF', .8)}${flower(342, 138, '#F7E6A8', .7)}
    ${leaf(36, 136, -30)}${leaf(268, 140, -40)}${leaf(326, 136, 200)}
    ${butterfly(110, 60, '#F5CDD2', 1)}${butterfly(200, 40, '#DCEBF5', .8)}
  </svg>`;
}

const ICONS = {
  worship: `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="44" r="28" fill="#fff" opacity=".45" filter="url(#wc)"/>
    <path d="M22 60 V40 C 22 28 40 22 40 14 C 40 22 58 28 58 40 V60 Z" fill="#A9BF7E" filter="url(#wcs)"/>
    <rect x="18" y="58" width="44" height="6" rx="3" fill="#536B3C" opacity=".8"/>
    <path d="M34 60 V48 a6 6 0 0 1 12 0 V60" fill="#FFF4DA"/>
    <path d="M40 14 V8" stroke="#C9A43C" stroke-width="2"/><path d="M43 4 a4 4 0 1 0 0 7 a5 5 0 0 1 0 -7" fill="#E5C35C"/>
    ${flower(16, 62, '#F5CDD2', .8)}${flower(64, 62, '#FFFFFF', .7)}${leaf(60, 66, 200, '#91AA62', .9)}
  </svg>`,
  habits: `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="42" r="28" fill="#fff" opacity=".45" filter="url(#wc)"/>
    <path d="M40 50 C 40 38 40 30 40 22" stroke="#6E8A4A" stroke-width="2.5" fill="none"/>
    <path d="M40 34 C 30 34 24 26 24 20 C 32 20 40 26 40 34Z" fill="#A9BF7E" filter="url(#wcs)"/>
    <path d="M40 28 C 50 28 56 20 56 14 C 48 14 40 20 40 28Z" fill="#91AA62" filter="url(#wcs)"/>
    <path d="M26 50 H54 L50 68 H30 Z" fill="#E9B8A0" filter="url(#wcs)"/><rect x="24" y="47" width="32" height="6" rx="3" fill="#D99F86"/>
    <circle cx="60" cy="56" r="9" fill="#91AA62"/><path d="M56 56 l3 3 l5 -6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </svg>`,
  journal: `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="42" r="28" fill="#fff" opacity=".45" filter="url(#wc)"/>
    <path d="M14 26 C 24 22 34 24 40 28 V64 C 34 60 24 58 14 62 Z" fill="#FFF4DA" stroke="#D8C7A4" filter="url(#wcs)"/>
    <path d="M66 26 C 56 22 46 24 40 28 V64 C 46 60 56 58 66 62 Z" fill="#FFFAF0" stroke="#D8C7A4" filter="url(#wcs)"/>
    <path d="M20 36 h14 M20 42 h14 M20 48 h10 M46 36 h14 M46 42 h12" stroke="#C9B48E" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M58 12 L66 20 L46 46 L40 48 L42 42 Z" fill="#F7D57A" stroke="#C9A43C" stroke-width="1"/>
    ${flower(56, 54, '#F5CDD2', .7)}
  </svg>`,
  emotions: `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="42" r="28" fill="#fff" opacity=".45" filter="url(#wc)"/>
    <path d="M40 66 C 14 50 14 26 28 24 C 34 23 38 27 40 31 C 42 27 46 23 52 24 C 66 26 66 50 40 66Z" fill="#F3A9B4" filter="url(#wcs)"/>
    <circle cx="33" cy="40" r="2.2" fill="#6b4a4a"/><circle cx="47" cy="40" r="2.2" fill="#6b4a4a"/>
    <path d="M34 47 C 37 51 43 51 46 47" stroke="#6b4a4a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="29" cy="46" r="3" fill="#F7C6CF"/><circle cx="51" cy="46" r="3" fill="#F7C6CF"/>
    ${butterfly(62, 20, '#DCEBF5', .9)}${butterfly(16, 22, '#F7E6A8', .7)}
  </svg>`,
  health: `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="42" r="28" fill="#fff" opacity=".45" filter="url(#wc)"/>
    <path d="M30 18 C 30 18 16 36 16 46 a14 14 0 0 0 28 0 C 44 36 30 18 30 18Z" fill="#9CC7E4" filter="url(#wcs)"/>
    <path d="M23 46 a7 7 0 0 0 7 7" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <g transform="translate(52 52) rotate(-35)">
      <rect x="-14" y="-2.5" width="28" height="5" rx="2" fill="#8a9a7a"/>
      <rect x="-19" y="-8" width="6" height="16" rx="2.5" fill="#91AA62"/><rect x="13" y="-8" width="6" height="16" rx="2.5" fill="#91AA62"/>
    </g>
    ${leaf(56, 24, -20, '#A9BF7E')}${leaf(58, 26, 60, '#91AA62', .8)}
  </svg>`,
  journey: `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="42" r="28" fill="#fff" opacity=".45" filter="url(#wc)"/>
    <path d="M8 64 L32 26 L44 42 L52 32 L74 64 Z" fill="#B9CD92" filter="url(#wcs)"/>
    <path d="M32 26 L38 35 L34 34 L30 38 L26 35 Z" fill="#fff" opacity=".9"/>
    <path d="M26 66 C 30 58 46 58 40 52 C 36 48 42 44 46 40" stroke="#FFF4DA" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M52 32 V16" stroke="#7a5f45" stroke-width="2"/><path d="M52 16 L64 20 L52 25 Z" fill="#F3A9B4"/>
    <circle cx="20" cy="22" r="6" fill="#F7D57A" opacity=".85" filter="url(#wcs)"/>
  </svg>`,
  plant: `<svg viewBox="0 0 120 100" aria-hidden="true">
    <ellipse cx="60" cy="88" rx="40" ry="6" fill="#91AA62" opacity=".18"/>
    <path d="M60 80 C 60 64 60 50 60 36" stroke="#6E8A4A" stroke-width="3" fill="none"/>
    <path d="M60 58 C 44 58 36 46 36 38 C 48 38 60 46 60 58Z" fill="#A9BF7E" filter="url(#wcs)"/>
    <path d="M60 48 C 76 48 84 36 84 28 C 72 28 60 36 60 48Z" fill="#91AA62" filter="url(#wcs)"/>
    <path d="M44 80 H76 L72 96 H48Z" fill="#E9B8A0"/>
    ${flower(60, 32, '#F5CDD2', 1.1)}${butterfly(92, 30, '#DCEBF5', 1)}
  </svg>`,
  trophy: `<svg viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="40" r="30" fill="#F7E6A8" opacity=".6" filter="url(#wc)"/>
    <path d="M26 20 H54 V30 a14 14 0 0 1 -28 0Z" fill="#F2C94C" filter="url(#wcs)"/>
    <path d="M26 24 H18 a8 8 0 0 0 10 10 M54 24 H62 a8 8 0 0 1 -10 10" stroke="#E0B23C" stroke-width="3" fill="none"/>
    <rect x="36" y="44" width="8" height="10" fill="#E0B23C"/><rect x="28" y="54" width="24" height="7" rx="3" fill="#91AA62"/>
    ${flower(18, 58, '#F5CDD2', .7)}${flower(62, 58, '#FFFFFF', .7)}
  </svg>`,
};
export const art = (name) => ICONS[name] || '';

// أيقونات خطية بسيطة للتنقل والأزرار
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
