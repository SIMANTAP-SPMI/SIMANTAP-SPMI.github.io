/* SIMANTAP 2.0 · Mesin skor: capaian → skor butir → Nilai Akreditasi (LAM Teknik 2025)
   + status & syarat perlu, keputusan IABEE (A/C/W/D), dan proyeksi skenario. */
import { LAM, IABEE, SKEMA_CAPAIAN } from './config.js';

export const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round = (v, d = 2) => { const f = Math.pow(10, d); return Math.round(v * f) / f; };
export const fmt = (v, d = 0) => v == null || isNaN(v) ? '–' : Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Nilai capaian terakhir s.d. bulan m (indeks 0–11). */
export function valueAt(ind, m) {
  for (let i = m; i >= 0; i--) if (ind.cap && ind.cap[i] != null) return { v: ind.cap[i], m: i };
  return null;
}

/** Rasio capaian thd target. Indikator kumulatif dibandingkan dengan target pro-rata bulan berjalan.
    Indikator arah "≤" dibalik (target / capaian). */
export function ratioOf(ind, v, m = 11) {
  if (v == null) return null;
  let t = Number(ind.target);
  if (ind.cum) t = t * (m + 1) / 12;
  if (ind.arah === '<=') return v <= 0 ? 1.5 : t / v;
  if (t === 0) return v > 0 ? 1.5 : 1;
  return v / t;
}
export function ratioAt(ind, m) { const x = valueAt(ind, m); return x ? ratioOf(ind, x.v, ind.cum ? x.m : 11) : null; }

/** Skema capaian → skor butir 0–4. */
export function skorDariRasio(r) {
  if (r == null) return 0;
  for (const s of SKEMA_CAPAIAN) if (r >= s.min) return s.skor;
  return 0;
}
export function kelasRasio(r) {
  if (r == null) return 'na';
  if (r >= 1) return 'ok';
  if (r >= 0.85) return 'near';
  return 'bad';
}
export const KELAS = {
  ok: { nama: 'Tercapai', warna: '#10b981' },
  near: { nama: 'Hampir tercapai', warna: '#f5a524' },
  bad: { nama: 'Belum tercapai', warna: '#f0616d' },
  na: { nama: 'Belum diisi', warna: '#a5b0c2' }
};

/* ---------------- LAM Teknik 2025 ---------------- */

function spThresholdMet(sp, nilai, lvl) {
  const t = sp[lvl];
  if (t == null) return true;
  if (nilai == null) return false;
  if (sp.jenis === 'max') return nilai <= t;
  return nilai >= t;
}
/** Tingkat tertinggi yang dipenuhi satu syarat perlu: 'unggul5' | 'unggul3' | 'terakreditasi' | 'gagal'. */
export function spLevel(sp, nilai) {
  if (!spThresholdMet(sp, nilai, 'terakreditasi')) return 'gagal';
  if (spThresholdMet(sp, nilai, 'unggul5')) return 'unggul5';
  if (spThresholdMet(sp, nilai, 'unggul3')) return 'unggul3';
  return 'terakreditasi';
}

/** Status akreditasi dari NA dan hasil syarat perlu (rule base Pedoman Penilaian 2025; verifikasi). */
export function statusLAM(NA, spRes) {
  const gagal = spRes.some(s => s.level === 'gagal');
  const all5 = spRes.every(s => s.level === 'unggul5');
  const all3 = spRes.every(s => s.level === 'unggul5' || s.level === 'unggul3');
  const A = LAM.ambang;
  let kode;
  if (gagal || NA < A.terakreditasi) kode = 'TT';
  else if (NA >= A.unggul && all5) kode = 'U5';
  else if (NA >= A.unggul && all3) kode = 'U3';
  else if (NA >= A.unggulBawah && all3) kode = 'U3';
  else kode = 'T5';
  return LAM.status.find(s => s.kode === kode);
}

/** Aspek penjaminan mutu (SP9) dihitung dari aktivitas di sistem. */
export function spmiAspects(S, prodi) {
  const inds = S.indikator.filter(i => i.aktif && i.unit === prodi);
  const m = S.settings.bulan;
  const updated = inds.filter(i => valueAt(i, m) && valueAt(i, m).m >= m - 1).length;
  const docs = S.dokumen.filter(d => d.jenis !== 'Tambahan');
  const docOk = docs.filter(d => d.status === 'Disetujui').length / Math.max(1, docs.length);
  const amiDone = S.ami.some(a => a.auditee === prodi && a.status === 'Selesai');
  const rtl = S.rtl.filter(r => r.unit === prodi);
  const rtlOk = rtl.length ? rtl.filter(r => r.status === 'Terverifikasi').length / rtl.length : 0;
  const rtmDone = S.rtm.some(r => r.status === 'Selesai');
  const naik = inds.some(i => i.peningkatan && i.peningkatan.status === 'Tingkatkan' && i.peningkatan.rtm);
  // Setiap aspek diberi skor 0–4 (rubrik), terpenuhi bila ≥ 3,5. Siklus sebelumnya (pra-SIMANTAP) memberi skor dasar.
  const pctUpd = updated / Math.max(1, inds.length);
  const a1 = pctUpd >= 0.8 && docOk >= 0.8 ? 4 : pctUpd >= 0.6 && docOk >= 0.6 ? 3 : 2;
  const amiSched = S.ami.some(a => a.auditee === prodi);
  const a2 = amiDone ? 4 : amiSched ? 3 : 2;
  const a3 = !rtl.length ? (amiDone ? 3 : 2.5) : rtlOk >= 0.8 ? 4 : rtlOk >= 0.6 ? 3 : rtlOk >= 0.4 ? 2.5 : 2;
  const a4 = rtmDone && naik ? 4 : rtmDone ? 3 : 2;
  return [
    { id: 'a1', nama: 'IKU–IKT dipantau & dokumen SPMI ditetapkan', skor: a1, detail: `${updated}/${inds.length} indikator mutakhir · ${Math.round(docOk * 100)}% dokumen disetujui` },
    { id: 'a2', nama: 'Siklus PPEPP berjalan (AMI prodi)', skor: a2, detail: amiDone ? 'AMI siklus berjalan selesai' : amiSched ? 'AMI terjadwal (siklus lalu terlaksana)' : 'AMI belum dijadwalkan' },
    { id: 'a3', nama: 'Efektivitas: ≥ 80% RTL terverifikasi', skor: a3, detail: rtl.length ? `${Math.round(rtlOk * 100)}% RTL terverifikasi (${rtl.length} RTL)` : 'Belum ada RTL siklus ini' },
    { id: 'a4', nama: 'Peningkatan standar disahkan RTM', skor: a4, detail: rtmDone ? (naik ? 'Ada standar prodi ditingkatkan via RTM' : 'RTM selesai, belum ada standar prodi ditingkatkan') : 'RTM belum dilaksanakan' }
  ].map(a => Object.assign(a, { ok: a.skor >= 3.5 }));
}


/** Evaluasi satu prodi. values: { key: nilai } (opsional, untuk simulasi) menimpa capaian terkini. */
export function evalProdi(S, prodi, values = null, sp9Override = null) {
  const m = S.settings.bulan;
  const inds = S.indikator.filter(i => i.aktif && i.unit === prodi && i.key);
  const rows = inds.map(i => {
    const v = values && values[i.key] != null ? values[i.key] : (valueAt(i, m) || {}).v;
    const r = ratioOf(i, v, i.cum ? m : 11);
    return { ind: i, key: i.key, v, r, skor: skorDariRasio(r) };
  });
  const byKey = Object.fromEntries(rows.map(x => [x.key, x]));
  const asp = spmiAspects(S, prodi);
  const sp9 = sp9Override != null ? sp9Override : round(asp.reduce((a, b) => a + b.skor, 0) / asp.length, 2); // rerata skor 0–4
  const kriteria = LAM.kriteria.map(k => {
    const rs = rows.filter(x => x.ind.lam === k.id);
    let skor = rs.length ? rs.reduce((a, b) => a + b.skor, 0) / rs.length : 0;
    if (k.id === 'K4') skor = (skor * rs.length + sp9) / (rs.length + 1);
    return { ...k, skor: round(skor, 2), n: rs.length + (k.id === 'K4' ? 1 : 0), rows: rs };
  });
  const NA = round(kriteria.reduce((a, k) => a + k.bobot / 100 * k.skor * 100, 0), 1);
  const jenjang = (S.settings.jenjang && S.settings.jenjang[prodi]) || 'STr';
  const spDef = jenjang === 'D3' ? LAM.syaratPerluD3 : LAM.syaratPerluSTr;
  const spMap = { SP1: 'tatapamong', SP2: 'kurikulum', SP3: 'basic', SP4: 'doktor', SP5: 'jabatan', SP6: 'publikasi', SP7: 'waktutunggu', SP8: 'kesesuaian' };
  const sp = spDef.map(d => {
    let nilai;
    if (d.id === 'SP9') nilai = sp9;
    else {
      const x = byKey[spMap[d.id]];
      nilai = x ? (d.jenis === 'rerata' && x.ind.satuan.indexOf('skor') !== 0 ? x.skor : x.v) : null;
    }
    return { ...d, nilai, level: spLevel(d, nilai) };
  });
  const status = statusLAM(NA, sp);
  const iabee = evalIABEE(rows);
  return { prodi, rows, byKey, kriteria, NA, sp, status, iabee, aspek: asp, sp9 };
}

/* ---------------- IABEE ---------------- */
export function ratingIABEE(skor) { return skor >= 3.5 ? 'A' : skor >= 3 ? 'C' : skor >= 2 ? 'W' : 'D'; }
export function evalIABEE(rows) {
  const kr = IABEE.kriteria.map(k => {
    const rs = rows.filter(x => (x.ind.iabee || []).includes(k.id));
    const skor = rs.length ? rs.reduce((a, b) => a + b.skor, 0) / rs.length : null;
    return { ...k, skor, rating: skor == null ? 'C' : ratingIABEE(skor), n: rs.length };
  });
  const any = r => kr.some(k => k.rating === r);
  const kode = any('D') ? 'NA' : any('W') ? 'IE2' : 'AC5';
  return { kriteria: kr, keputusan: IABEE.keputusan.find(x => x.kode === kode) };
}

/* ---------------- Skenario ---------------- */
// Laju perbaikan per tahun untuk setiap tuas (key indikator prodi). Ilustratif; dapat diubah.
export const LEVERS = [
  { key: 'tatapamong', nama: 'Skor tata pamong prodi (0–4)', sp: 'SP1', min: 0, max: 4, step: 0.05, mod: 0.1, agr: 0.2 },
  { key: 'kurikulum', nama: 'Skor kurikulum OBE (0–4)', sp: 'SP2', min: 0, max: 4, step: 0.05, mod: 0.15, agr: 0.3 },
  { key: 'basic', nama: 'Basic sciences & matematika (SKS)', sp: 'SP3', min: 0, max: 16, step: 1, mod: 0, agr: 0 },
  { key: 'doktor', nama: 'DTPS doktor (%)', sp: 'SP4', min: 0, max: 60, step: 0.5, mod: 2, agr: 4 },
  { key: 'jabatan', nama: 'DTPS jabatan GB/LK/L (%)', sp: 'SP5', min: 0, max: 100, step: 1, mod: 3, agr: 6 },
  { key: 'publikasi', nama: 'Rasio publikasi internasional DTPS', sp: 'SP6', min: 0, max: 2, step: 0.01, mod: 0.06, agr: 0.12 },
  { key: 'waktutunggu', nama: 'Waktu tunggu lulusan (bulan)', sp: 'SP7', min: 0.5, max: 12, step: 0.1, mod: -0.3, agr: -0.6 },
  { key: 'kesesuaian', nama: 'Kesesuaian bidang kerja (%)', sp: 'SP8', min: 0, max: 100, step: 1, mod: 2, agr: 4 },
  { key: 'ltw', nama: 'Lulus tepat waktu (%)', min: 0, max: 100, step: 1, mod: 1.5, agr: 3 },
  { key: 'kepuasan', nama: 'Kepuasan pengguna lulusan (skala 4)', min: 0, max: 4, step: 0.01, mod: 0.03, agr: 0.06 },
  { key: 'rps', nama: 'RPS berbasis OBE (%)', min: 0, max: 100, step: 1, mod: 8, agr: 15 },
  { key: 'cpl', nama: 'Ketercapaian CPL (%)', min: 0, max: 100, step: 1, mod: 3, agr: 6 },
  { key: 'sertifikat', nama: 'Lulusan bersertifikat kompetensi (%)', min: 0, max: 100, step: 1, mod: 2, agr: 4 },
  { key: 'mitra', nama: 'Mitra industri terimplementasi (mitra)', min: 0, max: 30, step: 1, mod: 1, agr: 2 },
  { key: 'rasio', nama: 'Rasio mahasiswa per DTPS', min: 5, max: 40, step: 0.5, mod: -0.5, agr: -1 },
  { key: 'rtl', nama: 'RTL AMI prodi tertutup tepat waktu (%)', min: 0, max: 100, step: 1, mod: 6, agr: 12 },
  { key: 'monitor', nama: 'Pemutakhiran monitoring bulanan (%)', min: 0, max: 100, step: 1, mod: 6, agr: 12 }
];
export const SKENARIO = [
  { id: 'base', nama: 'Kondisi kini', ket: 'Capaian terakhir tanpa intervensi' },
  { id: 'mod', nama: 'Moderat', ket: 'Perbaikan bertahap sesuai kapasitas anggaran' },
  { id: 'agr', nama: 'Agresif', ket: 'Percepatan penuh: tubel S3, klinik publikasi, kemitraan' },
  { id: 'hib', nama: 'Hibrida', ket: 'Agresif pada syarat perlu, moderat pada butir lain' }
];

/** Nilai tuas untuk skenario tertentu pada tahun ke-n dari baseline. */
export function scenarioValues(base, skenId, years) {
  const out = {};
  LEVERS.forEach(L => {
    const b = base[L.key];
    if (b == null) return;
    let d = 0;
    if (skenId === 'mod') d = L.mod;
    else if (skenId === 'agr') d = L.agr;
    else if (skenId === 'hib') d = L.sp ? L.agr : L.mod;
    let v = b + d * years;
    out[L.key] = round(clamp(v, L.min, L.max), 2);
  });
  return out;
}
export function sp9Scenario(base, skenId, years) {
  const d = skenId === 'base' ? 0 : skenId === 'mod' ? 0.25 : 0.5;
  return round(clamp(base + d * years, 0, 4), 2);
}
