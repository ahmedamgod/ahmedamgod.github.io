// الاتصال بـ Firebase: الحسابات وقاعدة البيانات
import { initializeApp } from '../vendor/firebase-app.js';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, sendEmailVerification, updateProfile, EmailAuthProvider, reauthenticateWithCredential,
  updatePassword, deleteUser,
} from '../vendor/firebase-auth.js';
import {
  initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, query, where, orderBy, limit,
  writeBatch, addDoc, serverTimestamp,
} from '../vendor/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

export const fs = { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot, query, where, orderBy, limit, writeBatch, addDoc, serverTimestamp };

const useEmu = (() => { try { return localStorage.getItem('rehla.emu') === '1'; } catch { return false; } })();

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'ar';
let cache;
try { cache = persistentLocalCache({ tabManager: persistentMultipleTabManager() }); } catch { cache = memoryLocalCache(); }
export const db = initializeFirestore(app, { localCache: useEmu ? memoryLocalCache() : cache, ignoreUndefinedProperties: true });
if (useEmu) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}


// أول حالة دخول (بعد ما Firebase يقرا الجلسة المحفوظة)
export function firstUser() {
  return new Promise((resolve) => {
    const un = onAuthStateChanged(auth, (u) => { un(); resolve(u); });
  });
}
export const onUser = (cb) => onAuthStateChanged(auth, cb);
export const currentUser = () => auth.currentUser;

const AR_ERRORS = {
  'auth/email-already-in-use': 'الإيميل ده متسجل قبل كده، جرّب تدخل',
  'auth/invalid-email': 'الإيميل مش مظبوط',
  'auth/weak-password': 'الباسورد لازم يكون ٦ حروف على الأقل',
  'auth/user-not-found': 'مفيش حساب بالإيميل ده',
  'auth/wrong-password': 'الباسورد غلط',
  'auth/invalid-credential': 'الإيميل أو الباسورد غلط',
  'auth/invalid-login-credentials': 'الإيميل أو الباسورد غلط',
  'auth/too-many-requests': 'محاولات كتير — استنى شوية وجرّب تاني',
  'auth/network-request-failed': 'مفيش نت — اتأكد من الاتصال وجرّب تاني',
  'auth/requires-recent-login': 'لأمانك، اخرج وادخل تاني وبعدين جرّب',
  'auth/operation-not-allowed': 'التسجيل بالإيميل مش متفعّل في Firebase',
  'permission-denied': 'مش مسموحلك تعمل ده',
  unavailable: 'مفيش اتصال بالسيرفر دلوقتي',
};
export function arError(e) {
  const code = e?.code || '';
  return AR_ERRORS[code] || AR_ERRORS[code.replace('firestore/', '')] || (e?.message?.startsWith('rehla:') ? e.message.slice(6) : 'حصلت مشكلة — جرّب تاني');
}

export async function register({ name, email, password, consent }) {
  if (!name.trim()) throw new Error('rehla:اكتب اسمك');
  if (!consent) throw new Error('rehla:لازم توافق على المتابعة عشان تكمّل');
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await setDoc(doc(db, 'users', cred.user.uid), {
    name: name.trim(), email: cred.user.email, createdAt: Date.now(), lastActive: Date.now(),
    supervisorId: null, disabled: false, consentAt: Date.now(), summary: {},
  });
  sendEmailVerification(cred.user).catch(() => {});
  return cred.user;
}

export const login = ({ email, password }) => signInWithEmailAndPassword(auth, email.trim(), password).then((c) => c.user);
export const logout = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());
export const resendVerification = () => auth.currentUser && sendEmailVerification(auth.currentUser);

export async function changePassword(oldPw, newPw) {
  const u = auth.currentUser;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, oldPw));
  await updatePassword(u, newPw);
}

export async function getUserDoc(uid) {
  const s = await getDoc(doc(db, 'users', uid));
  return s.exists() ? s.data() : null;
}

export async function giveConsent(uid, name, email) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) await updateDoc(ref, { consentAt: Date.now(), lastActive: Date.now() });
  else await setDoc(ref, { name, email, createdAt: Date.now(), lastActive: Date.now(), supervisorId: null, disabled: false, consentAt: Date.now(), summary: {} });
}

// ===== حالة المستخدم =====
export async function pullState(uid) {
  const [st, js] = await Promise.all([
    getDoc(doc(db, 'users', uid, 'data', 'state')),
    getDocs(collection(db, 'users', uid, 'journal')),
  ]);
  if (!st.exists()) return null;
  const { state, updatedAt } = st.data();
  const s = JSON.parse(state);
  s.journal = js.docs.map((d) => ({ id: d.id, ...d.data() }));
  s.updatedAt = updatedAt;
  return s;
}

export async function pushState(uid, stateNoJournal, updatedAt, summary) {
  const b = writeBatch(db);
  b.set(doc(db, 'users', uid, 'data', 'state'), { state: JSON.stringify(stateNoJournal), updatedAt });
  b.set(doc(db, 'users', uid), { summary, lastActive: Date.now(), name: stateNoJournal.profile?.name || '', avatar: stateNoJournal.profile?.avatar || '' }, { merge: true });
  await b.commit();
}

export async function pushJournal(uid, changed, removed) {
  if (!changed.length && !removed.length) return;
  const b = writeBatch(db);
  for (const j of changed) b.set(doc(db, 'users', uid, 'journal', j.id), { title: j.title || '', body: j.body || '', date: j.date, image: j.image || '', createdAt: j.createdAt || Date.now(), updatedAt: j.updatedAt || Date.now() });
  for (const id of removed) b.delete(doc(db, 'users', uid, 'journal', id));
  await b.commit();
}

export const watchUserDoc = (uid, cb) => onSnapshot(doc(db, 'users', uid), (s) => cb(s.exists() ? s.data() : null), () => {});
export const watchInbox = (uid, cb) => onSnapshot(query(collection(db, 'users', uid, 'inbox'), orderBy('at', 'desc'), limit(50)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
export const watchBroadcasts = (cb) => onSnapshot(query(collection(db, 'broadcasts'), orderBy('at', 'desc'), limit(20)), (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
export const markInboxRead = (uid, id) => updateDoc(doc(db, 'users', uid, 'inbox', id), { read: true }).catch(() => {});

// مسح الحساب: البيانات وبعدين الحساب نفسه
export async function deleteMyAccount(password) {
  const u = auth.currentUser;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
  const uid = u.uid;
  for (const sub of ['journal', 'inbox', 'data']) {
    const snap = await getDocs(collection(db, 'users', uid, sub));
    const b = writeBatch(db);
    snap.docs.forEach((d) => b.delete(d.ref));
    if (snap.size) await b.commit();
  }
  await deleteDoc(doc(db, 'users', uid));
  await deleteUser(u);
}
