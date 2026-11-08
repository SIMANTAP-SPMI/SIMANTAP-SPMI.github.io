/* SIMANTAP 2.0 · Aplikasi utama: state, peran, router, dan utilitas bersama. */
import { APP } from './config.js';
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
import laporan from './views/laporan.js';

/* ---------------- state ---------------- */
export const S = { indikator: [], ami: [], rtl: [], rtm: [], dokumen: [], log: [], settings: {} };
const CTX_KEY = 'simantap2web_ctx';
export const ctx = (() => {
  try { return Object.assign({ role: 'pimpinan', unit: 'TP', auditor: 'AU01' }, JSON.parse(localStorage.getItem(CTX_KEY) || '{}')); }
  catch (e) { return { role: 'pimpinan', unit: 'TP', auditor: 'AU01' }; }
})();
function saveCtx() { try { localStorage.setItem(CTX_KEY, JSON.stringify(ctx)); } catch (e) { /* abaikan */ } }

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

export function userName() {
  if (ctx.role === 'auditor') return (AUDITORS.find(a => a.id === ctx.auditor) || {}).nama || 'Auditor';
  if (ctx.role === 'auditee') return 'Auditee ' + ctx.unit;
  return ROLES[ctx.role].nama;
}

/** Hak akses per peran. */
export function can(action, obj) {
  const r = ctx.role;
  if (r === 'admin') return true;
  switch (action) {
    case 'capaian': case 'ed': return r === 'auditee' && obj && obj.unit === ctx.unit;
    case 'audit': {
      if (r !== 'auditor' || !obj) return false;
      const a = AUDITORS.find(x => x.id === ctx.auditor);
      return a && a.home !== obj.unit; // auditor tidak mengaudit unit asalnya
    }
    case 'rtl': return (r === 'auditee' && obj && obj.unit === ctx.unit);
    case 'verifikasi': return r === 'auditor';
    case 'rtm': return r === 'pimpinan';
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
  S.settings = (d.settings && d.settings[0]) || { bulan: 10, tahun: APP.tahun, jenjang: {} };
  S.log.sort((a, b) => (b.t || '').localeCompare(a.t || ''));
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
  { id: 'akreditasi', t: 'Akreditasi LAM & IABEE', ic: 'medal', c: '#10b981', sec: 'Akreditasi', v: akreditasi },
  { id: 'skema', t: 'Skema Capaian & Metode', ic: 'layers', c: '#0ea5e9', sec: 'Akreditasi', v: skema },
  { id: 'laporan', t: 'Laporan', ic: 'download', c: '#14b8a6', sec: 'Evaluasi & Pengendalian', v: laporan },
  { id: 'dokumen', t: 'Dokumen SPMI', ic: 'folder', c: '#f5a524', sec: 'Sistem', v: dokumen },
  { id: 'pengaturan', t: 'Database & Pengaturan', ic: 'db', c: '#64748b', sec: 'Sistem', v: pengaturan }
];

function renderSide(cur) {
  let sec = '', h = `<div class="brand-logos"><img src="assets/img/logo-pem-akamigas.png" alt="PEM Akamigas" class="lg-pem"><img src="assets/img/logo-esdm.png" alt="Kementerian ESDM" class="lg-esdm"></div>
    <div class="brand"><div class="brand-logo">${icon('spark')}</div><div><b>${APP.nama}</b><small>Sistem Penjaminan Mutu Internal</small></div></div><nav class="nav">`;
  ROUTES.forEach(r => {
    if (r.sec !== sec) { sec = r.sec; h += `<div class="nav-sec">${sec}</div>`; }
    h += `<a href="#/${r.id}" class="${r.id === cur ? 'on' : ''}" style="--c:${r.c}"><span class="chip">${icon(r.ic)}</span><span>${r.t}${r.sub ? `<small class="nsub">${r.sub}</small>` : ''}</span></a>`;
  });
  h += `</nav><div class="side-foot">${APP.institusi}<br>Data prodi terkalibrasi · ${BULAN[S.settings.bulan]} ${S.settings.tahun}</div>`;
  $('#side').innerHTML = h;
  $$('#side a').forEach(a => a.addEventListener('click', () => $('#side').classList.remove('open')));
}

function renderTop(route) {
  const unitOpts = UNITS.map(u => `<option value="${u.id}" ${u.id === ctx.unit ? 'selected' : ''}>${u.id}</option>`).join('');
  const audOpts = AUDITORS.map(a => `<option value="${a.id}" ${a.id === ctx.auditor ? 'selected' : ''}>${a.nama} (${a.home})</option>`).join('');
  $('#top').innerHTML = `
    <button class="btn ghost menu-btn" id="menuBtn" aria-label="Menu">${icon('menu')}</button>
    <div><div class="crumb">${route.sec}</div><h1>${route.t}</h1></div>
    <div class="sp"></div>
    <img src="assets/img/logo-esdm.png" alt="Kementerian ESDM" class="top-esdm">
    <span class="pill-db ${DB.mode === 'firebase' ? 'fb' : ''}" title="${DB.mode === 'firebase' ? 'Terhubung ke Cloud Firestore' : 'Database lokal peramban'}"><i></i><span>${DB.mode === 'firebase' ? 'Firestore' : 'Lokal'}</span></span>
    <div class="role-box">
      <span class="ico-badge" style="--c:#6366f1;width:32px;height:32px">${icon('user')}</span>
      <select class="inp" id="roleSel" aria-label="Peran">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${k === ctx.role ? 'selected' : ''}>${v.nama}</option>`).join('')}</select>
      ${ctx.role === 'auditee' ? `<select class="inp rl" id="unitSel" aria-label="Unit">${unitOpts}</select>` : ''}
      ${ctx.role === 'auditor' ? `<select class="inp rl" id="audSel" aria-label="Auditor">${audOpts}</select>` : ''}
    </div>`;
  $('#menuBtn').onclick = () => $('#side').classList.toggle('open');
  $('#roleSel').onchange = e => { ctx.role = e.target.value; saveCtx(); route_(); };
  const us = $('#unitSel'); if (us) us.onchange = e => { ctx.unit = e.target.value; saveCtx(); route_(); };
  const as = $('#audSel'); if (as) as.onchange = e => { ctx.auditor = e.target.value; saveCtx(); route_(); };
}

export function route_() {
  const id = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'beranda';
  const r = ROUTES.find(x => x.id === id) || ROUTES[0];
  disposeAll(); disposeHero(); closeDrawer();
  renderSide(r.id); renderTop(r);
  const view = $('#view');
  view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
  view.innerHTML = APP.dataIlustratif ? `<div class="ribbon">${icon('info')} Data dosen, publikasi, waktu tunggu, dan kesesuaian bidang kerja lima prodi dikalibrasi dengan SK LAM Teknik, LKPS terverifikasi asesor, dan Kepegawaian 2026. Indikator unit dan proses masih contoh sampai diisi data resmi (RSB, PK BLU, Kokin, PDDikti).</div>` : '';
  const holder = document.createElement('div'); view.appendChild(holder);
  try { r.v(holder); } catch (e) { console.error(e); holder.innerHTML = `<div class="card empty">Terjadi kesalahan saat memuat halaman: ${esc(e.message)}</div>`; }
  tilt(view);
  window.scrollTo({ top: 0 });
}

function loginForm() {
  return new Promise(resolve => {
    const v = $('#view');
    v.innerHTML = `<div class="card" style="max-width:440px;margin:40px auto">
      <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('db')}</span><div><h3>Masuk ke SIMANTAP 2.0</h3><div class="sub">Basis data bersama (Cloud Firestore). Akun dibuat oleh Admin SPM.</div></div></div>
      <form id="lgn" style="display:grid;gap:10px;margin-top:12px">
        <input class="inp" id="lg-e" type="email" placeholder="Email" autocomplete="username" required>
        <input class="inp" id="lg-p" type="password" placeholder="Kata sandi" autocomplete="current-password" required>
        <button class="btn pri" type="submit">Masuk</button>
        <div class="muted small" id="lg-msg"></div>
        <div class="small"><a href="#" id="lg-fp">Lupa kata sandi</a> · <a href="#" id="lg-local">Buka mode demo lokal</a></div>
      </form></div>`;
    const msg = t => { v.querySelector('#lg-msg').textContent = t; };
    v.querySelector('#lgn').onsubmit = async ev => {
      ev.preventDefault(); msg('Memeriksa akun...');
      try { await DB.login(v.querySelector('#lg-e').value.trim(), v.querySelector('#lg-p').value); resolve(); }
      catch (e) { msg('Gagal masuk: ' + (e.code === 'permission-denied' ? 'akun belum diberi akses' : e.message)); }
    };
    v.querySelector('#lg-fp').onclick = async ev => {
      ev.preventDefault(); const em = v.querySelector('#lg-e').value.trim();
      if (!em) return msg('Isi email terlebih dahulu.');
      try { await DB.resetPassword(em); msg('Tautan atur ulang kata sandi telah dikirim ke ' + em); } catch (e) { msg(e.message); }
    };
    v.querySelector('#lg-local').onclick = ev => { ev.preventDefault(); DB.useLocal(); resolve(); };
  });
}

async function boot() {
  await DB.init();
  if (DB.needLogin) await loginForm();
  let d = await DB.loadAll();
  const st = d.settings && d.settings[0];
  if (!d.indikator.length || !st || (st.seedVersi || 0) < 6) {
    d = buildSeed();
    for (const c of Object.keys(d)) await DB.replaceAll(c, d[c]);
  }
  load(d);
  window.addEventListener('hashchange', route_);
  route_();
}
boot().catch(e => { console.error(e); $('#view').innerHTML = `<div class="card empty">Gagal memulai aplikasi: ${esc(e.message)}</div>`; });

export { UNIT, icon };
