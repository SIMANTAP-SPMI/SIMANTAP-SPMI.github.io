# SIMANTAP 2.0 · SPMI & Simulasi Akreditasi PEM Akamigas

Website Sistem Penjaminan Mutu Internal (SPMI) berbasis siklus **PPEPP** untuk PEM Akamigas (BPSDM KESDM):
penetapan indikator, monitoring capaian bulanan, Audit Mutu Internal (AMI), Rencana Tindak Lanjut (RTL),
Rapat Tinjauan Manajemen (RTM), serta **simulasi akreditasi LAM Teknik 2025 dan IABEE** berbasis capaian.

> Seluruh angka bawaan **ilustratif**. Kalibrasi dengan dokumen resmi (RSB BLU, PK BLU, Kontrak Kinerja Kepala Badan, PDDikti) sebelum dipakai mengambil keputusan.

## Halaman
| Menu | Isi |
|---|---|
| Beranda | Hero 3D (Three.js), KPI animasi, infografis PPEPP, kalender mutu berlapis |
| Dashboard Pimpinan | Indeks capaian, peta 3D unit × bulan, radar kriteria LAM, kaskade Renstra→IKU/IKT, Eisenhower |
| Simulasi Skenario | Tuas capaian, skenario Moderat/Agresif/Hibrida, NA 0–400, syarat perlu, prediksi IABEE, proyeksi 2026–2030 |
| Katalog Indikator | Indikator bertag sumber RSB · BLU · KOKIN · LAM · IABEE · IAPT · Usulan IKU/IKT PEM, jejak PPEPP per indikator |
| Monitoring | Lembar isian capaian bulanan per unit + kelengkapan pengisian |
| AMI · RTL · RTM | Jadwal & temuan audit, kanban tindak lanjut, bahan RTM otomatis & pengesahan peningkatan standar |
| Akreditasi | NA per prodi, peta syarat perlu, matriks IABEE A/C/W/D, aspek penjaminan mutu (SP9) |
| Skema & Metode | Konversi capaian→skor, aturan status LAM Teknik 2025, metode IABEE, rujukan |
| Dokumen · Pengaturan | Pustaka dokumen SPMI, status database, sambungan Firestore, cadangan/pulihkan, log aktivitas |

Peran demo (pojok kanan atas): Admin SPM, Pimpinan, Auditor (tidak dapat mengaudit unit asal), Auditee (unit sendiri).

## Metode akreditasi
* **LAM Teknik 2025** (Pedoman Penilaian, Lampiran 10 Per-LAM Teknik No. 6/2025; PerBAN-PT No. 8/2025):
  4 kriteria (Diferensiasi Misi, Akuntabilitas, Relevansi, Budaya Mutu), skor butir 0–4, NA 0–400,
  ambang 361 / 331 / 200 dan syarat perlu Sarjana Terapan (SP1–SP9) serta D3.
* **IABEE**: rating A/C/W/D per kriteria → Accredited 5 tahun / Interim Evaluation 2 tahun / Not Accredited.
* Skema capaian → skor: ≥110% = 4 · 100–109% = 3,5 · 85–99% = 3 · 70–84% = 2 · 50–69% = 1 · <50% = 0.

Parameter yang perlu diverifikasi dengan lampiran resmi (bobot per butir, bobot kerja kriteria, ambang doktor Unggul 3 tahun)
dapat diubah di `assets/js/config.js`.

## Database
* **Bawaan**: database lokal peramban (localStorage), langsung berjalan tanpa server.
* **Cloud Firestore**: buat proyek Firebase → Firestore → Web app, lalu tempel `firebaseConfig` di
  menu *Database & Pengaturan* (atau isi `FIREBASE_CONFIG` di `assets/js/config.js` agar permanen untuk semua pengguna).
  Koleksi: `indikator, ami, rtl, rtm, dokumen, log, settings`.

## Menjalankan
Situs statis tanpa proses build. Lokal: `python3 -m http.server` lalu buka `http://localhost:8000`.
Publikasi: GitHub Pages via workflow `.github/workflows/pages.yml` (Settings → Pages → Source: GitHub Actions).

Pustaka (di-vendor di `assets/vendor`): ECharts 5.5.1, ECharts-GL 2.0.9, Three.js 0.160.0 — lisensi Apache-2.0/MIT.
