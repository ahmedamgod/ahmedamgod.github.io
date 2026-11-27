// تخزين دائم على الجهاز: IndexedDB، ولو مش متاح نرجع لـ localStorage
const DB_NAME = 'rehla';
const STORE = 'kv';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

function lsGet(k) {
  try { const v = localStorage.getItem('rehla:' + k); return v ? JSON.parse(v) : undefined; } catch { return undefined; }
}
function lsSet(k, v) {
  try { localStorage.setItem('rehla:' + k, JSON.stringify(v)); return true; } catch { return false; }
}

export async function get(key) {
  const db = await open();
  if (!db) return lsGet(key);
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => resolve(lsGet(key));
  });
}

export async function set(key, value) {
  const db = await open();
  if (!db) { if (!lsSet(key, value)) throw new Error('quota'); return; }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function del(key) {
  const db = await open();
  if (!db) { try { localStorage.removeItem('rehla:' + key); } catch {} return; }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
