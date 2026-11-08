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
