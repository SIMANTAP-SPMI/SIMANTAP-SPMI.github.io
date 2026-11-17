/* SIMANTAP · Rujukan bukti dari KUREKAM (hanya dibaca, tidak disalin): realisasi pembelajaran per mata kuliah. */
import { S, icon, esc } from '../app.js';
import { DB } from '../db.js';

const DEMO = { periode: '2025-2', mk: 57, isi: 14, lengkap: 6, inti: 12, intiLengkap: 4, cpmkTerukur: 29, cpmkBawah: 3, tl: 2, sesuaiRps: 93, ilustratif: true };
const label = (k) => { const [y, s] = String(k).split('-'); return `${y}/${+y + 1} ${s === '2' ? 'Genap' : 'Ganjil'}`; };

/** Kartu ringkasan realisasi pembelajaran prodi dari KUREKAM; kosong bila belum ada umpan. */
export function kartuRealisasi(pid, judulButir) {
  const demo = DB.mode !== 'firebase', u = demo ? { real: DEMO } : (S.kurekam || []).find(x => x.unit === pid);
  const r = u && u.real; if (!r) return `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Realisasi pembelajaran dari KUREKAM</h3></div><div class="small muted">Belum ada data realisasi pembelajaran untuk prodi ini. Dosen mengisinya di KUREKAM, menu Realisasi Pembelajaran.</div></div>`;
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  return `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Realisasi pembelajaran dari KUREKAM${judulButir ? ' · ' + esc(judulButir) : ''}</h3></div>
    <div class="small" style="line-height:1.6">${r.ilustratif ? '<span class="tag" style="--c:#f5a524">contoh ilustratif</span> ' : ''}${demo ? '<span class="muted">Mode demo. </span>' : ''}Semester ${esc(label(r.periode))}: portofolio mata kuliah lengkap <b>${r.lengkap} dari ${r.mk}</b> (${pct(r.lengkap, r.mk)}%), sudah mulai diisi ${r.isi}${r.inti ? `, mata kuliah inti lengkap <b>${r.intiLengkap} dari ${r.inti}</b>` : ''}. CPMK terukur <b>${r.cpmkTerukur}</b>, di bawah kriteria <b>${r.cpmkBawah}</b>, tindak lanjut tercatat ${r.tl}${r.sesuaiRps != null ? `. Pelaksanaan sesuai RPS rata-rata <b>${r.sesuaiRps}%</b>` : ''}.</div>
    <div class="small muted" style="margin-top:6px">Bukti rinci (soal, kisi-kisi, rubrik, analisis) ada di KUREKAM per mata kuliah dan dapat diminta auditor sebagai sampel. Data dibaca langsung dari KUREKAM.</div></div>`;
}
