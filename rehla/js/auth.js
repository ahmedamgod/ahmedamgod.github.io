// حسابات محلية على الجهاز: الباسورد بيتخزن hash بـ PBKDF2 (مش نص صريح)
import { uid } from './util.js';

const ACC = 'rehla.accounts';
const SES = 'rehla.session';

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password, saltHex) {
  if (!crypto?.subtle) throw new Error('crypto');
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}

export function accounts() {
  try { return JSON.parse(localStorage.getItem(ACC)) || []; } catch { return []; }
}
function saveAccounts(list) { localStorage.setItem(ACC, JSON.stringify(list)); }

export function currentSession() {
  try { return JSON.parse(localStorage.getItem(SES)); } catch { return null; }
}
function setSession(s) { localStorage.setItem(SES, JSON.stringify(s)); }
export function logout() { localStorage.removeItem(SES); localStorage.removeItem(CU); }

// آخر حساب (Firebase) دخل على الجهاز — عشان التطبيق يفتح على طول من غير ما يستنى النت
const CU = 'rehla.cloudUser';
export function rememberCloudUser(u) { try { localStorage.setItem(CU, JSON.stringify({ uid: u.uid, email: u.email || '', name: u.displayName || u.name || '' })); } catch {} }
export function cachedCloudUser() { try { return JSON.parse(localStorage.getItem(CU)); } catch { return null; } }

export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export async function register({ name, email, password }) {
  email = email.trim().toLowerCase();
  if (!name.trim()) throw new Error('اكتب اسمك');
  if (!validEmail(email)) throw new Error('الإيميل مش مظبوط');
  if (password.length < 6) throw new Error('الباسورد لازم يكون ٦ حروف على الأقل');
  const list = accounts();
  if (list.some((a) => a.email === email)) throw new Error('الإيميل ده متسجل قبل كده، جرّب تدخل');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt);
  const acc = { id: 'u_' + uid(), name: name.trim(), email, salt, hash, createdAt: Date.now() };
  list.push(acc);
  saveAccounts(list);
  setSession({ id: acc.id, guest: false });
  return acc;
}

export async function login({ email, password }) {
  email = email.trim().toLowerCase();
  const acc = accounts().find((a) => a.email === email);
  if (!acc) throw new Error('مفيش حساب بالإيميل ده على الجهاز');
  const hash = await hashPassword(password, acc.salt);
  if (hash !== acc.hash) throw new Error('الباسورد غلط');
  setSession({ id: acc.id, guest: false });
  return acc;
}

export function loginGuest() {
  setSession({ id: 'guest', guest: true });
  return { id: 'guest', name: '' };
}

export async function changePassword(id, oldPw, newPw) {
  const list = accounts();
  const acc = list.find((a) => a.id === id);
  if (!acc) throw new Error('الحساب مش موجود');
  if ((await hashPassword(oldPw, acc.salt)) !== acc.hash) throw new Error('الباسورد القديم غلط');
  if (newPw.length < 6) throw new Error('الباسورد الجديد لازم يكون ٦ حروف على الأقل');
  acc.salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  acc.hash = await hashPassword(newPw, acc.salt);
  saveAccounts(list);
}

export function removeAccount(id) {
  saveAccounts(accounts().filter((a) => a.id !== id));
  logout();
}

// تحويل الضيف لحساب: بننقل نفس البيانات
export async function upgradeGuest(data) {
  const acc = await register(data);
  return acc;
}
