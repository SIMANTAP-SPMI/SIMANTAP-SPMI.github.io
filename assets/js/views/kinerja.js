/* Kinerja pelaksana SPMI: skor 0-100 untuk SPM, Auditor, dan Auditee per siklus AMI, tahun, atau semester.
   Skor hanya menghitung fakta yang tercatat (kelengkapan dan ketepatan waktu terhadap batas tahap pada timeline siklus), bukan penilaian subjektif.
   Komponen yang belum dapat dihitung (misalnya belum ada temuan) dikeluarkan dan bobot sisanya dinormalkan. Rumus ditampilkan di laporan.
   Data indikator hanya tersimpan untuk siklus berjalan, sehingga laporan mencakup jadwal AMI yang ada di koleksi ami. */
import { S, ctx, icon, esc } from '../app.js';
import { AUDITORS, UNIT } from '../seed.js';
import { gelombangUnit, lingkupUnit, selesai } from './amisiklus.js';
import { temuanTahun, berjalan, today, tgl } from './siklus-core.js';
import { FOKUS, cfgKinerja, jenisKegiatan } from './tampilan.js';

export const KIN = { tipe: 'siklus', tahun: null };
const TIPE = [['siklus', 'Siklus AMI'], ['tahun', 'Tahun kalender'], ['ganjil', 'Semester ganjil (Agu–Jan)'], ['genap', 'Semester genap (Feb–Jul)']];
const thn = () => KIN.tahun || berjalan();
const tahunRow = (a) => 2000 + (+String(a.id).slice(4, 6) || berjalan() - 2000);
const audNama = (id) => (AUDITORS.find(a => a.id === id) || {}).nama || id;

export function barisPeriode() {
  const y = thn(), mulai = cfgKinerja().mulai, r = S.ami.filter(a => !mulai || a.tgl >= mulai);
  if (KIN.tipe === 'siklus') return r.filter(a => tahunRow(a) === y);
  if (KIN.tipe === 'tahun') return r.filter(a => String(a.tgl).startsWith(String(y)));
  if (KIN.tipe === 'ganjil') return r.filter(a => a.tgl >= `${y}-08-01` && a.tgl <= `${y + 1}-01-31`);
  return r.filter(a => a.tgl >= `${y}-02-01` && a.tgl <= `${y}-07-31`);
}
export const predikat = (s) => s >= 90 ? ['Sangat baik', '#10b981'] : s >= 75 ? ['Baik', '#0ea5e9'] : s >= 60 ? ['Cukup', '#f5a524'] : ['Perlu perhatian', '#f0616d'];
const pct = (a, b) => b ? a / b : null;
/** komponen: [nama, bobot, nilai 0..1 atau null, keterangan]; skor dinormalkan atas komponen yang bisa dihitung. */
function skorDari(komp) {
  const ada = komp.filter(k => k[2] != null), bobot = ada.reduce((s, k) => s + k[1], 0);
  return { skor: bobot ? Math.round(ada.reduce((s, k) => s + k[1] * k[2], 0) / bobot * 100) : null, komp };
}
/** Komponen baru dinilai setelah tahap terkait lewat; tanpa timeline, selalu dinilai. */
const jatuhTempo = (g, k) => { const b = batas(g, k); return !b || today() > b; };
const batas = (g, k) => { const t = g && g.tahap.find(x => x.k === k); return t ? selesai(t) : null; };

export function hitungAuditee(row) {
  const u = row.auditee, y = tahunRow(row), g = gelombangUnit(u, y), ling = lingkupUnit(u, y), n = ling.length;
  const ed = ling.filter(i => i.ed), bED = batas(g, 'ed'), tepatED = bED ? ed.filter(i => i.ed.tgl && i.ed.tgl <= bED).length : null;
  const bukti = ling.filter(i => Object.values(i.bukti || {}).some(a => a.some(b => b.verified))).length;
  const dED = jatuhTempo(g, 'ed'), dLap = jatuhTempo(g, 'lap');
  const tm = temuanTahun(y).filter(t => t.unit === u), tmDue = tm.filter(t => t.status === 'Close' || (t.tenggat && t.tenggat <= today())), tepatTK = tmDue.filter(t => t.status === 'Close' && t.tglSelesai && t.tglSelesai <= t.tenggat).length;
  return Object.assign({ unit: u, nama: (UNIT[u] || {}).nama || u }, skorDari([
    ['Evaluasi diri terisi', 40, dED ? pct(ed.length, n) : null, dED ? `${ed.length} dari ${n} indikator dalam lingkup` : `belum jatuh tempo (batas ${tgl(bED)})`],
    ['Evaluasi diri tepat waktu', 20, bED && dED ? pct(tepatED, ed.length) : null, bED ? (dED ? `${tepatED} dari ${ed.length} terisi sebelum ${tgl(bED)}` : `belum jatuh tempo (batas ${tgl(bED)})`) : 'timeline belum ditetapkan'],
    ['Bukti terverifikasi', 20, dLap ? pct(bukti, n) : null, dLap ? `${bukti} dari ${n} indikator punya bukti terverifikasi` : 'belum jatuh tempo'],
    ['Tindakan koreksi Close tepat waktu', 20, pct(tepatTK, tmDue.length), tmDue.length ? `${tepatTK} dari ${tmDue.length} temuan yang sudah jatuh tempo atau Close` : 'belum ada temuan jatuh tempo']]));
}

export function hitungAuditor(id) {
  const semuaRows = barisPeriode().filter(a => (a.auditor || []).includes(id)), rows = semuaRows.filter(a => jatuhTempo(gelombangUnit(a.auditee, tahunRow(a)), 'lap'));
  let n = 0, aud = 0, tepat = 0, tm = [];
  rows.forEach(a => { const y = tahunRow(a), ling = lingkupUnit(a.auditee, y), g = gelombangUnit(a.auditee, y), b = batas(g, 'lap');
    n += ling.length; const diaudit = ling.filter(i => i.ami); aud += diaudit.length; if (b) tepat += diaudit.filter(i => i.ami.tgl && i.ami.tgl <= b).length; tm = tm.concat(temuanTahun(y).filter(t => t.unit === a.auditee)); });
  const adaB = rows.some(a => batas(gelombangUnit(a.auditee, tahunRow(a)), 'lap')), lapor = tm.filter(t => ['Menunggu verifikasi', 'Close'].includes(t.status)), ver = lapor.filter(t => t.status === 'Close').length;
  return Object.assign({ id, nama: audNama(id), unit: semuaRows.map(a => a.auditee).join(', ') }, skorDari([
    ['Indikator dalam lingkup sudah diaudit', 50, pct(aud, n), rows.length ? `${aud} dari ${n} indikator (${rows.map(a => a.auditee).join(', ')})` : 'belum ada penugasan yang jatuh tempo'],
    ['Diaudit sebelum batas tahap audit lapangan', 30, adaB ? pct(tepat, aud) : null, adaB ? `${tepat} dari ${aud} diaudit tepat waktu` : 'timeline belum ditetapkan'],
    ['Tindakan koreksi yang dilaporkan selesai sudah diverifikasi', 20, pct(ver, lapor.length), lapor.length ? `${ver} dari ${lapor.length}` : 'belum ada yang dilaporkan selesai']]));
}

export function hitungSPM() {
  const rows = barisPeriode(), due = rows.filter(a => a.tgl <= today());
  const rtm = [...new Set(rows.map(tahunRow))].map(y => S.rtm.find(r => r.id === 'RTM-' + String(y).slice(2))).filter(Boolean), rtmDue = rtm.filter(r => r.tgl && r.tgl <= today());
  return Object.assign({ nama: 'SPM' }, skorDari([
    ['Siklus dan lingkup ditetapkan untuk auditee', 25, pct(rows.filter(a => gelombangUnit(a.auditee, tahunRow(a))).length, rows.length), `${rows.filter(a => gelombangUnit(a.auditee, tahunRow(a))).length} dari ${rows.length} auditee`],
    ['Auditor ditugaskan', 25, pct(rows.filter(a => (a.auditor || []).length).length, rows.length), `${rows.filter(a => (a.auditor || []).length).length} dari ${rows.length} auditee`],
    ['AMI terlaksana sesuai jadwal', 30, pct(due.filter(a => a.status === 'Selesai').length, due.length), due.length ? `${due.filter(a => a.status === 'Selesai').length} dari ${due.length} jadwal yang sudah jatuh tempo` : 'belum ada yang jatuh tempo'],
    ['RTM terlaksana', 20, pct(rtmDue.filter(r => r.status === 'Selesai').length, rtmDue.length), rtmDue.length ? `${rtmDue.filter(r => r.status === 'Selesai').length} dari ${rtmDue.length} RTM yang sudah jatuh tempo` : 'RTM belum jatuh tempo']]));
}

export const lencana = (s) => { if (s == null) return '<span class="muted small">belum dapat dihitung</span>'; const [t, c] = predikat(s); return `<span class="tag" style="--c:${c}"><b>${s}</b> · ${t}</span>`; };
export const detail = (komp) => komp.map(k => `<div class="small" style="display:flex;gap:6px;align-items:center;margin:2px 0"><span style="width:44px" class="muted">${k[1]}%</span><span style="flex:1">${esc(k[0])}: <span class="muted">${esc(k[3])}</span></span><b>${k[2] == null ? '–' : Math.round(k[2] * 100) + '%'}</b></div>`).join('');

/** Kartu skor sendiri di beranda "Tugas saya" (siklus AMI tahun berjalan). */
export function kartuSkor(jenis, id) {
  const saved = Object.assign({}, KIN); KIN.tipe = 'siklus'; KIN.tahun = null;
  let h = '';
  try {
    const r = jenis === 'auditor' ? hitungAuditor(id) : (() => { const row = barisPeriode().find(a => a.auditee === id); return row ? hitungAuditee(row) : null; })();
    if (r) h = `<div class="card" style="margin-top:16px"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('spark')}</span><div><h3>Capaian kerja saya</h3><div class="sub">Siklus AMI ${berjalan()} · dihitung dari yang sudah tercatat</div></div><div class="sp"></div>${lencana(r.skor)}</div>${detail(r.komp)}<div style="margin-top:8px"><a class="btn sm" href="#/laporan">${icon('download')} Laporan kinerja</a></div></div>`;
  } finally { Object.assign(KIN, saved); }
  return h;
}

/* ---------- laporan ---------- */
export function kontrolKinerja() {
  return `<select class="inp" id="kT">${TIPE.map(([k, n]) => `<option value="${k}" ${KIN.tipe === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <select class="inp" id="kY">${[berjalan() - 1, berjalan(), berjalan() + 1].map(y => `<option ${thn() === y ? 'selected' : ''}>${y}</option>`).join('')}</select>`;
}
export function bindKinerja(el, ulang) {
  const t = el.querySelector('#kT'), y = el.querySelector('#kY');
  if (t) t.onchange = () => { KIN.tipe = t.value; ulang(); };
  if (y) y.onchange = () => { KIN.tahun = +y.value; ulang(); };
}

function jejak(filter, maks = 12) {
  const c = cfgKinerja();
  return S.log.filter(l => l.peran && filter(l) && (!c.mulai || String(l.t).slice(0, 10) >= c.mulai) && c.kegiatan.includes(jenisKegiatan(l.aksi))).slice(0, maks).map(l => `<div class="small muted">${new Date(l.t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · ${esc(l.aksi)}</div>`).join('') || '<div class="small muted">Belum ada jejak terstruktur (dicatat mulai 26 November 2026).</div>';
}

export function kinerjaLaporan() {
  const rows = barisPeriode(), semua = !FOKUS.includes(ctx.role), judulPer = (TIPE.find(t => t[0] === KIN.tipe) || [])[1] + ' ' + thn();
  const csv = [['Peran', 'Pelaksana', 'Skor', 'Predikat', 'Komponen (bobot) = nilai', 'Keterangan']];
  const baris = (peran, nama, r) => csv.push([peran, nama, r.skor ?? '', r.skor == null ? '' : predikat(r.skor)[0], r.komp.map(k => `${k[0]} (${k[1]}%) = ${k[2] == null ? '-' : Math.round(k[2] * 100) + '%'}`).join(' | '), r.komp.map(k => k[3]).join(' | ')]);
  let h = `<div class="card" style="padding:12px 14px;margin-bottom:14px"><div class="small"><b>Cara membaca skor.</b> Skor 0–100 dihitung dari kelengkapan dan ketepatan waktu pekerjaan yang tercatat, terhadap batas tahap pada timeline siklus. Predikat: Sangat baik ≥ 90, Baik ≥ 75, Cukup ≥ 60, Perlu perhatian di bawahnya. Komponen yang belum dapat dihitung dikeluarkan dan bobot sisanya dinormalkan. Periode: ${esc(judulPer)}, ${rows.length} jadwal AMI.</div></div>`;
  const blok = (judul, ikon, warna, isi) => `<div class="card" style="margin-bottom:16px"><div class="card-h"><span class="ico-badge" style="--c:${warna}">${icon(ikon)}</span><div><h3>${judul}</h3></div></div>${isi}</div>`;
  if (semua) {
    const s = hitungSPM(); baris('SPM', 'SPM', s);
    h += blok('SPM · penyelenggara siklus', 'flag', '#6366f1', `<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">${lencana(s.skor)}</div>${detail(s.komp)}<details style="margin-top:8px"><summary class="small">Jejak aktivitas SPM</summary>${jejak(l => l.peran === 'admin')}</details>`);
  }
  const ids = [...new Set(rows.flatMap(a => a.auditor || []))].filter(id => semua || (ctx.role === 'auditor' && id === ctx.auditor));
  h += blok('Auditor', 'audit', '#8b5cf6', ids.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Auditor</th><th>Skor</th><th>Rincian</th></tr></thead><tbody>${ids.map(id => { const r = hitungAuditor(id); baris('Auditor', r.nama + ' (' + r.unit + ')', r);
    return `<tr><td><b>${esc(r.nama)}</b><div class="muted small">${esc(r.unit)}</div></td><td>${lencana(r.skor)}</td><td>${detail(r.komp)}<details><summary class="small">Jejak aktivitas</summary>${jejak(l => l.auditor === id)}</details></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">Tidak ada penugasan auditor pada periode ini.</div>');
  const aRows = rows.filter(a => semua || (a.auditee === ctx.unit));
  h += blok('Auditee', 'user', '#0ea5e9', aRows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Auditee</th><th>Skor</th><th>Rincian</th></tr></thead><tbody>${aRows.map(a => { const r = hitungAuditee(a); baris('Auditee', r.unit + ' · ' + r.nama, r);
    return `<tr><td><b>${esc(r.unit)}</b><div class="muted small">${esc(r.nama)}</div></td><td>${lencana(r.skor)}</td><td>${detail(r.komp)}<details><summary class="small">Jejak aktivitas</summary>${jejak(l => l.unit === r.unit)}</details></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">Tidak ada auditee pada periode ini.</div>');
  return { html: h, rows: csv };
}
