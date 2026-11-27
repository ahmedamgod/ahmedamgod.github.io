// أداة قص الصور: المستخدم يحرّك ويكبّر ويختار الجزء اللي يبان
import { sheet, toast } from './ui.js';
import { icon } from './art.js';

// بترجّع dataURL للصورة المقصوصة، أو null لو اتلغى
export function cropImage(file, { shape = 'circle', aspect = 1, out = 480, quality = 0.85 } = {}) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) { toast('اختار صورة', 'err'); return resolve(null); }
    if (file.size > 25e6) { toast('الصورة كبيرة أوي', 'err'); return resolve(null); }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => open(img, url, { shape, aspect, out, quality }, resolve);
    img.onerror = () => { URL.revokeObjectURL(url); toast('مقدرناش نفتح الصورة دي', 'err'); resolve(null); };
    img.src = url;
  });
}

function open(img, url, { shape, aspect, out, quality }, resolve) {
  let done = false;
  sheet({
    title: 'اختار الجزء اللي يبان',
    body: `
      <div class="cropper ${shape}" style="--ar:${aspect}">
        <div class="crop-view"><img id="cimg" src="${url}" alt="" draggable="false"></div>
        ${shape === 'circle' ? '<div class="crop-mask"></div>' : '<div class="crop-frame"></div>'}
      </div>
      <div class="crop-zoom">${icon('search', 16)}<input type="range" id="zoom" min="1" max="4" step="0.01" value="1" aria-label="تكبير"></div>
      <p class="muted small center">حرّك الصورة بإصبعك، وكبّرها بالشريط</p>
      <div class="row gap mt"><button class="btn primary grow" id="ok">حفظ</button><button class="btn ghost grow" data-close>إلغاء</button></div>`,
    onMount(b, close) {
      const view = b.querySelector('.crop-view');
      const im = b.querySelector('#cimg');
      const zoomEl = b.querySelector('#zoom');
      const iw = img.naturalWidth, ih = img.naturalHeight;
      let VW = 0, VH = 0, kFit = 1, kMax = 1, k = 1, tx = 0, ty = 0;

      const apply = () => { im.style.width = iw * k + 'px'; im.style.height = ih * k + 'px'; im.style.transform = `translate(${tx}px,${ty}px)`; };
      const clamp = () => {
        const dw = iw * k, dh = ih * k;
        tx = dw <= VW ? (VW - dw) / 2 : Math.min(0, Math.max(VW - dw, tx));
        ty = dh <= VH ? (VH - dh) / 2 : Math.min(0, Math.max(VH - dh, ty));
      };
      const setScale = (nk) => {
        const cx = (VW / 2 - tx) / k, cy = (VH / 2 - ty) / k;
        k = Math.min(kMax, Math.max(kFit, nk));
        tx = VW / 2 - cx * k; ty = VH / 2 - cy * k;
        clamp(); apply();
        zoomEl.value = k;
      };
      const init = () => {
        const r = view.getBoundingClientRect();
        VW = r.width; VH = r.height;
        if (!VW || !VH) return requestAnimationFrame(init);
        kFit = Math.min(VW / iw, VH / ih);   // الصورة كلها بتبان
        const kCover = Math.max(VW / iw, VH / ih); // الصورة بتملا الإطار
        kMax = kCover * 2.5;
        k = kCover; // نبدأ بإنها مالياه الإطار، وتقدر تصغّر أو تكبّر
        zoomEl.min = kFit; zoomEl.max = kMax; zoomEl.step = (kMax - kFit) / 200; zoomEl.value = k;
        tx = (VW - iw * k) / 2; ty = (VH - ih * k) / 2;
        clamp(); apply();
      };
      requestAnimationFrame(init);

      // حركة بالإصبع + تكبير بإصبعين
      const pts = new Map();
      let lastDist = 0;
      view.addEventListener('pointerdown', (e) => { view.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); lastDist = 0; });
      const end = (e) => { pts.delete(e.pointerId); lastDist = 0; };
      view.addEventListener('pointerup', end);
      view.addEventListener('pointercancel', end);
      view.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        const prev = pts.get(e.pointerId);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 1) { tx += e.clientX - prev.x; ty += e.clientY - prev.y; clamp(); apply(); }
        else if (pts.size >= 2) {
          const a = [...pts.values()];
          const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
          if (lastDist) setScale(k * (d / lastDist));
          lastDist = d;
        }
      });
      zoomEl.addEventListener('input', () => setScale(parseFloat(zoomEl.value)));

      b.querySelector('#ok').onclick = () => {
        const outW = aspect >= 1 ? out : Math.round(out * aspect);
        const outH = aspect >= 1 ? Math.round(out / aspect) : out;
        const c = document.createElement('canvas');
        c.width = outW; c.height = outH;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, outW, outH);
        // نرسم الصورة بنفس مكانها وحجمها اللي على الشاشة، لكن بمقاس الإخراج
        const fx = outW / VW, fy = outH / VH;
        ctx.drawImage(img, tx * fx, ty * fy, iw * k * fx, ih * k * fy);
        done = true;
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
        close();
      };

      const obs = new MutationObserver(() => { if (!b.isConnected) { obs.disconnect(); if (!done) { URL.revokeObjectURL(url); resolve(null); } } });
      obs.observe(document.body, { childList: true });
    },
  });
}
