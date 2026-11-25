(function () {
  "use strict";

  const S = HSE.store;
  const U = HSE.util;
  const CFG = window.HSE_CONFIG || {};

  const LIBS = {
    jsqr: "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js",
    face: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js",
    faceModels: "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model/",
    xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    ocr: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
    ocrWorker: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    ocrCore: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",
    ocrLang: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/ara@1.0.0/4.0.0_best_int"
  };

  const TOPICS = [
    "العمل على ارتفاعات", "مهمات الوقاية الشخصية PPE", "السلامة الكهربائية", "الإجهاد الحراري وشرب المياه",
    "المعدات الثقيلة وحركة المعدات", "عمليات الرفع والأوناش", "الحفر والخنادق", "مكافحة الحريق",
    "الإسعافات الأولية", "النظافة والترتيب Housekeeping", "الرفع اليدوي للأحمال", "تصاريح العمل Permit to Work",
    "العزل والإغلاق LOTO", "الطوارئ والإخلاء", "الإبلاغ عن الحوادث والـ Near Miss", "التعامل مع الألواح الشمسية والبطاريات"
  ];

  const GOVS = {
    "01": "القاهرة", "02": "الإسكندرية", "03": "بورسعيد", "04": "السويس", "11": "دمياط", "12": "الدقهلية",
    "13": "الشرقية", "14": "القليوبية", "15": "كفر الشيخ", "16": "الغربية", "17": "المنوفية", "18": "البحيرة",
    "19": "الإسماعيلية", "21": "الجيزة", "22": "بني سويف", "23": "الفيوم", "24": "المنيا", "25": "أسيوط",
    "26": "سوهاج", "27": "قنا", "28": "أسوان", "29": "الأقصر", "31": "البحر الأحمر", "32": "الوادي الجديد",
    "33": "مطروح", "34": "شمال سيناء", "35": "جنوب سيناء", "88": "خارج الجمهورية"
  };

  const TYPE_LABEL = { induction: "اندكشن", daily: "محاضرة يومية" };

  /* ================= DOM helpers ================= */
  const $ = (s, r = document) => r.querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "html") el.innerHTML = v; // only for trusted static markup
        else if (k in el && typeof v !== "string") el[k] = v;
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const svgIcon = (d) => h("span", { class: "ico", "aria-hidden": "true", html: '<svg viewBox="0 0 24 24">' + d + "</svg>" });
  const ICONS = {
    home: '<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    talk: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2zM15.5 14.5a5 5 0 0 1 6 5.5h-4"/>',
    add: '<circle cx="10" cy="8" r="4"/><path d="M2.5 21v-1.5a7.5 7.5 0 0 1 12-6M19 14v7M15.5 17.5h7"/>',
    admin: '<path d="M3 20.5h18"/><rect x="4.5" y="12" width="3.5" height="7.5" rx=".5"/><rect x="10.25" y="8" width="3.5" height="11.5" rx=".5"/><rect x="16" y="4" width="3.5" height="15.5" rx=".5"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
    id: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5 16a3.5 3.5 0 0 1 7 0M14.5 10h4.5M14.5 14h3.5"/>',
    camera: '<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="4"/>',
    face: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8.5 15a5 5 0 0 0 7 0"/>',
    name: '<path d="M4 20h16M6 16l5-12h2l5 12M8 12h8"/>',
    print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  const icon = (n) => svgIcon(ICONS[n] || "");

  const pad = (n) => String(n).padStart(2, "0");
  const today = () => U.todayStr();
  function fmtDate(s) { if (!s) return "—"; const [y, m, d] = s.split("-"); return d + "/" + m + "/" + y; }
  function fmtTime(ts) { if (!ts) return ""; const d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function addDays(s, n) { const [y, m, d] = s.split("-").map(Number); const dt = new Date(y, m - 1, d + n); return U.todayStr(dt); }
  const toWesternDigits = (s) => String(s || "").replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/[۰-۹]/g, (c) => "۰۱۲۳۴۵۶۷۸۹".indexOf(c));

  function parseNid(n) {
    n = toWesternDigits(n).replace(/\D/g, "");
    if (!/^[23]\d{13}$/.test(n)) return null;
    const y = (n[0] === "2" ? 1900 : 2000) + Number(n.slice(1, 3));
    const m = Number(n.slice(3, 5)), d = Number(n.slice(5, 7));
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1 || dt.getDate() !== d || dt > new Date()) return null;
    const gov = GOVS[n.slice(7, 9)];
    if (!gov) return null;
    const now = new Date();
    let age = now.getFullYear() - y; if (now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d)) age--;
    return { birth: y + "-" + pad(m) + "-" + pad(d), age, gov, gender: Number(n[12]) % 2 ? "ذكر" : "أنثى" };
  }
  function normalizeId(raw, foreign) {
    if (foreign) { const p = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return p ? "P-" + p : ""; }
    return toWesternDigits(raw).replace(/\D/g, "");
  }
  const isForeignId = (id) => String(id).startsWith("P-");
  const displayId = (id) => (isForeignId(id) ? "جواز: " + id.slice(2) : id);

  /* ================= UI helpers ================= */
  let toastTimer;
  function toast(msg, kind = "") {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show " + kind;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 2600);
  }
  function beep(ok = true) {
    try {
      if (navigator.vibrate) navigator.vibrate(ok ? 80 : [60, 60, 60]);
      const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = ok ? 880 : 300; g.gain.value = 0.08;
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  let modalOnClose = null;
  function openModal(title, body, onClose) {
    closeModal();
    $("#modalTitle").textContent = title;
    const mb = $("#modalBody"); mb.innerHTML = ""; mb.appendChild(body);
    $("#modal").hidden = false;
    modalOnClose = onClose || null;
    document.body.classList.add("noscroll");
  }
  function closeModal() {
    if ($("#modal").hidden) return;
    $("#modal").hidden = true;
    $("#modalBody").innerHTML = "";
    document.body.classList.remove("noscroll");
    const cb = modalOnClose; modalOnClose = null;
    if (cb) cb();
  }
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

  const scripts = {};
  function loadScript(src) {
    return scripts[src] || (scripts[src] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = true; s.crossOrigin = "anonymous";
      s.onload = res;
      s.onerror = () => { delete scripts[src]; rej(new Error("مش قادر أحمّل جزء من التطبيق، اتأكد من الإنترنت")); };
      document.head.appendChild(s);
    }));
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = label || "استنى..."; }
    else { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
  }
  const errMsg = (e) => (e && e.message) || "حصل خطأ";

  /* ================= cleanup on route change ================= */
  let cleanups = [];
  const onLeave = (fn) => cleanups.push(fn);
  function runCleanups() { const c = cleanups; cleanups = []; c.forEach((f) => { try { f(); } catch (e) {} }); }

  /* ================= camera ================= */
  function cameraView(facing = "environment") {
    const video = h("video", { playsinline: true, muted: true, autoplay: true, class: "cam-video" });
    video.setAttribute("playsinline", ""); video.muted = true;
    let stream = null;
    const wrap = h("div", { class: "cam" }, video);
    async function start() {
      stop();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      } catch (e) {
        throw new Error("مش قادر أفتح الكاميرا. اسمح للمتصفح باستخدام الكاميرا.");
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      video.classList.toggle("mirror", facing === "user");
    }
    function stop() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
    async function flip() { facing = facing === "user" ? "environment" : "user"; await start(); }
    function snapshot() {
      const c = document.createElement("canvas");
      c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext("2d").drawImage(video, 0, 0);
      return c;
    }
    return { el: wrap, video, start, stop, flip, snapshot };
  }

  /* ================= face recognition ================= */
  let faceP = null;
  function faceReady() {
    if (!faceP) {
      faceP = (async () => {
        await loadScript(LIBS.face);
        const fa = window.faceapi;
        if (fa.tf && fa.tf.ready) await fa.tf.ready();
        await Promise.all([
          fa.nets.tinyFaceDetector.loadFromUri(LIBS.faceModels),
          fa.nets.faceLandmark68Net.loadFromUri(LIBS.faceModels),
          fa.nets.faceRecognitionNet.loadFromUri(LIBS.faceModels)
        ]);
        return fa;
      })().catch((e) => { faceP = null; throw e; });
    }
    return faceP;
  }
  async function detectFace(canvas) {
    const fa = await faceReady();
    return fa.detectSingleFace(canvas, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 }))
      .withFaceLandmarks().withFaceDescriptor();
  }
  function cropThumb(canvas, box) {
    const size = 200;
    const c = document.createElement("canvas"); c.width = c.height = size;
    const ctx = c.getContext("2d");
    if (box) {
      const m = Math.max(box.width, box.height) * 1.6;
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      ctx.drawImage(canvas, cx - m / 2, cy - m / 2, m, m, 0, 0, size, size);
    } else {
      const m = Math.min(canvas.width, canvas.height);
      ctx.drawImage(canvas, (canvas.width - m) / 2, (canvas.height - m) / 2, m, m, 0, 0, size, size);
    }
    return c.toDataURL("image/jpeg", 0.72);
  }
  let facesCache = null;
  async function getFaces(force) {
    if (!facesCache || force) facesCache = await S.listFaces();
    return facesCache;
  }
  function matchFace(desc, faces) {
    let best = null;
    for (const f of faces) {
      if (!f.d || f.d.length !== desc.length) continue;
      let s = 0;
      for (let i = 0; i < desc.length; i++) { const x = desc[i] - f.d[i]; s += x * x; }
      const dist = Math.sqrt(s);
      if (!best || dist < best.dist) best = { nid: f.nid, name: f.name, dist };
    }
    return best;
  }

  /** Opens camera modal, returns {descriptor, thumb} or null */
  function captureFace(title) {
    return new Promise((resolve) => {
      const cam = cameraView("environment");
      const status = h("div", { class: "hint" }, "بيحمّل نظام التعرف على الوش...");
      const shoot = h("button", { class: "btn primary", type: "button", disabled: true }, "التقط الصورة");
      const flip = h("button", { class: "btn", type: "button", onclick: () => cam.flip().catch((e) => toast(errMsg(e), "err")) }, "قلب الكاميرا");
      let done = false;
      const finish = (v) => { if (done) return; done = true; cam.stop(); resolve(v); closeModal(); };
      shoot.addEventListener("click", async () => {
        busy(shoot, true, "بيدوّر على الوش...");
        try {
          const canvas = cam.snapshot();
          const r = await detectFace(canvas);
          if (!r) { toast("مفيش وش واضح، قرّب الكاميرا ونوّر كويس", "err"); beep(false); busy(shoot, false); return; }
          finish({ descriptor: Array.from(r.descriptor, (v) => Math.round(v * 10000) / 10000), thumb: cropThumb(canvas, r.detection.box) });
        } catch (e) { toast(errMsg(e), "err"); busy(shoot, false); }
      });
      openModal(title || "صورة الوش", h("div", { class: "stack" },
        cam.el, status, h("div", { class: "row" }, shoot, flip),
        h("p", { class: "muted small" }, "خلّي وش العامل في نص الصورة، قريب ومنوّر، ومن غير نضارة شمس أو كمامة.")
      ), () => { if (!done) { done = true; cam.stop(); resolve(null); } });
      cam.start().then(() => faceReady()).then(() => { status.textContent = "جاهز"; shoot.disabled = false; })
        .catch((e) => { status.textContent = errMsg(e); status.className = "hint err"; });
    });
  }

  /* ================= live scanner (QR + ID card) ================= */
  const QR_PREFIX = "HSEW:";
  function qrSvg(text, cell = 5) {
    const q = qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
  }
  async function workerFromQr(text) {
    text = String(text || "").trim();
    if (text.startsWith(QR_PREFIX)) return S.getWorkerByCode(text.slice(QR_PREFIX.length));
    const digits = toWesternDigits(text).replace(/\D/g, "");
    if (digits.length === 14) return S.getWorker(digits);
    return null;
  }

  let qrDecoder;
  async function getQrDecoder() {
    if (qrDecoder) return qrDecoder;
    try {
      if ("BarcodeDetector" in window) {
        const formats = await BarcodeDetector.getSupportedFormats();
        if (formats.includes("qr_code")) {
          const bd = new BarcodeDetector({ formats: ["qr_code"] });
          qrDecoder = async (c) => { const r = await bd.detect(c); return r[0] ? r[0].rawValue : null; };
          return qrDecoder;
        }
      }
    } catch (e) {}
    await loadScript(LIBS.jsqr);
    qrDecoder = async (c) => {
      const d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);
      const r = jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" });
      return r ? r.data : null;
    };
    return qrDecoder;
  }
  const nidCheck = (n) => !!parseNid(n);

  /**
   * Live camera that reads QR cards and the national ID number on its own.
   * opts: { qr, card, hint, onQr(text), onNid(nid) }
   */
  function liveScanner(opts) {
    const cam = cameraView("environment");
    const guide = h("div", { class: "scan-guide" + (opts.card ? " is-card" : "") }, h("span", { class: "scan-line" }));
    cam.el.appendChild(guide);
    const status = h("div", { class: "scan-status" }, "بيفتح الكاميرا...");
    const el = h("div", { class: "scanner" }, cam.el, status);
    let running = false, pausedUntil = 0, timer = null, lastOcr = 0;
    let lastVal = "", lastValT = 0, lastCrop = null;
    const fresh = (v) => { const now = Date.now(); if (v === lastVal && now - lastValT < 10000) { lastValT = now; return false; } lastVal = v; lastValT = now; return true; };
    const hist = [];
    const small = document.createElement("canvas");
    const setStatus = (t, k) => { status.textContent = t; status.className = "scan-status " + (k || ""); };

    function cropGuide(v) {
      const vw = v.videoWidth, vh = v.videoHeight, boxAR = 4 / 3;
      let sx = 0, sy = 0, sw = vw, sh = vh;               // visible part (object-fit: cover)
      if (vw / vh > boxAR) { sw = vh * boxAR; sx = (vw - sw) / 2; } else { sh = vw / boxAR; sy = (vh - sh) / 2; }
      const gw = sw * 0.92, gh = Math.min(sh * 0.9, gw / 1.586);
      const c = document.createElement("canvas");
      c.width = Math.round(gw); c.height = Math.round(gh);
      c.getContext("2d").drawImage(v, sx + (sw - gw) / 2, sy + (sh - gh) / 2, gw, gh, 0, 0, c.width, c.height);
      return c;
    }

    async function tick() {
      if (!running) return;
      const v = cam.video;
      if (v.readyState >= 2 && v.videoWidth && Date.now() > pausedUntil) {
        try {
          if (opts.qr) {
            const sc = Math.min(1, 800 / Math.max(v.videoWidth, v.videoHeight));
            small.width = Math.round(v.videoWidth * sc); small.height = Math.round(v.videoHeight * sc);
            small.getContext("2d", { willReadFrequently: true }).drawImage(v, 0, 0, small.width, small.height);
            const txt = await (await getQrDecoder())(small);
            if (txt && running && fresh(txt)) { pausedUntil = Date.now() + 2000; setStatus("✓ اتقرا الكود", "ok"); opts.onQr(txt); }
          }
          if (opts.card && running && Date.now() > pausedUntil && Date.now() - lastOcr > 500 && window.IDOCR) {
            lastOcr = Date.now();
            const crop = cropGuide(v);
            const nid = IDOCR.read(crop, { check: nidCheck });
            if (nid) lastCrop = crop;
            if (nid) {
              hist.push(nid); if (hist.length > 6) hist.shift();
              if (hist.filter((x) => x === nid).length >= 2 && fresh(nid)) {
                hist.length = 0; pausedUntil = Date.now() + 3000;
                beep(true); setStatus("✓ الرقم القومي: " + nid, "ok"); opts.onNid(nid, lastCrop);
              } else setStatus("لقيت رقم، ثبّت الكاميرا ثانية...", "");
            }
          }
        } catch (e) { console.warn(e); }
      }
      if (running) timer = setTimeout(tick, 150);
    }
    return {
      el,
      async start() {
        try {
          await cam.start(); running = true; setStatus(opts.hint || "وجّه الكاميرا");
          if (opts.qr) getQrDecoder().catch((e) => setStatus(errMsg(e), "err"));
          if (opts.card && window.IDOCR) setTimeout(() => IDOCR.warmup(), 50);
          tick();
        } catch (e) { setStatus(errMsg(e), "err"); }
      },
      stop() { running = false; clearTimeout(timer); cam.stop(); },
      setStatus
    };
  }

  /* ---------- name & address from the card (Tesseract reads Arabic letters well) ---------- */
  let ocrWorkerP = null;
  function ocrWorker() {
    if (!ocrWorkerP) {
      ocrWorkerP = (async () => {
        await loadScript(LIBS.ocr);
        const w = await Tesseract.createWorker("ara", 1, { workerPath: LIBS.ocrWorker, corePath: LIBS.ocrCore, langPath: LIBS.ocrLang });
        await w.setParameters({ tessedit_pageseg_mode: "11" });
        return w;
      })().catch((e) => { ocrWorkerP = null; throw e; });
    }
    return ocrWorkerP;
  }
  const COMMON_NAMES = ("محمد احمد محمود مصطفى علي حسن حسين ابراهيم عبدالله عبدالرحمن عبدالعزيز عبدالرحيم عبدالمقصود عبدالحميد عبدالفتاح عبدالناصر عبدالباسط عمر خالد يوسف سيد السيد " +
    "طه ياسر ياسين اسامه اسماعيل ايمن امجد اشرف عادل عاطف عصام عماد عمرو فتحي جمال حمدي حامد حماده رمضان سامي سعيد سعد شريف صابر صلاح طارق عزت فاروق فارس فوزي كريم كمال " +
    "مجدي مدحت مراد منصور ناصر نبيل هاني هشام وليد وائل رجب شعبان عرفه بكري جابر حسانين عثمان قاسم نصر محمدين زكريا مرسي هريدي عوض ابوبكر بلال حمزه زياد مازن").split(" ");
  function lev(a, b) {
    const m = a.length, n = b.length; const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  const normA = (x) => x.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  function fixName(name) {
    return name.split(" ").map((wd) => {
      const n = normA(wd);
      if (COMMON_NAMES.includes(n) || n.length < 3) return wd;
      let best = null, bd = 9;
      for (const c of COMMON_NAMES) { const dd = lev(n, c); if (dd < bd) { bd = dd; best = c; } }
      return bd === 1 && n.length >= 4 ? best : wd;
    }).join(" ");
  }
  function fixAddress(addr, gov) {
    if (!gov || !addr) return addr;
    return addr.split(" - ").map((part) => part.split(" ").map((wd) => (lev(normA(wd), normA(gov)) <= 1 && wd.length >= 3 ? gov : wd)).join(" ")).join(" - ");
  }

  /** card front canvas -> {name, address} */
  async function readCardText(card) {
    const W = card.width, H = card.height;
    // name + address block: right side, between the header and the ID number
    const sx = W * 0.49, sy = H * 0.22, sw = W * 0.48, sh = H * 0.4;
    const scale = 1000 / sw;
    const c = document.createElement("canvas");
    c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(card, sx, sy, sw, sh, 0, 0, c.width, c.height);
    // keep dark ink, drop the coloured background: use the brightest channel
    const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data;
    let lo = 255, hi = 0;
    for (let i = 0; i < d.length; i += 4) { const v = Math.max(d[i], d[i + 1], d[i + 2]); d[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    const span = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) { const v = Math.round(((d[i] - lo) / span) * 255); d[i] = d[i + 1] = d[i + 2] = v; }
    ctx.putImageData(img, 0, 0);
    const w = await ocrWorker();
    const r = await w.recognize(c);
    const HEAD = /جمهوري|مصر|العربي|بطاق|تحقيق|الشخصي/;
    const lines = r.data.text.split("\n")
      .map((l) => l.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[^\u0621-\u064A\s-]/g, " ")
        .split(/\s+/).filter((x) => x.length > 1 || x === "-").join(" ").replace(/^-+|-+$/g, "").trim())
      .filter((l) => (l.match(/[\u0621-\u064A]/g) || []).length >= 3 && !HEAD.test(l));
    return { name: fixName(lines.slice(0, 2).join(" ").trim()), address: lines.slice(2, 4).join(" - ").trim() };
  }

  /** button that opens the live camera to read the ID number into a field */
  function cardPhotoButton(onNid, label = "صوّر البطاقة") {
    return h("button", { class: "btn", type: "button", onclick: () => {
      const sc = liveScanner({ card: true, hint: "حط وش البطاقة جوه الإطار وثبّت الموبايل", onNid: (nid, frame) => { sc.stop(); closeModal(); toast("اتقرا الرقم القومي، راجعه", "ok"); onNid(nid, frame); } });
      openModal("قراءة البطاقة", h("div", { class: "stack" }, sc.el,
        h("p", { class: "muted small" }, "التطبيق بيقرا الرقم القومي لوحده. نوّر كويس وخلّي البطاقة مالية الإطار ومن غير لمعة.")), () => sc.stop());
      sc.start();
    } }, icon("camera"), label);
  }

  /* ================= identify widget ================= */
  /**
   * opts.onWorker(worker) — worker found
   * opts.onMissing(idOrNull) — not registered
   * opts.continuous — keep the camera open after each read
   */
  function identifier(opts) {
    const methods = [["scan", "الكاميرا", "qr"], ["nid", "الرقم القومي", "id"], ["name", "الاسم", "name"], ["face", "الوش", "face"]];
    let current = null;
    let stopCurrent = null;
    const area = h("div", { class: "id-area" });
    const tabs = h("div", { class: "seg", role: "tablist" });
    methods.forEach(([k, label, ic]) => {
      tabs.appendChild(h("button", { type: "button", class: "seg-btn", "data-k": k, onclick: () => select(k) }, icon(ic), h("span", null, label)));
    });
    function stopAll() { if (stopCurrent) { const f = stopCurrent; stopCurrent = null; f(); } }
    async function lookupId(id) {
      if (!id) return;
      try { const w = await S.getWorker(id); if (w) opts.onWorker(w); else opts.onMissing(id); } catch (e) { toast(errMsg(e), "err"); }
    }

    function select(k) {
      stopAll();
      current = k;
      tabs.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
      area.innerHTML = "";
      try { localStorage.setItem("hse_id_method2", k); } catch (e) {}

      if (k === "scan") {
        const holder = h("div");
        const again = h("button", { class: "btn primary big", type: "button", hidden: true, onclick: () => startScan() }, icon("qr"), "امسح تاني");
        let sc = null;
        const finish = () => { if (!opts.continuous && sc) { sc.stop(); sc = null; holder.innerHTML = ""; again.hidden = false; } };
        function startScan() {
          again.hidden = true; holder.innerHTML = "";
          sc = liveScanner({
            qr: true, card: true,
            hint: "وجّه الكاميرا على كارت الـ QR أو وش البطاقة",
            onQr: async (t) => {
              try {
                const w = await workerFromQr(t);
                if (w) { beep(true); finish(); opts.onWorker(w); } else { beep(false); toast("الكود ده مش متسجل", "err"); }
              } catch (e) { toast(errMsg(e), "err"); }
            },
            onNid: async (nid) => { finish(); await lookupId(nid); }
          });
          holder.appendChild(sc.el); sc.start();
          stopCurrent = () => { if (sc) sc.stop(); };
        }
        area.append(holder, again, h("p", { class: "muted small" }, opts.continuous
          ? "الكاميرا بتفضل مفتوحة: امسح كارت ورا كارت أو بطاقة ورا بطاقة، وكل واحد بيتسجل لوحده."
          : "مش محتاج تدوس حاجة، أول ما الكاميرا تشوف الـ QR أو الرقم القومي بتقراه."));
        startScan();
      }

      if (k === "nid") {
        let foreign = false;
        const input = h("input", { class: "input big-input", inputmode: "numeric", autocomplete: "off", placeholder: "اكتب الرقم القومي (14 رقم)", maxlength: 20 });
        const info = h("div", { class: "hint" });
        const go = h("button", { class: "btn primary", type: "submit" }, icon("search"), "بحث");
        const fToggle = h("label", { class: "check small" }, h("input", { type: "checkbox", onchange: (e) => {
          foreign = e.target.checked;
          input.placeholder = foreign ? "رقم جواز السفر" : "اكتب الرقم القومي (14 رقم)";
          input.inputMode = foreign ? "text" : "numeric";
          upd();
        } }), "أجنبي (رقم جواز سفر)");
        function upd() {
          const id = normalizeId(input.value, foreign);
          if (foreign) { info.textContent = ""; return; }
          if (id.length < 14) { info.textContent = id.length ? id.length + " / 14" : ""; info.className = "hint"; return; }
          const p = parseNid(id);
          info.textContent = p ? "مواليد " + fmtDate(p.birth) + " · " + p.age + " سنة · " + p.gov + " · " + p.gender : "الرقم ده شكله غلط، راجعه";
          info.className = "hint " + (p ? "ok" : "err");
        }
        input.addEventListener("input", upd);
        const form = h("form", { class: "stack", onsubmit: (e) => {
          e.preventDefault();
          const id = normalizeId(input.value, foreign);
          if (!foreign && id.length !== 14) { toast("الرقم القومي لازم يكون 14 رقم", "err"); return; }
          lookupId(id).then(() => { if (opts.continuous) { input.value = ""; upd(); input.focus(); } });
        } }, h("div", { class: "row" }, input, go), info, fToggle);
        area.appendChild(form);
        setTimeout(() => input.focus(), 50);
      }

      if (k === "name") {
        const input = h("input", { class: "input big-input", placeholder: "اكتب الاسم أو جزء منه", autocomplete: "off" });
        const list = h("div", { class: "list" });
        let t, seq = 0;
        input.addEventListener("input", () => {
          clearTimeout(t);
          t = setTimeout(async () => {
            const q = input.value.trim(); const my = ++seq;
            if (q.length < 2) { list.innerHTML = ""; return; }
            list.innerHTML = ""; list.appendChild(h("div", { class: "muted small" }, "بيدوّر..."));
            try {
              const res = await S.searchWorkers(q);
              if (my !== seq) return;
              list.innerHTML = "";
              if (!res.length) list.appendChild(h("div", { class: "empty" }, "مفيش حد بالاسم ده"));
              res.forEach((w) => list.appendChild(h("button", { type: "button", class: "list-item", onclick: () => opts.onWorker(w) },
                avatar(w, 40), h("div", { class: "grow" }, h("div", { class: "strong" }, w.name), h("div", { class: "muted small" }, [w.company, displayId(w.nid)].filter(Boolean).join(" · "))))));
            } catch (e) { list.innerHTML = ""; toast(errMsg(e), "err"); }
          }, 350);
        });
        area.append(input, list);
        setTimeout(() => input.focus(), 50);
      }

      if (k === "face") {
        const btn = h("button", { class: "btn primary big", type: "button" }, icon("face"), "صوّر وش العامل");
        btn.addEventListener("click", async () => {
          const r = await captureFace("التعرف على العامل بالوش");
          if (!r) return;
          busy(btn, true, "بيقارن...");
          try {
            const faces = await getFaces();
            const m = matchFace(r.descriptor, faces);
            const th = CFG.faceThreshold || 0.5;
            if (m && m.dist <= th) {
              const w = await S.getWorker(m.nid);
              if (w) { beep(true); toast("اتعرفت عليه: " + w.name + " (تطابق " + Math.round((1 - m.dist) * 100) + "%)", "ok"); opts.onWorker(w); }
              else opts.onMissing(null);
            } else {
              beep(false);
              toast(faces.length ? "مش لاقي حد بالوش ده، جرّب طريقة تانية" : "لسه مفيش ولا وش متسجل", "err");
            }
          } catch (e) { toast(errMsg(e), "err"); }
          busy(btn, false);
        });
        area.append(btn, h("p", { class: "muted small" }, "بيشتغل بس مع العمال اللي اتصورت وشوشهم وهما بيتسجلوا. أول مرة بياخد شوية وقت عشان يحمّل."));
      }
    }

    let start = "scan";
    try { start = localStorage.getItem("hse_id_method2") || "scan"; } catch (e) {}
    if (!methods.some((m) => m[0] === start)) start = "scan";
    const el = h("div", { class: "identifier" }, tabs, area);
    select(start);
    onLeave(stopAll);
    return { el, stop: stopAll };
  }

  /* ================= worker presentation ================= */
  function avatar(w, size = 56) {
    if (w && w.photo) return h("img", { class: "avatar", src: w.photo, alt: "", width: size, height: size, style: "width:" + size + "px;height:" + size + "px" });
    const initial = ((w && w.name) || "؟").trim().charAt(0);
    return h("div", { class: "avatar ph", style: "width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size * 0.42) + "px" }, initial);
  }

  function workerStatus(w, recs) {
    const inds = recs.filter((r) => r.type === "induction").sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const lastInd = inds.length ? inds[inds.length - 1].date : w.inductionDate || null;
    let indState = lastInd ? "ok" : "no";
    let indExpires = null;
    if (lastInd && CFG.inductionValidDays > 0) {
      indExpires = addDays(lastInd, CFG.inductionValidDays);
      if (indExpires < today()) indState = "expired";
    }
    const dailies = recs.filter((r) => r.type === "daily");
    const todayTalks = dailies.filter((r) => r.date === today());
    return { lastInd, indState, indExpires, todayTalks, lastDaily: dailies[0] || null, dailyCount: dailies.length };
  }

  const isMaster = () => S.currentUser() && S.currentUser().role === "master";
  const isMine = (s, me) => s.officerUid === me.uid || (!!s.officerUsername && s.officerUsername === me.username);
  async function myTodaySessions() {
    const me = S.currentUser();
    const list = await S.listSessionsByDate(today());
    return list.filter((s) => isMine(s, me));
  }

  async function ensureInductionSession() {
    const mine = await myTodaySessions();
    let s = mine.find((x) => x.type === "induction");
    if (!s) s = await S.createSession({ type: "induction", topic: "Induction – المحاضرة التعريفية", location: "" });
    return s;
  }

  async function giveInduction(w) {
    const s = await ensureInductionSession();
    const r = await S.addAttendance(s, w);
    await S.updateWorker(w.nid, { inductionDate: s.date, inductionBy: S.currentUser().name });
    return r;
  }

  /** Full worker panel with status and history */
  function workerPanel(w, { onChanged } = {}) {
    const root = h("div", { class: "card worker" });
    async function draw() {
      root.innerHTML = "";
      root.appendChild(h("div", { class: "muted" }, "بيحمّل..."));
      let recs = [];
      try { recs = await S.listAttendanceByWorker(w.nid); } catch (e) { toast(errMsg(e), "err"); }
      const st = workerStatus(w, recs);
      root.innerHTML = "";

      const indBadge = st.indState === "ok"
        ? badge("ok", "✓ أخد الاندكشن", fmtDate(st.lastInd) + (st.indExpires ? " · صالح لحد " + fmtDate(st.indExpires) : ""))
        : st.indState === "expired"
          ? badge("warn", "! الاندكشن خلص", "آخر مرة " + fmtDate(st.lastInd))
          : badge("bad", "✕ ماخدش الاندكشن", "لازم ياخده قبل ما يشتغل");
      const talkBadge = st.todayTalks.length
        ? badge("ok", "✓ أخد محاضرة النهارده", st.todayTalks.map((r) => r.topic + " – " + r.officerName).join(" / "))
        : badge("bad", "✕ ماخدش محاضرة النهارده", st.lastDaily ? "آخر محاضرة: " + fmtDate(st.lastDaily.date) : "ماحضرش أي محاضرة يومية لسه");

      const p = isForeignId(w.nid) ? null : parseNid(w.nid);
      root.append(
        h("div", { class: "worker-head" },
          avatar(w, 72),
          h("div", { class: "grow" },
            h("h2", { class: "worker-name" }, w.name),
            h("div", { class: "muted" }, displayId(w.nid)),
            h("div", { class: "muted small" }, [w.company, w.job, w.phone, p ? p.age + " سنة" : ""].filter(Boolean).join(" · ")),
            w.address ? h("div", { class: "muted small" }, w.address) : null
          )
        ),
        h("div", { class: "badges" }, indBadge, talkBadge)
      );

      // actions
      const actions = h("div", { class: "row wrap" });
      if (st.indState !== "ok" && !isMaster()) {
        root.insertBefore(h("p", { class: "hint err" }, "الاندكشن بيتسجل من عند الأدمن بس. ابعت العامل للأدمن."), null);
      }
      if (st.indState !== "ok" && isMaster()) {
        actions.appendChild(h("button", { class: "btn primary", type: "button", onclick: async (e) => {
          busy(e.currentTarget, true);
          try { await giveInduction(w); w = (await S.getWorker(w.nid)) || w; toast("اتسجل الاندكشن", "ok"); draw(); onChanged && onChanged(); }
          catch (err) { toast(errMsg(err), "err"); busy(e.currentTarget, false); }
        } }, "سجّل إنه أخد الاندكشن النهارده"));
      }
      actions.appendChild(h("button", { class: "btn", type: "button", onclick: () => addToSessionDialog(w, () => { draw(); onChanged && onChanged(); }) }, icon("talk"), "سجّله في محاضرة النهارده"));
      actions.appendChild(h("button", { class: "btn", type: "button", onclick: () => printCards([w]) }, icon("print"), "طباعة الكارت"));
      if (isMaster()) actions.appendChild(h("button", { class: "btn", type: "button", onclick: () => editWorkerDialog(w, (nw) => { w = nw; draw(); }) }, "تعديل البيانات / الصورة"));
      if (S.currentUser().role === "master") {
        actions.appendChild(h("button", { class: "btn danger", type: "button", onclick: async () => {
          if (!confirm("متأكد إنك عايز تمسح " + w.name + "؟ سجل الحضور القديم هيفضل موجود.")) return;
          try { await S.deleteWorker(w.nid); facesCache = null; toast("اتمسح", "ok"); root.remove(); onChanged && onChanged(); } catch (e) { toast(errMsg(e), "err"); }
        } }, "مسح"));
      }
      root.appendChild(actions);

      // history
      const hist = h("div", { class: "history" }, h("h3", null, "سجل المحاضرات (" + recs.length + ")"));
      if (!recs.length) hist.appendChild(h("div", { class: "empty" }, "لسه مفيش ولا محاضرة"));
      recs.forEach((r) => hist.appendChild(h("div", { class: "hist-item" },
        h("span", { class: "pill " + (r.type === "induction" ? "pill-ind" : "pill-daily") }, TYPE_LABEL[r.type] || r.type),
        h("div", { class: "grow" }, h("div", { class: "strong" }, r.topic), h("div", { class: "muted small" }, fmtDate(r.date) + " " + fmtTime(r.ts) + " · " + r.officerName))
      )));
      root.appendChild(hist);
      root.appendChild(h("div", { class: "muted small" }, "اتسجل بواسطة " + (w.createdByName || "—")));
    }
    draw();
    return root;
  }
  function badge(kind, title, sub) {
    return h("div", { class: "badge " + kind }, h("div", { class: "badge-title" }, title), sub ? h("div", { class: "badge-sub" }, sub) : null);
  }

  async function addToSessionDialog(w, done) {
    let sessions;
    try { sessions = (await myTodaySessions()).filter((s) => s.type === "daily"); } catch (e) { toast(errMsg(e), "err"); return; }
    const body = h("div", { class: "stack" });
    async function add(s) {
      try {
        const r = await S.addAttendance(s, w);
        toast(r.duplicate ? w.name + " متسجل في المحاضرة دي قبل كده" : "اتسجل في: " + s.topic, r.duplicate ? "" : "ok");
        closeModal(); done && done();
      } catch (e) { toast(errMsg(e), "err"); }
    }
    if (sessions.length) {
      body.appendChild(h("p", null, "اختار المحاضرة:"));
      sessions.forEach((s) => body.appendChild(h("button", { class: "list-item", type: "button", onclick: () => add(s) },
        h("div", { class: "grow" }, h("div", { class: "strong" }, s.topic), h("div", { class: "muted small" }, fmtTime(s.ts) + (s.location ? " · " + s.location : "") + " · " + (s.count || 0) + " حاضر")))));
      body.appendChild(h("hr"));
    }
    body.appendChild(h("p", { class: "muted" }, sessions.length ? "أو ابدأ محاضرة جديدة:" : "مفيش محاضرة مفتوحة ليك النهارده. ابدأ واحدة:"));
    const f = newSessionForm(async (s) => { await add(s); });
    body.appendChild(f);
    openModal("تسجيل " + w.name + " في محاضرة", body);
  }

  function newSessionForm(onCreated) {
    const topic = h("input", { class: "input", list: "topicsList", placeholder: "موضوع المحاضرة", required: true });
    const loc = h("input", { class: "input", placeholder: "المكان / المنطقة (اختياري)" });
    const dl = h("datalist", { id: "topicsList" }, TOPICS.map((t) => h("option", { value: t })));
    const btn = h("button", { class: "btn primary", type: "submit" }, "ابدأ المحاضرة");
    return h("form", { class: "stack", onsubmit: async (e) => {
      e.preventDefault();
      if (!topic.value.trim()) return;
      busy(btn, true);
      try { const s = await S.createSession({ type: "daily", topic: topic.value.trim(), location: loc.value.trim() }); await onCreated(s); }
      catch (err) { toast(errMsg(err), "err"); }
      busy(btn, false);
    } }, dl, topic, loc, btn);
  }

  function editWorkerDialog(w, done) {
    const name = h("input", { class: "input", value: w.name || "", required: true });
    const company = h("input", { class: "input", value: w.company || "", list: "companiesList" });
    const job = h("input", { class: "input", value: w.job || "" });
    const phone = h("input", { class: "input", value: w.phone || "", inputmode: "tel" });
    const address = h("input", { class: "input", value: w.address || "" });
    let face = null;
    const faceHolder = h("div", { class: "face-holder" }, avatar(w, 72));
    const faceBtn = h("button", { class: "btn", type: "button", onclick: async () => {
      const r = await captureFace("صورة وش " + w.name);
      if (r) { face = r; faceHolder.innerHTML = ""; faceHolder.appendChild(h("img", { class: "avatar", src: r.thumb, width: 72, height: 72 })); }
      editWorkerDialog.reopen && editWorkerDialog.reopen();
    } }, icon("face"), w.photo ? "تغيير صورة الوش" : "صوّر الوش");
    const save = h("button", { class: "btn primary", type: "submit" }, "حفظ");
    const form = h("form", { class: "stack", onsubmit: async (e) => {
      e.preventDefault(); busy(save, true);
      try {
        const patch = { name: name.value.trim(), company: company.value.trim(), job: job.value.trim(), phone: phone.value.trim(), address: address.value.trim() };
        if (face) { patch.photo = face.thumb; patch.hasFace = true; await S.saveFace(w.nid, patch.name, face.descriptor); facesCache = null; }
        const nw = await S.updateWorker(w.nid, patch);
        toast("اتحفظ", "ok"); closeModal(); done && done(nw);
      } catch (err) { toast(errMsg(err), "err"); busy(save, false); }
    } },
      field("الاسم بالكامل", name), field("الشركة / المقاول", company), field("الوظيفة", job), field("العنوان", address), field("التليفون", phone),
      h("div", { class: "row" }, faceHolder, faceBtn), save);
    // captureFace uses the modal too, so re-open this dialog after it
    editWorkerDialog.reopen = () => openModal("تعديل بيانات العامل", form);
    editWorkerDialog.reopen();
  }

  function field(label, input, hint) {
    return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input, hint || null);
  }

  /* ================= print cards ================= */
  function printCards(workers) {
    const area = $("#printArea");
    area.innerHTML = "";
    const sheet = h("div", { class: "cards-sheet" });
    workers.forEach((w) => {
      sheet.appendChild(h("div", { class: "id-card" },
        h("div", { class: "id-card-top" }, h("span", null, "HSE · Induction Card"), h("span", null, CFG.siteName || "")),
        h("div", { class: "id-card-body" },
          h("div", { class: "id-card-info" },
            w.photo ? h("img", { src: w.photo, class: "id-card-photo", alt: "" }) : null,
            h("div", { class: "id-card-name" }, w.name),
            h("div", null, w.company || ""),
            h("div", null, w.job || ""),
            h("div", { class: "id-card-small" }, "الاندكشن: " + fmtDate(w.inductionDate))
          ),
          h("div", { class: "id-card-qr" }, h("div", { html: qrSvg(QR_PREFIX + w.code, 4) }), h("div", { class: "id-card-code" }, w.code))
        )
      ));
    });
    area.appendChild(sheet);
    document.body.classList.add("printing");
    setTimeout(() => { window.print(); }, 300);
  }
  window.addEventListener("afterprint", () => { document.body.classList.remove("printing"); $("#printArea").innerHTML = ""; });

  /* ================= Excel ================= */
  async function exportXlsx(filename, sheets) {
    try {
      await loadScript(LIBS.xlsx);
      const wb = XLSX.utils.book_new();
      for (const [name, rows] of sheets) {
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "": "لا توجد بيانات" }]);
        ws["!views"] = [{ RTL: true }];
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      }
      if (!wb.Workbook) wb.Workbook = {};
      wb.Workbook.Views = [{ RTL: true }];
      XLSX.writeFile(wb, filename);
    } catch (e) { toast(errMsg(e), "err"); }
  }

  /* ================= VIEWS ================= */
  const app = $("#app");
  function setView(...nodes) { app.innerHTML = ""; nodes.forEach((n) => n && app.appendChild(n)); window.scrollTo(0, 0); }
  function pageTitle(t, sub) { return h("div", { class: "page-title" }, h("h1", null, t), sub ? h("p", { class: "muted" }, sub) : null); }

  function viewLogin() {
    const user = h("input", { class: "input", autocomplete: "username", placeholder: "اسم المستخدم", required: true, autocapitalize: "none", dir: "ltr" });
    const pass = h("input", { class: "input", type: "password", autocomplete: "current-password", placeholder: "الباسورد", required: true, dir: "ltr" });
    const err = h("div", { class: "hint err" });
    const btn = h("button", { class: "btn primary big", type: "submit" }, "دخول");
    setView(h("div", { class: "login" },
      h("div", { class: "login-logo" }, icon("check")),
      h("h1", null, "متابعة التدريب والمحاضرات"),
      h("p", { class: "muted" }, CFG.siteName || ""),
      h("form", { class: "stack", onsubmit: async (e) => {
        e.preventDefault(); err.textContent = ""; busy(btn, true);
        try { await S.login(user.value, pass.value); } catch (ex) { err.textContent = errMsg(ex); }
        busy(btn, false);
      } }, user, pass, err, btn),
      S.mode === "demo" ? h("p", { class: "muted small" }, "وضع التجربة: ادخل بـ admin والباسورد admin") : null
    ));
    setTimeout(() => user.focus(), 50);
  }

  async function viewHome() {
    const me = S.currentUser();
    const tiles = h("div", { class: "tiles" },
      tile("#/lookup", "search", "كشف على عامل", "أخد الاندكشن ومحاضرة النهارده ولا لأ؟"),
      tile("#/talk", "talk", "محاضرة اليوم", "ابدأ محاضرة وسجّل الحاضرين"),
      me.role === "master" ? tile("#/register", "add", "عامل جديد (اندكشن)", "تسجيل عامل وطباعة الكارت") : null,
      me.role === "master" ? tile("#/admin", "admin", "لوحة الأدمن", "تقارير، أوفيسرز، باسوردات، وإكسل") : null
    );
    const todayBox = h("div", { class: "card" }, h("h3", null, "محاضراتك النهارده"), h("div", { class: "muted" }, "بيحمّل..."));
    setView(pageTitle("أهلاً " + me.name, "النهارده " + fmtDate(today())), tiles, todayBox, shareCard());
    try {
      const mine = await myTodaySessions();
      todayBox.innerHTML = ""; todayBox.appendChild(h("h3", null, "محاضراتك النهارده"));
      if (!mine.length) todayBox.appendChild(h("div", { class: "empty" }, "لسه مدّيتش محاضرات النهارده"));
      mine.forEach((s) => todayBox.appendChild(sessionRow(s)));
    } catch (e) { todayBox.lastChild.textContent = errMsg(e); }
  }
  /* ---------- share / install ---------- */
  let installPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; });
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, "");
  function shareCard() {
    const url = appUrl();
    const qr = h("div", { class: "share-qr", html: qrSvg(url, 4) });
    const shareBtn = h("button", { class: "btn primary", type: "button", onclick: async () => {
      const data = { title: "HSE Training Tracker", text: "تطبيق متابعة الاندكشن والمحاضرات", url };
      try {
        if (navigator.share) await navigator.share(data);
        else { await navigator.clipboard.writeText(url); toast("اتنسخ اللينك", "ok"); }
      } catch (e) { if (e && e.name !== "AbortError") { try { await navigator.clipboard.writeText(url); toast("اتنسخ اللينك", "ok"); } catch (x) { toast(url); } } }
    } }, "شارك اللينك");
    const installBtn = h("button", { class: "btn", type: "button", onclick: async () => {
      if (installPrompt) { installPrompt.prompt(); try { await installPrompt.userChoice; } catch (e) {} installPrompt = null; }
      else openModal("تثبيت التطبيق", h("div", { class: "stack" },
        h("p", null, "من قايمة المتصفح:"),
        h("p", null, "• Chrome على أندرويد: ⋮ ← Add to Home screen / Install app"),
        h("p", null, "• Safari على آيفون: زرار المشاركة ⬆ ← Add to Home Screen"),
        h("p", { class: "muted small" }, "بعدها هيبقى ليه أيقونة على الشاشة ويفتح زي أي تطبيق.")));
    } }, "ثبّت التطبيق على الموبايل");
    return h("div", { class: "card share" },
      h("h3", null, "شارك التطبيق مع الأوفيسرز"),
      h("div", { class: "share-body" }, qr,
        h("div", { class: "stack grow" },
          h("p", { class: "muted small" }, "خلّي الأوفيسر يصوّر الـ QR ده بكاميرا موبايله، أو ابعتله اللينك. وبعدها تعمله حساب من لوحة الأدمن."),
          h("div", { class: "muted small", dir: "ltr" }, url),
          h("div", { class: "row wrap" }, shareBtn, isStandalone() ? null : installBtn))));
  }

  function tile(href, ic, title, sub) {
    return h("a", { class: "tile", href }, h("div", { class: "tile-ico" }, icon(ic)), h("div", null, h("div", { class: "tile-title" }, title), h("div", { class: "tile-sub" }, sub)));
  }
  function sessionRow(s) {
    return h("a", { class: "list-item", href: "#/talk/" + s.id },
      h("span", { class: "pill " + (s.type === "induction" ? "pill-ind" : "pill-daily") }, TYPE_LABEL[s.type]),
      h("div", { class: "grow" }, h("div", { class: "strong" }, s.topic), h("div", { class: "muted small" }, fmtDate(s.date) + " " + fmtTime(s.ts) + " · " + s.officerName + (s.location ? " · " + s.location : ""))),
      h("span", { class: "count" }, String(s.count || 0)));
  }

  function viewLookup() {
    const result = h("div", { class: "result" });
    const idw = identifier({
      onWorker: (w) => { result.innerHTML = ""; result.appendChild(workerPanel(w)); result.scrollIntoView({ behavior: "smooth", block: "start" }); },
      onMissing: (id) => {
        result.innerHTML = "";
        result.appendChild(h("div", { class: "card notfound" },
          h("div", { class: "badge bad" }, h("div", { class: "badge-title" }, "✕ العامل ده مش متسجل"), h("div", { class: "badge-sub" }, id ? displayId(id) : "")),
          h("p", null, isMaster() ? "يعني لسه ماخدش الاندكشن. سجّله وادّيله الاندكشن الأول." : "يعني لسه ماخدش الاندكشن، ومينفعش يشتغل. ابعته للأدمن ياخد الاندكشن ويتسجل."),
          isMaster() ? h("button", { class: "btn primary", type: "button", onclick: () => { pendingPrefill = { nid: id }; location.hash = "#/register"; } }, icon("add"), "تسجيل العامل ده") : null
        ));
      }
    });
    setView(pageTitle("كشف على عامل", "اختار طريقة التعرف على العامل"), h("div", { class: "card" }, idw.el), result);
  }

  async function viewTalkList() {
    const me = S.currentUser();
    const listBox = h("div", { class: "card" }, h("h3", null, "محاضرات النهارده في الموقع"), h("div", { class: "muted" }, "بيحمّل..."));
    setView(pageTitle("محاضرة اليوم", "ابدأ محاضرة جديدة أو كمّل محاضرة مفتوحة"),
      h("div", { class: "card" }, h("h3", null, "محاضرة جديدة"), newSessionForm(async (s) => { location.hash = "#/talk/" + s.id; })),
      listBox);
    try {
      const all = await S.listSessionsByDate(today());
      all.sort((a, b) => isMine(b, me) - isMine(a, me) || (b.ts - a.ts));
      listBox.innerHTML = ""; listBox.appendChild(h("h3", null, "محاضرات النهارده في الموقع (" + all.length + ")"));
      if (!all.length) listBox.appendChild(h("div", { class: "empty" }, "لسه مفيش محاضرات النهارده"));
      all.forEach((s) => listBox.appendChild(sessionRow(s)));
    } catch (e) { listBox.lastChild.textContent = errMsg(e); }
  }

  async function viewTalkSession(id) {
    setView(h("div", { class: "muted" }, "بيحمّل..."));
    let s;
    try { s = await S.getSession(id); } catch (e) { setView(h("div", { class: "card" }, errMsg(e))); return; }
    if (!s) { setView(h("div", { class: "card" }, "المحاضرة دي مش موجودة")); return; }
    const me = S.currentUser();
    const canEdit = (isMine(s, me) && s.date === today()) || me.role === "master";
    const countEl = h("span", { class: "count big" }, "0");
    const list = h("div", { class: "list" });
    const lastAdded = h("div", { class: "last-added" });
    let recs = [];

    async function refresh() {
      try { recs = await S.listAttendanceBySession(s.id); } catch (e) { toast(errMsg(e), "err"); }
      countEl.textContent = String(recs.length);
      list.innerHTML = "";
      if (!recs.length) list.appendChild(h("div", { class: "empty" }, "لسه محدش اتسجل"));
      recs.forEach((r, i) => list.appendChild(h("div", { class: "list-item" },
        h("span", { class: "num" }, String(recs.length - i)),
        h("div", { class: "grow" }, h("div", { class: "strong" }, r.workerName), h("div", { class: "muted small" }, [r.company, displayId(r.nid), fmtTime(r.ts)].filter(Boolean).join(" · "))),
        canEdit ? h("button", { class: "icon-btn", type: "button", title: "شيل", "aria-label": "شيل " + r.workerName, onclick: async () => {
          if (!confirm("تشيل " + r.workerName + " من المحاضرة دي؟")) return;
          try { await S.removeAttendance(r.id); refresh(); } catch (e) { toast(errMsg(e), "err"); }
        } }, "✕") : null
      )));
    }

    async function addWorker(w) {
      try {
        const r = await S.addAttendance(s, w);
        lastAdded.innerHTML = "";
        const noInd = !w.inductionDate;
        lastAdded.appendChild(h("div", { class: "badge " + (r.duplicate ? "warn" : noInd ? "warn" : "ok") },
          h("div", { class: "badge-title" }, (r.duplicate ? "متسجل قبل كده: " : "✓ اتسجل: ") + w.name),
          noInd ? h("div", { class: "badge-sub" }, "تنبيه: العامل ده ماخدش الاندكشن!") : h("div", { class: "badge-sub" }, w.company || "")));
        if (!r.duplicate) { toast("✓ " + w.name, "ok"); refresh(); }
        else toast(w.name + " متسجل قبل كده");
      } catch (e) { toast(errMsg(e), "err"); }
    }

    const header = h("div", { class: "card session-head" },
      h("div", { class: "row between" },
        h("div", null,
          h("span", { class: "pill " + (s.type === "induction" ? "pill-ind" : "pill-daily") }, TYPE_LABEL[s.type]),
          h("h2", null, s.topic),
          h("div", { class: "muted small" }, fmtDate(s.date) + " " + fmtTime(s.ts) + " · " + s.officerName + (s.location ? " · " + s.location : ""))),
        h("div", { class: "center" }, countEl, h("div", { class: "muted small" }, "حاضر")))
    );

    const parts = [header];
    if (canEdit) {
      const idw = identifier({
        continuous: true,
        onWorker: addWorker,
        onMissing: (nid) => {
          beep(false);
          openModal("العامل مش متسجل", h("div", { class: "stack" },
            h("p", null, (nid ? displayId(nid) + " " : "") + "مش متسجل في السيستم، يعني ماخدش الاندكشن."),
            isMaster() ? h("button", { class: "btn primary", type: "button", onclick: () => { closeModal(); pendingPrefill = { nid, returnTo: "#/talk/" + s.id }; location.hash = "#/register"; } }, "سجّله واديله الاندكشن")
              : h("p", { class: "hint err" }, "ابعته للأدمن ياخد الاندكشن الأول."),
            h("button", { class: "btn", type: "button", onclick: closeModal }, "رجوع")));
        }
      });
      parts.push(h("div", { class: "card" }, h("h3", null, "سجّل الحاضرين"), idw.el, lastAdded));
    }
    parts.push(h("div", { class: "card" },
      h("div", { class: "row between" }, h("h3", null, "الحاضرين"),
        h("button", { class: "btn small", type: "button", onclick: () => exportXlsx("attendance-" + s.date + ".xlsx", [["الحضور", recs.slice().reverse().map((r, i) => ({
          "م": i + 1, "الاسم": r.workerName, "رقم الهوية": r.nid, "الشركة": r.company, "الوقت": fmtTime(r.ts)
        }))]]) }, "إكسل")),
      list));
    setView(...parts);
    refresh();
  }

  let pendingPrefill = null;
  function viewRegister() {
    const pre = pendingPrefill || {}; pendingPrefill = null;
    let foreign = pre.nid ? isForeignId(pre.nid) : false;
    const nid = h("input", { class: "input big-input", inputmode: foreign ? "text" : "numeric", autocomplete: "off", placeholder: foreign ? "رقم جواز السفر" : "الرقم القومي (14 رقم)", required: true, value: pre.nid ? (foreign ? pre.nid.slice(2) : pre.nid) : "" });
    const nidInfo = h("div", { class: "hint" });
    const name = h("input", { class: "input", placeholder: "الاسم بالكامل زي البطاقة", required: true, autocomplete: "off" });
    const company = h("input", { class: "input", placeholder: "اسم الشركة أو المقاول", list: "companiesList", autocomplete: "off" });
    const job = h("input", { class: "input", placeholder: "مثال: فني لحام، سواق ونش", autocomplete: "off" });
    const phone = h("input", { class: "input", inputmode: "tel", placeholder: "اختياري", autocomplete: "off" });
    const address = h("input", { class: "input", placeholder: "اختياري", autocomplete: "off" });
    const doInd = h("input", { type: "checkbox", checked: true });
    let face = null;
    const faceHolder = h("div", { class: "face-holder" }, h("div", { class: "avatar ph", style: "width:72px;height:72px" }, "؟"));
    const faceBtn = h("button", { class: "btn", type: "button" }, icon("face"), "صوّر وش العامل (اختياري)");
    faceBtn.addEventListener("click", async () => {
      const r = await captureFace("صورة وش العامل");
      if (r) { face = r; faceHolder.innerHTML = ""; faceHolder.appendChild(h("img", { class: "avatar", src: r.thumb, width: 72, height: 72, alt: "" })); faceBtn.lastChild.textContent = "إعادة التصوير"; }
    });
    const existing = h("div");
    const save = h("button", { class: "btn primary big", type: "submit" }, "حفظ وتسجيل الاندكشن");
    doInd.addEventListener("change", () => (save.textContent = doInd.checked ? "حفظ وتسجيل الاندكشن" : "حفظ"));

    let chkT;
    function updNid() {
      const id = normalizeId(nid.value, foreign);
      existing.innerHTML = "";
      if (!foreign) {
        if (id.length < 14) { nidInfo.textContent = id.length ? id.length + " / 14" : ""; nidInfo.className = "hint"; return; }
        const p = parseNid(id);
        nidInfo.textContent = p ? "مواليد " + fmtDate(p.birth) + " · " + p.age + " سنة · " + p.gov + " · " + p.gender : "الرقم ده شكله غلط، راجعه";
        nidInfo.className = "hint " + (p ? "ok" : "err");
      } else nidInfo.textContent = "";
      clearTimeout(chkT);
      chkT = setTimeout(async () => {
        if (!id) return;
        try {
          const w = await S.getWorker(id);
          if (w) {
            existing.innerHTML = "";
            existing.appendChild(h("div", { class: "badge warn" }, h("div", { class: "badge-title" }, "العامل ده متسجل قبل كده: " + w.name),
              h("a", { href: "#", class: "badge-sub link", onclick: (e) => { e.preventDefault(); openModal(w.name, workerPanel(w)); } }, "افتح ملفه")));
          }
        } catch (e) {}
      }, 400);
    }
    nid.addEventListener("input", updNid);
    const fToggle = h("label", { class: "check small" }, h("input", { type: "checkbox", checked: foreign, onchange: (e) => {
      foreign = e.target.checked; nid.placeholder = foreign ? "رقم جواز السفر" : "الرقم القومي (14 رقم)"; nid.inputMode = foreign ? "text" : "numeric"; updNid();
    } }), "عامل أجنبي (رقم جواز سفر)");

    const form = h("form", { class: "stack", onsubmit: async (e) => {
      e.preventDefault();
      const id = normalizeId(nid.value, foreign);
      if (!foreign && id.length !== 14) { toast("الرقم القومي لازم يكون 14 رقم", "err"); nid.focus(); return; }
      if (!foreign && !parseNid(id) && !confirm("الرقم القومي ده شكله غلط. تكمل برضه؟")) return;
      if (!name.value.trim()) { toast("اكتب الاسم", "err"); return; }
      busy(save, true, "بيحفظ...");
      try {
        let w = await S.createWorker({
          nid: id, name: name.value.trim(), company: company.value.trim(), job: job.value.trim(), phone: phone.value.trim(),
          address: address.value.trim(),
          ...(() => { const p = foreign ? null : parseNid(id); return p ? { birthDate: p.birth, gender: p.gender, governorate: p.gov } : {}; })(),
          photo: face ? face.thumb : "", hasFace: !!face, inductionDate: ""
        });
        if (face) { await S.saveFace(id, w.name, face.descriptor); facesCache = null; }
        if (doInd.checked) { await giveInduction(w); w = (await S.getWorker(id)) || w; }
        toast("اتسجل " + w.name, "ok");
        afterRegister(w, pre.returnTo);
      } catch (err) { toast(errMsg(err), "err"); busy(save, false); }
    } },
      h("div", { class: "row wrap" }, cardPhotoButton(async (v, frame) => {
        if (foreign) fToggle.querySelector("input").click();
        nid.value = v; updNid();
        if (!frame) return;
        const oldPh = name.placeholder;
        name.placeholder = "بيقرا الاسم من البطاقة..."; address.placeholder = "بيقرا العنوان...";
        try {
          const t = await readCardText(frame);
          if (t.name && !name.value.trim()) name.value = t.name;
          const pn = parseNid(v);
          if (t.address && !address.value.trim()) address.value = fixAddress(t.address, pn && pn.gov);
          toast(t.name ? "اتقرا الاسم والعنوان، راجعهم وصلّح أي غلط" : "مقدرتش أقرا الاسم، اكتبه بإيدك", t.name ? "ok" : "err");
        } catch (e) { toast("مقدرتش أقرا الاسم، اكتبه بإيدك", "err"); }
        name.placeholder = oldPh; address.placeholder = "اختياري";
      }, "صوّر البطاقة (الرقم والاسم)")),
      field("رقم الهوية", nid, nidInfo), fToggle, existing,
      field("الاسم بالكامل", name),
      field("الشركة / المقاول", company),
      field("الوظيفة", job),
      field("العنوان", address),
      field("التليفون", phone),
      h("div", { class: "field" }, h("span", { class: "field-label" }, "صورة الوش (عشان التعرف عليه بالكاميرا بعد كده)"), h("div", { class: "row" }, faceHolder, faceBtn)),
      h("label", { class: "check" }, doInd, "العامل أخد المحاضرة التعريفية (الاندكشن) النهارده"),
      save);
    setView(pageTitle("تسجيل عامل جديد", "بعد التسجيل تقدر تطبع له كارت فيه QR"), h("div", { class: "card" }, form), companiesDatalist());
    if (pre.nid) updNid();
  }

  function afterRegister(w, returnTo) {
    setView(pageTitle("تم التسجيل ✓"),
      h("div", { class: "card center stack" },
        avatar(w, 96),
        h("h2", null, w.name),
        h("div", { class: "muted" }, displayId(w.nid) + (w.company ? " · " + w.company : "")),
        h("div", { class: "qr-preview", html: qrSvg(QR_PREFIX + w.code, 6) }),
        h("div", { class: "muted small" }, "كود العامل: " + w.code),
        h("div", { class: "row wrap center" },
          h("button", { class: "btn primary", type: "button", onclick: () => printCards([w]) }, icon("print"), "اطبع الكارت"),
          returnTo ? h("a", { class: "btn", href: returnTo }, "ارجع للمحاضرة") : null,
          h("button", { class: "btn", type: "button", onclick: () => { pendingPrefill = null; viewRegister(); } }, icon("add"), "تسجيل عامل تاني"))
      ));
  }

  let companiesCache = null;
  function companiesDatalist() {
    const dl = h("datalist", { id: "companiesList" });
    (async () => {
      try {
        if (!companiesCache && S.mode === "demo") companiesCache = Array.from(new Set((await S.listAllWorkers()).map((w) => w.company).filter(Boolean)));
        (companiesCache || []).forEach((c) => dl.appendChild(h("option", { value: c })));
      } catch (e) {}
    })();
    return dl;
  }

  /* ---------- admin ---------- */
  function viewAdmin(tab) {
    const me = S.currentUser();
    if (me.role !== "master") { location.hash = "#/home"; return; }
    tab = tab || "reports";
    const tabs = h("div", { class: "seg" },
      [["reports", "التقارير"], ["officers", "الأوفيسرز"], ["workers", "العمال"]].map(([k, l]) =>
        h("a", { class: "seg-btn" + (k === tab ? " on" : ""), href: "#/admin/" + k }, l)));
    const body = h("div");
    setView(pageTitle("لوحة الأدمن"), tabs, body);
    if (tab === "reports") adminReports(body);
    if (tab === "officers") adminOfficers(body);
    if (tab === "workers") adminWorkers(body);
  }

  function adminReports(body) {
    const from = h("input", { class: "input", type: "date", value: today() });
    const to = h("input", { class: "input", type: "date", value: today() });
    const out = h("div");
    const go = h("button", { class: "btn primary", type: "button" }, "عرض");
    let data = null;
    async function load() {
      if (from.value > to.value) { toast("تاريخ البداية بعد النهاية", "err"); return; }
      busy(go, true); out.innerHTML = "";
      try {
        const [sessions, att] = await Promise.all([S.listSessionsRange(from.value, to.value), S.listAttendanceRange(from.value, to.value)]);
        data = { sessions, att };
        const uniq = new Set(att.map((a) => a.nid)).size;
        const inds = att.filter((a) => a.type === "induction").length;
        const officers = {};
        sessions.forEach((s) => { officers[s.officerName] = (officers[s.officerName] || 0) + 1; });
        out.append(
          h("div", { class: "stats" },
            stat(sessions.length, "محاضرة"), stat(att.length, "حضور"), stat(uniq, "عامل مختلف"), stat(inds, "اندكشن")),
          h("div", { class: "row wrap" },
            h("button", { class: "btn", type: "button", onclick: exportReport }, "تصدير إكسل")),
          h("div", { class: "card" }, h("h3", null, "المحاضرات"),
            sessions.length ? sessions.map((s) => sessionRow(s)) : h("div", { class: "empty" }, "مفيش محاضرات في الفترة دي")),
          Object.keys(officers).length ? h("div", { class: "card" }, h("h3", null, "المحاضرات لكل أوفيسر"),
            Object.entries(officers).sort((a, b) => b[1] - a[1]).map(([n, c]) => h("div", { class: "list-item" }, h("div", { class: "grow" }, n), h("span", { class: "count" }, String(c))))) : null
        );
      } catch (e) { toast(errMsg(e), "err"); }
      busy(go, false);
    }
    function exportReport() {
      if (!data) return;
      exportXlsx("hse-report-" + from.value + "_" + to.value + ".xlsx", [
        ["الحضور", data.att.slice().sort((a, b) => a.ts - b.ts).map((a) => ({
          "التاريخ": a.date, "الوقت": fmtTime(a.ts), "النوع": TYPE_LABEL[a.type], "الموضوع": a.topic,
          "اسم العامل": a.workerName, "رقم الهوية": a.nid, "الشركة": a.company, "الأوفيسر": a.officerName
        }))],
        ["المحاضرات", data.sessions.slice().sort((a, b) => a.ts - b.ts).map((s) => ({
          "التاريخ": s.date, "الوقت": fmtTime(s.ts), "النوع": TYPE_LABEL[s.type], "الموضوع": s.topic, "المكان": s.location || "",
          "الأوفيسر": s.officerName, "عدد الحضور": s.count || 0
        }))]
      ]);
    }
    go.addEventListener("click", load);
    body.append(h("div", { class: "card" }, h("div", { class: "row wrap" }, field("من", from), field("إلى", to), go)), out);
    load();
  }
  function stat(n, label) { return h("div", { class: "stat" }, h("div", { class: "stat-n" }, String(n)), h("div", { class: "stat-l" }, label)); }

  async function adminOfficers(body) {
    const me = S.currentUser();
    const list = h("div", { class: "card" }, h("div", { class: "muted" }, "بيحمّل..."));
    const name = h("input", { class: "input", placeholder: "اسم الأوفيسر", required: true });
    const username = h("input", { class: "input", placeholder: "اسم مستخدم بالإنجليزي (مثال: mohamed)", required: true, dir: "ltr", autocapitalize: "none", pattern: "[a-zA-Z0-9._\\-]{3,30}" });
    const password = h("input", { class: "input", placeholder: "باسورد (6 على الأقل)", required: true, dir: "ltr", minlength: 6 });
    const role = h("select", { class: "input" }, h("option", { value: "officer" }, "أوفيسر"), h("option", { value: "master" }, "ماستر (صلاحيات كاملة)"));
    const btn = h("button", { class: "btn primary", type: "submit" }, "إضافة");
    const form = h("form", { class: "stack", onsubmit: async (e) => {
      e.preventDefault(); busy(btn, true);
      try {
        await S.createUser({ username: username.value, password: password.value, name: name.value.trim(), role: role.value });
        toast("اتعمل الحساب. ابعت للأوفيسر اسم المستخدم والباسورد", "ok");
        form.reset(); draw();
      } catch (err) { toast(errMsg(err), "err"); }
      busy(btn, false);
    } }, field("الاسم", name), field("اسم المستخدم", username), field("الباسورد", password), field("الصلاحية", role), btn);
    async function draw() {
      try {
        const users = await S.listUsers();
        list.innerHTML = ""; list.appendChild(h("h3", null, "الحسابات (" + users.length + ")"));
        users.forEach((u) => list.appendChild(h("div", { class: "list-item" + (u.active ? "" : " off") },
          h("div", { class: "grow" }, h("div", { class: "strong" }, u.name), h("div", { class: "muted small", dir: "ltr" }, u.username + " · " + (u.role === "master" ? "master" : "officer"))),
          u.uid === me.uid ? h("span", { class: "muted small" }, "أنت") : h("div", { class: "row" },
            h("button", { class: "btn small", type: "button", onclick: () => resetPasswordDialog(u, draw) }, "باسورد جديد"),
            h("button", { class: "btn small " + (u.active ? "danger" : ""), type: "button", onclick: async () => {
              try { await S.setUserActive(u.uid, !u.active); draw(); } catch (e) { toast(errMsg(e), "err"); }
            } }, u.active ? "إيقاف" : "تفعيل")))));
      } catch (e) { list.innerHTML = ""; list.appendChild(h("div", { class: "hint err" }, errMsg(e))); }
    }
    body.append(h("div", { class: "card" }, h("h3", null, "إضافة أوفيسر"), form), list);
    draw();
  }

  function resetPasswordDialog(u, done) {
    const pass = h("input", { class: "input", dir: "ltr", minlength: 6, required: true, placeholder: "الباسورد الجديد (6 على الأقل)", autocomplete: "new-password" });
    const btn = h("button", { class: "btn primary", type: "submit" }, "حفظ الباسورد الجديد");
    openModal("باسورد جديد لـ " + u.name, h("form", { class: "stack", onsubmit: async (e) => {
      e.preventDefault(); busy(btn, true);
      try {
        await S.resetPassword(u.uid, pass.value);
        closeModal();
        toast("اتغير. ابعت للأوفيسر: اسم المستخدم " + u.username + " والباسورد الجديد", "ok");
        done && done();
      } catch (err) { toast(errMsg(err), "err"); busy(btn, false); }
    } },
      h("p", null, "اسم المستخدم هيفضل زي ما هو: ", h("b", { dir: "ltr" }, u.username)),
      field("الباسورد الجديد", pass), btn));
    setTimeout(() => pass.focus(), 50);
  }

  async function adminWorkers(body) {
    const box = h("div", { class: "card" }, h("div", { class: "muted" }, "بيحمّل كل العمال..."));
    body.appendChild(box);
    let workers = [], todayAtt = [];
    try { [workers, todayAtt] = await Promise.all([S.listAllWorkers(), S.listAttendanceRange(today(), today())]); }
    catch (e) { box.innerHTML = ""; box.appendChild(h("div", { class: "hint err" }, errMsg(e))); return; }
    companiesCache = Array.from(new Set(workers.map((w) => w.company).filter(Boolean)));
    const talkedToday = new Set(todayAtt.filter((a) => a.type === "daily").map((a) => a.nid));
    const q = h("input", { class: "input", placeholder: "فلترة بالاسم أو الرقم أو الشركة" });
    const onlyMissing = h("input", { type: "checkbox" });
    const company = h("select", { class: "input" }, h("option", { value: "" }, "كل الشركات"), companiesCache.map((c) => h("option", { value: c }, c)));
    const table = h("div", { class: "list" });
    const countEl = h("div", { class: "muted small" });
    let filtered = [];
    function draw() {
      const qq = U.normalizeArabic(q.value);
      filtered = workers.filter((w) =>
        (!qq || (w.nameNorm || "").includes(qq) || w.nid.includes(qq) || U.normalizeArabic(w.company).includes(qq)) &&
        (!company.value || w.company === company.value) &&
        (!onlyMissing.checked || !talkedToday.has(w.nid)));
      countEl.textContent = filtered.length + " من " + workers.length + " عامل · " + talkedToday.size + " أخدوا محاضرة النهارده";
      table.innerHTML = "";
      filtered.slice(0, 300).forEach((w) => table.appendChild(h("button", { type: "button", class: "list-item", onclick: () => openModal(w.name, workerPanel(w)) },
        avatar(w, 40),
        h("div", { class: "grow" }, h("div", { class: "strong" }, w.name), h("div", { class: "muted small" }, [displayId(w.nid), w.company, w.inductionDate ? "اندكشن " + fmtDate(w.inductionDate) : "بدون اندكشن"].filter(Boolean).join(" · "))),
        h("span", { class: "dot " + (talkedToday.has(w.nid) ? "ok" : "bad"), title: talkedToday.has(w.nid) ? "أخد محاضرة النهارده" : "ماخدش محاضرة النهارده" })
      )));
      if (filtered.length > 300) table.appendChild(h("div", { class: "muted small center" }, "بيعرض أول 300، استخدم الفلترة"));
    }
    [q, company].forEach((el) => el.addEventListener("input", draw));
    onlyMissing.addEventListener("change", draw);
    box.innerHTML = "";
    box.append(
      h("div", { class: "stack" }, q, h("div", { class: "row wrap" }, company, h("label", { class: "check small" }, onlyMissing, "اللي ماخدوش محاضرة النهارده بس"))),
      h("div", { class: "row wrap between" }, countEl, h("div", { class: "row" },
        h("button", { class: "btn small", type: "button", onclick: () => exportXlsx("workers-" + today() + ".xlsx", [["العمال", filtered.map((w) => ({
          "الاسم": w.name, "رقم الهوية": w.nid, "الشركة": w.company || "", "الوظيفة": w.job || "", "التليفون": w.phone || "",
          "العنوان": w.address || "", "تاريخ الميلاد": w.birthDate || "", "النوع": w.gender || "", "المحافظة": w.governorate || "",
          "تاريخ الاندكشن": w.inductionDate || "", "محاضرة النهارده": talkedToday.has(w.nid) ? "نعم" : "لا", "الكود": w.code
        }))]]) }, "إكسل"),
        h("button", { class: "btn small", type: "button", onclick: () => {
          if (!filtered.length) return;
          if (filtered.length > 60 && !confirm("هتطبع " + filtered.length + " كارت. تكمل؟")) return;
          printCards(filtered);
        } }, icon("print"), "طباعة كروت"))),
      table);
    draw();
  }

  /* ================= router ================= */
  function nav() {
    const me = S.currentUser();
    const n = $("#bottomnav");
    n.innerHTML = "";
    const r = location.hash.split("/")[1] || "home";
    [["home", "home", "الرئيسية"], ["lookup", "search", "كشف"], ["talk", "talk", "المحاضرة"]]
      .concat(me.role === "master" ? [["register", "add", "اندكشن"], ["admin", "admin", "الأدمن"]] : [])
      .forEach(([k, ic, l]) => n.appendChild(h("a", { href: "#/" + k, class: "nav-item" + (r === k ? " on" : "") }, icon(ic), h("span", null, l))));
  }

  function route() {
    runCleanups();
    closeModal();
    const me = S.currentUser();
    $("#topbar").hidden = !me; $("#bottomnav").hidden = !me;
    if (!me) { viewLogin(); return; }
    $("#whoName").textContent = me.name;
    nav();
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const r = parts[0] || "home";
    if (r === "lookup") viewLookup();
    else if (r === "talk" && parts[1]) viewTalkSession(parts[1]);
    else if (r === "talk") viewTalkList();
    else if (r === "register" && me.role === "master") viewRegister();
    else if (r === "admin") viewAdmin(parts[1]);
    else viewHome();
  }

  window.addEventListener("hashchange", route);
  $("#logoutBtn").addEventListener("click", () => S.logout());
  $("#siteName").textContent = CFG.siteName || "HSE Training Tracker";
  $("#demoBanner").hidden = S.mode !== "demo";
  S.onAuth(() => route());
  S.init();

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {});
  }
})();
