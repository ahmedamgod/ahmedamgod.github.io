/*
 * طبقة البيانات: نفس الدوال بتشتغل على Firebase أو على وضع التجربة (localStorage).
 */
(function () {
  "use strict";

  const MASTER_USERNAME = "admin";
  const EMAIL_DOMAIN = "hse.example.com";

  /* ---------- helpers ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  function todayStr(d = new Date()) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function normalizeArabic(s) {
    return String(s || "")
      .replace(/[ً-ْٰـ]/g, "")
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  function nameTokens(name) {
    return Array.from(new Set(normalizeArabic(name).split(" ").filter(Boolean)));
  }
  function matchesName(worker, q) {
    const words = normalizeArabic(q).split(" ").filter(Boolean);
    if (!words.length) return false;
    const toks = worker.tokens || nameTokens(worker.name);
    return words.every((w) => toks.some((t) => t.startsWith(w)));
  }
  function randomCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const arr = new Uint32Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr, (n) => abc[n % abc.length]).join("");
  }
  const cleanUsername = (u) => String(u || "").trim().toLowerCase().split("@")[0];
  const usernameToEmail = (u) => cleanUsername(u) + "@" + EMAIL_DOMAIN;

  function prepareWorker(w) {
    const out = Object.assign({}, w);
    out.name = String(out.name || "").trim().replace(/\s+/g, " ");
    out.nameNorm = normalizeArabic(out.name);
    out.tokens = nameTokens(out.name);
    if (!out.code) out.code = randomCode();
    return out;
  }
  function inactiveMsg(u) {
    if (!u) return "الحساب ده مش موجود، كلم الأدمن";
    if (u.status === "pending") return "طلبك لسه مستني موافقة الأدمن";
    if (u.status === "rejected") return "طلب الحساب ده اترفض، كلم الأدمن";
    return "الحساب ده متوقف، كلم الأدمن";
  }
  const byTsDesc = (a, b) => (b.ts || 0) - (a.ts || 0);

  /* =========================================================
   *  DEMO STORE (localStorage)
   * ========================================================= */
  function DemoStore() {
    const KEY = "hse_training_demo_v1";
    const SESSION_KEY = "hse_training_demo_user";
    let data;
    try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { data = null; }
    if (data && !data.announcements) data.announcements = {};
    if (!data) {
      data = { announcements: {},
        users: { u_admin: { uid: "u_admin", username: "admin", password: "admin", name: "مدير النظام", role: "master", active: true, ts: Date.now() } },
        workers: {}, faces: {}, sessions: {}, attendance: {}
      };
    }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn(e); } };
    let current = null;
    const listeners = [];
    const emit = () => listeners.forEach((cb) => cb(current));
    const pub = (u) => u && { uid: u.uid, username: u.username, name: u.name, role: u.role, active: u.active, owner: u.username === MASTER_USERNAME };
    const vals = (o) => Object.values(o);
    const tick = () => new Promise((r) => setTimeout(r, 30));

    return {
      mode: "demo",
      async init() {
        try {
          const uid = sessionStorage.getItem(SESSION_KEY);
          if (uid && data.users[uid] && data.users[uid].active) current = pub(data.users[uid]);
        } catch (e) {}
        setTimeout(emit, 0);
      },
      onAuth(cb) { listeners.push(cb); },
      currentUser() { return current; },
      async login(username, password) {
        await tick();
        const u = vals(data.users).find((x) => x.username === cleanUsername(username));
        if (!u || u.password !== password) throw new Error("اسم المستخدم أو الباسورد غلط");
        if (!u.active) throw new Error(inactiveMsg(u));
        current = pub(u);
        try { sessionStorage.setItem(SESSION_KEY, u.uid); } catch (e) {}
        emit();
      },
      async logout() { current = null; try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} emit(); },

      async listUsers() { await tick(); return vals(data.users).map((u) => Object.assign(pub(u), { status: u.status, jobTitle: u.jobTitle, company: u.company, phone: u.phone, ts: u.ts })).sort((a, b) => a.name.localeCompare(b.name)); },
      async register({ username, password, name, jobTitle, company, phone }) {
        await tick();
        username = cleanUsername(username);
        if (username === MASTER_USERNAME || vals(data.users).some((u) => u.username === username)) throw new Error("اسم المستخدم ده موجود قبل كده، اختار غيره");
        if (String(password).length < 6) throw new Error("الباسورد لازم يكون 6 حروف أو أرقام على الأقل");
        const uid = "u_" + randomCode();
        data.users[uid] = { uid, username, password, name, jobTitle, company, phone, role: "officer", active: false, status: "pending", ts: Date.now() };
        save();
      },
      async decideRequest(uid, approve, role) {
        await tick();
        const u = data.users[uid]; if (!u) return;
        Object.assign(u, approve ? { active: true, status: "approved", role: role || "officer", approvedBy: current.name } : { active: false, status: "rejected", rejectedBy: current.name });
        save();
      },
      async createUser({ username, password, name, role }) {
        await tick();
        username = cleanUsername(username);
        if (vals(data.users).some((u) => u.username === username)) throw new Error("اسم المستخدم ده موجود قبل كده");
        const uid = "u_" + randomCode();
        data.users[uid] = { uid, username, password, name, role, active: true, ts: Date.now() };
        save();
      },
      async setUserActive(uid, active) {
        await tick();
        const u = data.users[uid]; if (!u) return;
        if (u.username === MASTER_USERNAME && !current.owner) throw new Error("محدش يقدر يغيّر حساب صاحب التطبيق");
        u.active = active; save();
      },
      async deleteUser(uid) {
        await tick();
        if (!current.owner) throw new Error("حذف الحسابات لصاحب التطبيق بس");
        const u = data.users[uid]; if (!u) return;
        if (u.username === MASTER_USERNAME) throw new Error("مينفعش تمسح حساب صاحب التطبيق");
        delete data.users[uid]; save();
      },
      async resetPassword(uid, password) {
        await tick();
        if (!data.users[uid]) throw new Error("مش موجود");
        if (data.users[uid].username === MASTER_USERNAME && !current.owner) throw new Error("محدش يقدر يغيّر حساب صاحب التطبيق");
        if (String(password).length < 6) throw new Error("الباسورد لازم يكون 6 حروف أو أرقام على الأقل");
        data.users[uid].password = password; save();
      },

      async getWorker(nid) { await tick(); return data.workers[nid] || null; },
      async getWorkerByCode(code) { await tick(); return vals(data.workers).find((w) => w.code === code) || null; },
      async createWorker(w) {
        await tick();
        if (current.role !== "master") throw new Error("تسجيل العمال الجداد من الأدمن بس");
        if (data.workers[w.nid]) throw new Error("العامل ده متسجل قبل كده");
        const out = prepareWorker(Object.assign({}, w, { ts: Date.now(), createdBy: current.uid, createdByName: current.name }));
        data.workers[w.nid] = out; save(); return out;
      },
      async updateWorker(nid, patch) {
        await tick();
        const w = data.workers[nid]; if (!w) throw new Error("مش موجود");
        const out = prepareWorker(Object.assign({}, w, patch));
        data.workers[nid] = out; save(); return out;
      },
      async deleteWorker(nid) { await tick(); delete data.workers[nid]; delete data.faces[nid]; save(); },
      async deleteWorkers(nids) { await tick(); nids.forEach((n) => { delete data.workers[n]; delete data.faces[n]; }); save(); },
      async searchWorkers(q) { await tick(); return vals(data.workers).filter((w) => matchesName(w, q)).slice(0, 30); },
      async listAllWorkers() { await tick(); return vals(data.workers).sort(byTsDesc); },
      async existingIds(ids) { await tick(); return new Set(ids.filter((id) => data.workers[id])); },
      /** items: [{ worker, date }] -> creates workers + one induction session per date */
      async importWorkers(items, onProgress) {
        if (current.role !== "master") throw new Error("الاستيراد من الأدمن بس");
        const sessions = {};
        let done = 0;
        for (const it of items) {
          if (data.workers[it.worker.nid]) continue;
          let s = sessions[it.date];
          if (!s) {
            const id = "s_" + Date.now().toString(36) + randomCode().slice(0, 4);
            s = sessions[it.date] = { id, type: "induction", topic: "Induction – استيراد من إكسل", location: "", date: it.date, officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now(), count: 0, imported: true };
            data.sessions[id] = s;
          }
          const w = prepareWorker(Object.assign({}, it.worker, { inductionDate: it.date, inductionBy: current.name, ts: Date.now(), createdBy: current.uid, createdByName: current.name, imported: true }));
          data.workers[w.nid] = w;
          const aid = s.id + "_" + w.nid;
          data.attendance[aid] = { id: aid, sessionId: s.id, nid: w.nid, workerName: w.name, company: w.company || "", type: "induction", topic: s.topic, date: s.date, officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now(), imported: true };
          s.count++;
          done++;
          if (onProgress && done % 50 === 0) onProgress(done);
        }
        save();
        return done;
      },
      async listFaces() { await tick(); return vals(data.faces); },
      async saveFace(nid, name, descriptor) { data.faces[nid] = { nid, name, d: descriptor }; save(); },

      async createSession(s) {
        await tick();
        const id = "s_" + Date.now().toString(36) + randomCode().slice(0, 4);
        if (s.type !== "daily" && current.role !== "master") throw new Error("الاندكشن بيتسجل من الأدمن بس");
        const out = Object.assign({ id, date: todayStr(), officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now(), count: 0 }, s);
        data.sessions[id] = out; save(); return out;
      },
      async getSession(id) { await tick(); return data.sessions[id] || null; },
      async listSessionsByDate(date) { await tick(); return vals(data.sessions).filter((s) => s.date === date).sort(byTsDesc); },
      async setSessionCount(id, n) { if (data.sessions[id]) { data.sessions[id].count = n; save(); } },

      /* ---- الأوامر الإدارية ---- */
      watchAnnouncements(cb) {
        const push = () => cb(vals(data.announcements).sort(byTsDesc).slice(0, 30));
        this._annCb = push; setTimeout(push, 0);
        return () => { this._annCb = null; };
      },
      async addAnnouncement({ text, urgent, speak }) {
        await tick();
        if (current.role !== "master") throw new Error("الأوامر الإدارية من الماستر بس");
        const id = "a_" + Date.now().toString(36) + randomCode().slice(0, 4);
        data.announcements[id] = { id, text, urgent: !!urgent, speak: !!speak, createdBy: current.uid, createdByName: current.name, ts: Date.now(), acks: {} };
        save(); if (this._annCb) this._annCb();
      },
      async deleteAnnouncement(id) { await tick(); delete data.announcements[id]; save(); if (this._annCb) this._annCb(); },
      async ackAnnouncement(id) {
        const a = data.announcements[id]; if (!a) return;
        a.acks = a.acks || {}; a.acks[current.uid] = { uid: current.uid, name: current.name, username: current.username, ts: Date.now() }; save();
      },
      async listAcks(id) { await tick(); const a = data.announcements[id]; return a ? vals(a.acks || {}).sort((x, y) => x.ts - y.ts) : []; },
      async deleteSessions(ids) {
        await tick();
        if (current.role !== "master") throw new Error("مسح المحاضرات من الأدمن بس");
        const set = new Set(ids);
        Object.keys(data.attendance).forEach((k) => { if (set.has(data.attendance[k].sessionId)) delete data.attendance[k]; });
        ids.forEach((id) => delete data.sessions[id]);
        save();
      },
      async listSessionsRange(from, to) { await tick(); return vals(data.sessions).filter((s) => s.date >= from && s.date <= to).sort(byTsDesc); },

      async addAttendance(session, worker) {
        await tick();
        const id = session.id + "_" + worker.nid;
        if (data.attendance[id]) return { duplicate: true, rec: data.attendance[id] };
        const rec = {
          id, sessionId: session.id, nid: worker.nid, workerName: worker.name, company: worker.company || "",
          type: session.type, topic: session.topic, date: session.date,
          officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now()
        };
        data.attendance[id] = rec;
        if (data.sessions[session.id]) data.sessions[session.id].count = (data.sessions[session.id].count || 0) + 1;
        save(); return { duplicate: false, rec };
      },
      async removeAttendance(id) {
        await tick();
        const rec = data.attendance[id]; if (!rec) return;
        delete data.attendance[id];
        const s = data.sessions[rec.sessionId]; if (s) s.count = Math.max(0, (s.count || 1) - 1);
        save();
      },
      async listAttendanceBySession(sid) { await tick(); return vals(data.attendance).filter((a) => a.sessionId === sid).sort(byTsDesc); },
      async listAttendanceByWorker(nid) { await tick(); return vals(data.attendance).filter((a) => a.nid === nid).sort(byTsDesc); },
      async listAttendanceRange(from, to) { await tick(); return vals(data.attendance).filter((a) => a.date >= from && a.date <= to).sort(byTsDesc); }
    };
  }

  /* =========================================================
   *  FIREBASE STORE
   * ========================================================= */
  function FirebaseStore(cfg) {
    const app = firebase.initializeApp(cfg);
    const auth = app.auth();
    const db = app.firestore();
    try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
    const FV = firebase.firestore.FieldValue;
    let current = null;
    const listeners = [];
    const emit = () => listeners.forEach((cb) => cb(current));
    const docs = (snap) => snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));

    function authError(e) {
      const c = (e && e.code) || "";
      if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found") || c.includes("invalid-login"))
        return new Error("اسم المستخدم أو الباسورد غلط");
      if (c.includes("too-many-requests")) return new Error("محاولات كتير، استنى شوية وجرب تاني");
      if (c.includes("network")) return new Error("مفيش إنترنت");
      if (c.includes("invalid-email")) return new Error("اسم المستخدم فيه حروف غلط، استخدم حروف إنجليزي وأرقام بس");
      if (c.includes("email-already-in-use")) return new Error("اسم المستخدم ده موجود قبل كده");
      if (c.includes("weak-password")) return new Error("الباسورد لازم يكون 6 حروف أو أرقام على الأقل");
      if (c.includes("permission-denied")) return new Error("مالكش صلاحية تعمل كده");
      return e;
    }

    async function newAuthAccount(email, password) {
      // تطبيق ثانوي عشان إنشاء حساب جديد ما يخرجش الأدمن من حسابه
      const sec = firebase.apps.find((a) => a.name === "secondary") || firebase.initializeApp(cfg, "secondary");
      try {
        const cred = await sec.auth().createUserWithEmailAndPassword(email, password);
        await sec.auth().signOut();
        return cred.user.uid;
      } catch (e) { throw authError(e); }
    }

    return {
      mode: "firebase",
      async init() {
        auth.onAuthStateChanged(async (fu) => {
          if (!fu) { current = null; emit(); return; }
          try {
            const ref = db.collection("users").doc(fu.uid);
            let snap = await ref.get();
            const username = (fu.email || "").split("@")[0];
            if (!snap.exists && username === MASTER_USERNAME) {
              await ref.set({ username, name: "مدير النظام", role: "master", active: true, ts: Date.now() });
              snap = await ref.get();
            }
            if (!snap.exists || !snap.data().active) {
              await auth.signOut();
              current = null; emit();
              return;
            }
            const u = snap.data();
            current = { uid: fu.uid, username: u.username, name: u.name, role: u.role, active: u.active, owner: u.username === MASTER_USERNAME };
          } catch (e) {
            console.error(e); current = null;
          }
          emit();
        });
      },
      onAuth(cb) { listeners.push(cb); },
      currentUser() { return current; },
      async register({ username, password, name, jobTitle, company, phone }) {
        username = cleanUsername(username);
        if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error("اسم المستخدم بالإنجليزي وأرقام بس (3 حروف على الأقل)");
        if (username === MASTER_USERNAME) throw new Error("اسم المستخدم ده محجوز");
        if (String(password).length < 6) throw new Error("الباسورد لازم يكون 6 حروف أو أرقام على الأقل");
        const m = await db.collection("logins").doc(username).get();
        if (m.exists) throw new Error("اسم المستخدم ده موجود قبل كده، اختار غيره");
        // الحساب بيتعمل في تطبيق ثانوي عشان مايدخلش على طول
        const sec = firebase.apps.find((a) => a.name === "secondary") || firebase.initializeApp(cfg, "secondary");
        let email = usernameToEmail(username), cred;
        try { cred = await sec.auth().createUserWithEmailAndPassword(email, password); }
        catch (e) {
          const err = authError(e);
          if (!/موجود قبل كده/.test(err.message)) throw err;
          email = username + "." + Date.now().toString(36) + "@" + EMAIL_DOMAIN;
          try { cred = await sec.auth().createUserWithEmailAndPassword(email, password); } catch (e2) { throw authError(e2); }
        }
        const sdb = sec.firestore();
        try {
          await sdb.collection("users").doc(cred.user.uid).set({ username, name, jobTitle, company, phone, role: "officer", active: false, status: "pending", ts: Date.now() });
          await sdb.collection("logins").doc(username).set({ email, uid: cred.user.uid });
        } finally { await sec.auth().signOut(); }
      },
      async decideRequest(uid, approve, role) {
        const patch = approve ? { active: true, status: "approved", role: role || "officer", approvedBy: current.name } : { active: false, status: "rejected", rejectedBy: current.name };
        await db.collection("users").doc(uid).update(patch);
      },
      async login(username, password) {
        const u = cleanUsername(username);
        let email = usernameToEmail(u);
        try {
          const m = await db.collection("logins").doc(u).get();
          if (m.exists && m.data().email) email = m.data().email;
        } catch (e) { /* offline or no mapping: use default */ }
        let cred;
        try { cred = await auth.signInWithEmailAndPassword(email, password); }
        catch (e) { throw authError(e); }
        const prof = await db.collection("users").doc(cred.user.uid).get().catch(() => null);
        const pd = prof && prof.exists ? prof.data() : null;
        if (u !== MASTER_USERNAME && (!pd || !pd.active)) { await auth.signOut(); throw new Error(inactiveMsg(pd)); }
      },
      async logout() { await auth.signOut(); },

      async listUsers() {
        const s = await db.collection("users").get();
        return s.docs.map((d) => Object.assign({ uid: d.id }, d.data())).filter((u) => !u.replacedBy)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      },
      async createUser({ username, password, name, role }) {
        username = cleanUsername(username);
        if (username === MASTER_USERNAME) throw new Error("اسم المستخدم ده محجوز");
        const m = await db.collection("logins").doc(username).get();
        if (m.exists) throw new Error("اسم المستخدم ده موجود قبل كده");
        let email = usernameToEmail(username), uid;
        try { uid = await newAuthAccount(email, password); }
        catch (e) {
          // اسم مستخدم اتمسح قبل كده: حساب الدخول القديم لسه موجود، فنعمل واحد جديد
          if (!/موجود قبل كده/.test(e.message)) throw e;
          email = username + "." + Date.now().toString(36) + "@" + EMAIL_DOMAIN;
          uid = await newAuthAccount(email, password);
        }
        await db.collection("users").doc(uid).set({ username, name, role, active: true, ts: Date.now() });
        await db.collection("logins").doc(username).set({ email, uid });
      },
      /* Firebase مبيسمحش للأدمن يغيّر باسورد حد تاني من المتصفح، فبنعمل للأوفيسر
         حساب دخول جديد بنفس اسم المستخدم والصلاحيات، والقديم بيتقفل. */
      async resetPassword(uid, password) {
        if (String(password).length < 6) throw new Error("الباسورد لازم يكون 6 حروف أو أرقام على الأقل");
        const ref = db.collection("users").doc(uid);
        const snap = await ref.get();
        if (!snap.exists) throw new Error("مش موجود");
        const u = snap.data();
        if (u.username === MASTER_USERNAME) throw new Error("باسورد صاحب التطبيق بيتغير من Firebase");
        const email = u.username + "." + Date.now().toString(36) + "@" + EMAIL_DOMAIN;
        const newUid = await newAuthAccount(email, password);
        await db.collection("users").doc(newUid).set({ username: u.username, name: u.name, role: u.role, active: u.active !== false, ts: u.ts || Date.now(), previousUid: uid });
        await db.collection("logins").doc(u.username).set({ email, uid: newUid });
        await ref.update({ active: false, replacedBy: newUid });
      },
      async setUserActive(uid, active) {
        const snap = await db.collection("users").doc(uid).get();
        if (snap.exists && snap.data().username === MASTER_USERNAME && !current.owner) throw new Error("محدش يقدر يغيّر حساب صاحب التطبيق");
        await db.collection("users").doc(uid).update({ active });
      },
      /* بيمسح الحساب من التطبيق: صاحبه مش هيقدر يدخل تاني، وسجل المحاضرات اللي عملها بيفضل زي ما هو */
      async deleteUser(uid) {
        if (!current.owner) throw new Error("حذف الحسابات لصاحب التطبيق بس");
        const snap = await db.collection("users").doc(uid).get();
        if (!snap.exists) return;
        const u = snap.data();
        if (u.username === MASTER_USERNAME) throw new Error("مينفعش تمسح حساب صاحب التطبيق");
        const all = await db.collection("users").where("username", "==", u.username).get();
        const batch = db.batch();
        all.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(db.collection("logins").doc(u.username));
        try { await batch.commit(); } catch (e) { throw authError(e); }
      },

      async getWorker(nid) {
        const s = await db.collection("workers").doc(nid).get();
        return s.exists ? s.data() : null;
      },
      async getWorkerByCode(code) {
        const s = await db.collection("workers").where("code", "==", code).limit(1).get();
        return s.empty ? null : s.docs[0].data();
      },
      async createWorker(w) {
        if (current.role !== "master") throw new Error("تسجيل العمال الجداد من الأدمن بس");
        const ref = db.collection("workers").doc(w.nid);
        const out = prepareWorker(Object.assign({}, w, { ts: Date.now(), createdBy: current.uid, createdByName: current.name }));
        try {
          await db.runTransaction(async (tx) => {
            const s = await tx.get(ref);
            if (s.exists) throw new Error("العامل ده متسجل قبل كده");
            tx.set(ref, out);
          });
        } catch (e) { throw authError(e); }
        return out;
      },
      async updateWorker(nid, patch) {
        const ref = db.collection("workers").doc(nid);
        const s = await ref.get(); if (!s.exists) throw new Error("مش موجود");
        const out = prepareWorker(Object.assign({}, s.data(), patch));
        await ref.set(out); return out;
      },
      async deleteWorkers(nids) {
        for (let i = 0; i < nids.length; i += 200) {
          const batch = db.batch();
          nids.slice(i, i + 200).forEach((n) => { batch.delete(db.collection("workers").doc(n)); batch.delete(db.collection("faces").doc(n)); });
          await batch.commit();
        }
      },
      async deleteWorker(nid) {
        await db.collection("workers").doc(nid).delete();
        await db.collection("faces").doc(nid).delete().catch(() => {});
      },
      async searchWorkers(q) {
        const norm = normalizeArabic(q);
        if (!norm) return [];
        const first = norm.split(" ")[0];
        const [a, b] = await Promise.all([
          db.collection("workers").where("nameNorm", ">=", norm).where("nameNorm", "<=", norm + "").limit(30).get(),
          db.collection("workers").where("tokens", "array-contains", first).limit(60).get()
        ]);
        const map = new Map();
        [...a.docs, ...b.docs].forEach((d) => map.set(d.id, d.data()));
        return Array.from(map.values()).filter((w) => matchesName(w, q)).slice(0, 30);
      },
      async existingIds(ids) {
        const found = new Set();
        const FP = firebase.firestore.FieldPath.documentId();
        for (let i = 0; i < ids.length; i += 30) {
          const chunk = ids.slice(i, i + 30);
          const snap = await db.collection("workers").where(FP, "in", chunk).get();
          snap.docs.forEach((d) => found.add(d.id));
        }
        return found;
      },
      async importWorkers(items, onProgress) {
        if (current.role !== "master") throw new Error("الاستيراد من الأدمن بس");
        const existing = await this.existingIds(items.map((it) => it.worker.nid));
        const todo = items.filter((it) => !existing.has(it.worker.nid));
        const sessions = {};
        const counts = {};
        let batch = db.batch(), ops = 0, done = 0;
        const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
        for (const it of todo) {
          let s = sessions[it.date];
          if (!s) {
            const ref = db.collection("sessions").doc();
            s = sessions[it.date] = { id: ref.id, type: "induction", topic: "Induction – استيراد من إكسل", location: "", date: it.date, officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now(), count: 0, imported: true };
            batch.set(ref, s); ops++;
          }
          const w = prepareWorker(Object.assign({}, it.worker, { inductionDate: it.date, inductionBy: current.name, ts: Date.now(), createdBy: current.uid, createdByName: current.name, imported: true }));
          batch.set(db.collection("workers").doc(w.nid), w); ops++;
          const aid = s.id + "_" + w.nid;
          batch.set(db.collection("attendance").doc(aid), { id: aid, sessionId: s.id, nid: w.nid, workerName: w.name, company: w.company || "", type: "induction", topic: s.topic, date: s.date, officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now(), imported: true }); ops++;
          counts[s.id] = (counts[s.id] || 0) + 1;
          done++;
          if (ops >= 400) { await flush(); if (onProgress) onProgress(done); }
        }
        for (const id in counts) { batch.update(db.collection("sessions").doc(id), { count: counts[id] }); ops++; if (ops >= 400) await flush(); }
        await flush();
        return done;
      },
      async listAllWorkers() {
        const s = await db.collection("workers").get();
        return s.docs.map((d) => d.data()).sort(byTsDesc);
      },
      async listFaces() {
        const s = await db.collection("faces").get();
        return s.docs.map((d) => d.data());
      },
      async saveFace(nid, name, descriptor) { await db.collection("faces").doc(nid).set({ nid, name, d: descriptor }); },

      async createSession(s) {
        const ref = db.collection("sessions").doc();
        if (s.type !== "daily" && current.role !== "master") throw new Error("الاندكشن بيتسجل من الأدمن بس");
        const out = Object.assign({ id: ref.id, date: todayStr(), officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now(), count: 0 }, s);
        await ref.set(out); return out;
      },
      async getSession(id) { const s = await db.collection("sessions").doc(id).get(); return s.exists ? s.data() : null; },
      async setSessionCount(id, n) { await db.collection("sessions").doc(id).update({ count: n }); },

      /* ---- الأوامر الإدارية ---- */
      async fetchAnnouncements() {
        const snap = await db.collection("announcements").orderBy("ts", "desc").limit(30).get({ source: "server" });
        return docs(snap);
      },
      watchAnnouncements(cb) {
        return db.collection("announcements").orderBy("ts", "desc").limit(30)
          .onSnapshot((snap) => cb(docs(snap)), (e) => console.warn("announcements", e));
      },
      async addAnnouncement({ text, urgent, speak }) {
        if (current.role !== "master") throw new Error("الأوامر الإدارية من الماستر بس");
        const ref = db.collection("announcements").doc();
        try { await ref.set({ id: ref.id, text, urgent: !!urgent, speak: !!speak, createdBy: current.uid, createdByName: current.name, ts: Date.now() }); }
        catch (e) { throw authError(e); }
      },
      async deleteAnnouncement(id) {
        const acks = await db.collection("announcements").doc(id).collection("acks").get();
        const batch = db.batch();
        acks.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(db.collection("announcements").doc(id));
        try { await batch.commit(); } catch (e) { throw authError(e); }
      },
      async ackAnnouncement(id) {
        await db.collection("announcements").doc(id).collection("acks").doc(current.uid)
          .set({ uid: current.uid, name: current.name, username: current.username, ts: Date.now() });
      },
      async listAcks(id) {
        const s = await db.collection("announcements").doc(id).collection("acks").get();
        return s.docs.map((d) => d.data()).sort((a, b) => a.ts - b.ts);
      },
      /* بيمسح المحاضرات ومعاها تسجيلات الحضور بتاعتها */
      async deleteSessions(ids) {
        if (current.role !== "master") throw new Error("مسح المحاضرات من الأدمن بس");
        let batch = db.batch(), ops = 0;
        const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
        for (const id of ids) {
          const att = await db.collection("attendance").where("sessionId", "==", id).get();
          for (const d of att.docs) { batch.delete(d.ref); if (++ops >= 400) await flush(); }
          batch.delete(db.collection("sessions").doc(id)); if (++ops >= 400) await flush();
        }
        await flush();
      },
      async listSessionsByDate(date) {
        const s = await db.collection("sessions").where("date", "==", date).get();
        return docs(s).sort(byTsDesc);
      },
      async listSessionsRange(from, to) {
        const s = await db.collection("sessions").where("date", ">=", from).where("date", "<=", to).get();
        return docs(s).sort(byTsDesc);
      },

      async addAttendance(session, worker) {
        const id = session.id + "_" + worker.nid;
        const ref = db.collection("attendance").doc(id);
        const rec = {
          id, sessionId: session.id, nid: worker.nid, workerName: worker.name, company: worker.company || "",
          type: session.type, topic: session.topic, date: session.date,
          officerUid: current.uid, officerUsername: current.username, officerName: current.name, ts: Date.now()
        };
        const existing = await ref.get();
        if (existing.exists) return { duplicate: true, rec: existing.data() };
        await ref.set(rec);
        db.collection("sessions").doc(session.id).update({ count: FV.increment(1) }).catch(() => {});
        return { duplicate: false, rec };
      },
      async removeAttendance(id) {
        const ref = db.collection("attendance").doc(id);
        const s = await ref.get(); if (!s.exists) return;
        await ref.delete();
        db.collection("sessions").doc(s.data().sessionId).update({ count: FV.increment(-1) }).catch(() => {});
      },
      async listAttendanceBySession(sid) {
        const s = await db.collection("attendance").where("sessionId", "==", sid).get();
        return docs(s).sort(byTsDesc);
      },
      async listAttendanceByWorker(nid) {
        const s = await db.collection("attendance").where("nid", "==", nid).get();
        return docs(s).sort(byTsDesc);
      },
      async listAttendanceRange(from, to) {
        const s = await db.collection("attendance").where("date", ">=", from).where("date", "<=", to).get();
        return docs(s).sort(byTsDesc);
      }
    };
  }

  const cfg = (window.HSE_CONFIG || {}).firebase;
  window.HSE = {
    store: cfg && window.firebase ? FirebaseStore(cfg) : DemoStore(),
    util: { todayStr, normalizeArabic, randomCode }
  };
})();
