/* SIMANTAP 2.0 · Aplikasi utama: state, peran, router, dan utilitas bersama. */
import { APP, APP_LAIN } from './config.js';
import { DB } from './db.js';
import { buildSeed, UNITS, UNIT, ROLES, AUDITORS } from './seed.js';
import { icon } from './icons.js';
import { disposeAll, tilt } from './charts.js';
import { disposeHero } from './hero3d.js';
import { BULAN } from './scoring.js';

import beranda from './views/beranda.js';
import dashboard from './views/dashboard.js';
import { katalog, monitoring } from './views/indikator.js';
import simulasi from './views/simulasi.js';
import skema from './views/skema.js';
import { amiView, rtmView, rtlView } from './views/siklus.js';
import akreditasi from './views/akreditasi.js';
import dokumen from './views/dokumen.js';
import pengaturan from './views/pengaturan.js';
import wadir from './views/wadir.js';
import penggunaView from './views/pengguna.js';
import jalurView from './views/jalur.js';
import ledView from './views/led.js';
import amiIabeeView from './views/amiiabee.js';
import amiLamView from './views/amilam.js';
import { LAM_AWAL } from './lam-awal.js';
import ppeppView from './views/ppepp.js';
import { PPEPP_AWAL } from './ppepp-awal.js';
import laporan from './views/laporan.js';

/* ---------------- state ---------------- */
export const S = { indikator: [], ami: [], rtl: [], rtm: [], dokumen: [], log: [], settings: {}, kurekam: [], kurPengguna: [], pengguna: [], iabee: [], led: [], lam: [], ppepp: [] };
const CTX_KEY = 'simantap2web_ctx';
export const ctx = (() => {
  try { return Object.assign({ role: 'pimpinan', unit: 'TP', auditor: 'AU01' }, JSON.parse(localStorage.getItem(CTX_KEY) || '{}')); }
  catch (e) { return { role: 'pimpinan', unit: 'TP', auditor: 'AU01' }; }
})();
export function saveCtx() { try { localStorage.setItem(CTX_KEY, JSON.stringify(ctx)); } catch (e) { /* abaikan */ } }

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* Peran pengisi (auditee): Prodi, Unit, dan Kasubbag AK. Ketiganya mengisi capaian, evaluasi diri, dan tindak lanjut unitnya. */
export const AUDITEE = ['prodi', 'unit', 'kasubbag'];
export const eAuditee = (r = ctx.role) => AUDITEE.includes(r);
const jenisUnit = (u) => (UNIT[u] || {}).jenis;

export function userName() {
  if (ctx.me && (ctx.me.nama || ctx.me.email)) return ctx.me.nama || ctx.me.email;
  if (ctx.role === 'auditor') return (AUDITORS.find(a => a.id === ctx.auditor) || {}).nama || 'Auditor';
  if (eAuditee()) return ROLES[ctx.role].nama + (ctx.role === 'kasubbag' ? '' : ' ' + ctx.unit);
  return ROLES[ctx.role].nama;
}

/* Samakan unit dengan peran yang dipilih: Kasubbag AK selalu unit AKD, Prodi memakai prodi, Unit memakai unit non-prodi. */
export function selaraskanUnit() {
  if (!eAuditee()) return;
  const tetap = ctx.unitPer && ctx.unitPer[ctx.role];
  if (ctx.role === 'kasubbag') ctx.unit = 'AKD';
  else if (tetap) ctx.unit = tetap;
  else if (ctx.role === 'prodi' && jenisUnit(ctx.unit) !== 'prodi') ctx.unit = 'TP';
  else if (ctx.role === 'unit' && jenisUnit(ctx.unit) !== 'unit') ctx.unit = 'UPPM';
}

/* Peran KUREKAM yang dibaca SIMANTAP. Daftar pengguna KUREKAM adalah satu-satunya tempat mendaftarkan SPM, Prodi, Kasubbag AK, dan Wakil Direktur I.
   Admin dan developer KUREKAM tampil sebagai SPM (SIMANTAP tidak punya peran admin atau developer). */
const KUR_PETA = { spm: 'admin', admin: 'admin', developer: 'admin', wadir: 'wadir1', pimpinan: 'pimpinan', prodi: 'prodi', akademik: 'kasubbag' };
const DEVELOPER_SHA = ['f512cb3abb950d4c65241a0fda6c394decc7b29da869d6f51bbe36b9b1804a7b']; // sama dengan KUREKAM
let sidikDev = false;
async function cekDeveloper() {
  sidikDev = false; const em = DB.user && DB.user.email ? DB.user.email.toLowerCase() : ''; if (!em || !window.crypto || !crypto.subtle) return;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kurekam:' + em)); sidikDev = DEVELOPER_SHA.includes(Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')); } catch (e) { /* abaikan */ }
}
const urutPeran = (arr) => Object.keys(ROLES).filter(k => k !== 'tamu' && arr.includes(k));
/** Peran SIMANTAP yang diturunkan dari satu dokumen kur_pengguna (untuk tampilan daftar pengguna). */
export function peranDariKurekam(ku) {
  const out = [];
  (ku.peran || []).forEach(k => { const t = KUR_PETA[k]; if (!t) return; if (t === 'prodi') { if (ku.prodi) out.push('prodi'); } else out.push(t); });
  return urutPeran(out);
}

/* Peran dari daftar pengguna (mode masuk). Mode demo tetap memakai penukar peran bebas. */
export function terapkanPeran() {
  // Mode demo (tanpa akun): semua peran bisa diperagakan, tetapi menu pengelolaan (Pengguna & Peran, Pengaturan) tidak ditampilkan.
  ctx.tersedia = Object.keys(ROLES).filter(k => k !== 'tamu'); ctx.tetap = false; ctx.bootstrap = false; ctx.me = null; ctx.unitPer = null; ctx.sumber = '';
  if (!ctx.tersedia.includes(ctx.role)) { ctx.role = 'pimpinan'; saveCtx(); }
  S.pengguna.filter(p => (p.peran || []).includes('auditor')).forEach(p => {
    if (!AUDITORS.some(a => a.id === p.id)) AUDITORS.push({ id: p.id, nama: p.nama || p.email, home: p.home || '' });
  });
  if (!DB.user || !DB.user.email) { selaraskanUnit(); return; }
  const em = DB.user.email.toLowerCase();
  const me = S.pengguna.find(p => (p.email || '').toLowerCase() === em);
  const ku = S.kurPengguna.find(p => (p.email || '').toLowerCase() === em);
  if (!S.pengguna.length && !S.kurPengguna.length && !sidikDev) { ctx.bootstrap = true; ctx.tersedia = ['admin']; ctx.role = 'admin'; return; } // kedua daftar kosong: pengguna pertama menjadi SPM
  const set = new Set(), unitPer = {};
  if (me) {
    (me.peran || []).forEach(k => {
      if (k === 'auditee') { const t = jenisUnit(me.unit) === 'prodi' ? 'prodi' : 'unit'; if (me.unit) { set.add(t); unitPer[t] = me.unit; } }
      else if (k === 'prodi' || k === 'unit') { if (me.unit) { set.add(k); unitPer[k] = me.unit; } }
      else if (ROLES[k] && k !== 'tamu') set.add(k);
    });
  }
  if (ku) {
    (ku.peran || []).forEach(k => {
      const t = KUR_PETA[k]; if (!t) return;
      if (t === 'prodi') { if (ku.prodi) { set.add('prodi'); unitPer.prodi = ku.prodi; } } else set.add(t);
    });
  }
  if (sidikDev) set.add('admin');
  if (set.has('kasubbag')) unitPer.kasubbag = 'AKD';
  const peran = urutPeran([...set]);
  if (!peran.length) { ctx.tersedia = ['tamu']; ctx.role = 'tamu'; ctx.tetap = true; ctx.sumber = ku ? 'kur-saja' : 'tak-terdaftar'; return; }
  ctx.me = me || (ku ? { nama: ku.nama, email: ku.email, id: ku.id } : null);
  ctx.sumber = me && ku ? 'keduanya' : ku ? 'kurekam' : 'simantap';
  const admin = peran.includes('admin');
  ctx.tersedia = admin ? Object.keys(ROLES).filter(k => k !== 'tamu') : peran;
  ctx.tetap = !admin;
  ctx.unitPer = admin ? null : unitPer;
  if (admin) ctx.role = 'admin'; // SPM memulai sebagai SPM, lalu boleh memeragakan peran lain
  else if (!ctx.tersedia.includes(ctx.role)) ctx.role = ctx.tersedia[0];
  if (peran.includes('auditor') && !admin && me) ctx.auditor = me.id;
  selaraskanUnit();
  saveCtx();
}

/** Hak akses per peran. */
export function can(action, obj) {
  const r = ctx.role;
  if (r === 'admin') return true;
  switch (action) {
    case 'capaian': case 'ed': return eAuditee(r) && obj && obj.unit === ctx.unit;
    case 'audit': {
      if (r !== 'auditor' || !obj) return false;
      const a = AUDITORS.find(x => x.id === ctx.auditor);
      return a && a.home !== obj.unit; // auditor tidak mengaudit unit asalnya
    }
    case 'rtl': return (eAuditee(r) && obj && obj.unit === ctx.unit);
    case 'verifikasi': return r === 'auditor';
    case 'rtm': case 'sahkan': return r === 'pimpinan' || r === 'wadir1';
    case 'jadwal': case 'pengguna': return false; // hanya SPM
    case 'dokumen': return false;
    case 'indikator': return false;
    default: return false;
  }
}

/* ---------------- persistensi ---------------- */
export async function save(col, doc, aksi) {
  const arr = S[col];
  const i = arr.findIndex(x => x.id === doc.id);
  if (i >= 0) arr[i] = doc; else arr.push(doc);
  try { await DB.put(col, doc, arr); } catch (e) { toast('Gagal menyimpan: ' + e.message); return; }
  if (aksi) await addLog(aksi);
}
export async function remove(col, id, aksi) {
  S[col] = S[col].filter(x => x.id !== id);
  try { await DB.del(col, id, S[col]); } catch (e) { toast('Gagal menghapus: ' + e.message); }
  if (aksi) await addLog(aksi);
}
export async function saveSettings() {
  const doc = Object.assign({ id: 'app' }, S.settings);
  try { await DB.put('settings', doc, [doc]); } catch (e) { toast('Gagal menyimpan pengaturan'); }
}
export async function addLog(aksi) {
  const doc = { id: 'LOG' + Date.now() + Math.floor(Math.random() * 1000), t: new Date().toISOString(), user: userName() + (DB.user && DB.user.email ? ' · ' + DB.user.email : ''), aksi };
  S.log.unshift(doc);
  if (S.log.length > 300) S.log.length = 300;
  try { await DB.put('log', doc, S.log); } catch (e) { /* abaikan */ }
}
export async function resetData() {
  const d = buildSeed();
  for (const c of Object.keys(d)) { await DB.replaceAll(c, d[c]); }
  load(d);
}
function load(d) {
  ['indikator', 'ami', 'rtl', 'rtm', 'dokumen', 'log'].forEach(k => { S[k] = d[k] || []; });
  S.pengguna = d.pengguna || [];
  S.iabee = d.iabee || [];
  S.led = d.led || [];
  S.lam = d.lam || [];
  S.ppepp = d.ppepp || [];
  S.settings = (d.settings && d.settings[0]) || { bulan: 10, tahun: APP.tahun, jenjang: {} };
  S.log.sort((a, b) => (b.t || '').localeCompare(a.t || ''));
}

/* ---------------- umpan dari KUREKAM ----------------
   KUREKAM menulis ringkasan kesiapan IABEE per prodi ke koleksi kur_umpan (satu dokumen per prodi).
   Di sini umpan itu hanya DIBACA: nilai indikator prodi yang bersumber dari KUREKAM menimpa tampilan
   pada bulan berjalan (di memori), tanpa mengubah dokumen indikator di basis data. */
export async function muatKurekam() {
  S.kurekam = await DB.bacaLuar('kur_umpan');
  const m = S.settings.bulan;
  S.kurekam.forEach(u => {
    const nilai = u.simantap || {};
    S.indikator.filter(i => i.unit === u.unit && nilai[i.key] != null).forEach(i => {
      const cap = (i.cap || []).slice(); cap[m] = +nilai[i.key];
      i.cap = cap; i.kurekam = { periode: u.periode, waktu: u.waktu };
    });
  });
}

/* ---------------- drawer ---------------- */
export function openDrawer(html, onMount) {
  closeDrawer();
  const bg = document.createElement('div'); bg.className = 'drawer-bg'; bg.id = 'drawer';
  bg.innerHTML = `<div class="drawer" role="dialog" aria-modal="true">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeDrawer(); });
  document.body.appendChild(bg);
  const x = bg.querySelector('[data-close]'); if (x) x.onclick = closeDrawer;
  if (onMount) onMount(bg.querySelector('.drawer'));
}
export function closeDrawer() { const d = document.getElementById('drawer'); if (d) d.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

/* ---------------- navigasi ---------------- */
export const ROUTES = [
  { id: 'beranda', t: 'Beranda', ic: 'home', c: '#10b981', sec: 'Ringkasan', v: beranda },
  { id: 'dashboard', t: 'Dashboard Pimpinan', ic: 'dash', c: '#0ea5e9', sec: 'Ringkasan', v: dashboard },
  { id: 'simulasi', t: 'Simulasi Skenario', ic: 'sim', c: '#8b5cf6', sec: 'Ringkasan', v: simulasi },
  { id: 'wadir-1', t: 'Wakil Direktur I', sub: 'Akademik', ic: 'book', c: '#0ea5e9', sec: 'Pimpinan', v: el => wadir(el, 1) },
  { id: 'wadir-2', t: 'Wakil Direktur II', sub: 'Umum & Keuangan', ic: 'db', c: '#f5a524', sec: 'Pimpinan', v: el => wadir(el, 2) },
  { id: 'wadir-3', t: 'Wakil Direktur III', sub: 'Kemahasiswaan & Kerja Sama', ic: 'user', c: '#8b5cf6', sec: 'Pimpinan', v: el => wadir(el, 3) },
  { id: 'indikator', t: 'Katalog Indikator', ic: 'target', c: '#14b8a6', sec: 'Penetapan & Pelaksanaan', v: katalog },
  { id: 'monitoring', t: 'Monitoring Capaian', ic: 'pulse', c: '#f5a524', sec: 'Penetapan & Pelaksanaan', v: monitoring },
  { id: 'ami', t: 'Audit Mutu Internal', ic: 'audit', c: '#f0616d', sec: 'Evaluasi & Pengendalian', v: amiView },
  { id: 'rtl', t: 'Rencana Tindak Lanjut', ic: 'loop', c: '#6366f1', sec: 'Evaluasi & Pengendalian', v: rtlView },
  { id: 'rtm', t: 'Tinjauan Manajemen', ic: 'meet', c: '#f472b6', sec: 'Evaluasi & Pengendalian', v: rtmView },
  { id: 'ppepp', t: 'Siklus PPEPP', sub: 'Satu tahun satu layar, 2022–2026', ic: 'loop', c: '#f0616d', sec: 'Evaluasi & Pengendalian', v: ppeppView },
  { id: 'akreditasi', t: 'Akreditasi LAM & IABEE', ic: 'medal', c: '#10b981', sec: 'Akreditasi', v: akreditasi },
  { id: 'jalur', t: 'Jalur IABEE', sub: 'Dari pemahaman sampai keputusan', ic: 'flag', c: '#8b5cf6', sec: 'Akreditasi', v: jalurView },
  { id: 'led', t: 'LED IABEE', sub: '53 aitem: narasi, bukti, kelengkapan', ic: 'book', c: '#0ea5e9', sec: 'Akreditasi', v: ledView },
  { id: 'amiiabee', t: 'AMI Kesiapan IABEE', sub: 'Auditor, temuan, matriks prediksi', ic: 'audit', c: '#f0616d', sec: 'Akreditasi', v: amiIabeeView },
  { id: 'amilam', t: 'AMI Akreditasi LAM Teknik', sub: '64 butir, rumus resmi instrumen 2025', ic: 'audit', c: '#14b8a6', sec: 'Akreditasi', v: amiLamView },
  { id: 'skema', t: 'Skema Capaian & Metode', ic: 'layers', c: '#0ea5e9', sec: 'Akreditasi', v: skema },
  { id: 'laporan', t: 'Laporan', ic: 'download', c: '#14b8a6', sec: 'Evaluasi & Pengendalian', v: laporan },
  { id: 'dokumen', t: 'Dokumen SPMI', ic: 'folder', c: '#f5a524', sec: 'Sistem', v: dokumen },
  { id: 'pengguna', t: 'Pengguna & Peran', ic: 'users', c: '#6366f1', sec: 'Sistem', v: penggunaView },
  { id: 'pengaturan', t: 'Database & Pengaturan', ic: 'db', c: '#64748b', sec: 'Sistem', v: pengaturan }
];

// Menu Database & Pengaturan hanya untuk pengguna yang sudah masuk (bukan mode demo)
const navRoutes = () => ROUTES.filter(r => (r.id !== 'pengaturan' || DB.user) && (r.id !== 'pengguna' || (DB.user && ctx.role === 'admin')));

function renderSide(cur) {
  let sec = '', h = `<div class="brand-logos"><img src="assets/img/logo-pem-akamigas.png" alt="PEM Akamigas" class="lg-pem"><img src="assets/img/logo-esdm.png" alt="Kementerian ESDM" class="lg-esdm"></div>
    <div class="brand"><div class="brand-logo">${icon('spark')}</div><div><b>${APP.nama}</b><small>Sistem Penjaminan Mutu Internal</small></div></div><nav class="nav">`;
  navRoutes().forEach(r => {
    if (r.sec !== sec) { sec = r.sec; h += `<div class="nav-sec">${sec}</div>`; }
    h += `<a href="#/${r.id}" class="${r.id === cur ? 'on' : ''}" style="--c:${r.c}"><span class="chip">${icon(r.ic)}</span><span>${r.t}${r.sub ? `<small class="nsub">${r.sub}</small>` : ''}</span></a>`;
  });
  h += `<div class="nav-sec">Aplikasi lain</div><a href="${APP_LAIN.kurekam.url}" target="_blank" rel="noopener" style="--c:#10b981"><span class="chip">${icon('book')}</span><span>KUREKAM<small class="nsub">Kurikulum dan kesiapan IABEE</small></span></a>`;
  h += `</nav><div class="side-foot">${APP.institusi}<br>Data prodi terkalibrasi · ${BULAN[S.settings.bulan]} ${S.settings.tahun}</div>`;
  $('#side').innerHTML = h;
  $$('#side a').forEach(a => a.addEventListener('click', () => $('#side').classList.remove('open')));
}

function renderTop(route) {
  const unitOpts = UNITS.filter(u => ctx.role === 'prodi' ? u.jenis === 'prodi' : u.jenis === 'unit').map(u => `<option value="${u.id}" ${u.id === ctx.unit ? 'selected' : ''}>${u.id}</option>`).join('');
  const labelPeran = (k) => ROLES[k].nama + ((k === 'prodi' || k === 'unit') && ctx.tetap && ctx.unitPer && ctx.unitPer[k] ? ' ' + ctx.unitPer[k] : '');
  const audOpts = AUDITORS.map(a => `<option value="${a.id}" ${a.id === ctx.auditor ? 'selected' : ''}>${a.nama} (${a.home})</option>`).join('');
  $('#top').innerHTML = `
    <button class="btn ghost menu-btn" id="menuBtn" aria-label="Menu">${icon('menu')}</button>
    <div><div class="crumb">${route.sec}</div><h1>${route.t}</h1></div>
    <div class="sp"></div>
    ${DB.user ? `<span class="pill-db ${DB.mode === 'firebase' ? 'fb' : ''}" title="${DB.mode === 'firebase' ? 'Terhubung ke Cloud Firestore' : 'Database lokal peramban'}"><i></i><span>${DB.mode === 'firebase' ? 'Firestore' : 'Lokal'}</span></span>` : ''}
    <div class="role-box">
      <span class="ico-badge" style="--c:#6366f1;width:32px;height:32px">${icon('user')}</span>
      ${ctx.tetap && ctx.tersedia.length === 1
        ? `<span class="tag" style="--c:#6366f1" title="${esc(ROLES[ctx.role].ket || '')}">${esc(userName())} · ${esc(labelPeran(ctx.role))}</span>`
        : `<select class="inp" id="roleSel" aria-label="Peran">${ctx.tersedia.map(k => `<option value="${k}" ${k === ctx.role ? 'selected' : ''}>${esc(labelPeran(k))}</option>`).join('')}</select>`}
      ${(ctx.role === 'prodi' || ctx.role === 'unit') && !ctx.tetap ? `<select class="inp rl" id="unitSel" aria-label="Unit">${unitOpts}</select>` : ''}
      ${ctx.role === 'auditor' && !ctx.tetap ? `<select class="inp rl" id="audSel" aria-label="Auditor">${audOpts}</select>` : ''}
    </div>
    ${DB.user ? `<button class="btn" id="logoutBtn" title="Keluar dari ${esc(DB.user.email || '')}">${icon('logout')} Keluar</button>` : ''}`;
  $('#menuBtn').onclick = () => $('#side').classList.toggle('open');
  const lo = $('#logoutBtn'); if (lo) lo.onclick = async () => { if (!confirm('Keluar dari SIMANTAP 2.0?')) return; await DB.logout(); location.reload(); };
  const rs = $('#roleSel'); if (rs) rs.onchange = e => { ctx.role = e.target.value; selaraskanUnit(); saveCtx(); route_(); };
  const us = $('#unitSel'); if (us) us.onchange = e => { ctx.unit = e.target.value; saveCtx(); route_(); };
  const as = $('#audSel'); if (as) as.onchange = e => { ctx.auditor = e.target.value; saveCtx(); route_(); };
}

export function route_() {
  const id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'beranda';
  const r = navRoutes().find(x => x.id === id) || ROUTES[0];
  disposeAll(); disposeHero(); closeDrawer();
  renderSide(r.id); renderTop(r);
  const view = $('#view');
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  view.innerHTML = APP.dataIlustratif ? `<div class="ribbon">${icon('info')} Data dosen, publikasi, waktu tunggu, dan kesesuaian bidang kerja lima prodi dikalibrasi dengan SK LAM Teknik, LKPS terverifikasi asesor, dan Kepegawaian 2026. Indikator unit dan proses masih contoh sampai diisi data resmi (RSB, PK BLU, Kokin, PDDikti).</div>` : '';
  if (ctx.role === 'tamu' && DB.user) view.insertAdjacentHTML('afterbegin', `<div class="ribbon">${icon('info')} Akun ${esc(DB.user.email || '')} ${ctx.sumber === 'kur-saja' ? 'terdaftar di KUREKAM, tetapi perannya (misalnya Dosen) tidak punya tugas di SIMANTAP' : 'belum terdaftar'}, sehingga hanya bisa melihat. SPM, Prodi, Kasubbag AK, dan Wakil Direktur I didaftarkan di KUREKAM (menu Data induk). Pimpinan, Auditor, dan Unit didaftarkan SPM di menu Pengguna & Peran. Hubungi SPM.</div>`);
  const holder = document.createElement('div'); view.appendChild(holder);
  try { r.v(holder); } catch (e) { console.error(e); holder.innerHTML = `<div class="card empty">Terjadi kesalahan saat memuat halaman: ${esc(e.message)}</div>`; }
  tilt(view);
  window.scrollTo({ top: 0 });
}

const kolomSandi = (id, ph) => `<div style="position:relative"><input class="inp" id="${id}" type="password" placeholder="${ph}" required autocomplete="current-password" style="width:100%;padding-right:112px"><button type="button" class="btn ghost sm" data-mata="${id}" style="position:absolute;right:4px;top:50%;transform:translateY(-50%)">${icon('eye')} Lihat</button></div>`;
function pasangMata(root) {
  root.querySelectorAll('[data-mata]').forEach(b => b.onclick = () => {
    const i = root.querySelector('#' + b.dataset.mata), buka = i.type === 'password';
    i.type = buka ? 'text' : 'password'; b.innerHTML = `${icon('eye')} ${buka ? 'Sembunyikan' : 'Lihat'}`;
  });
}
function pesanMasuk(e) {
  const c = e.code || '';
  if (/wrong-password|invalid-credential|invalid-login|user-not-found/.test(c)) return 'Email atau kata sandi tidak cocok. Akun yang dipakai sama dengan KUREKAM. Bila lupa, klik "Lupa kata sandi".';
  if (c === 'permission-denied') return 'Akun berhasil masuk, tetapi aturan database belum mengizinkan akses. Hubungi SPM.';
  if (c === 'auth/too-many-requests') return 'Terlalu banyak percobaan. Tunggu beberapa menit atau pakai "Lupa kata sandi".';
  if (c === 'auth/network-request-failed') return 'Koneksi internet bermasalah. Coba lagi.';
  return 'Gagal masuk: ' + (e.message || c);
}
function loginForm() {
  return new Promise(resolve => {
    const v = $('#view');
    v.innerHTML = `<div class="card" style="max-width:440px;margin:40px auto">
      <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('db')}</span><div><h3>Masuk ke SIMANTAP 2.0</h3><div class="sub">Akun sama dengan KUREKAM. Peran SPM, Prodi, dan Kasubbag AK otomatis mengikuti daftar pengguna KUREKAM.</div></div></div>
      <form id="lgn" style="display:grid;gap:10px;margin-top:12px">
        <input class="inp" id="lg-e" type="email" placeholder="Email" autocomplete="username" required>
        ${kolomSandi('lg-p', 'Kata sandi')}
        <button class="btn pri" type="submit">Masuk</button>
        <div class="muted small" id="lg-msg"></div>
        <button class="btn" type="button" id="lg-fp">Lupa kata sandi? Kirim tautan ke email saya</button>
        <div class="small muted">Pengguna baru: kata sandi awal sama dengan alamat email (huruf kecil), seperti di KUREKAM.</div>
      </form></div>`;
    pasangMata(v);
    const msg = t => { v.querySelector('#lg-msg').textContent = t; };
    v.querySelector('#lgn').onsubmit = async ev => {
      ev.preventDefault(); msg('Memeriksa akun...');
      try { await DB.login(v.querySelector('#lg-e').value.trim().toLowerCase(), v.querySelector('#lg-p').value); resolve(); }
      catch (e) { msg(pesanMasuk(e) + (e.code ? ' (' + e.code + ')' : '')); }
    };
    v.querySelector('#lg-fp').onclick = async ev => {
      ev.preventDefault(); const em = v.querySelector('#lg-e').value.trim().toLowerCase();
      if (!em) return msg('Isi email lebih dulu, lalu klik Lupa kata sandi.');
      try { await DB.resetPassword(em); msg('Tautan membuat kata sandi baru dikirim ke ' + em + ' bila email itu sudah punya akun. Periksa juga folder spam.'); } catch (e) { msg(pesanMasuk(e)); }
    };
  });
}

/* 17 Nov 2026: lulusan milik unit karier (CDC), bukan Akademik. Indikator lama di AKD dipindahkan sekali (data lain tidak diubah). */
async function pindahkanLulusanKeKarier() {
  const ind = S.indikator.find(i => i.unit === 'AKD' && /^Lulusan pendidikan vokasi ESDM/.test(i.teks || ''));
  if (!ind) return;
  ind.unit = 'CDC';
  try { await DB.put('indikator', ind, S.indikator); } catch (e) { /* pengguna tanpa hak tulis: perubahan hanya di tampilan, akan tersimpan saat SPM membuka */ }
  for (const r of S.rtl.filter(x => x.ind === ind.id && x.unit === 'AKD')) { r.unit = 'CDC'; try { await DB.put('rtl', r, S.rtl); } catch (e) { /* abaikan */ } }
}

async function boot() {
  await DB.init(); // mode demo ditutup 24 Nov 2026: akses hanya lewat akun
  if (DB.needLogin) await loginForm();
  let d = await DB.loadAll();
  const st = d.settings && d.settings[0];
  if (!d.indikator.length || !st || (st.seedVersi || 0) < 6) {
    d = buildSeed();
    for (const c of Object.keys(d)) await DB.replaceAll(c, d[c]);
  }
  /* Kode prodi Logistik diseragamkan dengan KUREKAM: LO menjadi LG. Diganti di memori setiap muat, lalu ditulis ulang ke basis data. */
  const ubahLG = (v) => typeof v === 'string' ? v.replace(/\bLO\b/g, 'LG') : Array.isArray(v) ? v.map(ubahLG) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k === 'LO' ? 'LG' : k, ubahLG(x)])) : v;
  const migLG = [];
  for (const c of Object.keys(d)) { if (Array.isArray(d[c]) && /\bLO\b/.test(JSON.stringify(d[c]))) { const m = new Map(); d[c].map(ubahLG).forEach((x, i) => m.set(x && x.id != null ? x.id : 'i' + i, x)); d[c] = Array.from(m.values()); migLG.push(c); } }
  if (ctx.unit === 'LO') ctx.unit = 'LG';
  if (ctx.auditor && /\bLO\b/.test(ctx.auditor)) ctx.auditor = ctx.auditor.replace(/\bLO\b/, 'LG');
  saveCtx();
  for (const c of migLG) { try { await DB.replaceAll(c, d[c]); } catch (e) { console.warn('Penyeragaman LG gagal untuk ' + c + ': ' + e.message); } }
  load(d);
  if (DB.mode !== 'firebase' && !S.ppepp.length) { for (const a of PPEPP_AWAL) { const c = JSON.parse(JSON.stringify(a)); S.ppepp.push(c); try { await DB.put('ppepp', c, S.ppepp); } catch (e) { /* abaikan */ } } }
  if (DB.mode !== 'firebase' && !S.lam.length) { for (const a of LAM_AWAL) { const c = JSON.parse(JSON.stringify(a)); S.lam.push(c); try { await DB.put('lam', c, S.lam); } catch (e) { /* abaikan */ } } }
  S.kurPengguna = await DB.bacaLuar('kur_pengguna');
  await cekDeveloper();
  await pindahkanLulusanKeKarier();
  terapkanPeran();
  if (DB.mode === 'firebase' && ctx.role === 'tamu') { // akun tanpa peran di SIMANTAP (mis. dosen) tidak diberi akses
    $('#view').innerHTML = `<div class="card" style="max-width:480px;margin:40px auto"><div class="card-h"><div><h3>Akun ini belum punya akses SIMANTAP</h3><div class="sub">SIMANTAP hanya untuk Pimpinan, Wakil Direktur I, SPM, Prodi, Kasubbag AK, Auditor, dan Unit. Hubungi SPM bila Anda ditugaskan.</div></div></div><button class="btn" id="keluar">Keluar</button></div>`;
    $('#keluar').onclick = async () => { try { await DB.logout(); } catch (e) { /* abaikan */ } location.reload(); };
    return;
  }
  await muatKurekam();
  window.addEventListener('hashchange', route_);
  route_();
}
boot().catch(e => { console.error(e); $('#view').innerHTML = `<div class="card empty">Gagal memulai aplikasi: ${esc(e.message)}</div>`; });

export { UNIT, icon };
