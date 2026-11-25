/*
 * قارئ الرقم القومي المصري من صورة البطاقة (بدون مكتبات خارجية).
 * بيدوّر على سطر فيه أرقام عربي (٠-٩)، يقطّع كل رقم ويقارنه بأشكال مرجعية
 * مرسومة بأكتر من خط، وبعدين يتأكد إن الرقم الناتج رقم قومي صحيح.
 */
(function () {
  "use strict";
  const DIG = "٠١٢٣٤٥٦٧٨٩";
  const N = 20;
  let DEBUG = null; // template grid
  let templates = null;

  const FONTS = ['"Cairo"', "Tahoma", "Arial", '"Segoe UI"', '"Noto Sans Arabic"', '"Noto Naskh Arabic"', '"Droid Arabic Naskh"', '"DejaVu Sans"', '"Geeza Pro"', "sans-serif", "serif"];
  const WEIGHTS = ["400", "700", "900"];

  function buildTemplates(extraFonts, onlyFonts) {
    const list = [];
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const fonts = onlyFonts || (extraFonts || []).concat(FONTS);
    const seen = new Set();
    for (const f of fonts) {
      for (const w of WEIGHTS) {
        for (let d = 1; d <= 9; d++) {
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 96, 96);
          ctx.fillStyle = "#000"; ctx.font = w + " 64px " + f; ctx.textBaseline = "middle"; ctx.textAlign = "center";
          ctx.fillText(DIG[d], 48, 50);
          const img = ctx.getImageData(0, 0, 96, 96).data;
          const bin = new Uint8Array(96 * 96);
          for (let i = 0; i < bin.length; i++) bin[i] = img[i * 4] < 128 ? 1 : 0;
          const comps = components(bin, 96, 96, 4);
          if (!comps.length) continue;
          // merge all into one box
          let x0 = 96, y0 = 96, x1 = 0, y1 = 0;
          comps.forEach((k) => { x0 = Math.min(x0, k.x0); y0 = Math.min(y0, k.y0); x1 = Math.max(x1, k.x1); y1 = Math.max(y1, k.y1); });
          const v = normalize(bin, 96, { x0, y0, x1, y1 });
          const key = d + ":" + v.join("").slice(0, 200);
          if (seen.has(key)) continue;
          seen.add(key);
          list.push({ d, v, ar: (y1 - y0 + 1) / (x1 - x0 + 1) });
        }
      }
    }
    return list;
  }

  /** binary mask crop -> N*N float vector (aspect preserved, centered) */
  function normalize(bin, w, b) {
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const s = Math.max(bw, bh);
    const ox = (s - bw) / 2, oy = (s - bh) / 2;
    const v = new Float32Array(N * N);
    const cnt = new Float32Array(N * N);
    for (let y = b.y0; y <= b.y1; y++) {
      for (let x = b.x0; x <= b.x1; x++) {
        const gx = Math.min(N - 1, Math.floor(((x - b.x0 + ox) / s) * N));
        const gy = Math.min(N - 1, Math.floor(((y - b.y0 + oy) / s) * N));
        v[gy * N + gx] += bin[y * w + x];
        cnt[gy * N + gx] += 1;
      }
    }
    let mean = 0;
    for (let i = 0; i < v.length; i++) { v[i] = cnt[i] ? v[i] / cnt[i] : 0; mean += v[i]; }
    mean /= v.length;
    let norm = 0;
    for (let i = 0; i < v.length; i++) { v[i] -= mean; norm += v[i] * v[i]; }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= norm;
    return v;
  }

  /** connected components (8-neighbour) on binary mask */
  function components(bin, w, h, minArea) {
    const lab = new Int32Array(w * h);
    const out = [];
    const stack = new Int32Array(w * h);
    let id = 0;
    for (let i = 0; i < w * h; i++) {
      if (!bin[i] || lab[i]) continue;
      id++;
      let sp = 0; stack[sp++] = i; lab[i] = id;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
      while (sp) {
        const p = stack[--sp];
        const x = p % w, y = (p - x) / w;
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= w) continue;
            const q = yy * w + xx;
            if (bin[q] && !lab[q]) { lab[q] = id; stack[sp++] = q; }
          }
        }
      }
      if (area >= minArea) out.push({ x0, y0, x1, y1, area, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    }
    return out;
  }

  /** adaptive threshold (dark text on light/patterned background) */
  function binarize(gray, w, h, r, k) {
    const ii = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) { row += gray[y * w + x]; ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + row; }
    }
    const bin = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1);
        const sum = ii[yb * (w + 1) + xb] - ii[ya * (w + 1) + xb] - ii[yb * (w + 1) + xa] + ii[ya * (w + 1) + xa];
        const mean = sum / ((yb - ya) * (xb - xa));
        bin[y * w + x] = gray[y * w + x] < mean * (1 - k) ? 1 : 0;
      }
    }
    return bin;
  }

  /** structural features of one glyph (font-independent) */
  let STRICT = null;
  function features(bin, w, c) {
    const W = c.w + 2, H = c.h + 2;
    const m = new Uint8Array(W * H);
    const hb = STRICT || bin;
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) m[(y + 1) * W + x + 1] = hb[(c.y0 + y) * w + c.x0 + x];
    // holes: background regions not touching the border
    const seen = new Uint8Array(W * H); const st = [];
    const holes = [];
    for (let i = 0; i < W * H; i++) {
      if (m[i] || seen[i]) continue;
      let area = 0, sy = 0, border = false; st.push(i); seen[i] = 1;
      while (st.length) {
        const p = st.pop(); const x = p % W, y = (p - x) / W; area++; sy += y;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true;
        if (x > 0 && !m[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; st.push(p - 1); }
        if (x < W - 1 && !m[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; st.push(p + 1); }
        if (y > 0 && !m[p - W] && !seen[p - W]) { seen[p - W] = 1; st.push(p - W); }
        if (y < H - 1 && !m[p + W] && !seen[p + W]) { seen[p + W] = 1; st.push(p + W); }
      }
      if (!border && area >= Math.max(3, c.w * c.h * 0.02)) holes.push({ area, cy: (sy / area - 1) / c.h });
    }
    const runsAt = (fy) => { const y = Math.min(c.h - 1, Math.max(0, Math.round(fy * (c.h - 1)))); let r = 0, prev = 0; for (let x = 0; x < c.w; x++) { const v = bin[(c.y0 + y) * w + c.x0 + x]; if (v && !prev) r++; prev = v; } return r; };
    const widthAt = (fy) => { const y = Math.min(c.h - 1, Math.max(0, Math.round(fy * (c.h - 1)))); let a = -1, b = -1; for (let x = 0; x < c.w; x++) if (bin[(c.y0 + y) * w + c.x0 + x]) { if (a < 0) a = x; b = x; } return a < 0 ? 0 : (b - a + 1) / c.w; };
    const maxRuns = (a, b) => { let r = 0; for (let f = a; f <= b; f += 0.03) r = Math.max(r, runsAt(f)); return r; };
    // teeth on top (٢ / ٣) can blur together; also count them on the stricter mask
    const runsStrict = (fy) => { if (!STRICT) return 0; const y = Math.min(c.h - 1, Math.max(0, Math.round(fy * (c.h - 1)))); let r = 0, prev = 0; for (let x = 0; x < c.w; x++) { const v = STRICT[(c.y0 + y) * w + c.x0 + x]; if (v && !prev) r++; prev = v; } return r; };
    let topStrict = 0; for (let f = 0.04; f <= 0.3; f += 0.03) topStrict = Math.max(topStrict, runsStrict(f));
    // vertical stem: a narrow column band covering most rows
    const band = Math.max(1, Math.round(c.w * 0.18));
    let stem = 0, stemX = 0;
    for (let x = 0; x + band <= c.w; x++) {
      let rows = 0;
      for (let y = 0; y < c.h; y++) { let any = 0; for (let k = 0; k < band; k++) if (bin[(c.y0 + y) * w + c.x0 + x + k]) { any = 1; break; } rows += any; }
      const cov = rows / c.h; if (cov > stem) { stem = cov; stemX = (x + band / 2) / c.w; }
    }
    let td = 0;
    const th = Math.max(1, Math.round(c.h * 0.4));
    for (let y = 0; y < th; y++) for (let x = 0; x < c.w; x++) td += bin[(c.y0 + y) * w + c.x0 + x];
    td /= th * c.w;
    // depth of the empty notch rising from the bottom in the middle columns (big for ٨)
    let notch = 0, nc = 0;
    for (let x = Math.floor(c.w * 0.4); x <= Math.ceil(c.w * 0.6) && x < c.w; x++) {
      let d = 0; for (let y = c.h - 1; y >= 0 && !bin[(c.y0 + y) * w + c.x0 + x]; y--) d++;
      notch += d / c.h; nc++;
    }
    notch = nc ? notch / nc : 0;
    let tx = 0, tn = 0;
    for (let y = 0; y < Math.max(1, Math.round(c.h * 0.2)); y++) for (let x = 0; x < c.w; x++) if (bin[(c.y0 + y) * w + c.x0 + x]) { tx += x; tn++; }
    let bx = 0, bn = 0;
    for (let y = Math.floor(c.h * 0.85); y < c.h; y++) for (let x = 0; x < c.w; x++) if (bin[(c.y0 + y) * w + c.x0 + x]) { bx += x; bn++; }
    return { holes, ar: c.h / c.w, top: Math.max(maxRuns(0.04, 0.3), Math.min(3, topStrict)), mid: maxRuns(0.35, 0.65), mid2: maxRuns(0.45, 0.68), bot: maxRuns(0.75, 0.96), wTop: widthAt(0.12), wBot: widthAt(0.88), stem, stemX, botX: bn ? bx / bn / c.w : 0.5, topX: tn ? tx / tn / c.w : 0.5, td, notch };
  }

  /** rule based digit recognition; returns digit or -1 when unsure */
  function rules(f) {
    if (f.holes.length) return f.holes[0].cy < 0.4 ? 9 : 5;
    if (f.ar > 2.1) return 1;
    if (f.wBot > f.wTop * 1.3) return (f.notch > 0.15 || f.mid2 >= 2) ? 8 : 4;   // Λ-like: ٨ (open between legs) or ٤
    if (f.wTop > f.wBot * 1.3) {                               // V-like / hooked
      if (f.top >= 3) return 3;
      if (f.mid2 >= 2) return 7;
      if (f.top === 2 && f.botX < 0.72) return 2;              // ٢: stem + one tooth on top
      if (f.top === 1 && f.botX > 0.55) return 6;              // ٦: one bar on top, stem on the right
      return f.botX < 0.5 ? 2 : 6;
    }
    return -1;
  }

  function classify(bin, w, c) {
    const r = rules(features(bin, w, c));
    if (r >= 0) return { d: r, score: 1, margin: 1 };
    return templateClassify(bin, w, c);
  }

  function templateClassify(bin, w, c) {
    const v = normalize(bin, w, c);
    const ar = c.h / c.w;
    let best = -2, bestD = -1, second = -2;
    for (const t of templates) {
      let s = 0;
      for (let i = 0; i < v.length; i++) s += v[i] * t.v[i];
      // aspect-ratio penalty
      s -= Math.min(0.4, Math.abs(Math.log(ar / t.ar)) * 0.25);
      if (s > best) { if (t.d !== bestD) second = best; best = s; bestD = t.d; }
      else if (s > second && t.d !== bestD) second = s;
    }
    return { d: bestD, score: best, margin: best - second };
  }

  function validNid(n, check) { return /^[23]\d{13}$/.test(n) && (!check || check(n)); }

  /**
   * read national ID from a canvas region.
   * opts.check(nid) -> bool : extra validation (date / governorate)
   */
  function read(canvas, opts) {
    opts = opts || {};
    if (!templates) templates = buildTemplates(opts.fonts, opts.onlyFonts);
    const W = canvas.width, H = canvas.height;
    // work at a sane resolution
    const scale = Math.min(2.5, 1700 / W);
    const w = Math.round(W * scale), h = Math.round(H * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < gray.length; i++) gray[i] = 0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2];

    const found = [];
    for (const k of [0.12, 0.2, 0.07]) {
      const r = Math.max(8, Math.round(h / 10));
      const bin = binarize(gray, w, h, r, k);
      STRICT = binarize(gray, w, h, r, Math.max(0.3, k + 0.2));
      const comps = components(bin, w, h, 6).filter((q) => q.h < h * 0.4 && q.w < w * 0.2);
      const nid = fromComponents(bin, w, comps, opts.check);
      if (nid) found.push(nid);
      if (found.length) break;
    }
    return found[0] || null;
  }

  function fromComponents(bin, w, comps, check) {
    if (comps.length < 10) return null;
    // group into text lines by vertical centre
    const sorted = comps.slice().sort((a, b) => a.cy - b.cy);
    const lines = [];
    for (const q of sorted) {
      let line = lines.find((L) => Math.abs(L.cy - q.cy) < Math.max(L.mh, q.h) * 0.55);
      if (!line) { line = { items: [], cy: q.cy, mh: q.h }; lines.push(line); }
      line.items.push(q);
      line.cy = line.items.reduce((s, x) => s + x.cy, 0) / line.items.length;
      line.mh = median(line.items.map((x) => x.h));
    }
    const cands = [];
    for (const L of lines) {
      if (L.items.length < 10) continue;
      const mh = median(L.items.filter((x) => x.h > L.mh * 0.5).map((x) => x.h)) || L.mh;
      let items = L.items.filter((x) => x.h <= mh * 1.6 && x.area >= Math.max(4, (mh * 0.12) ** 2));
      items.sort((a, b) => a.x0 - b.x0);
      // merge pieces that overlap horizontally
      const merged = [];
      for (const q of items) {
        const p = merged[merged.length - 1];
        if (p && Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0) > Math.min(p.w, q.w) * 0.5) {
          p.x0 = Math.min(p.x0, q.x0); p.x1 = Math.max(p.x1, q.x1); p.y0 = Math.min(p.y0, q.y0); p.y1 = Math.max(p.y1, q.y1);
          p.w = p.x1 - p.x0 + 1; p.h = p.y1 - p.y0 + 1; p.area += q.area;
        } else merged.push(Object.assign({}, q));
      }
      // split into runs by large gaps
      const runs = [[]];
      for (let i = 0; i < merged.length; i++) {
        const q = merged[i], p = merged[i - 1];
        if (p && q.x0 - p.x1 > mh * 1.6) runs.push([]);
        runs[runs.length - 1].push(q);
      }
      for (const run of runs) {
        if (run.length < 12 || run.length > 22) continue;
        const ds = run.map((q) => {
          if (q.h < mh * 0.5 && q.w < mh * 0.6) return { d: 0, score: 1 }; // ٠ is a small dot/diamond
          return classify(bin, w, q);
        });
        const s = ds.map((x) => x.d).join("");
        if (DEBUG) DEBUG.push({ s, feats: run.map((q) => { const f = features(bin, w, q); return { w: q.w, h: q.h, top: f.top, mid2: f.mid2, wT: +f.wTop.toFixed(2), wB: +f.wBot.toFixed(2), topX: +f.topX.toFixed(2), botX: +f.botX.toFixed(2), holes: f.holes.length, ar: +f.ar.toFixed(2), notch: +f.notch.toFixed(2) }; }) });
        for (let i = 0; i + 14 <= s.length; i++) {
          const sub = s.slice(i, i + 14);
          if (validNid(sub, check)) {
            const conf = ds.slice(i, i + 14).reduce((a, x) => a + x.score, 0) / 14;
            cands.push({ nid: sub, conf });
          }
        }
      }
    }
    cands.sort((a, b) => b.conf - a.conf);
    return cands.length ? cands[0].nid : null;
  }

  function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

  window.IDOCR = { _debug: (on) => { DEBUG = on ? [] : null; return () => DEBUG; }, _features: features, _reset: () => { templates = null; }, read, warmup: (fonts) => { if (!templates) templates = buildTemplates(fonts); } };
})();
