/* SIMANTAP 2.0 · Lapisan database
   - Mode "firebase": Cloud Firestore (dimuat dari CDN gstatic bila konfigurasi diisi
     di config.js atau di halaman Pengaturan).
   - Mode "local": localStorage peramban (fallback, untuk demo/offline).
   Seluruh data dimuat ke memori saat start; setiap perubahan ditulis per dokumen. */
import { FIREBASE_CONFIG } from './config.js';

export const COLLECTIONS = ['indikator', 'ami', 'rtl', 'rtm', 'dokumen', 'log', 'settings'];
const LS_PREFIX = 'simantap2web_';
const LS_FBCFG = 'simantap2web_firebase_config';
const FB_VER = '10.12.2';

let mode = 'local', fs = null, lastError = null;

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src));
    document.head.appendChild(s);
  });
}

export function getFirebaseConfig() {
  try { const c = JSON.parse(localStorage.getItem(LS_FBCFG) || 'null'); if (c && c.projectId) return c; } catch (e) { /* abaikan */ }
  return FIREBASE_CONFIG.projectId ? FIREBASE_CONFIG : null;
}
export function saveFirebaseConfig(cfg) {
  try { cfg ? localStorage.setItem(LS_FBCFG, JSON.stringify(cfg)) : localStorage.removeItem(LS_FBCFG); } catch (e) { /* abaikan */ }
}

async function initFirebase(cfg) {
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore-compat.js`);
  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg);
  fs = app.firestore();
  await fs.collection('settings').limit(1).get(); // uji koneksi & aturan akses
}

export const DB = {
  get mode() { return mode; },
  get error() { return lastError; },

  async init() {
    const cfg = getFirebaseConfig();
    if (cfg) {
      try { await initFirebase(cfg); mode = 'firebase'; }
      catch (e) { lastError = e.message || String(e); mode = 'local'; console.warn('Firestore tidak tersedia, memakai database lokal:', lastError); }
    }
    return mode;
  },

  async loadAll() {
    const out = {};
    if (mode === 'firebase') {
      for (const c of COLLECTIONS) {
        const snap = await fs.collection(c).get();
        out[c] = snap.docs.map(d => d.data());
      }
    } else {
      for (const c of COLLECTIONS) {
        try { out[c] = JSON.parse(localStorage.getItem(LS_PREFIX + c) || '[]'); } catch (e) { out[c] = []; }
      }
    }
    return out;
  },

  async put(col, doc, all) {
    if (mode === 'firebase') { await fs.collection(col).doc(String(doc.id)).set(JSON.parse(JSON.stringify(doc))); }
    else this._saveLocal(col, all);
  },

  async del(col, id, all) {
    if (mode === 'firebase') await fs.collection(col).doc(String(id)).delete();
    else this._saveLocal(col, all);
  },

  async replaceAll(col, arr) {
    if (mode === 'firebase') {
      const old = await fs.collection(col).get();
      let batch = fs.batch(), n = 0;
      const flush = async () => { await batch.commit(); batch = fs.batch(); n = 0; };
      for (const d of old.docs) { batch.delete(d.ref); if (++n >= 400) await flush(); }
      for (const doc of arr) { batch.set(fs.collection(col).doc(String(doc.id)), JSON.parse(JSON.stringify(doc))); if (++n >= 400) await flush(); }
      if (n) await batch.commit();
    } else this._saveLocal(col, arr);
  },

  _saveLocal(col, arr) {
    try { localStorage.setItem(LS_PREFIX + col, JSON.stringify(arr)); }
    catch (e) { lastError = 'Penyimpanan lokal penuh/terblokir'; console.warn(e); }
  },

  clearLocal() { COLLECTIONS.forEach(c => { try { localStorage.removeItem(LS_PREFIX + c); } catch (e) { /* abaikan */ } }); }
};
