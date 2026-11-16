/* ============================================================
   SIMANTAP 2.0 · Konfigurasi
   ------------------------------------------------------------
   1) FIREBASE: isi objek di bawah dengan konfigurasi Web App dari
      Firebase Console (Project settings → General → Your apps).
      Jika dibiarkan kosong, aplikasi memakai database lokal
      (IndexedDB/localStorage di peramban) sehingga tetap bisa
      didemokan tanpa server.
   2) METODE: parameter penilaian LAM Teknik 2025 dan IABEE.
      Nilai yang ditandai "verifikasi" perlu dicocokkan dengan
      lampiran resmi sebelum dipakai untuk keputusan.
   ============================================================ */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCHC9m3eFUnvLY9Kh__3q46xeF3ZSooMZA",
  authDomain: "simantap-pem.firebaseapp.com",
  projectId: "simantap-pem",
  storageBucket: "simantap-pem.firebasestorage.app",
  messagingSenderId: "672894538274",
  appId: "1:672894538274:web:c3f9154ba2139a0fb6b07b"
};

export const APP = {
  nama: "SIMANTAP 2.0",
  sub: "Sistem Penjaminan Mutu Internal & Simulasi Akreditasi",
  institusi: "PEM Akamigas · BPSDM KESDM",
  tahun: 2026,
  dataIlustratif: true
};

/* ---------- LAM Teknik 2025 (Lampiran 10 Peraturan LAM Teknik No. 6/2025) ----------
   Sumber: Pedoman Penilaian Instrumen LAM Teknik 2025 dan PerBAN-PT No. 8/2025
   tentang Standar Unggul LAM Teknik. */
export const LAM = {
  sumber: [
    { nama: "Pedoman Penilaian Instrumen LAM Teknik 2025 (Lampiran 10 Per-LAM Teknik No. 6/2025)", url: "https://lamteknik.or.id/assets/downloads/instrumen-akreditasi-lam-teknik-2025/update-12-november-2025/naskah-akademik-dan-pedoman-penilaian/pedoman-penilaian-instrumen-lam-teknik-2025.pdf" },
    { nama: "PerBAN-PT No. 8/2025 tentang Standar Unggul LAM Teknik", url: "https://www.lamteknik.or.id/assets/downloads/peraturan-ban-pt/perban-pt-8-2025-standar-unggul-lam-teknik-dan-lampiran.pdf" }
  ],
  skalaButir: [0, 1, 2, 3, 4],          // skor per butir
  naMaks: 400,                          // NA = Σ(bobot% × skor) → 0–400
  jumlahButir: { D3: 56, STr: 64 },
  kriteria: [
    { id: "K1", nama: "Diferensiasi Misi", bobot: 15, ket: "Visi-misi, keunikan, dan kekhasan program dalam ekosistem energi" },
    { id: "K2", nama: "Akuntabilitas", bobot: 25, ket: "Tata pamong, tata kelola, SDM, keuangan, dan sarana prasarana" },
    { id: "K3", nama: "Relevansi", bobot: 40, ket: "Relevansi pendidikan, penelitian, dan PkM; luaran dan capaian lulusan" },
    { id: "K4", nama: "Budaya Mutu", bobot: 20, ket: "SPMI, siklus PPEPP, evaluasi capaian, dan perbaikan berkelanjutan" }
  ],
  // bobot kriteria di atas adalah asumsi kerja (verifikasi dengan "Bobot Butir Penilaian" STr, hlm. 136 Pedoman)
  komponen: [ { id: "I", nama: "Input", bobot: 25 }, { id: "P", nama: "Proses", bobot: 35 }, { id: "O", nama: "Output/Outcome", bobot: 40 } ],
  ambang: { unggul: 361, unggulBawah: 331, terakreditasi: 200 },
  status: [
    { kode: "U5", nama: "Terakreditasi Unggul 5 Tahun", warna: "#0e9f6e" },
    { kode: "U3", nama: "Terakreditasi Unggul 3 Tahun", warna: "#16a3b8" },
    { kode: "T5", nama: "Terakreditasi 5 Tahun", warna: "#f59f0b" },
    { kode: "TT", nama: "Tidak Terakreditasi", warna: "#ef5350" }
  ],
  // Syarat perlu Sarjana Terapan (STr / D-IV)
  syaratPerluSTr: [
    { id: "SP1", nama: "Sistem tata pamong", jenis: "rerata", terakreditasi: 2.0, unggul3: 3.0, unggul5: 3.5, satuan: "rerata skor" },
    { id: "SP2", nama: "Kurikulum", jenis: "rerata", terakreditasi: 2.0, unggul3: 3.0, unggul5: 3.5, satuan: "rerata skor" },
    { id: "SP3", nama: "Basic sciences & matematika", jenis: "min", terakreditasi: 2, unggul3: 4, unggul5: 4, satuan: "SKS" },
    { id: "SP4", nama: "Kualifikasi DTPS doktor/doktor terapan", jenis: "min", terakreditasi: null, unggul3: 12.5, unggul5: 15, satuan: "%" },
    { id: "SP5", nama: "Jabatan akademik DTPS (GB/LK/L)", jenis: "min", terakreditasi: null, unggul3: 40, unggul5: 40, satuan: "%" },
    { id: "SP6", nama: "Pagelaran/publikasi internasional DTPS", jenis: "min", terakreditasi: null, unggul3: 0.5, unggul5: 0.5, satuan: "rasio" },
    { id: "SP7", nama: "Waktu tunggu lulusan", jenis: "max", terakreditasi: null, unggul3: 6, unggul5: 6, satuan: "bulan" },
    { id: "SP8", nama: "Kesesuaian bidang kerja", jenis: "min", terakreditasi: null, unggul3: 50, unggul5: 50, satuan: "%" },
    { id: "SP9", nama: "Penjaminan mutu (IKU-IKT, PPEPP, efektivitas, peningkatan)", jenis: "rerata", terakreditasi: 2.0, unggul3: 3.0, unggul5: 3.5, satuan: "rerata skor" }
  ],
  syaratPerluD3: [
    { id: "SP2", nama: "Kurikulum", jenis: "rerata", terakreditasi: 2.0, unggul3: 3.0, unggul5: 3.5, satuan: "rerata skor" },
    { id: "SP5", nama: "Jabatan akademik DTPS (GB/LK/L)", jenis: "min", terakreditasi: null, unggul3: 30, unggul5: 40, satuan: "%" },
    { id: "SP7", nama: "Waktu tunggu lulusan", jenis: "max", terakreditasi: null, unggul3: 3, unggul5: 3, satuan: "bulan" },
    { id: "SP8", nama: "Kesesuaian bidang kerja", jenis: "min", terakreditasi: null, unggul3: 70, unggul5: 70, satuan: "%" },
    { id: "SP9", nama: "Penjaminan mutu", jenis: "rerata", terakreditasi: 2.0, unggul3: 3.0, unggul5: 3.5, satuan: "rerata skor" }
  ]
};

/* ---------- IABEE (Accreditation Evaluation and Decision) ----------
   Sumber: https://iabee.or.id/en/accrediation/accreditation-evaluation-and-decision/ */
export const IABEE = {
  sumber: { nama: "IABEE · Accreditation Evaluation and Decision", url: "https://iabee.or.id/en/accrediation/accreditation-evaluation-and-decision/" },
  rating: [
    { kode: "A", nama: "Acceptable", ket: "Memenuhi kriteria", warna: "#0e9f6e" },
    { kode: "C", nama: "Concern", ket: "Memenuhi, tetapi ada potensi tidak terpenuhi di masa depan", warna: "#16a3b8" },
    { kode: "W", nama: "Weakness", ket: "Pemenuhan kriteria lemah; perlu perbaikan", warna: "#f59f0b" },
    { kode: "D", nama: "Deficiency", ket: "Kriteria tidak terpenuhi", warna: "#ef5350" }
  ],
  keputusan: [
    { kode: "AC5", nama: "Accredited (5 tahun)", aturan: "Semua butir A atau C" },
    { kode: "IE2", nama: "Accredited with Interim Evaluation (2 tahun)", aturan: "Ada butir W yang belum tuntas" },
    { kode: "NA", nama: "Not Accredited", aturan: "Ada butir D yang belum tuntas" }
  ],
  kriteria: [
    { id: "K1", nama: "Orientasi kompetensi lulusan", ket: "Profil Profesional Mandiri (PPM) dan CPL ditetapkan bersama pemangku kepentingan dan dipublikasikan" },
    { id: "K2", nama: "Pelaksanaan pembelajaran", ket: "Kurikulum, metode, dosen, fasilitas mendukung pencapaian CPL" },
    { id: "K3", nama: "Penilaian capaian pembelajaran", ket: "Asesmen CPL langsung dan tidak langsung terdokumentasi" },
    { id: "K4", nama: "Perbaikan berkelanjutan", ket: "Hasil asesmen dipakai untuk perbaikan yang terdokumentasi" },
    { id: "K5", nama: "Kriteria kategori/disiplin", ket: "Kriteria program teknologi keteknikan (Sydney Accord) dan disiplin terkait" }
  ],
  cpl: ["(a) Pengetahuan dasar keteknikan", "(b) Analisis masalah", "(c) Perancangan", "(d) Investigasi & pengolahan data", "(e) Teknologi modern", "(f) Dampak bagi masyarakat & lingkungan", "(g) Etika profesi", "(h) Kerja individu & tim", "(i) Komunikasi", "(j) Manajemen proyek", "(k) Pembelajaran sepanjang hayat"]
};

/* ---------- Skema konversi capaian → skor butir (0–4) ----------
   Rasio capaian = capaian / target (atau target / capaian bila arah "≤").
   Skema ini dipakai simulator untuk menerjemahkan capaian indikator SPMI
   menjadi skor butir LAM Teknik. */
export const SKEMA_CAPAIAN = [
  { min: 1.10, skor: 4, label: "Melampaui", ket: "≥ 110% target" },
  { min: 1.00, skor: 3.5, label: "Tercapai penuh", ket: "100–109% target" },
  { min: 0.85, skor: 3, label: "Hampir tercapai", ket: "85–99% target" },
  { min: 0.70, skor: 2, label: "Sebagian", ket: "70–84% target" },
  { min: 0.50, skor: 1, label: "Kurang", ket: "50–69% target" },
  { min: 0, skor: 0, label: "Tidak tercapai", ket: "< 50% target / tidak ada bukti" }
];

/* Sepuluh indikator kesiapan IABEE. Dihitung di KUREKAM, SIMANTAP hanya membaca ringkasannya (koleksi kur_umpan).
   Kunci umpan: iabee_01 sampai iabee_10. */
export const INDIKATOR_IABEE = [
  { no: 1, nama: 'Mata kuliah inti dengan PI dan CPMK terpetakan', sumber: 'KUREKAM', target: 'PI untuk 100% CPL, Desember 2026' },
  { no: 2, nama: 'CPL terpetakan ke butir IABEE (a) sampai (k)', sumber: 'KUREKAM', target: 'Lima prodi terpetakan, Desember 2026' },
  { no: 3, nama: 'CPL yang datanya terukur per angkatan', sumber: 'KUREKAM', target: 'Pengukuran mulai Januari 2027' },
  { no: 4, nama: 'Ketercapaian CPL terhadap kriteria', sumber: 'KUREKAM', target: 'Semua CPL prodi pilot di atas kriteria' },
  { no: 5, nama: 'Capstone: bobot, rubrik, proyek nyata', sumber: 'KUREKAM', target: 'Terdokumentasi 2027 sampai 2028' },
  { no: 6, nama: 'Jumlah lulusan OBE per prodi', sumber: 'KUREKAM', target: 'Terdata semua prodi' },
  { no: 7, nama: 'Tindak lanjut perbaikan dari hasil CPL', sumber: 'KUREKAM', target: 'Minimal 1 siklus per prodi pilot' },
  { no: 8, nama: 'Tracer dan survei pengguna lulusan', sumber: 'KUREKAM', target: 'Respons minimal 70%' },
  { no: 9, nama: 'Kelengkapan dokumen kelayakan dan evaluasi diri', sumber: 'SIMANTAP', target: '100% prodi pilot sebelum SER' },
  { no: 10, nama: 'Kompetensi dosen untuk mata kuliah inti', sumber: 'KUREKAM', target: 'Tidak ada mata kuliah inti tanpa dosen sesuai' }
];

/* Aplikasi pendamping. Akun masuk sama (satu proyek Firebase), tetapi sesi masuk dipisah per situs. */
export const APP_LAIN = { kurekam: { nama: 'KUREKAM', url: 'https://kurekam-pemakamigas.github.io/' } };

/* Jalur akreditasi IABEE (diringkas dari RPEA 2026 dan Kriteria ETECH 2026; cek dokumen resmi sebelum mendaftar).
   Tanggal siklus: pendaftaran 1-15 April, SER 30 Juni, kunjungan paling lambat 7 November, keputusan 15 Maret, pengumuman 31 Maret. */
export const IABEE_JALUR = {
  syarat: {
    PA: [
      'Institusi dan program studi terakreditasi nasional',
      'Cakupan program sesuai (sarjana terapan, minimal 144 SKS, 4 tahun)',
      'Profil Profesional Mandiri (PPM) dan CPL dipublikasikan',
      'Kurikulum berbasis capaian (OBE) sudah berjalan minimal 1 tahun sebelum mendaftar',
      'Pernyataan Ketua Prodi tentang tanggal mulai OBE'
    ],
    GA: [
      'Akreditasi institusi minimal B dan program studi terakreditasi nasional',
      'Cakupan program sesuai (sarjana terapan, minimal 144 SKS, 4 tahun)',
      'Pemangku kepentingan industri terlibat dalam PPM, CPL, dan kurikulum',
      'Etika, keberlanjutan, dan keselamatan termuat dalam kurikulum',
      'Kedalaman dan keluasan kurikulum memenuhi kriteria (Tabel B1)',
      'PPM dan CPL dipublikasikan',
      'OBE diterapkan penuh',
      'Minimal satu lulusan OBE sebelum kunjungan evaluator',
      'Pernyataan Ketua Prodi tentang tanggal mulai OBE'
    ]
  },
  /* Tanggal bawaan relatif terhadap tahun pendaftaran Y (April Y). */
  langkah: [
    { no: 1, nama: 'Pahami kriteria dan siklus', mulai: [-1, '11-16'], tenggat: [-1, '12-31'], menu: { t: 'Skema Capaian & Metode', h: '#/skema' },
      panduan: ['Baca Kriteria Akreditasi ETECH 2026 dan RPEA 2026 dari folder panduan IABEE.', 'Pahami perbedaan jalur PA (sekali, 3 tahun, tidak diakui internasional) dan GA (diakui internasional).', 'Tentukan prodi dan jalur yang diusulkan, lalu ajukan untuk disahkan Wadir I.'] },
    { no: 2, nama: 'Cek kelayakan', mulai: [-1, '12-01'], tenggat: [0, '03-15'], menu: { t: 'Kelayakan di halaman ini', h: '#/jalur' },
      panduan: ['Centang setiap syarat yang sudah terpenuhi pada kartu Kelayakan.', 'Lampirkan tautan bukti (boleh lebih dari satu) untuk tiap syarat.', 'Isi angkatan OBE pertama dan tanggal wisuda agar syarat lulusan OBE terhitung otomatis.', 'Syarat yang belum terpenuhi dicatat beserta rencana pemenuhannya.'] },
    { no: 3, nama: 'Surat tugas dan registrasi', mulai: [-1, '12-15'], tenggat: [0, '04-15'], menu: { t: 'Registrasi di halaman ini', h: '#/jalur' },
      panduan: ['Terbitkan surat tugas Wakil Prodi (Program Representative) dan catat nomor, tanggal, serta tautannya.', 'Daftarkan prodi di sistem IABEE pada 1 sampai 15 April.', 'Pastikan akun Wakil Prodi di sistem IABEE aktif; templat LED resmi baru bisa diunduh setelah registrasi.', 'Setelah surat tugas terisi dan penetapan disahkan, akses pengisian LED di aplikasi terbuka.'] },
    { no: 4, nama: 'Susun laporan evaluasi diri (LED)', mulai: [0, '01-05'], tenggat: [0, '05-15'], menu: { t: 'Register LED (tahap berikutnya)', h: '#/jalur' },
      panduan: ['Siapkan Tabel Suplemen di KUREKAM berurutan A1, A2, B1, B2, C1, C2, lalu B3 sampai B5.', 'Isi uraian 53 aitem beserta tautan bukti di aplikasi.', 'Lengkapi Ikhtisar Program dan data kuantitatif empat tahun terakhir.'] },
    { no: 5, nama: 'AMI kesiapan IABEE', mulai: [0, '05-16'], tenggat: [0, '06-12'], menu: { t: 'Audit Mutu Internal', h: '#/ami' },
      panduan: ['SPM menugaskan auditor dari dosen di luar prodi yang diaudit.', 'Auditor menilai tiap aitem (A, C, W, D) dan memeriksa bukti.', 'Temuan W dan D masuk Rencana Tindak Lanjut dan harus tuntas sebelum SER dikirim.'] },
    { no: 6, nama: 'Kirim SER ke IABEE', mulai: [0, '06-13'], tenggat: [0, '06-30'], menu: { t: 'Dokumen SPMI', h: '#/dokumen' },
      panduan: ['Unggah LED dan lampirannya melalui sistem evaluasi IABEE dengan akun Wakil Prodi.', 'Pastikan tenggat 30 Juni terpenuhi; simpan bukti unggah.'] },
    { no: 7, nama: 'Kunjungan evaluator', mulai: [0, '10-01'], tenggat: [0, '11-07'], menu: { t: 'Rencana Tindak Lanjut', h: '#/rtl' },
      panduan: ['Siapkan jadwal, ruang, dan pihak yang diwawancarai (dosen, mahasiswa, alumni, industri).', 'Siapkan bukti fisik dan akses data yang tertaut di LED.', 'Catat temuan dan pernyataan penutup evaluator.'] },
    { no: 8, nama: 'Tindak lanjut dan keputusan', mulai: [0, '11-08'], tenggat: [1, '03-31'], menu: { t: 'Tinjauan Manajemen', h: '#/rtm' },
      panduan: ['Tanggapi laporan evaluator sesuai tenggat (laporan akhir sekitar 15 Januari).', 'Pantau keputusan (sekitar 15 Maret) dan pengumuman (31 Maret).', 'Bawa hasilnya ke Tinjauan Manajemen untuk rencana perbaikan.'] }
  ]
};
