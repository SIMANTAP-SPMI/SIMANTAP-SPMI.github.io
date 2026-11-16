/* AMI Akreditasi LAM Teknik: instrumen 2025 (Sarjana Terapan, 64 butir) dihitung dengan rumus yang sama persis dengan berkas Excel resmi.
   Prodi mengisi angka borang, deskripsi, dan tautan bukti per butir; auditor menilai butir kualitatif 0 sampai 4 seperti asesor LAM.
   Data di koleksi "lam" (satu dokumen per prodi): { id, input:{sel:nilai}, deskripsi:{no}, bukti:{no:[{label,url}]}, catatan:{no}, riwayat[] }. */
import { S, ctx, icon, esc, save, toast, openDrawer, closeDrawer, userName } from '../app.js';
import { PRODI } from '../seed.js';
import { LAM } from '../config.js';
import { statusLAM } from '../scoring.js';
import { LAM_ITEMS, LAM_SYARAT_TEKS } from '../lam-data.js';
import { LAM_AWAL } from '../lam-awal.js';
import { hitungLam, isianButir } from '../lam-engine.js';
import { auditorBerhak } from './led.js';
import { xlsx, unduh } from '../ekspor.js';

const urlOk = (u) => /^https?:\/\/\S+$/i.test(u || '');
const ST = { belum: ['#94a3b8', 'Belum diisi'], sebagian: ['#f5a524', 'Sebagian'], siap: ['#0ea5e9', 'Siap dinilai'], selesai: ['#10b981', 'Selesai'] };
const SP_KOL = [['J', 'I', 'Terakreditasi'], ['L', 'K', 'Unggul 3 tahun'], ['N', 'M', 'Unggul 5 tahun']];
const SP_BARIS = [...new Set(LAM_ITEMS.map(it => it.lap))].filter(r => [16, 24, 31, 39, 40, 50, 65, 66, 71].includes(r));
let pilih = null, fS = '', fQ = '';

/* ---------- data ---------- */
export const dokLam = (pid) => S.lam.find(x => x.id === pid) || { id: pid, input: {}, deskripsi: {}, bukti: {}, catatan: {}, riwayat: [], _baru: true };
const ada = (v) => v !== undefined && v !== null && v !== '';
const fmt = (v, d = 2) => typeof v === 'number' && Number.isFinite(v) ? (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',') : (v === null || v === undefined ? '–' : String(v));

/** Kelengkapan satu butir: bagian prodi (angka borang, deskripsi, tautan bukti) dan bagian auditor (skor untuk butir kualitatif). */
export function statusButir(it, d) {
  const num = it.borang.every(b => ada(d.input[b.ref]));
  const desk = (d.deskripsi[it.no] || '').trim().length >= 50, bukti = (d.bukti[it.no] || []).some(b => urlOk(b.url));
  const prodi = num && bukti && (it.judge.length ? desk : true);
  const skorAda = it.judge.length ? it.judge.every(j => ada(d.input[j.ref])) : true;
  const sentuh = it.borang.some(b => ada(d.input[b.ref])) || it.judge.some(j => ada(d.input[j.ref])) || desk || (d.bukti[it.no] || []).length > 0;
  const k = prodi && skorAda ? 'selesai' : prodi ? 'siap' : sentuh ? 'sebagian' : 'belum';
  return { k, prodi, skorAda };
}

/** Hasil satu prodi: NA, syarat perlu, status akreditasi LAM, kemajuan pengisian, cakupan bobot, dan proyeksi NA.
    Butir yang belum terisi bernilai 0 pada NA, sehingga proyeksi menaksir NA penuh dari butir yang sudah terisi saja (indikatif). */
const BOBOT_TOTAL = LAM_ITEMS.reduce((a, it) => a + it.bobot, 0);
export function hasilLam(pid) {
  const d = dokLam(pid), H = hitungLam(d.input);
  const sb = LAM_ITEMS.map(it => statusButir(it, d)), selesai = sb.filter(x => x.k === 'selesai').length, sentuh = sb.filter(x => x.k !== 'belum').length;
  const ukur = LAM_ITEMS.map(it => isianButir(it).every(x => ada(d.input[x.ref])));
  const bobotUkur = LAM_ITEMS.reduce((a, it, i) => a + (ukur[i] ? it.bobot : 0), 0), cakupan = Math.round(bobotUkur / BOBOT_TOTAL * 100);
  const NAukur = H.butir.reduce((a, b, i) => a + (ukur[i] ? b.nilai : 0), 0), proy = bobotUkur > 0 ? NAukur / bobotUkur * BOBOT_TOTAL : 0;
  const lengkap = ukur.every(Boolean), A = LAM.ambang;
  const level = !H.spTerakreditasi ? 'gagal' : H.spUnggul5 ? 'unggul5' : H.spUnggul3 ? 'unggul3' : 'terakreditasi';
  let status = null, indikatif = '';
  if (lengkap) status = statusLAM(H.NA, [{ level }]);
  else if (cakupan >= 30) indikatif = proy >= A.unggulBawah ? 'Berpotensi Unggul' : proy >= A.terakreditasi ? 'Berpotensi Terakreditasi' : 'Di bawah NA minimum';
  return { d, H, sb, selesai, sentuh, status, indikatif, cakupan, proy, lengkap, sementara: !lengkap, nProdi: sb.filter(x => x.prodi).length, nSkor: LAM_ITEMS.filter((it, i) => it.judge.length && sb[i].skorAda).length };
}
const nJudge = LAM_ITEMS.filter(it => it.judge.length).length;

const riw = (doc, aksi) => { doc.riwayat = [{ t: new Date().toISOString(), oleh: userName(), aksi }, ...(doc.riwayat || [])].slice(0, 60); };
const bolehIsi = (pid) => ctx.role === 'admin' || (ctx.role === 'auditee' && ctx.unit === pid);
const chip = ([c, t]) => `<span class="tag" style="--c:${c}">${t}</span>`;
const tagStatus = (s) => s ? `<span class="tag" style="--c:${s.warna}">${esc(s.nama)}</span>` : '<span class="muted">Belum dinilai</span>';

/* ---------- ekspor ---------- */
function unduhExcel(p, R) {
  const H = (v) => ({ v, s: 1 }), tgl = new Date().toISOString().slice(0, 10);
  const ring = [['Prodi', 'NA butir terisi', 'Cakupan bobot (%)', 'Proyeksi NA (indikatif)', 'Status', 'Syarat perlu Terakreditasi', 'Syarat perlu Unggul 3 th', 'Syarat perlu Unggul 5 th', 'Butir selesai'].map(H)];
  PRODI.forEach(x => { const r = hasilLam(x.id); ring.push([x.id, fmt(r.H.NA), String(r.cakupan), fmt(r.proy), r.status ? r.status.nama : (r.indikatif ? r.indikatif + ' (indikatif)' : 'Belum cukup data'), r.H.spTerakreditasi ? 'Terpenuhi' : 'Belum', r.H.spUnggul3 ? 'Terpenuhi' : 'Belum', r.H.spUnggul5 ? 'Terpenuhi' : 'Belum', `${r.selesai}/${LAM_ITEMS.length}`]); });
  const bt = [['No', 'Elemen', 'Bobot (%)', 'Skor', 'Nilai (bobot x skor)', 'Status isian', 'Deskripsi prodi', 'Bukti', 'Catatan auditor'].map(H)];
  LAM_ITEMS.forEach((it, i) => { const b = R.H.butir[i], d = R.d; bt.push([String(it.no), it.elemen, fmt(it.bobot), fmt(b.skor), fmt(b.nilai, 3), ST[R.sb[i].k][1], d.deskripsi[it.no] || '', (d.bukti[it.no] || []).map((x, j) => `Bukti ${j + 1}: ${x.label} - ${x.url}`).join('\n'), d.catatan[it.no] || '']); });
  unduh(`AMI_LAM_Teknik_${p.id}_${tgl}.xlsx`, xlsx([{ nama: 'Ringkasan', lebar: [10, 16, 16, 20, 34, 22, 22, 22, 14], baris: ring }, { nama: p.id, lebar: [6, 40, 10, 8, 14, 14, 60, 50, 40], baris: bt }]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* ---------- tampilan utama ---------- */
export default function amiLamView(el) {
  const lihat = ctx.role === 'auditee' ? PRODI.filter(p => p.id === ctx.unit) : PRODI;
  if (!lihat.length) { el.innerHTML = '<div class="empty">Akun Prodi/Unit ini belum terhubung ke prodi. Hubungi Admin SPM.</div>'; return; }
  if (!pilih || !lihat.some(p => p.id === pilih)) pilih = lihat[0].id;
  const p = PRODI.find(x => x.id === pilih), R = hasilLam(pilih), H = R.H, isi = bolehIsi(pilih), audit = auditorBerhak(pilih);
  const semua = lihat.map(x => ({ x, r: x.id === pilih ? R : hasilLam(x.id) }));
  const daftar = LAM_ITEMS.map((it, i) => ({ it, i, b: H.butir[i], s: R.sb[i] })).filter(({ it, s }) => (!fS || s.k === fS) && (!fQ || (it.elemen + ' ' + it.uraian + ' ' + it.no).toLowerCase().includes(fQ.toLowerCase())));
  const spCell = (v) => v === 'TERPENUHI' ? '<span class="tag" style="--c:#10b981">Terpenuhi</span>' : v === 'TIDAK TERPENUHI' ? '<span class="tag" style="--c:#f0616d">Belum</span>' : '<span class="muted">–</span>';
  el.innerHTML = `
  <div class="ribbon info">${icon('info')} <span><b>Instrumen LAM Teknik 2025, Sarjana Terapan.</b> Rumus identik dengan berkas Excel resmi (64 butir, NA maksimum sekitar 400). Prodi mengisi angka borang, deskripsi, dan tautan bukti per butir. Auditor menilai butir kualitatif dengan skala 0 sampai 4 sesuai rubrik. Impor otomatis dari LKPS menyusul; sementara angka diisi manual.</span></div>
  <div class="card" style="margin-top:14px"><div class="card-h"><span class="ico-badge" style="--c:#14b8a6">${icon('audit')}</span><div><h3>Perbandingan prodi</h3><div class="sub">NA menghitung butir terisi saja (butir kosong bernilai 0). Proyeksi menaksir NA penuh dari butir terisi, dan status baru resmi bila 64 butir lengkap.</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>NA butir terisi</th><th>Cakupan bobot</th><th>Proyeksi NA</th><th>Status</th><th>Syarat perlu<br><span class="small muted">Terakr. · U3 · U5</span></th><th>Isian prodi</th></tr></thead><tbody>
    ${semua.map(({ x, r }) => `<tr class="click" data-p="${x.id}" ${x.id === pilih ? 'style="background:rgba(139,92,246,.07)"' : ''}><td><b>${x.id}</b><div class="small muted">${esc(x.nama)}</div></td>
      <td><b>${r.sentuh ? fmt(r.H.NA, 1) : '–'}</b></td><td class="small">${r.sentuh ? r.cakupan + '%' : '–'}</td><td><b>${r.cakupan >= 30 ? fmt(r.proy, 1) : '–'}</b>${r.cakupan >= 30 && !r.lengkap ? '<div class="small muted">indikatif</div>' : ''}</td>
      <td>${r.status ? tagStatus(r.status) : r.indikatif ? `<span class="tag" style="--c:#0ea5e9">${r.indikatif}</span><div class="small muted">indikatif</div>` : '<span class="muted">Belum cukup data</span>'}</td>
      <td class="small">${r.lengkap ? [r.H.spTerakreditasi, r.H.spUnggul3, r.H.spUnggul5].map(v => v ? '✓' : '✗').join(' · ') : '<span class="muted">belum lengkap</span>'}</td><td class="small">${r.nProdi}/${LAM_ITEMS.length}${r.d.awal ? '<div class="small" style="color:#92400e">data awal, perlu validasi</div>' : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="small muted" style="margin-top:8px">Ambang NA: Terakreditasi mulai ${LAM.ambang.terakreditasi}, Unggul mulai ${LAM.ambang.unggulBawah} atau ${LAM.ambang.unggul} sesuai syarat perlu. Syarat perlu dihitung dari instrumen (rata-rata skor butir tertentu, SKS praktik, rasio dosen S3, dan seterusnya). Hasil ini simulasi internal, bukan keputusan LAM Teknik.</div></div>

  ${R.d.awal ? `<div class="ribbon" style="margin-top:16px">${icon('alert')} <span><b>Data awal, perlu validasi.</b> Angka dan skor estimasi ini diambil dari ${esc(R.d.awalDari)} serta LKPS yang dinilai saat itu (data lama, bukan kondisi terkini). Auditor dan prodi memvalidasi lalu memperbarui tiap butir; butir yang kosong belum terisi.</span></div>` : ''}
  <div class="card" style="margin-top:16px"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('layers')}</span><div><h3>${esc(p.id)} · ${esc(p.nama)}</h3><div class="sub">${R.selesai} dari ${LAM_ITEMS.length} butir selesai · ${isi ? 'Anda dapat mengisi angka, deskripsi, dan bukti' : audit ? 'Anda ditugaskan menilai prodi ini' : 'Hanya lihat'}</div></div><div class="sp"></div>
    ${lihat.length > 1 ? `<select class="inp" id="m-p" style="max-width:240px">${lihat.map(x => `<option value="${x.id}" ${x.id === pilih ? 'selected' : ''}>${x.id} · ${esc(x.nama)}</option>`).join('')}</select>` : ''}
    ${R.d._baru && ctx.role === 'admin' ? `<button class="btn sm" id="m-awal">${icon('spark')} Muat data awal dari tanggapan AL</button>` : ''}<button class="btn sm" id="m-x">${icon('download')} Excel</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
      <div style="padding:10px 12px;border-radius:12px;background:rgba(139,92,246,.1)"><b style="font-size:22px;color:#6d28d9">${R.sentuh ? fmt(H.NA, 1) : '–'}</b><div class="small">NA butir terisi (maks. 400) · proyeksi ${R.cakupan >= 30 ? fmt(R.proy, 1) : '–'} · cakupan ${R.cakupan}%</div></div>
      <div style="padding:10px 12px;border-radius:12px;background:rgba(24,35,58,.05)"><div style="font-weight:700">${R.status ? esc(R.status.nama) : R.indikatif || 'Belum cukup data'}</div><div class="small">${R.status ? 'status akreditasi' : 'indikatif, belum resmi'}</div></div>
      <div style="padding:10px 12px;border-radius:12px;background:rgba(14,165,233,.1)"><b style="font-size:22px;color:#0369a1">${R.nProdi}</b><span class="small"> / ${LAM_ITEMS.length}</span><div class="small">butir isian prodi lengkap</div></div>
      <div style="padding:10px 12px;border-radius:12px;background:rgba(16,185,129,.1)"><b style="font-size:22px;color:#047857">${R.nSkor}</b><span class="small"> / ${nJudge}</span><div class="small">butir kualitatif sudah dinilai</div></div></div>
    <details style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">Syarat perlu per butir</summary>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Butir</th>${SP_KOL.map(k => `<th>${k[2]}</th>`).join('')}</tr></thead><tbody>
      ${SP_BARIS.map(lap => { const it = LAM_ITEMS.find(x => x.lap === lap), b = H.butir[LAM_ITEMS.indexOf(it)]; return `<tr><td class="small"><b>${it.no}</b> ${esc(it.elemen)}</td>${SP_KOL.map(([j, k]) => `<td>${spCell(b.sp[j])}<div class="small muted">${esc(String(LAM_SYARAT_TEKS[k + lap] || H.e.lap(k + lap) || '').replace(/\n+/g, ' '))}</div></td>`).join('')}</tr>`; }).join('')}
      </tbody></table></div></details></div>

  <div class="card" style="margin-top:16px"><div class="filters">
    <select class="inp" id="m-s"><option value="">Semua status</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${fS === k ? 'selected' : ''}>${v[1]}</option>`).join('')}</select>
    <input class="inp" id="m-q" placeholder="Cari elemen atau kata di butir" value="${esc(fQ)}" style="min-width:220px"></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Elemen penilaian</th><th>Jenis</th><th>Bobot</th><th>Status</th><th>Skor</th><th>Nilai</th><th></th></tr></thead><tbody>
    ${daftar.map(({ it, b, s }) => `<tr><td><b>${it.no}</b></td><td class="small" style="max-width:380px">${esc(it.elemen)}</td><td class="small">${it.judge.length ? 'Kualitatif (dinilai auditor)' : 'Kuantitatif (angka borang)'}</td><td class="small">${fmt(it.bobot)}%</td>
      <td>${chip(ST[s.k])}</td><td>${s.k === 'belum' ? '–' : `<b>${fmt(b.skor)}</b>`}</td><td class="small">${s.k === 'belum' ? '–' : fmt(b.nilai, 2)}</td><td><button class="btn sm" data-no="${it.no}">${isi || audit ? 'Isi / nilai' : 'Buka'}</button></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Tidak ada butir yang cocok dengan filter.</td></tr>'}
    </tbody></table></div></div>`;

  const ulang = () => amiLamView(el);
  const sp = el.querySelector('#m-p'); if (sp) sp.onchange = () => { pilih = sp.value; ulang(); };
  el.querySelectorAll('tr[data-p]').forEach(tr => tr.onclick = () => { pilih = tr.dataset.p; ulang(); });
  el.querySelector('#m-s').onchange = (e) => { fS = e.target.value; ulang(); };
  el.querySelector('#m-q').onchange = (e) => { fQ = e.target.value; ulang(); };
  el.querySelector('#m-x').onclick = () => unduhExcel(p, R);
  const aw = el.querySelector('#m-awal');
  if (aw) aw.onclick = async () => { const a = LAM_AWAL.find(x => x.id === pilih); if (!a) return toast('Tidak ada data awal untuk prodi ini'); await save('lam', JSON.parse(JSON.stringify(a)), `Memuat data awal AMI LAM ${pilih} dari tanggapan AL`); toast('Data awal dimuat. Mohon divalidasi.'); ulang(); };
  el.querySelectorAll('[data-no]').forEach(b => b.onclick = () => drawerButir(p, LAM_ITEMS.find(i => i.no === +b.dataset.no), isi, audit, ulang));
}

/* ---------- drawer satu butir ---------- */
function drawerButir(p, it, isi, audit, ulang) {
  const d0 = dokLam(p.id), baris = (b = {}) => `<div class="bk" style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-bottom:8px"><input class="inp" placeholder="Label (mis. SK Kurikulum 2023)" value="${esc(b.label || '')}" ${isi ? '' : 'disabled'}><input class="inp" placeholder="https://..." value="${esc(b.url || '')}" ${isi ? '' : 'disabled'}></div>`;
  const nilaiIn = (r) => ada(d0.input[r]) ? d0.input[r] : '';
  openDrawer(`<div class="card-h"><h3>Butir ${it.no} · ${esc(it.elemen)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="card"><div class="small muted">Bobot ${fmt(it.bobot)}% · ${it.judge.length ? 'butir kualitatif: skor diberikan auditor 0 sampai 4' : 'butir kuantitatif: skor dihitung dari angka borang'}</div><p style="margin:8px 0 0">${esc(it.uraian)}</p></div>
  ${it.borang.length ? `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Angka borang (diisi prodi)</h3></div>
    ${it.borang.map(b => `<div class="field"><label>${esc(b.label)}${b.pos ? ' <span class="small muted">(harus lebih dari 0)</span>' : ''}</label><input class="inp" type="number" step="any" min="0" data-ref="${b.ref}" value="${esc(nilaiIn(b.ref))}" ${isi ? '' : 'disabled'}></div>`).join('')}
    <div class="small muted">Sumber angka: Tabel LKPS yang dirujuk butir ini. Kosongkan bila belum ada data.</div></div>` : ''}
  ${it.judge.map(j => `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Penilaian asesor</h3><div class="sp"></div><span class="small muted">skor minimal ${j.min}</span></div>
    <div class="small muted" style="margin-bottom:8px">${esc(j.teks)}</div>
    ${[4, 3, 2, 1, 0].map(s => `<label style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;margin-bottom:6px;border-radius:10px;background:rgba(24,35,58,.04);${s < j.min ? 'opacity:.45' : ''}"><input type="radio" name="j-${j.ref}" data-ref="${j.ref}" value="${s}" ${String(d0.input[j.ref]) === String(s) ? 'checked' : ''} ${audit && s >= j.min ? '' : 'disabled'}><span><b>Skor ${s}</b><div class="small">${esc(j.rubrik[s] || '–')}</div></span></label>`).join('')}</div>`).join('')}
  <div class="card" style="margin-top:12px"><div class="card-h"><h3>Deskripsi dan bukti (diisi prodi)</h3><div class="sp"></div><span class="small muted" id="b-cnt"></span></div>
    <textarea class="inp" id="b-d" rows="6" style="width:100%;resize:vertical" ${isi ? '' : 'disabled'} placeholder="Jelaskan kondisi program studi terhadap butir ini, rujuk bukti dan tabel LKPS.">${esc(d0.deskripsi[it.no] || '')}</textarea>
    <div style="margin-top:10px" id="b-b">${((d0.bukti[it.no] || []).length ? d0.bukti[it.no] : [{}]).map(baris).join('')}</div>${isi ? `<button class="btn sm" id="b-add">${icon('plus')} Tambah tautan</button>` : ''}</div>
  <div class="card" style="margin-top:12px"><div class="card-h"><h3>Hasil perhitungan</h3></div><div id="b-h"></div></div>
  ${audit || d0.catatan[it.no] ? `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Catatan auditor</h3></div><textarea class="inp" id="b-c" rows="3" style="width:100%;resize:vertical" ${audit ? '' : 'disabled'} placeholder="Temuan, saran perbaikan, atau alasan skor.">${esc(d0.catatan[it.no] || '')}</textarea></div>` : ''}
  ${isi || audit ? `<div class="filters" style="margin-top:12px"><button class="btn pri" id="b-s">${icon('check')} Simpan</button></div>` : '<div class="small muted" style="margin-top:12px">Anda hanya dapat melihat butir ini.</div>'}
  ${(d0.riwayat || []).filter(r => r.no === it.no).length ? `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Riwayat</h3></div>${d0.riwayat.filter(r => r.no === it.no).slice(0, 8).map(r => `<div class="small"><span class="muted">${new Date(r.t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span> · ${esc(r.oleh)} · ${esc(r.aksi)}</div>`).join('')}</div>` : ''}`, d => {
    const $ = (s) => d.querySelector(s);
    const bacaBukti = () => { const out = []; d.querySelectorAll('.bk').forEach(r => { const [x, y] = r.querySelectorAll('input'); const label = x.value.trim(), url = y.value.trim(); if (label || url) out.push({ label: label || url, url }); }); return out; };
    const bacaInput = () => {
      const m = Object.assign({}, d0.input);
      d.querySelectorAll('input[data-ref][type=number]').forEach(i => { if (i.value === '') delete m[i.dataset.ref]; else m[i.dataset.ref] = +i.value; });
      it.judge.forEach(j => { const r = d.querySelector(`input[name="j-${j.ref}"]:checked`); if (r) m[j.ref] = +r.value; });
      return m;
    };
    const hitung = () => {
      const m = bacaInput(), H = hitungLam(m), i = LAM_ITEMS.indexOf(it), b = H.butir[i];
      const lengkap = isianButir(it).every(x => ada(m[x.ref]));
      const pctLabel = (l) => /%/.test(l);
      $('#b-h').innerHTML = `${it.calc.map(c => { const v = H.e.kk(c.ref); return `<div class="small">${esc(c.label)}: <b>${typeof v === 'number' ? (pctLabel(c.label) ? fmt(v * 100) + '%' : fmt(v, 4)) : esc(String(v ?? '–'))}</b></div>`; }).join('')}
        <div style="margin-top:8px"><span class="tag" style="--c:#8b5cf6">Skor butir ${fmt(b.skor)}</span> <span class="tag" style="--c:#0ea5e9">Nilai ${fmt(b.nilai, 3)} dari maks. ${fmt(it.bobot * 4, 2)}</span></div>
        ${b.ket ? `<div class="small muted" style="margin-top:6px">${esc(String(b.ket).replace(/\n+/g, ' '))}</div>` : ''}
        ${lengkap ? '' : '<div class="small" style="color:#92400e;margin-top:6px">Isian butir ini belum lengkap, hasil memakai nilai bawaan instrumen.</div>'}`;
      const n = $('#b-d').value.trim().length;
      $('#b-cnt').textContent = `${n} karakter${it.judge.length ? ' (minimal 50)' : ''}`;
    };
    hitung(); d.addEventListener('input', hitung); d.addEventListener('change', hitung);
    if (isi) $('#b-add').onclick = () => { $('#b-b').insertAdjacentHTML('beforeend', baris()); d.querySelectorAll('.bk:last-child input').forEach(i => i.disabled = false); };
    const s = $('#b-s');
    if (s) s.onclick = async () => {
      const bukti = isi ? bacaBukti() : d0.bukti[it.no] || [], m = bacaInput();
      if (bukti.some(b => !urlOk(b.url))) return toast('Setiap tautan harus diawali http:// atau https://');
      if (isi) for (const b of it.borang) { const v = m[b.ref]; if (ada(v) && (!Number.isFinite(v) || v < 0 || (b.pos && v <= 0))) return toast(`Isian "${b.label.slice(0, 40)}" ${b.pos ? 'harus lebih dari 0' : 'tidak boleh negatif'}`); }
      const doc = JSON.parse(JSON.stringify(dokLam(p.id))); delete doc._baru;
      doc.input = doc.input || {}; doc.deskripsi = doc.deskripsi || {}; doc.bukti = doc.bukti || {}; doc.catatan = doc.catatan || {};
      const aksi = [];
      if (isi) {
        it.borang.forEach(b => { if (ada(m[b.ref])) doc.input[b.ref] = m[b.ref]; else delete doc.input[b.ref]; });
        doc.deskripsi[it.no] = $('#b-d').value.trim(); doc.bukti[it.no] = bukti; aksi.push('isian prodi');
      }
      if (audit) {
        it.judge.forEach(j => { if (ada(m[j.ref])) doc.input[j.ref] = m[j.ref]; });
        const c = $('#b-c'); if (c) doc.catatan[it.no] = c.value.trim(); aksi.push('penilaian auditor');
      }
      riw(doc, aksi.join(' dan ')); doc.riwayat[0].no = it.no;
      await save('lam', doc, `AMI LAM ${p.id} butir ${it.no}: ${aksi.join(' dan ')}`);
      closeDrawer(); toast('Butir tersimpan'); ulang();
    };
  });
}
