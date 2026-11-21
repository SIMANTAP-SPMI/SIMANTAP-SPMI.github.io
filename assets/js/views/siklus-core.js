/* Inti siklus PPEPP lintas tahun: satu pintu data untuk menu Audit Mutu Internal, Rencana Tindak Lanjut, Tinjauan Manajemen, dan Siklus PPEPP.
   Tidak ada salinan data. Sumber data per tahun:
   - 2022 sampai 2025 (arsip): koleksi "ppepp" (dokumen P2022..P2025: AMI, temuan, RTM, RTL; dokumen "risiko").
   - Tahun berjalan: koleksi yang sudah dipakai modul lain (ami, rtl, rtm, indikator). Temuan dan tindak lanjut tahun berjalan = baris koleksi "rtl";
     RTM tahun berjalan = koleksi "rtm". Bidang tambahan (tanggapan, tglSelesai, perpanjang, riwayat) ditulis ke baris yang sama.
   Modul ini menormalkan keduanya menjadi bentuk yang sama dan mengarahkan penulisan ke sumber aslinya. */
import { S, ctx, icon, esc, can, save, toast, openDrawer, closeDrawer, userName, eAuditee } from '../app.js';
import { AUDITORS } from '../seed.js';
import { docx, unduh } from '../ekspor.js';
import { detail } from './indikator.js';

export const TAHUN = [2022, 2023, 2024, 2025, 2026];
export const KAT = { 'KTS Mayor': '#f0616d', 'KTS Minor': '#fb923c', 'Observasi': '#f5a524' };
export const STA = { 'Open': '#f0616d', 'Proses': '#f5a524', 'Menunggu verifikasi': '#0ea5e9', 'Close': '#10b981', 'Tidak efektif': '#8b5cf6' };
export const RST = { 'Terbuka': '#f0616d', 'Proses': '#f5a524', 'Selesai': '#0ea5e9', 'Terverifikasi': '#10b981' };
const KOL_DARI = { 'Open': 'Terbuka', 'Proses': 'Proses', 'Menunggu verifikasi': 'Selesai', 'Close': 'Terverifikasi', 'Tidak efektif': 'Proses' };
const STA_DARI = { 'Terbuka': 'Open', 'Proses': 'Proses', 'Selesai': 'Menunggu verifikasi', 'Terverifikasi': 'Close' };
const MIME_D = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ROMAWI = { 22: 'I', 23: 'II', 24: 'III', 25: 'IV', 26: 'V', 27: 'VI' };

export const today = () => new Date().toISOString().slice(0, 10);
export const hari = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const tambah = (s, n) => new Date(new Date(s).getTime() + n * 864e5).toISOString().slice(0, 10);
export const tgl = (s) => { if (!s) return '–'; const [y, m, d] = s.split('-'); return `${+d} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+m - 1]} ${y}`; };
export const audName = (id) => (AUDITORS.find(a => a.id === id) || {}).nama || id;
export const tg = (c, s) => `<span class="tag" style="--c:${c}">${esc(s)}</span>`;
export const berjalan = () => +S.settings.tahun || 2026;

/* ---------- tahun terpilih (dipakai bersama semua menu siklus) ---------- */
let cur = null;
export const tahunAktif = () => (cur === null ? berjalan() : cur);
export const setTahun = (y) => { cur = y; };
export function tahunBar() {
  const b = berjalan();
  return `<div class="card" style="padding:8px 12px;margin-bottom:14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="muted small" style="margin-right:6px">Siklus tahun</span>
    ${TAHUN.map(y => `<button class="btn sm ${y === tahunAktif() ? 'pri' : 'ghost'}" data-yr="${y}">${y}${y === b ? ' · berjalan' : ''}</button>`).join('')}</div>`;
}
export function bindTahun(el, ulang) { el.querySelectorAll('[data-yr]').forEach(b => b.onclick = () => { setTahun(+b.dataset.yr); ulang(); }); }

/* ---------- sumber data ---------- */
export const docTahun = (y) => S.ppepp.find(d => d.tahun === y);
export const riskDoc = () => S.ppepp.find(d => d.id === 'risiko') || { id: 'risiko', daftar: [], _baru: true };
const tahunDari = (r) => { const m = String(r.sumberRTL || '').match(/\d{4}/); return m ? +m[0] : berjalan(); };

function dariPpepp(t, doc) {
  return { src: 'ppepp', kind: 'temuan', raw: t, doc, id: t.id, tahun: t.tahun, unit: t.unit, standar: t.standar, uraian: t.uraian, kategori: t.kategori, akar: t.akar, tindakan: t.tindakan, pic: t.pic, tglTemuan: t.tglTemuan, tenggat: t.tenggat, tglSelesai: t.tglSelesai, status: t.status, tanggapanAuditee: t.tanggapanAuditee || '', tanggapanAuditor: t.tanggapanAuditor || '', perpanjang: t.perpanjang || [], riwayat: t.riwayat || [], berulangDari: t.berulangDari || null, auditor: t.auditor || [], sumber: 'AMI ' + t.tahun };
}
function dariLegacy(r) {
  const ind = S.indikator.find(i => i.id === r.ind) || {}, y = tahunDari(r);
  const a = S.ami.find(x => x.auditee === r.unit && x.id.startsWith('AMI-' + String(y).slice(2)));
  return { src: 'legacy', kind: 'temuan', raw: r, id: r.id, tahun: y, unit: r.unit, standar: ind.kode ? `${ind.kode} · ${ind.std || ''}`.replace(/ · $/, '') : (r.led ? 'LED IABEE aitem ' + r.led : ''), ind: r.ind,
    uraian: r.ringkas || (ind.teks ? `${ind.teks}. ${(ind.ami && ind.ami.uraian) || ''}` : r.tindakan), kategori: r.temuan, akar: r.akar || '', tindakan: r.tindakan, pic: r.pic, tglTemuan: (a && a.tgl) || '', tenggat: r.tenggat, tglSelesai: r.tglSelesai || null,
    status: STA_DARI[r.status] || 'Open', tanggapanAuditee: r.tanggapanAuditee || '', tanggapanAuditor: r.tanggapanAuditor || '', perpanjang: r.perpanjang || [], riwayat: r.riwayat || [], berulangDari: r.berulangDari || null, auditor: a ? a.auditor : [], sumber: r.sumberRTL || 'AMI ' + y };
}
export function temuanTahun(y) {
  const d = docTahun(y), a = d ? (d.temuan || []).map(t => dariPpepp(t, d)) : [];
  return a.concat(S.rtl.filter(r => tahunDari(r) === y).map(dariLegacy));
}
export const semuaTemuan = () => TAHUN.flatMap(temuanTahun);
export const cariTemuan = (id) => semuaTemuan().find(t => t.id === id);

/** RTL dari keputusan RTM (arsip). Tahun berjalan belum memiliki RTL dari RTM sampai RTM disahkan. */
export function rtlRtmTahun(y) {
  const d = docTahun(y);
  return d ? (d.rtl || []).map(r => ({ src: 'ppepp', kind: 'rtm', raw: r, doc: d, id: r.id, tahun: y, unit: '', pic: r.pic, uraian: r.aksi, tindakan: '', kategori: null, tenggat: r.tenggat, tglSelesai: r.tglSelesai, status: r.status, temuanTerkait: r.temuan || [], keputusan: r.keputusan, sumber: 'RTM ' + y })) : [];
}
export function rtmTahun(y) {
  const d = docTahun(y), rtl = rtlRtmTahun(y);
  if (d && d.rtm) return { src: 'ppepp', raw: d.rtm, doc: d, id: d.rtm.id, judul: 'RTM Tahunan ' + y, tgl: d.rtm.tgl, status: d.rtm.status, peserta: d.rtm.peserta, ringkas: d.rtm.ringkas, keputusan: d.rtm.keputusan.map(k => ({ no: k.no, teks: k.teks, rtl: rtl.find(r => r.id === k.rtl) })), ilustratif: !!d.ilustratif };
  const r = S.rtm.find(x => x.id === 'RTM-' + String(y).slice(2));
  if (!r) return null;
  return { src: 'legacy', raw: r, id: r.id, judul: r.judul, tgl: r.tgl, status: r.status, peserta: r.pimpinan + ', Wakil Direktur I–III, Kepala SPM, ketua program studi, kepala unit', ringkas: '', keputusan: (r.keputusan || []).map((t, i) => ({ no: i + 1, teks: t, rtl: rtl.find(x => x.keputusan === i + 1) })), ilustratif: false };
}
export function amiTahun(y) {
  const d = docTahun(y);
  if (d && d.ami) return { src: 'ppepp', id: d.ami.id, mulai: d.ami.mulai, selesai: d.ami.selesai, tahap: d.ami.tahap, baris: d.ami.baris || d.ami.unit.map(u => ({ auditee: u, auditor: [], tgl: d.ami.mulai, status: 'Selesai' })), ba: d.ami.ba, ilustratif: !!d.ilustratif };
  const yy = String(y).slice(2), rows = S.ami.filter(a => a.id.startsWith('AMI-' + yy));
  if (!rows.length) return null;
  const sel = rows.filter(a => a.status === 'Selesai'), tgls = rows.map(a => a.tgl).sort(), selT = sel.map(a => a.tgl).sort();
  const belum = rows.filter(a => a.status !== 'Selesai');
  return { src: 'legacy', id: 'AMI-' + yy, mulai: tgls[0], selesai: selT.length ? selT[selT.length - 1] : tgls[0], tahap: belum.length ? `Tahap 1 selesai (${sel.map(a => a.auditee).join(', ')}); tahap 2 dijadwalkan ${tgl(belum.map(a => a.tgl).sort()[0])} (${belum.map(a => a.auditee).join(', ')})` : 'Selesai',
    baris: rows.map(a => ({ id: a.id, auditee: a.auditee, auditor: a.auditor, tgl: a.tgl, status: a.status })),
    ba: sel.length ? { no: `BA/AMI/SPM/${yy}/${ROMAWI[+yy] || ''}`, tgl: tambah(selT[selT.length - 1], 7), ringkas: '', ttd: ['Kepala SPM', 'Ketua Tim Auditor', 'Perwakilan Auditee'] } : null, ilustratif: false };
}

/** Semua kartu tindak lanjut satu tahun untuk papan RTL: perbaikan temuan, RTL dari RTM. Kolom papan memakai kosakata Terbuka/Proses/Selesai/Terverifikasi. */
export function kartuTL(y) {
  return temuanTahun(y).map(t => Object.assign(t, { kol: KOL_DARI[t.status] })).concat(rtlRtmTahun(y).map(r => Object.assign(r, { kol: r.status })));
}

/* ---------- ketepatan dan statistik ---------- */
export function ketepatan(t) {
  if (t.tglSelesai) { const d = hari(t.tenggat, t.tglSelesai); return d < 0 ? { k: 'ok', teks: `Lebih cepat ${-d} hari`, d } : d === 0 ? { k: 'ok', teks: 'Tepat waktu', d } : { k: 'bad', teks: `Terlambat ${d} hari`, d }; }
  if (['Close', 'Menunggu verifikasi', 'Terverifikasi', 'Selesai'].includes(t.status)) return { k: 'na', teks: 'Tanggal selesai belum dicatat', d: null };
  const s = hari(today(), t.tenggat);
  return s < 0 ? { k: 'bad', teks: `Lewat tenggat ${-s} hari`, d: -s, lewat: true } : { k: 'na', teks: `Sisa ${s} hari`, d: null };
}
export const ketBadge = (t) => { const k = ketepatan(t); return `<span class="st ${k.k}">${k.teks}</span>`; };
export const stBadge = (t) => tg(STA[t.status] || '#94a3b8', t.status);
export function statTahun(y) {
  const t = temuanTahun(y), sel = t.filter(x => x.tglSelesai), tepat = sel.filter(x => ketepatan(x).d <= 0), r = rtlRtmTahun(y);
  return { n: t.length, mayor: t.filter(x => x.kategori === 'KTS Mayor').length, minor: t.filter(x => x.kategori === 'KTS Minor').length, obs: t.filter(x => x.kategori === 'Observasi').length, close: t.filter(x => x.status === 'Close').length, belum: t.filter(x => x.status !== 'Close').length, sel: sel.length, tepat: tepat.length, rep: t.filter(x => x.berulangDari).length, lewat: t.filter(x => !x.tglSelesai && ketepatan(x).lewat).length, rtl: r.length, rtlV: r.filter(x => x.status === 'Terverifikasi').length };
}
export function ringkasSiklus() {
  const st = TAHUN.map(statTahun), sum = (k) => st.reduce((a, s) => a + s[k], 0), n = sum('n'), risk = riskDoc().daftar || [];
  return { n, close: sum('close'), belum: sum('belum'), lewat: sum('lewat'), rep: sum('rep'), tepatPct: sum('sel') ? Math.round(sum('tepat') / sum('sel') * 100) : 0, closePct: n ? Math.round(sum('close') / n * 100) : 0, risikoTinggi: risk.filter(r => r.kemungkinan * r.dampak >= 15 && r.status !== 'Ditutup').length };
}

/* ---------- penulisan (diarahkan ke sumber aslinya) ---------- */
export async function tulis(n, patch, aksi) {
  const riw = { t: new Date().toISOString(), oleh: userName(), aksi };
  if (n.src === 'ppepp') {
    Object.assign(n.raw, patch); if (n.kind === 'temuan') n.raw.riwayat = (n.raw.riwayat || []).concat([riw]);
    await save('ppepp', n.doc, `${n.kind === 'rtm' ? 'RTL' : 'Temuan'} ${n.id}: ${aksi}`); return;
  }
  const r = n.raw, p = Object.assign({}, patch);
  if ('status' in p) r.status = { 'Open': 'Terbuka', 'Proses': 'Proses', 'Menunggu verifikasi': 'Selesai', 'Close': 'Terverifikasi', 'Tidak efektif': 'Proses' }[p.status] || p.status;
  ['tglSelesai', 'tanggapanAuditee', 'tanggapanAuditor', 'tenggat', 'perpanjang'].forEach(k => { if (k in p) r[k] = p[k]; });
  r.riwayat = (r.riwayat || []).concat([riw]);
  const ind = S.indikator.find(i => i.id === r.ind);
  if (ind && 'status' in p) {
    ind.pengendalian = Object.assign({ rekomendasi: 'Pantau 3 bulan melalui monitoring bulanan.' }, ind.pengendalian, { pelaksanaan: r.status === 'Proses' ? 'Perbaikan sedang berjalan.' : 'Tindakan perbaikan dilaksanakan; bukti diunggah.', efektivitas: r.status === 'Terverifikasi' ? 'Efektif' : r.status === 'Selesai' ? 'Menunggu verifikasi' : 'Dalam proses' });
    await save('indikator', ind);
  }
  await save('rtl', r, `RTL ${r.id}: ${aksi}`);
}
export const bolehAuditee = (t) => ctx.role === 'admin' || (eAuditee() && (!t.unit || ctx.unit === t.unit));
export const bolehAuditor = (t) => ctx.role === 'admin' || (ctx.role === 'auditor' && (!t.unit || can('audit', { unit: t.unit })));
export const bolehPimpinan = () => ctx.role === 'admin' || can('rtm');

/* ---------- daftar temuan (menu AMI, tab Temuan) ---------- */
const F = { u: '', kat: '', st: '', q: '' };
export function temuanTabel(el, y, ulang) {
  const semua = temuanTahun(y), q = F.q.toLowerCase(), unitList = [...new Set(semua.map(t => t.unit))];
  const list = semua.filter(t => (!F.u || t.unit === F.u) && (!F.kat || t.kategori === F.kat) && (!F.st || t.status === F.st) && (!q || (t.id + ' ' + t.uraian + ' ' + t.standar + ' ' + t.unit).toLowerCase().includes(q)));
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  el.innerHTML = `<div class="card">
    <div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('audit')}</span><div><h3>Temuan AMI ${y}</h3><div class="sub">${list.length} dari ${semua.length} temuan. Klik baris untuk uraian, tanggapan, perbaikan, dan verifikasi.</div></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <select class="inp" id="f-u"><option value="">Semua unit</option>${opt(unitList, F.u)}</select>
      <select class="inp" id="f-kat"><option value="">Semua kategori</option>${opt(Object.keys(KAT), F.kat)}</select>
      <select class="inp" id="f-st"><option value="">Semua status</option>${opt(Object.keys(STA), F.st)}</select>
      <input class="inp" id="f-q" placeholder="Cari temuan" value="${esc(F.q)}" style="min-width:180px"></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Unit</th><th>Standar dan uraian</th><th>Kategori</th><th>Tenggat</th><th>Selesai</th><th>Ketepatan</th><th>Status</th></tr></thead><tbody>
    ${list.map(t => `<tr class="click" data-id="${t.id}"><td><b>${t.id}</b>${t.berulangDari ? `<div class="muted small">berulang dari ${t.berulangDari}</div>` : ''}</td><td><b>${t.unit}</b></td><td style="max-width:420px"><div class="muted small">${esc(t.standar)}</div>${esc(t.uraian)}</td><td>${tg(KAT[t.kategori] || '#94a3b8', t.kategori)}</td><td>${tgl(t.tenggat)}${t.perpanjang.length ? '<div class="muted small">diperpanjang</div>' : ''}</td><td>${tgl(t.tglSelesai)}</td><td>${ketBadge(t)}</td><td>${stBadge(t)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Tidak ada temuan yang cocok.</td></tr>'}
    </tbody></table></div></div>`;
  const bind = (id, k) => { el.querySelector(id).onchange = (e) => { F[k] = e.target.value; temuanTabel(el, y, ulang); }; };
  bind('#f-u', 'u'); bind('#f-kat', 'kat'); bind('#f-st', 'st'); bind('#f-q', 'q');
  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => drawerTemuan(tr.dataset.id, ulang));
}

/* ---------- rincian temuan: satu komponen untuk menu AMI, RTL, dan Siklus ---------- */
export function drawerTemuan(id, ulang) {
  const t = cariTemuan(id); if (!t) return;
  const rtl = rtlRtmTahun(t.tahun).filter(r => r.temuanTerkait.includes(t.id));
  const lanjut = semuaTemuan().filter(x => x.berulangDari === t.id);
  const aE = bolehAuditee(t), aA = bolehAuditor(t);
  const garis = [['Temuan', t.tglTemuan], ['Tenggat awal', t.perpanjang.length ? t.perpanjang[0].dari : t.tenggat], ...t.perpanjang.map(p => ['Perpanjangan', p.ke]), ['Selesai', t.tglSelesai]];
  const selesai = async (patch, aksi, pesan) => { await tulis(t, patch, aksi); closeDrawer(); toast(pesan); ulang(); };
  openDrawer(`<div class="card-h"><h3>${t.id} · ${t.unit}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${tg(KAT[t.kategori] || '#94a3b8', t.kategori)}${stBadge(t)}${ketBadge(t)}<span class="tag" style="--c:#64748b">${esc(t.sumber)}</span></div>
    <div class="muted small">${esc(t.standar)}</div><p style="margin:4px 0 10px"><b>${esc(t.uraian)}</b></p>
    ${t.akar ? `<div class="small"><b>Akar masalah.</b> ${esc(t.akar)}</div>` : ''}
    <div class="small" style="margin-top:6px"><b>Tindakan yang disepakati.</b> ${esc(t.tindakan)}</div>
    <div class="small" style="margin-top:6px"><b>Penanggung jawab.</b> ${esc(t.pic)}${t.auditor.length ? ` · <b>Auditor.</b> ${t.auditor.map(audName).join(', ')}` : ''}</div>
    <div class="small" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">${garis.map(([a, b]) => `<span class="tag" style="--c:#0ea5e9">${a}: ${tgl(b)}</span>`).join('')}</div>
    ${t.berulangDari ? `<div class="small" style="margin-top:8px">Berulang dari <a href="#" data-go="${t.berulangDari}">${t.berulangDari}</a>.</div>` : ''}
    ${lanjut.length ? `<div class="small" style="margin-top:4px">Muncul lagi sebagai ${lanjut.map(x => `<a href="#" data-go="${x.id}">${x.id}</a>`).join(', ')}.</div>` : ''}
    ${t.perpanjang.map(p => `<div class="small muted" style="margin-top:4px">Perpanjangan ke ${tgl(p.ke)}: ${esc(p.alasan)}</div>`).join('')}
    ${t.ind ? `<button class="btn sm ghost" id="t-ind" style="margin-top:8px">${icon('eye')} Lihat indikator</button>` : ''}
  </div>
  <div class="card" style="margin-top:12px"><h4 style="margin:0 0 6px">Tanggapan auditee</h4>
    <textarea class="inp" id="t-ae" rows="3" ${aE ? '' : 'disabled'}>${esc(t.tanggapanAuditee)}</textarea>
    <h4 style="margin:10px 0 6px">Tanggapan auditor</h4>
    <textarea class="inp" id="t-au" rows="3" ${aA ? '' : 'disabled'}>${esc(t.tanggapanAuditor)}</textarea>
    ${aE || aA ? `<button class="btn sm" id="t-simpan" style="margin-top:8px">${icon('check')} Simpan tanggapan</button>` : '<div class="muted small" style="margin-top:6px">Hanya auditee unit ini, auditor, dan SPM yang dapat mengisi tanggapan.</div>'}
  </div>
  <div class="card" style="margin-top:12px"><h4 style="margin:0 0 8px">Tindak lanjut</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${aE && t.status === 'Open' ? '<button class="btn sm" id="t-mulai">Mulai perbaikan</button>' : ''}
      ${aE && ['Open', 'Proses', 'Tidak efektif'].includes(t.status) ? `<button class="btn sm" id="t-lapor">${icon('upload')} Lapor selesai</button>` : ''}
      ${aA && t.status === 'Menunggu verifikasi' ? `<button class="btn sm pri" id="t-close">${icon('check')} Verifikasi: Close</button><button class="btn sm" id="t-tidak">Tidak efektif</button>` : ''}
      ${aE && t.status !== 'Close' ? `<button class="btn sm ghost" id="t-perp">${icon('calendar')} Perpanjang tenggat</button>` : ''}
    </div><div id="t-perp-f"></div>
    ${rtl.length ? `<div class="small" style="margin-top:10px"><b>Terkait RTL dari RTM.</b> ${rtl.map(r => `${r.id} (${r.status})`).join(', ')}</div>` : ''}
  </div>
  ${t.riwayat.length ? `<div class="card" style="margin-top:12px"><h4 style="margin:0 0 6px">Riwayat perubahan</h4>${t.riwayat.slice().reverse().map(r => `<div class="small muted">${r.t.slice(0, 10)} · ${esc(r.oleh)} · ${esc(r.aksi)}</div>`).join('')}</div>` : ''}`, d => {
    const b = (i, f) => { const x = d.querySelector(i); if (x) x.onclick = f; };
    d.querySelectorAll('[data-go]').forEach(a => a.onclick = (e) => { e.preventDefault(); closeDrawer(); setTimeout(() => drawerTemuan(a.dataset.go, ulang), 120); });
    b('#t-ind', () => { closeDrawer(); detail(t.ind, ulang); });
    b('#t-simpan', () => { const p = {}; if (aE) p.tanggapanAuditee = d.querySelector('#t-ae').value.trim(); if (aA) p.tanggapanAuditor = d.querySelector('#t-au').value.trim(); selesai(p, 'Tanggapan disimpan', 'Tanggapan tersimpan'); });
    b('#t-mulai', () => selesai({ status: 'Proses' }, 'Perbaikan dimulai', 'Status: Proses'));
    b('#t-lapor', () => selesai({ status: 'Menunggu verifikasi', tglSelesai: today() }, 'Perbaikan dilaporkan selesai', 'Menunggu verifikasi auditor'));
    b('#t-close', () => selesai({ status: 'Close' }, 'Diverifikasi auditor: Close', 'Temuan ditutup'));
    b('#t-tidak', () => selesai({ status: 'Tidak efektif', tglSelesai: null }, 'Diverifikasi auditor: tidak efektif, perbaikan diulang', 'Dikembalikan ke auditee'));
    b('#t-perp', () => {
      const f = d.querySelector('#t-perp-f');
      f.innerHTML = `<div class="grid g2" style="gap:8px;margin-top:10px"><div class="field"><label>Tenggat baru</label><input class="inp" type="date" id="pp-t" value="${t.tenggat}" min="${t.tenggat}"></div><div class="field"><label>Alasan</label><input class="inp" id="pp-a"></div></div><button class="btn sm pri" id="pp-s" style="margin-top:8px">Simpan perpanjangan</button>`;
      f.querySelector('#pp-s').onclick = () => { const ke = f.querySelector('#pp-t').value, al = f.querySelector('#pp-a').value.trim(); if (!ke || ke <= t.tenggat) return toast('Tenggat baru harus setelah tenggat saat ini'); if (al.length < 10) return toast('Isi alasan perpanjangan'); selesai({ perpanjang: t.perpanjang.concat([{ tgl: today(), dari: t.tenggat, ke, alasan: al }]), tenggat: ke }, `Tenggat diperpanjang ke ${ke}`, 'Tenggat diperpanjang'); };
    });
  });
}

/** Rincian RTL dari keputusan RTM (papan RTL, kartu bertanda RTM). */
export function drawerRtlRtm(id, y, ulang) {
  const r = rtlRtmTahun(y).find(x => x.id === id); if (!r) return;
  const ok = bolehPimpinan(), ver = ctx.role === 'admin' || ctx.role === 'auditor';
  const ubah = async (st, aksi) => { const p = { status: st }; if (st === 'Selesai') p.tglSelesai = today(); await tulis(r, p, aksi); closeDrawer(); toast(aksi); ulang(); };
  openDrawer(`<div class="card-h"><h3>${r.id} · RTL dari RTM ${y}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div style="display:flex;gap:6px;margin-bottom:8px">${tg(RST[r.status], r.status)}${ketBadge(r)}</div><p style="margin:0 0 8px"><b>${esc(r.uraian)}</b></p>
    <div class="small">Penanggung jawab: ${esc(r.pic)} · Tenggat: ${tgl(r.tenggat)} · Selesai: ${tgl(r.tglSelesai)}</div>
    <div class="small" style="margin-top:8px"><b>Temuan terkait.</b> ${r.temuanTerkait.map(i => `<a href="#" class="tag" style="--c:#0ea5e9" data-go="${i}">${i}</a>`).join(' ') || 'Kebijakan pimpinan, tanpa temuan khusus'}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      ${ok && r.status === 'Terbuka' ? '<button class="btn sm" id="r-p">Mulai</button>' : ''}${ok && r.status === 'Proses' ? `<button class="btn sm" id="r-s">${icon('upload')} Lapor selesai</button>` : ''}${ver && r.status === 'Selesai' ? `<button class="btn sm pri" id="r-v">${icon('check')} Verifikasi</button>` : ''}</div></div>`, d => {
    d.querySelectorAll('[data-go]').forEach(a => a.onclick = (e) => { e.preventDefault(); closeDrawer(); setTimeout(() => drawerTemuan(a.dataset.go, ulang), 120); });
    const b = (i, f) => { const x = d.querySelector(i); if (x) x.onclick = f; };
    b('#r-p', () => ubah('Proses', 'RTL dimulai')); b('#r-s', () => ubah('Selesai', 'RTL dilaporkan selesai')); b('#r-v', () => ubah('Terverifikasi', 'RTL diverifikasi'));
  });
}

/* ---------- dokumen: berita acara AMI dan notulen RTM ---------- */
export function beritaAcara(y) {
  const a = amiTahun(y), t = temuanTahun(y), s = statTahun(y);
  if (!a || !a.ba) return toast('Berita acara belum tersedia: AMI belum selesai');
  const au = [...new Set(a.baris.flatMap(b => b.auditor))].map(audName).join(', ');
  const blok = [{ t: 'h1', v: `BERITA ACARA AUDIT MUTU INTERNAL ${y}` }, { t: 'p', v: `Nomor: ${a.ba.no}` }, { t: 'p', v: `Pada tanggal ${tgl(a.ba.tgl)} telah dilaksanakan Audit Mutu Internal (${a.id}) pada periode ${tgl(a.mulai)} sampai ${tgl(a.selesai)} di PEM Akamigas.` },
    { t: 'h2', v: 'Lingkup dan tim' }, { t: 'p', v: `Auditee: ${a.baris.map(b => b.auditee).join(', ')}.` }, { t: 'p', v: `Auditor: ${au}.` },
    { t: 'h2', v: 'Ringkasan hasil' }, { t: 'p', v: `Ditemukan ${s.n} temuan: ${s.mayor} KTS Mayor, ${s.minor} KTS Minor, dan ${s.obs} Observasi. Temuan berulang dari siklus sebelumnya: ${s.rep}.` },
    { t: 'h2', v: 'Daftar temuan' }, ...t.map(x => ({ t: 'li', v: `${x.id} (${x.unit}, ${x.kategori}): ${x.uraian} Tenggat perbaikan ${tgl(x.tenggat)}; penanggung jawab ${x.pic}.` })),
    { t: 'h2', v: 'Penutup' }, { t: 'p', v: 'Auditee menyatakan menerima hasil audit dan akan menyampaikan rencana perbaikan sesuai tenggat. Hasil audit dibawa ke Rapat Tinjauan Manajemen.' },
    { t: 'p', v: `Penandatangan: ${a.ba.ttd.join(', ')}.` }, { t: 'cat', v: a.ilustratif ? 'Dokumen contoh (ilustratif), bukan dokumen resmi.' : '' }];
  unduh(`Berita_Acara_AMI_${y}.docx`, docx(blok), MIME_D);
}
export function notulen(y) {
  const r = rtmTahun(y); if (!r) return toast('RTM belum tersedia');
  const blok = [{ t: 'h1', v: `NOTULEN RAPAT TINJAUAN MANAJEMEN ${y}` }, { t: 'p', v: `${r.id}, ${tgl(r.tgl)}. Status: ${r.status}.` }, { t: 'p', v: `Peserta: ${r.peserta}.` }, ...(r.ringkas ? [{ t: 'h2', v: 'Bahan tinjauan' }, { t: 'p', v: r.ringkas }] : []),
    { t: 'h2', v: 'Keputusan dan tindak lanjut' }, ...(r.keputusan.length ? r.keputusan.map(k => ({ t: 'li', v: `${k.no}. ${k.teks}${k.rtl ? ` (${k.rtl.id}; PIC ${k.rtl.pic}; tenggat ${tgl(k.rtl.tenggat)}; status ${k.rtl.status})` : ''}.` })) : [{ t: 'p', v: 'Belum ada keputusan.' }]),
    { t: 'cat', v: r.ilustratif ? 'Dokumen contoh (ilustratif), bukan dokumen resmi.' : '' }];
  unduh(`Notulen_RTM_${y}.docx`, docx(blok), MIME_D);
}
