/* SIMANTAP 2.0 · Data acuan & data awal (ILUSTRATIF, kalibrasi dengan dokumen resmi PEM Akamigas).
   Sumber kebijakan indikator:
   RSB   = Rencana Strategis Bisnis BLU PEM Akamigas
   BLU   = Target kinerja BLU (Perjanjian Kinerja BLU)
   KOKIN = Kontrak Kinerja Kepala Badan PPSDM/BPSDM KESDM
   LAM   = Instrumen LAM Teknik 2025 · IAPT = IAPT 4.1 BAN-PT · IABEE = Kriteria IABEE
   PCR   = Diadaptasi dari IKU/IKT Renstra Politeknik Caltex Riau 2022–2026 (benchmark) */
import { clamp, round, ratioAt, kelasRasio, valueAt, BLN } from './scoring.js';

export const TAHUN = 2026;

export const UNITS = [
  { id: 'TPM', nama: 'Teknik Produksi Migas', jenis: 'prodi', pilot: true, reakr: '2028-12-20' },
  { id: 'TPG', nama: 'Teknik Pengolahan Migas', jenis: 'prodi', reakr: '2029-08-20' },
  { id: 'TIK', nama: 'Teknik Instrumentasi Kilang', jenis: 'prodi', pilot: true, reakr: '2029-08-20' },
  { id: 'TMK', nama: 'Teknik Mesin Kilang', jenis: 'prodi', reakr: '2029-12-20' },
  { id: 'LOG', nama: 'Logistik Migas', jenis: 'prodi', reakr: '2030-12-20' },
  { id: 'UPM', nama: 'Unit Penjaminan Mutu', jenis: 'unit' },
  { id: 'P3M', nama: 'Pusat Penelitian & PkM', jenis: 'unit' },
  { id: 'SDM', nama: 'Kepegawaian / SDM', jenis: 'unit' },
  { id: 'AKD', nama: 'Bagian Akademik', jenis: 'unit' },
  { id: 'KMS', nama: 'Kemahasiswaan & Alumni', jenis: 'unit' },
  { id: 'KSM', nama: 'Kerja Sama & Humas', jenis: 'unit' },
  { id: 'KEU', nama: 'Keuangan & Perencanaan BLU', jenis: 'unit' }
];
export const UNIT = Object.fromEntries(UNITS.map(u => [u.id, u]));
export const PRODI = UNITS.filter(u => u.jenis === 'prodi');

export const SUMBER = [
  { id: 'RSB', nama: 'Rencana Strategis Bisnis BLU', warna: '#6366f1', kebijakan: true },
  { id: 'BLU', nama: 'Target Kinerja BLU', warna: '#0ea5e9', kebijakan: true },
  { id: 'KOKIN', nama: 'Kontrak Kinerja Kepala Badan', warna: '#f59e0b', kebijakan: true },
  { id: 'LAM', nama: 'LAM Teknik 2025', warna: '#10b981' },
  { id: 'IABEE', nama: 'IABEE', warna: '#8b5cf6' },
  { id: 'IAPT', nama: 'IAPT 4.1', warna: '#14b8a6' },
  { id: 'PCR', nama: 'Benchmark Caltex (PCR)', warna: '#f472b6' }
];
export const SUMBERMAP = Object.fromEntries(SUMBER.map(s => [s.id, s]));

export const STANDAR = [
  ['S01', 'Kompetensi Lulusan'], ['S02', 'Isi Pembelajaran'], ['S03', 'Proses Pembelajaran'],
  ['S04', 'Penilaian Pembelajaran'], ['S05', 'Dosen & Tenaga Kependidikan'], ['S06', 'Sarana & Prasarana'],
  ['S07', 'Pengelolaan & Tata Pamong'], ['S08', 'Pembiayaan'], ['S09', 'Penelitian'],
  ['S10', 'Pengabdian kepada Masyarakat'], ['S11', 'Kerja Sama'], ['S12', 'Kemahasiswaan & Alumni'],
  ['S13', 'Sistem Penjaminan Mutu'], ['S14', 'Internasionalisasi (IABEE)']
];
export const STD = Object.fromEntries(STANDAR);

export const RENSTRA = [
  { id: 'SS1', nama: 'Lulusan kompeten dan terserap industri energi' },
  { id: 'SS2', nama: 'Pendidikan vokasi bermutu berstandar internasional' },
  { id: 'SS3', nama: 'Riset terapan & PkM berdampak bagi sektor ESDM' },
  { id: 'SS4', nama: 'SDM dosen dan tendik unggul' },
  { id: 'SS5', nama: 'Tata kelola BLU akuntabel dan budaya mutu' }
];
export const IKU = [
  { id: 'IKU-1', ss: 'SS1', nama: 'Lulusan mendapat pekerjaan layak' },
  { id: 'IKU-2', ss: 'SS1', nama: 'Lulusan bersertifikat kompetensi' },
  { id: 'IKU-3', ss: 'SS2', nama: 'Prodi terakreditasi Unggul / internasional' },
  { id: 'IKU-4', ss: 'SS2', nama: 'Pembelajaran OBE & kepuasan pengguna' },
  { id: 'IKU-5', ss: 'SS3', nama: 'Luaran riset & PkM berdampak/terpublikasi' },
  { id: 'IKU-6', ss: 'SS4', nama: 'Dosen doktor & berjabatan akademik' },
  { id: 'IKU-7', ss: 'SS3', nama: 'Kerja sama mitra terimplementasi' },
  { id: 'IKU-8', ss: 'SS5', nama: 'Kinerja keuangan & akuntabilitas BLU' },
  { id: 'IKT-1', ss: 'SS5', nama: 'Siklus PPEPP konsisten (AMI, RTM, RTL)' },
  { id: 'IKT-2', ss: 'SS2', nama: 'Kesiapan akreditasi internasional IABEE' },
  { id: 'IKT-3', ss: 'SS4', nama: 'Pengembangan karier & kompetensi dosen' },
  { id: 'IKT-4', ss: 'SS1', nama: 'Prestasi & pengalaman belajar mahasiswa' }
];
export const IKUMAP = Object.fromEntries(IKU.map(k => [k.id, k]));

export const ROLES = {
  admin: { nama: 'Admin UPM' },
  pimpinan: { nama: 'Pimpinan (Direktur/Kepala Badan)' },
  auditor: { nama: 'Auditor Internal' },
  auditee: { nama: 'Auditee (Prodi/Unit)' }
};
export const AUDITORS = [
  { id: 'AU01', nama: 'Auditor 01', home: 'TMK' }, { id: 'AU02', nama: 'Auditor 02', home: 'TPG' },
  { id: 'AU03', nama: 'Auditor 03', home: 'LOG' }, { id: 'AU04', nama: 'Auditor 04', home: 'TIK' },
  { id: 'AU05', nama: 'Auditor 05', home: 'TPM' }, { id: 'AU06', nama: 'Auditor 06', home: 'KEU' }
];
export const EIS = {
  'I-U': { nama: 'Penting · Mendesak', aksi: 'Kerjakan segera', warna: '#f0616d' },
  'I-NU': { nama: 'Penting · Tidak mendesak', aksi: 'Jadwalkan', warna: '#f5a524' },
  'NI-U': { nama: 'Tidak penting · Mendesak', aksi: 'Delegasikan', warna: '#38bdf8' },
  'NI-NU': { nama: 'Tidak penting · Tidak mendesak', aksi: 'Pantau', warna: '#94a3b8' }
};

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function eisDefault(ind, m) {
  const k = kelasRasio(ratioAt(ind, m));
  const penting = ind.risk === 'Tinggi' || (ind.sumber || []).some(s => ['KOKIN', 'RSB', 'BLU'].includes(s)) || !!ind.sp;
  const mendesak = k === 'bad' || k === 'near';
  return (penting ? 'I' : 'NI') + '-' + (mendesak ? 'U' : 'NU');
}
export function saranPeningkatan(ind, m) {
  const r = ratioAt(ind, m);
  if (r == null) return 'Tetap';
  if (r >= 1.1) return 'Tingkatkan';
  if (r < 0.6) return 'Sesuaikan';
  return 'Tetap';
}

export function buildSeed() {
  const R = rng(20261107);
  const inds = [];
  const seq = { IKU: 0, IKT: 0, IK: 0 };
  const add = (o) => {
    const jenis = o.jenis || 'IK';
    seq[jenis]++;
    inds.push(Object.assign({
      id: 'IND' + String(inds.length + 1).padStart(3, '0'),
      kode: `${jenis}26${String(seq[jenis]).padStart(3, '0')}`,
      aktif: true, cum: false, dec: 0, risk: 'Sedang', sumber: [], iabee: [], lam: null, komp: null, iapt: null, sp: null,
      data: o.satuan === 'terpenuhi (1/0)' ? 'Kualitatif' : 'Kuantitatif'
    }, o));
  };

  /* ---- Indikator tingkat prodi (dipakai simulator LAM & IABEE) ---- */
  const base = {
    TPM: { tp: 3.55, kur: 3.5, dok: 22, jab: 48, pub: .52, wt: 4.2, ks: 78, ltw: 84, kp: 3.42, rps: 92, cpl: 74, sert: 88, mitra: 12, rasio: 17, rtl: 70, mon: 86 },
    TPG: { tp: 3.4, kur: 3.3, dok: 20, jab: 44, pub: .44, wt: 4.8, ks: 72, ltw: 81, kp: 3.42, rps: 84, cpl: 70, sert: 85, mitra: 10, rasio: 20, rtl: 62, mon: 78 },
    TIK: { tp: 3.6, kur: 3.6, dok: 25, jab: 52, pub: .56, wt: 3.9, ks: 81, ltw: 86, kp: 3.51, rps: 95, cpl: 78, sert: 91, mitra: 14, rasio: 16, rtl: 80, mon: 90 },
    TMK: { tp: 3.25, kur: 2.9, dok: 17, jab: 41, pub: .36, wt: 5.1, ks: 69, ltw: 78, kp: 3.32, rps: 76, cpl: 66, sert: 81, mitra: 8, rasio: 22, rtl: 55, mon: 70 },
    LOG: { tp: 3.1, kur: 2.8, dok: 10, jab: 38, pub: .26, wt: 5.9, ks: 62, ltw: 76, kp: 3.28, rps: 70, cpl: 62, sert: 76, mitra: 7, rasio: 24, rtl: 50, mon: 66 }
  };
  PRODI.forEach(p => {
    const b = base[p.id];
    const A = (o) => add(Object.assign({ unit: p.id }, o));
    A({ key: 'tatapamong', std: 'S07', teks: 'Skor sistem tata pamong prodi (struktur, kebijakan, VMTS, GUG) hasil asesmen rubrik', target: 3.5, satuan: 'skor 0–4', arah: '>=', jenis: 'IK', iku: 'IKU-8', sumber: ['LAM', 'IAPT'], lam: 'K2', komp: 'P', iapt: 'AK', sp: 'SP1', risk: 'Sedang', b: b.tp, dr: .05, nz: 0, dec: 2 });
    A({ key: 'kurikulum', std: 'S02', teks: 'Skor kurikulum: ditinjau bersama pemangku kepentingan, profil lulusan & CPL diturunkan dan ditinjau berkala', target: 3.5, satuan: 'skor 0–4', arah: '>=', jenis: 'IK', iku: 'IKU-4', sumber: ['LAM', 'IABEE'], lam: 'K3', komp: 'P', iabee: ['K1', 'K2'], sp: 'SP2', risk: 'Tinggi', b: b.kur, dr: .1, nz: 0, dec: 2 });
    A({ key: 'basic', std: 'S02', teks: 'Mata kuliah basic sciences dan matematika dalam kurikulum', target: 4, satuan: 'SKS', arah: '>=', jenis: 'IK', sumber: ['LAM', 'IABEE'], lam: 'K3', komp: 'I', iabee: ['K5'], sp: 'SP3', risk: 'Rendah', b: 8, dr: 0, nz: 0 });
    A({ key: 'doktor', std: 'S05', teks: 'Proporsi DTPS berpendidikan doktor/doktor terapan', target: 15, satuan: '%', arah: '>=', jenis: 'IKU', iku: 'IKU-6', sumber: ['LAM', 'RSB', 'PCR'], lam: 'K2', komp: 'I', iapt: 'AK', sp: 'SP4', risk: 'Tinggi', b: b.dok, dr: 1, nz: 0, dec: 1 });
    A({ key: 'jabatan', std: 'S05', teks: 'Proporsi DTPS berjabatan Guru Besar, Lektor Kepala, atau Lektor', target: 40, satuan: '%', arah: '>=', jenis: 'IKU', iku: 'IKU-6', sumber: ['LAM', 'RSB', 'PCR'], lam: 'K2', komp: 'I', sp: 'SP5', risk: 'Tinggi', b: b.jab, dr: 2, nz: 0, dec: 1 });
    A({ key: 'publikasi', std: 'S09', teks: 'Rasio publikasi/pagelaran internasional DTPS terhadap jumlah DTPS', target: .5, satuan: 'rasio', arah: '>=', jenis: 'IKU', iku: 'IKU-5', sumber: ['LAM', 'PCR', 'IAPT'], lam: 'K3', komp: 'O', iapt: 'RP', sp: 'SP6', risk: 'Tinggi', b: b.pub * .8, dr: b.pub * .25, nz: .02, dec: 2 });
    A({ key: 'waktutunggu', std: 'S01', teks: 'Rata-rata waktu tunggu lulusan memperoleh pekerjaan pertama', target: 6, satuan: 'bulan', arah: '<=', jenis: 'IKU', iku: 'IKU-1', sumber: ['LAM', 'KOKIN', 'PCR'], lam: 'K3', komp: 'O', iapt: 'RD', sp: 'SP7', risk: 'Sedang', b: b.wt + .3, dr: -.4, nz: .15, dec: 1 });
    A({ key: 'kesesuaian', std: 'S01', teks: 'Kesesuaian bidang kerja lulusan dengan bidang prodi', target: 50, satuan: '%', arah: '>=', jenis: 'IKU', iku: 'IKU-1', sumber: ['LAM', 'KOKIN'], lam: 'K3', komp: 'O', iapt: 'RD', sp: 'SP8', risk: 'Sedang', b: b.ks - 3, dr: 3, nz: 1.5 });
    A({ key: 'ltw', std: 'S03', teks: 'Mahasiswa lulus tepat waktu', target: 80, satuan: '%', arah: '>=', jenis: 'IKT', iku: 'IKT-4', sumber: ['LAM', 'BLU', 'PCR'], lam: 'K3', komp: 'O', risk: 'Sedang', b: b.ltw - 2, dr: 2, nz: 1 });
    A({ key: 'kepuasan', std: 'S01', teks: 'Indeks kepuasan pengguna lulusan', target: 3.5, satuan: 'skala 4', arah: '>=', jenis: 'IKU', iku: 'IKU-4', sumber: ['LAM', 'BLU', 'IABEE'], lam: 'K3', komp: 'O', iabee: ['K3'], iapt: 'RD', risk: 'Sedang', b: b.kp - .04, dr: .05, nz: .02, dec: 2 });
    A({ key: 'rps', std: 'S03', teks: 'RPS berbasis OBE (CPMK terpetakan ke CPL) untuk seluruh mata kuliah', target: 100, satuan: '%', arah: '>=', jenis: 'IKT', iku: 'IKT-2', sumber: ['IABEE', 'LAM'], lam: 'K3', komp: 'P', iabee: ['K2'], risk: p.pilot ? 'Tinggi' : 'Sedang', b: b.rps - 14, dr: 14, nz: 1 });
    A({ key: 'cpl', std: 'S04', teks: 'Ketercapaian CPL lulusan (asesmen langsung & tidak langsung)', target: 75, satuan: '%', arah: '>=', jenis: 'IKT', iku: 'IKT-2', sumber: ['IABEE', 'LAM'], lam: 'K4', komp: 'O', iabee: ['K3', 'K4'], risk: p.pilot ? 'Tinggi' : 'Sedang', b: b.cpl - 4, dr: 4, nz: 1 });
    A({ key: 'sertifikat', std: 'S01', teks: 'Lulusan memiliki sertifikat kompetensi/profesi (BNSP/migas)', target: 85, satuan: '%', arah: '>=', jenis: 'IKU', iku: 'IKU-2', sumber: ['LAM', 'KOKIN', 'PCR'], lam: 'K1', komp: 'O', iabee: ['K5'], iapt: 'DM', risk: 'Sedang', b: b.sert - 3, dr: 3, nz: 1 });
    A({ key: 'mitra', std: 'S11', teks: 'Mitra industri energi yang terlibat dalam kurikulum, magang, dan rekrutmen', target: 10, satuan: 'mitra', arah: '>=', jenis: 'IKT', iku: 'IKU-7', sumber: ['LAM', 'RSB', 'PCR', 'IABEE'], lam: 'K1', komp: 'P', iabee: ['K1'], iapt: 'DM', risk: 'Sedang', b: b.mitra - 1, dr: 1, nz: 0 });
    A({ key: 'rasio', std: 'S05', teks: 'Rasio mahasiswa terhadap DTPS', target: 20, satuan: 'mhs/dosen', arah: '<=', jenis: 'IK', sumber: ['LAM', 'PCR'], lam: 'K2', komp: 'I', risk: 'Rendah', b: b.rasio, dr: 0, nz: .2, dec: 1 });
    A({ key: 'rtl', std: 'S13', teks: 'RTL hasil AMI prodi tertutup tepat waktu', target: 85, satuan: '%', arah: '>=', jenis: 'IKT', iku: 'IKT-1', sumber: ['LAM', 'IABEE'], lam: 'K4', komp: 'P', iabee: ['K4'], iapt: 'BM', risk: 'Tinggi', b: b.rtl - 10, dr: 10, nz: 2 });
    A({ key: 'monitor', std: 'S13', teks: 'Pemutakhiran capaian indikator bulanan tepat waktu', target: 90, satuan: '%', arah: '>=', jenis: 'IKT', iku: 'IKT-1', sumber: ['LAM'], lam: 'K4', komp: 'P', iapt: 'BM', risk: 'Sedang', b: b.mon - 12, dr: 12, nz: 2 });
  });

  /* ---- Indikator tingkat institusi/unit ---- */
  const U = (unit, std, teks, target, satuan, arah, jenis, iku, sumber, tag, risk, b, dr, nz, dec, cum) =>
    add(Object.assign({ unit, std, teks, target, satuan, arah, jenis, iku, sumber, risk, b, dr, nz, dec: dec || 0, cum: !!cum }, tag));
  // RSB / BLU / KOKIN (kebijakan yang sudah ada di PEM Akamigas — isi sesuai dokumen resmi)
  U('KEU', 'S08', 'Pendapatan BLU (PNBP layanan pendidikan & non-pendidikan)', 120, 'miliar Rp', '>=', 'IKU', 'IKU-8', ['RSB', 'BLU', 'KOKIN'], { lam: 'K2', iapt: 'AK' }, 'Tinggi', 118, 0, 0, 1, true);
  U('KEU', 'S08', 'Rasio PNBP terhadap biaya operasional (POBO)', 60, '%', '>=', 'IKU', 'IKU-8', ['RSB', 'BLU'], { lam: 'K2', iapt: 'AK' }, 'Tinggi', 54, 3, 1, 1);
  U('KEU', 'S08', 'Realisasi penyerapan anggaran', 95, '%', '>=', 'IKU', 'IKU-8', ['BLU', 'KOKIN'], { lam: 'K2', iapt: 'AK' }, 'Sedang', 97, 0, 0, 0, true);
  U('KEU', 'S08', 'Nilai Indikator Kinerja Pelaksanaan Anggaran (IKPA)', 95, 'nilai', '>=', 'IKT', 'IKU-8', ['KOKIN'], { lam: 'K2', iapt: 'AK' }, 'Sedang', 93.5, 1.5, .4, 1);
  U('KEU', 'S08', 'Opini laporan keuangan BLU Wajar Tanpa Pengecualian', 1, 'terpenuhi (1/0)', '>=', 'IKU', 'IKU-8', ['RSB', 'BLU', 'PCR'], { lam: 'K2', iapt: 'AK' }, 'Tinggi', 1, 0, 0);
  U('KEU', 'S08', 'Pendapatan non-SPP (kerja sama, pelatihan, jasa) terhadap total pendapatan', 30, '%', '>=', 'IKT', 'IKU-8', ['RSB', 'BLU', 'PCR'], { lam: 'K2', iapt: 'AK' }, 'Sedang', 24, 3, 1, 1);
  U('KEU', 'S09', 'Alokasi anggaran penelitian terhadap total anggaran', 5, '%', '>=', 'IKT', 'IKU-5', ['PCR', 'LAM'], { lam: 'K2', iapt: 'RP' }, 'Sedang', 4.1, .4, .1, 1);
  U('KEU', 'S10', 'Alokasi anggaran PkM terhadap total anggaran', 2, '%', '>=', 'IKT', 'IKU-5', ['PCR', 'LAM'], { lam: 'K2', iapt: 'RM' }, 'Rendah', 1.7, .2, .05, 1);
  U('KEU', 'S08', 'Dana penelitian dan PkM per dosen per tahun', 15, 'juta Rp', '>=', 'IKT', 'IKU-5', ['LAM'], { lam: 'K2', iapt: 'RP' }, 'Sedang', 13, 3, .3, 1);
  U('UPM', 'S07', 'Nilai SAKIP / akuntabilitas kinerja instansi', 80, 'nilai', '>=', 'IKU', 'IKU-8', ['KOKIN', 'RSB'], { lam: 'K2', iapt: 'AK' }, 'Tinggi', 77.5, 2, .3, 1);
  U('UPM', 'S07', 'Indeks Kepuasan Masyarakat terhadap layanan BLU', 3.5, 'skala 4', '>=', 'IKU', 'IKU-8', ['BLU', 'KOKIN'], { lam: 'K2', iapt: 'AK' }, 'Sedang', 3.41, .06, .02, 2);
  U('AKD', 'S01', 'Lulusan pendidikan vokasi ESDM yang terserap dunia kerja ≤ 1 tahun', 85, '%', '>=', 'IKU', 'IKU-1', ['KOKIN', 'RSB'], { lam: 'K3', komp: 'O', iapt: 'RD' }, 'Tinggi', 82, 3, 1);
  U('AKD', 'S07', 'Program studi terakreditasi Unggul', 100, '%', '>=', 'IKU', 'IKU-3', ['KOKIN', 'RSB', 'IAPT'], { lam: 'K1', iapt: 'AK' }, 'Tinggi', 100, 0, 0);
  U('AKD', 'S14', 'Prodi terakreditasi internasional (IABEE/Sydney Accord)', 2, 'prodi', '>=', 'IKU', 'IKU-3', ['RSB', 'IABEE', 'PCR'], { lam: 'K1', iabee: ['K5'], iapt: 'DM' }, 'Tinggi', 0, 0, 0);
  // Adaptasi IKU/IKT PCR (benchmark)
  U('AKD', 'S03', 'Mata kuliah dengan metode case method / team-based project (PjBL)', 40, '% MK', '>=', 'IKT', 'IKT-4', ['PCR', 'IABEE'], { lam: 'K3', komp: 'P', iabee: ['K2'] }, 'Sedang', 31, 6, 1);
  U('AKD', 'S03', 'Mahasiswa memperoleh ≥ 20 SKS di luar kampus (magang industri/OJT)', 60, '%', '>=', 'IKT', 'IKT-4', ['PCR', 'LAM'], { lam: 'K3', komp: 'P', iapt: 'RD' }, 'Sedang', 64, 2, 1);
  U('AKD', 'S01', 'Rata-rata IPK lulusan', 3.35, 'IPK', '>=', 'IKT', 'IKT-4', ['PCR', 'LAM'], { lam: 'K3', komp: 'O' }, 'Rendah', 3.31, .03, .01, 2);
  U('AKD', 'S14', 'Lulusan dengan skor TOEIC ≥ 450 atau setara', 40, '%', '>=', 'IKT', 'IKT-2', ['PCR', 'IABEE'], { lam: 'K1', iabee: ['K1', 'K3'] }, 'Sedang', 28, 5, 1);
  U('AKD', 'S01', 'Tingkat respons tracer study lulusan', 60, '%', '>=', 'IKT', 'IKU-1', ['LAM', 'IAPT'], { lam: 'K3', iapt: 'RD' }, 'Sedang', 52, 14, 2);
  U('AKD', 'S14', 'Prodi pilot mempublikasikan PPM & CPL berbahasa Inggris di web', 2, 'prodi', '>=', 'IKT', 'IKT-2', ['IABEE'], { lam: 'K1', iabee: ['K1'] }, 'Tinggi', 0, 1, 0);
  U('AKD', 'S14', 'Butir eligibility IABEE terpenuhi untuk prodi pilot', 9, 'butir', '>=', 'IKT', 'IKT-2', ['IABEE'], { lam: 'K4', iabee: ['K1', 'K4'] }, 'Tinggi', 2, 4, 0);
  U('AKD', 'S14', 'Rapat Industrial Advisory Board (IAB) prodi pilot per tahun', 4, 'rapat', '>=', 'IKT', 'IKT-2', ['IABEE', 'PCR'], { lam: 'K1', iabee: ['K1', 'K4'] }, 'Sedang', 3, 0, 0, 0, true);
  U('AKD', 'S14', 'Kemajuan penyusunan Self Evaluation Report (SER) IABEE', 100, '%', '>=', 'IKT', 'IKT-2', ['IABEE'], { lam: 'K4', iabee: ['K4'] }, 'Tinggi', 10, 30, 0);
  U('KMS', 'S01', 'Lulusan bekerja < 6 bulan dengan gaji ≥ 1,2 × UMP', 60, '%', '>=', 'IKU', 'IKU-1', ['PCR', 'KOKIN'], { lam: 'K3', komp: 'O', iapt: 'RD' }, 'Tinggi', 57, 4, 1);
  U('KMS', 'S01', 'Lulusan berwirausaha atau studi lanjut', 5, '%', '>=', 'IKT', 'IKU-1', ['PCR'], { lam: 'K3', komp: 'O' }, 'Rendah', 4, .5, .2, 1);
  U('KMS', 'S12', 'Prestasi mahasiswa tingkat nasional/internasional', 20, 'prestasi', '>=', 'IKT', 'IKT-4', ['LAM', 'PCR', 'IAPT'], { lam: 'K1', iapt: 'DM' }, 'Rendah', 24, 0, 0, 0, true);
  U('KMS', 'S12', 'Mahasiswa penerima beasiswa', 30, '%', '>=', 'IKT', 'IKT-4', ['PCR', 'BLU'], { lam: 'K2' }, 'Rendah', 33, 0, 1);
  U('KMS', 'S12', 'Mahasiswa mengikuti magang/praktik kerja di industri energi', 95, '%', '>=', 'IKU', 'IKU-1', ['LAM', 'IAPT'], { lam: 'K3', komp: 'P', iapt: 'RD' }, 'Sedang', 91, 3, 1);
  U('KSM', 'S11', 'Kerja sama dalam negeri aktif dan terimplementasi', 50, 'PKS', '>=', 'IKU', 'IKU-7', ['RSB', 'LAM', 'IAPT'], { lam: 'K1', iapt: 'RD' }, 'Sedang', 48, 4, 0);
  U('KSM', 'S11', 'Kerja sama internasional aktif dan terimplementasi', 12, 'PKS', '>=', 'IKU', 'IKU-7', ['RSB', 'PCR', 'IAPT'], { lam: 'K1', iapt: 'DM' }, 'Sedang', 9, 2, 0);
  U('KSM', 'S11', 'Pendapatan dari kerja sama industri dan pelatihan', 25, 'miliar Rp', '>=', 'IKU', 'IKU-7', ['RSB', 'BLU', 'PCR'], { lam: 'K2', iapt: 'AK' }, 'Tinggi', 23, 0, 0, 1, true);
  U('P3M', 'S09', 'Publikasi internasional bereputasi (Scopus/WoS)', 45, 'judul', '>=', 'IKU', 'IKU-5', ['LAM', 'PCR', 'IAPT'], { lam: 'K3', komp: 'O', iapt: 'RP' }, 'Tinggi', 47, 0, 0, 0, true);
  U('P3M', 'S09', 'Publikasi jurnal nasional terakreditasi Sinta 1–2', 60, 'judul', '>=', 'IKT', 'IKU-5', ['LAM', 'PCR'], { lam: 'K3', komp: 'O', iapt: 'RP' }, 'Sedang', 66, 0, 0, 0, true);
  U('P3M', 'S09', 'Luaran riset yang mendapat rekognisi internasional', 20, 'luaran', '>=', 'IKU', 'IKU-5', ['PCR', 'IAPT'], { lam: 'K3', komp: 'O', iapt: 'RP' }, 'Sedang', 18, 0, 0, 0, true);
  U('P3M', 'S10', 'Luaran riset/PkM yang diterapkan industri atau masyarakat', 12, 'luaran', '>=', 'IKU', 'IKU-5', ['PCR', 'LAM', 'IAPT'], { lam: 'K3', komp: 'O', iapt: 'RM' }, 'Sedang', 11, 0, 0, 0, true);
  U('P3M', 'S09', 'Kekayaan intelektual (paten/paten sederhana/hak cipta) terdaftar', 25, 'KI', '>=', 'IKT', 'IKU-5', ['PCR', 'LAM', 'IAPT'], { lam: 'K1', iapt: 'DM' }, 'Rendah', 27, 0, 0, 0, true);
  U('P3M', 'S09', 'Produk inovasi/teknologi tepat guna yang dihilirkan', 3, 'produk', '>=', 'IKT', 'IKU-5', ['PCR', 'RSB'], { lam: 'K1', iapt: 'DM' }, 'Sedang', 2, 0, 0, 0, true);
  U('SDM', 'S05', 'Dosen tetap berpendidikan doktor (institusi)', 30, '%', '>=', 'IKU', 'IKU-6', ['RSB', 'KOKIN', 'IAPT'], { lam: 'K2', iapt: 'AK' }, 'Tinggi', 23, 1, 0, 1);
  U('SDM', 'S05', 'Jumlah Guru Besar', 2, 'orang', '>=', 'IKT', 'IKT-3', ['PCR', 'IAPT'], { lam: 'K2', iapt: 'DM' }, 'Tinggi', 0, 0, 0);
  U('SDM', 'S05', 'Dosen bersertifikat pendidik (serdos)', 85, '%', '>=', 'IKT', 'IKT-3', ['PCR', 'LAM'], { lam: 'K2' }, 'Sedang', 81, 2, 0);
  U('SDM', 'S05', 'Dosen bersertifikat kompetensi/profesi industri', 90, '%', '>=', 'IKT', 'IKT-3', ['PCR', 'LAM'], { lam: 'K1' }, 'Sedang', 72, 7, 1);
  U('SDM', 'S05', 'Dosen bertridharma di kampus top QS-100 atau berpengalaman industri migas', 25, '%', '>=', 'IKT', 'IKT-3', ['PCR', 'IAPT'], { lam: 'K1', iapt: 'DM' }, 'Sedang', 18, 3, 1);
  U('SDM', 'S05', 'Tendik mengikuti pelatihan/sertifikasi kompetensi', 80, '%', '>=', 'IKT', 'IKT-3', ['PCR', 'BLU'], { lam: 'K2' }, 'Rendah', 70, 12, 2);
  U('UPM', 'S13', 'Dokumen SPMI (kebijakan, manual, standar, formulir, SOP) ditetapkan', 30, 'dokumen', '>=', 'IKT', 'IKT-1', ['IAPT', 'LAM'], { lam: 'K4', iapt: 'BM' }, 'Tinggi', 23, 7, 0);
  U('UPM', 'S13', 'Unit dan prodi yang diaudit (AMI) dalam siklus berjalan', 100, '%', '>=', 'IKT', 'IKT-1', ['IAPT', 'LAM', 'IABEE'], { lam: 'K4', iabee: ['K4'], iapt: 'BM' }, 'Tinggi', 0, 100, 0, 0, true);
  U('UPM', 'S13', 'RTL hasil AMI/RTM yang tertutup tepat waktu (institusi)', 85, '%', '>=', 'IKT', 'IKT-1', ['IAPT', 'IABEE'], { lam: 'K4', iabee: ['K4'], iapt: 'BM' }, 'Tinggi', 58, 14, 2);
  U('UPM', 'S13', 'Auditor internal bersertifikat', 12, 'orang', '>=', 'IKT', 'IKT-1', ['IAPT'], { lam: 'K4', iapt: 'BM' }, 'Sedang', 6, 3, 0);
  U('UPM', 'S13', 'Indeks kepuasan mahasiswa terhadap layanan akademik', 3.5, 'skala 4', '>=', 'IKT', 'IKT-1', ['IAPT', 'LAM', 'BLU'], { lam: 'K2', iapt: 'AK' }, 'Sedang', 3.46, .07, .02, 2);

  /* ---- Deret capaian bulanan (Jan–Okt lengkap, Nov sebagian) ---- */
  const partial = 10;
  const fullNov = new Set(['TPM', 'TIK', 'UPM', 'P3M', 'SDM', 'KEU']);
  inds.forEach(ind => {
    const cap = Array(12).fill(null);
    for (let m = 0; m <= partial; m++) {
      if (m === partial && !fullNov.has(ind.unit) && R() > 0.35) continue;
      let v;
      if (ind.cum) {
        v = ind.b * (0.92 + R() * 0.2) * (m + 1) / 12 * (0.95 + R() * 0.08);
        if (ind.teks.startsWith('Unit dan prodi yang diaudit')) v = m < 7 ? 0 : (m === 7 ? 17 : (m < 10 ? 33 : 42));
        if (ind.teks.startsWith('Rapat Industrial')) v = Math.floor((m + 1) / 4);
      } else v = ind.b + ind.dr * (m / 11) + (R() - 0.5) * 2 * ind.nz;
      const f = Math.pow(10, ind.dec);
      v = Math.round(v * f) / f;
      if (ind.satuan.startsWith('%') && !ind.cum) v = Math.min(100, v);
      cap[m] = Math.max(0, v);
    }
    if (ind.cum) for (let m = 1; m < 12; m++) if (cap[m] != null && cap[m - 1] != null && cap[m] < cap[m - 1]) cap[m] = cap[m - 1];
    ind.cap = cap;
    ind.bukti = {};
    for (let m = 0; m <= partial; m++) if (cap[m] != null && R() > 0.25) ind.bukti[m] = [{ nama: `Bukti_${ind.unit}_${BLN[m]}${TAHUN}.pdf`, verified: m < 8 }];
    ind.rencana = `Pemantauan bulanan oleh ${UNIT[ind.unit].nama}; evaluasi triwulanan bersama UPM.`;
    ind.catatan = ind.sumber.some(s => ['RSB', 'BLU', 'KOKIN'].includes(s)) ? 'Target ilustratif — sesuaikan dengan dokumen RSB/PK BLU/Kokin resmi.' : '';
    delete ind.b; delete ind.dr; delete ind.nz;
  });

  /* ---- PPEPP: ED → AMI → Pengendalian → Peningkatan (AMI September, unit pilot) ---- */
  const amiUnits = ['TPM', 'TIK', 'UPM', 'P3M'];
  const AMI_M = 8;
  const auditorOf = { TPM: 'AU04', TIK: 'AU05', UPM: 'AU01', P3M: 'AU02' };
  const rtl = [];
  inds.forEach(ind => {
    ind.ed = null; ind.ami = null; ind.pengendalian = null;
    if (amiUnits.includes(ind.unit)) {
      const k = kelasRasio(ratioAt(ind, AMI_M));
      const sk = k === 'ok' ? (R() > .5 ? 4 : 3) : k === 'near' ? (R() > .5 ? 3 : 2) : (R() > .6 ? 2 : 1);
      const v = valueAt(ind, AMI_M);
      ind.ed = { skala: sk, hasil: v ? v.v : null, analisis: k === 'ok' ? 'Capaian memenuhi target; bukti lengkap.' : k === 'near' ? 'Capaian mendekati target; perlu percepatan.' : 'Capaian di bawah target; akar masalah sedang dianalisis.', status: 'Dikirim', tgl: '2026-09-05' };
      let temuan = 'Sesuai', akhir = sk;
      if (k === 'bad') { temuan = ratioAt(ind, AMI_M) < 0.75 ? 'KTS Mayor' : 'KTS Minor'; akhir = Math.max(1, sk - (R() > .5 ? 1 : 0)); }
      else if (k === 'near') temuan = 'Observasi';
      else if (ratioAt(ind, AMI_M) >= 1.1) temuan = 'Terlampaui';
      ind.ami = { akhir, temuan, uraian: temuan === 'Sesuai' || temuan === 'Terlampaui' ? 'Capaian dan bukti sesuai/melampaui target.' : `Capaian ${ind.teks.toLowerCase()} belum memenuhi target ${ind.target} ${ind.satuan}.`, auditor: auditorOf[ind.unit], tgl: '2026-09-18' };
      if (['Observasi', 'KTS Minor', 'KTS Mayor'].includes(temuan)) {
        const st = R();
        const status = st > .55 ? 'Terverifikasi' : st > .3 ? 'Selesai' : st > .12 ? 'Proses' : 'Terbuka';
        rtl.push({ id: 'RTL' + String(rtl.length + 1).padStart(3, '0'), ind: ind.id, unit: ind.unit, sumberRTL: 'AMI 2026', temuan, tindakan: 'Menyusun rencana perbaikan dengan PIC dan tenggat; unggah bukti pelaksanaan.', pic: 'Kaprodi/Ka. Unit ' + ind.unit, tenggat: '2026-12-15', status });
        ind.pengendalian = { pelaksanaan: status === 'Terverifikasi' || status === 'Selesai' ? 'Tindakan perbaikan dilaksanakan; bukti diunggah.' : 'Perbaikan sedang berjalan.', efektivitas: status === 'Terverifikasi' ? 'Efektif' : status === 'Selesai' ? 'Menunggu verifikasi' : 'Dalam proses', rekomendasi: 'Pantau 3 bulan melalui monitoring bulanan.' };
      }
    }
    ind.peningkatan = { status: amiUnits.includes(ind.unit) ? saranPeningkatan(ind, partial) : '', eis: eisDefault(ind, partial), rtm: false, catatan: '' };
  });
  // Peningkatan yang sudah disahkan RTM (contoh)
  inds.filter(i => i.unit === 'TIK' && i.peningkatan.status === 'Tingkatkan').slice(0, 2).forEach(i => { i.peningkatan.rtm = true; });
  inds.filter(i => i.unit === 'UPM' && i.peningkatan.status === 'Tingkatkan').slice(0, 1).forEach(i => { i.peningkatan.rtm = true; });

  /* ---- Dokumen ---- */
  const docs = [];
  const D = (jenis, kode, judul, status, periode) => docs.push({ id: 'DOC' + String(docs.length + 1).padStart(3, '0'), jenis, kode, judul, status, periode: periode || '2026–2030', tgl: `2026-${String(1 + docs.length % 9).padStart(2, '0')}-15` });
  D('Kebijakan', 'KB-SPMI-01', 'Kebijakan Sistem Penjaminan Mutu Internal PEM Akamigas', 'Disetujui');
  D('Manual', 'MN-SPMI-01', 'Manual Penetapan Standar', 'Disetujui');
  D('Manual', 'MN-SPMI-02', 'Manual Pelaksanaan Standar', 'Disetujui');
  D('Manual', 'MN-SPMI-03', 'Manual Evaluasi (AMI) Pelaksanaan Standar', 'Disetujui');
  D('Manual', 'MN-SPMI-04', 'Manual Pengendalian Standar', 'Disetujui');
  D('Manual', 'MN-SPMI-05', 'Manual Peningkatan Standar', 'Review UPM');
  STANDAR.forEach(([k, j], i) => D('Standar', 'ST-' + k, 'Standar ' + j, i < 12 ? 'Disetujui' : (i < 13 ? 'Review UPM' : 'Draft')));
  D('Formulir', 'FM-AMI-01', 'Daftar Tilik Audit Mutu Internal', 'Disetujui', '2026');
  D('Formulir', 'FM-AMI-02', 'Permintaan Tindakan Koreksi (PTK)', 'Disetujui', '2026');
  D('Formulir', 'FM-RTM-01', 'Notulen dan Daftar Hadir RTM', 'Disetujui', '2026');
  D('Formulir', 'FM-RTL-01', 'Rencana dan Bukti Tindak Lanjut', 'Disetujui', '2026');
  D('SOP', 'SOP-UPM-01', 'SOP Audit Mutu Internal', 'Disetujui');
  D('SOP', 'SOP-UPM-02', 'SOP Rapat Tinjauan Manajemen', 'Disetujui');
  D('SOP', 'SOP-UPM-03', 'SOP Pengendalian Dokumen dan Rekaman Mutu', 'Disetujui');
  D('SOP', 'SOP-UPM-04', 'SOP Survei Kepuasan Pemangku Kepentingan', 'Draft');
  D('Tambahan', 'RSB-2025', 'Rencana Strategis Bisnis BLU PEM Akamigas 2025–2029', 'Disetujui', '2025–2029');
  D('Tambahan', 'PK-BLU-2026', 'Perjanjian Kinerja / Target Kinerja BLU 2026', 'Disetujui', '2026');
  D('Tambahan', 'KOKIN-2026', 'Kontrak Kinerja Kepala Badan 2026 (turunan PEM Akamigas)', 'Disetujui', '2026');
  D('Tambahan', 'REF-PCR', 'Benchmark Renstra & IKU/IKT Politeknik Caltex Riau 2022–2026', 'Disetujui', '2022–2026');

  const ami = [
    { id: 'AMI-26-01', auditee: 'TPM', auditor: ['AU04', 'AU06'], tgl: '2026-09-16', status: 'Selesai' },
    { id: 'AMI-26-02', auditee: 'TIK', auditor: ['AU05', 'AU03'], tgl: '2026-09-17', status: 'Selesai' },
    { id: 'AMI-26-03', auditee: 'UPM', auditor: ['AU01'], tgl: '2026-09-18', status: 'Selesai' },
    { id: 'AMI-26-04', auditee: 'P3M', auditor: ['AU02', 'AU06'], tgl: '2026-09-18', status: 'Selesai' },
    { id: 'AMI-26-05', auditee: 'TPG', auditor: ['AU01', 'AU04'], tgl: '2027-01-20', status: 'Terjadwal' },
    { id: 'AMI-26-06', auditee: 'TMK', auditor: ['AU02', 'AU05'], tgl: '2027-01-21', status: 'Terjadwal' },
    { id: 'AMI-26-07', auditee: 'LOG', auditor: ['AU04', 'AU06'], tgl: '2027-01-22', status: 'Terjadwal' },
    { id: 'AMI-26-08', auditee: 'SDM', auditor: ['AU03'], tgl: '2027-01-27', status: 'Terjadwal' }
  ];
  const rtm = [
    { id: 'RTM-25', judul: 'RTM Tahunan 2025', tgl: '2026-02-24', status: 'Selesai', pimpinan: 'Direktur PEM Akamigas', keputusan: ['Menetapkan target IKU/IKT 2026 selaras RSB & Kokin', 'Meningkatkan standar luaran riset prodi TIK', 'Menetapkan pilot IABEE: TPM & TIK'] },
    { id: 'RTM-26', judul: 'RTM Tahunan 2026', tgl: '2026-12-18', status: 'Terjadwal', pimpinan: 'Direktur PEM Akamigas', keputusan: [] }
  ];
  const settings = [{ id: 'app', bulan: partial, tahun: TAHUN, jenjang: Object.fromEntries(PRODI.map(p => [p.id, 'STr'])), seedVersi: 4 }];
  const log = [{ id: 'LOG' + Date.now(), t: new Date().toISOString(), user: 'Sistem', aksi: 'Inisialisasi data ilustratif SIMANTAP 2.0' }];
  return { indikator: inds, ami, rtl, rtm, dokumen: docs, log, settings };
}
