/* LED IABEE: register 53 aitem evaluasi per prodi. Narasi ditulis di sini, bukti berupa tautan (boleh lebih dari satu),
   kelengkapan diperiksa otomatis, status mengalir dari Belum diisi sampai Final. Data di koleksi "led" (satu dokumen per prodi). */
import { S, ctx, icon, esc, save, toast, openDrawer, closeDrawer, userName } from '../app.js';
import { DB } from '../db.js';
import { PRODI, UNIT, AUDITORS } from '../seed.js';
import { LED_KRITERIA, LED_SUB, LED_SS, LED_AITEM } from '../led-data.js';
import { aksesLed, ringkas, dokIabee } from './jalur.js';
import { NAMA_BAHAN } from '../config.js';
import { xlsx, docx, unduh } from '../ekspor.js';
import { kartuRealisasi } from './rujukan.js';

const urlOk = (u) => /^https?:\/\/\S+$/i.test(u || '');
const ST = { belum: { n: 'Belum diisi', c: '#94a3b8' }, draf: { n: 'Draf', c: '#f5a524' }, siap: { n: 'Siap diaudit', c: '#0ea5e9' }, audit: { n: 'Sudah diaudit', c: '#8b5cf6' }, final: { n: 'Final', c: '#10b981' } };
const NILAI = { A: 'A · Acceptable (memenuhi)', C: 'C · Concern (perlu perhatian)', W: 'W · Weakness (kelemahan, wajib diperbaiki)', D: 'D · Deficiency (kekurangan, wajib diperbaiki)' };
const MIN = 250;
const KRIT_C = { 1: '#0ea5e9', 2: '#10b981', 3: '#8b5cf6', 4: '#f5a524' };
let pilih = null, fK = '', fS = '', fQ = '';

/* ---------- data ---------- */
export function dokLed(pid) { return S.led.find(x => x.id === pid) || { id: pid, aitem: {}, _baru: true }; }
export const dataAitem = (d, no) => d.aitem[no] || { narasi: '', bukti: [], status: 'belum', pj: '', tenggat: '', nilai: '', catatan: '', riwayat: [] };
const pjDefault = (it) => it.sub === '2.5' ? 'Institusi (Wadir / SPM)' : 'Prodi';

/** Pemeriksaan kelengkapan satu aitem: daftar [label, lolos]. */
export function cek(a, it) {
  const n = (a.narasi || '').trim(), bk = a.bukti || [];
  const c = [
    [`Narasi minimal ${MIN} karakter`, n.length >= MIN],
    ['Minimal satu tautan bukti yang valid', bk.some(b => urlOk(b.url))],
    ['Setiap tautan punya label dan alamat valid', bk.length > 0 && bk.every(b => b.label && urlOk(b.url))],
    ['Narasi menyebut rujukan bukti (mis. "Bukti 1")', /bukti\s*\d|lampiran|\[[A-Z]?\d+\]/i.test(n)],
    ['Narasi tidak lagi memuat penanda [isi ...]', n.length > 0 && !/\[isi|\[\.\.\.|\.\.\.\]|xxx/i.test(n)]
  ];
  if (it.tabel.length) c.push([`Narasi merujuk ${it.tabel.map(t => 'Tabel Suplemen ' + t).join(' / ')}`, it.tabel.some(t => new RegExp('\\b' + t + '\\b', 'i').test(n))]);
  return c;
}
const pctCek = (a, it) => { const c = cek(a, it); return Math.round(c.filter(x => x[1]).length / c.length * 100); };

/** Ringkasan LED satu prodi untuk dasbor dan Jalur IABEE. */
export function ringkasLed(pid) {
  const d = dokLed(pid), n = LED_AITEM.length, per = {};
  Object.keys(ST).forEach(k => per[k] = 0);
  let lengkap = 0;
  LED_AITEM.forEach(it => { const a = dataAitem(d, it.no); per[a.status] = (per[a.status] || 0) + 1; lengkap += pctCek(a, it); });
  const siap = per.siap + per.audit + per.final;
  return { d, n, per, siap, pctSiap: Math.round(siap / n * 100), pctLengkap: Math.round(lengkap / n) };
}

/* ---------- kerangka tulisan (aturan, bukan AI) ---------- */
export function kerangka(it, prodi) {
  const t = it.id, nm = `Program Studi ${prodi.nama}`;
  const butir = (t.match(/butir \(([a-k])\)/) || [])[1];
  const tb = it.tabel.length ? ` Rujuk ${it.tabel.map(x => 'Tabel Suplemen ' + x).join(' dan ')}.` : '';
  if (/^(Berikan bukti|Demonstrasikan)/.test(t)) return [
    `Pernyataan: ${nm} telah [isi pernyataan inti yang menjawab aitem ${it.no}${butir ? ', butir (' + butir + ')' : ''}].${tb}`,
    `Bukti pendukung: [isi daftar dokumen/rekaman beserta nomor, tanggal, dan penanggung jawab] (Bukti 1, Bukti 2).`,
    `Contoh nyata: [isi satu atau dua contoh konkret dari tiga tahun terakhir dengan data ringkas] (Bukti 3).`,
    `Keterpeliharaan: [isi di mana rekaman disimpan, siapa pengelolanya, dan bagaimana dapat diakses evaluator].`
  ].join('\n\n');
  return [
    `Konteks dan kebijakan: ${nm} menetapkan [isi kebijakan atau prosedur yang menjadi dasar, lengkap dengan nomor SK dan tahun] (Bukti 1).${tb}`,
    `Pelaksanaan: [isi bagaimana hal ini dijalankan: siapa penanggung jawab, kapan, dengan mekanisme apa${butir ? ', dan bagaimana CPL mencakup butir (' + butir + ')' : ''}] (Bukti 2).`,
    `Hasil dan rekaman: [isi hasil atau data pendukung tiga tahun terakhir serta rekaman yang dipelihara] (Bukti 3).`,
    `Evaluasi dan tindak lanjut: [isi hasil evaluasi, tindak lanjut, dan perbaikan yang sudah dilakukan].`
  ].join('\n\n');
}

/* ---------- izin ---------- */
const bolehIsi = (pid) => ctx.role === 'admin' || (ctx.role === 'auditee' && ctx.unit === pid);
/** Auditor hanya menilai prodi yang ditugaskan kepadanya (lihat menu AMI IABEE). Tanpa penugasan, hanya mode demo yang membuka, dan tidak untuk unit asal. */
export function auditorBerhak(pid) {
  if (ctx.role === 'admin') return true;
  if (ctx.role !== 'auditor') return false;
  const ls = dokIabee(pid).auditor || [];
  if (ls.length) return ls.some(a => a.id === ctx.auditor);
  const a = AUDITORS.find(x => x.id === ctx.auditor);
  return !DB.user && !!a && a.home !== pid;
}
export const pilihLed = (pid) => { pilih = pid; fK = ''; fS = ''; fQ = ''; };
const bolehAudit = (pid) => auditorBerhak(pid);

/** Ringkasan angka LED prodi dikirim ke koleksi simantap_led agar KUREKAM dapat menampilkannya. Hanya agregat. */
async function kirimRingkas(pid) {
  if (DB.mode !== 'firebase' || !DB.user) return;
  const R = ringkasLed(pid), d = dokLed(pid), nilai = { A: 0, C: 0, W: 0, D: 0 };
  LED_AITEM.forEach(it => { const a = dataAitem(d, it.no); if (['audit', 'final'].includes(a.status) && nilai[a.nilai] != null) nilai[a.nilai]++; });
  try { await DB.put('simantap_led', { id: pid, unit: pid, sumber: 'SIMANTAP', waktu: new Date().toISOString(), n: R.n, siap: R.siap, per: R.per, nilai, pctLengkap: R.pctLengkap, pctSiap: R.pctSiap }, []); }
  catch (e) { console.warn('Ringkasan LED gagal dikirim ke KUREKAM:', e.message); }
}

/** Kartu Bahan LED dari KUREKAM: kesiapan tabel suplemen per prodi. */
function kartuBahan(pid) {
  const demo = DB.mode !== 'firebase', u = demo ? { led: { A1: { k: 'ok', pct: 100 }, A2: { k: 'ok', pct: 100 }, B1: { k: 'ok', pct: 100 }, B2: { k: 'near', pct: 75 }, C1: { k: 'near', pct: 38 }, C2: { k: 'bad', pct: 0 }, B3: { k: 'near', pct: 75 }, B4: { k: 'near', pct: 75 }, B5: { k: 'bad', pct: 0 }, siap: 4 }, obe: { angkatan: '2023', wisuda: '2027-07-31', lulusan: 0 } } : (S.kurekam || []).find(x => x.unit === pid);
  const W = { ok: ['#10b981', 'Siap'], near: ['#f5a524', 'Sebagian'], bad: ['#f0616d', 'Belum'], na: ['#94a3b8', 'Belum ada data'] };
  if (!u || !u.led) return `<div class="card" style="margin-top:16px"><div class="card-h"><h3>Bahan LED dari KUREKAM</h3><div class="sub">Belum ada umpan tabel suplemen untuk ${esc(pid)}. Muncul setelah KUREKAM mengirim umpan.</div></div></div>`;
  return `<div class="card" style="margin-top:16px"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('globe')}</span><div><h3>Bahan LED dari KUREKAM${demo ? ' (contoh demo)' : ''}</h3><div class="sub">Tabel suplemen disusun prodi di KUREKAM · ${u.led.siap != null ? u.led.siap + ' dari 6 tabel utama siap' : ''}${u.obe && u.obe.angkatan ? ` · OBE angkatan ${esc(u.obe.angkatan)}${u.obe.wisuda ? ', wisuda ' + esc(u.obe.wisuda) : ''}` : ''}</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">${Object.keys(NAMA_BAHAN).map(k => { const t = u.led[k] || { k: 'na', pct: 0 }, w = W[t.k] || W.na; return `<div style="padding:8px 10px;border-radius:10px;background:color-mix(in srgb,${w[0]} 10%,#fff)" title="${esc(NAMA_BAHAN[k])}"><b>${k}</b> <span class="tag" style="--c:${w[0]}">${w[1]}</span><div class="small muted">${t.pct}%</div></div>`; }).join('')}</div></div>`;
}

/** Temuan W atau D otomatis menjadi RTL (sumber "AMI IABEE"); RTL yang sudah ada tidak ditimpa statusnya. */
async function sinkronRtl(p, it, a) {
  const id = `RTL-IABEE-${p.id}-${it.no}`, ada = S.rtl.find(r => r.id === id);
  if (a.nilai !== 'W' && a.nilai !== 'D') return;
  const J = ringkas(p.id), tenggat = J.ada ? J.L[5].tenggat : `${S.settings.tahun}-12-31`;
  await save('rtl', Object.assign({ status: 'Terbuka' }, ada || {}, {
    id, ind: '', led: it.no, unit: p.id, sumberRTL: 'AMI IABEE', ringkas: `LED IABEE aitem ${it.no}: ${it.id.slice(0, 110)}`,
    temuan: a.nilai === 'D' ? 'KTS Mayor' : 'KTS Minor', tindakan: a.catatan || 'Menyusun perbaikan dan bukti baru untuk aitem ini.', pic: 'Ka. ' + p.id, tenggat: ada ? ada.tenggat : tenggat
  }), `RTL ${id} dari AMI IABEE`);
}
const bolehSah = () => ctx.role === 'pimpinan' || ctx.role === 'wadir1';
const terbuka = (pid) => !DB.user || aksesLed(pid);

const tglID = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const riw = (a, aksi) => { a.riwayat = [{ t: new Date().toISOString(), oleh: userName(), aksi }, ...(a.riwayat || [])].slice(0, 30); };

/* ---------- ekspor ---------- */
function bukaBerkas(p, fmt) {
  const d = dokLed(p.id), tgl = new Date().toISOString().slice(0, 10);
  const bk = (a) => (a.bukti || []).map((b, i) => `Bukti ${i + 1}: ${b.label} - ${b.url}`).join('\n');
  if (fmt === 'xlsx') {
    const H = (v) => ({ v, s: 1 });
    const baris = [[H('Criterion No.'), H('Sub-Criterion No.'), H('Sub-sub Criterion No.'), H('Aitem Evaluasi'), H('Criteria and Evaluation Items (ETECH 2026)'), H('Description of Program Self Evaluation'), H('References')]];
    let ks = '', ss = '', kk = '';
    LED_AITEM.forEach(it => {
      if (String(it.k) !== kk) { kk = String(it.k); baris.push([{ v: kk + '.0', s: 3 }, '', '', '', { v: LED_KRITERIA[kk], s: 3 }, '', '']); }
      if (it.sub !== ks) { ks = it.sub; baris.push(['', { v: it.sub, s: 2 }, '', '', { v: LED_SUB[it.sub].id, s: 2 }, '', '']); }
      if (it.ss !== it.sub && it.ss !== ss) { ss = it.ss; baris.push(['', '', { v: it.ss, s: 2 }, '', { v: (LED_SS[it.ss] || {}).id || '', s: 2 }, '', '']); }
      const a = dataAitem(d, it.no);
      baris.push(['', '', '', it.no + ')', it.id, a.narasi || '', bk(a)]);
    });
    const st = [['No', 'Aitem', 'Status', 'Kelengkapan (%)', 'Nilai audit', 'Catatan auditor', 'Penanggung jawab', 'Tenggat'].map(v => ({ v, s: 1 }))];
    LED_AITEM.forEach(it => { const a = dataAitem(d, it.no); st.push([String(it.no), it.id.slice(0, 120), ST[a.status].n, String(pctCek(a, it)), a.nilai || '', a.catatan || '', a.pj || pjDefault(it), a.tenggat || '']); });
    unduh(`LED_IABEE_${p.id}_${tgl}.xlsx`, xlsx([{ nama: 'LED', lebar: [12, 14, 16, 12, 60, 70, 45], baris }, { nama: 'Status', lebar: [6, 60, 16, 14, 12, 40, 24, 14], baris: st }]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else {
    const b = [{ t: 'h1', v: `Laporan Evaluasi Diri (LED) IABEE - Program Studi ${p.nama}` }, { t: 'cat', v: `Draf dari SIMANTAP 2.0, diunduh ${tglID(tgl)}. Salin isi ke templat LED resmi IABEE yang diunduh dari akun Program Representative.` }];
    let kk = '', ks = '', ss = '';
    LED_AITEM.forEach(it => {
      if (String(it.k) !== kk) { kk = String(it.k); b.push({ t: 'h2', v: `Kriteria ${kk}. ${LED_KRITERIA[kk]}` }); }
      if (it.sub !== ks) { ks = it.sub; b.push({ t: 'h3', v: `${it.sub} ${LED_SUB[it.sub].id}` }); }
      if (it.ss !== it.sub && it.ss !== ss) { ss = it.ss; b.push({ t: 'b', v: `${it.ss} ${(LED_SS[it.ss] || {}).id || ''}` }); }
      const a = dataAitem(d, it.no);
      b.push({ t: 'b', v: `Aitem ${it.no})` }, { t: 'p', v: it.id }, { t: 'p', v: a.narasi || '[belum diisi]' });
      if ((a.bukti || []).length) { b.push({ t: 'b', v: 'Referensi bukti' }); a.bukti.forEach((x, i) => b.push({ t: 'li', v: `Bukti ${i + 1}: ${x.label} - ${x.url}` })); }
    });
    unduh(`LED_IABEE_${p.id}_${tgl}.docx`, docx(b), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
}

/* ---------- tampilan ---------- */
export default function ledView(el) {
  const lihat = ctx.role === 'auditee' ? PRODI.filter(p => p.id === ctx.unit) : PRODI;
  if (!lihat.length) { el.innerHTML = '<div class="empty">Akun Prodi/Unit ini belum terhubung ke prodi. Hubungi SPM.</div>'; return; }
  if (!pilih || !lihat.some(p => p.id === pilih)) pilih = lihat[0].id;
  const p = PRODI.find(x => x.id === pilih), d = dokLed(pilih), buka = terbuka(pilih), isi = buka && bolehIsi(pilih);
  const R = ringkasLed(pilih), J = ringkas(pilih), langkah4 = J.ada ? J.L[3] : null;
  const tglT = langkah4 ? new Date(langkah4.tenggat + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const kri = [1, 2, 3, 4].map(k => { const l = LED_AITEM.filter(i => i.k === k); const s = l.filter(i => ['siap', 'audit', 'final'].includes(dataAitem(d, i.no).status)).length; return { k, n: l.length, s, pct: Math.round(s / l.length * 100) }; });
  const daftar = LED_AITEM.filter(it => {
    const a = dataAitem(d, it.no);
    return (!fK || String(it.k) === fK) && (!fS || a.status === fS) && (!fQ || (it.id + ' ' + it.no + ' ' + (a.narasi || '')).toLowerCase().includes(fQ.toLowerCase()));
  });
  const kunciInfo = !buka ? `<div class="ribbon">${icon('alert')} <span><b>Akses LED terkunci untuk ${esc(p.id)}.</b> Terbuka setelah jalur disahkan Wadir I dan surat tugas Wakil Prodi tercatat di <a href="#/jalur">Jalur IABEE</a>. Daftar aitem tetap dapat dibaca.</span></div>` : (!DB.user ? `<div class="ribbon">${icon('info')} <span><b>Mode demo.</b> Akses dibuka agar fitur dapat dicoba; data hanya tersimpan di peramban ini.</span></div>` : '');
  el.innerHTML = `
  ${kunciInfo}
  <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('book')}</span><div><h3>Laporan Evaluasi Diri IABEE · ${esc(p.id)}</h3><div class="sub">53 aitem evaluasi: narasi, bukti tautan, kelengkapan otomatis${tglT ? ` · tenggat penyusunan ${tglT}` : ''}</div></div><div class="sp"></div>
    ${lihat.length > 1 ? `<select class="inp" id="l-p" style="max-width:260px">${lihat.map(x => `<option value="${x.id}" ${x.id === pilih ? 'selected' : ''}>${x.id} · ${esc(x.nama)}</option>`).join('')}</select>` : ''}
    <button class="btn sm" id="l-x">${icon('download')} Excel</button><button class="btn sm" id="l-w">${icon('download')} Word</button></div>
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:12px">
      ${Object.entries(ST).map(([k, v]) => `<div class="glass-lite" style="padding:10px 12px;border-radius:12px;background:color-mix(in srgb,${v.c} 10%,#fff)"><b style="font-size:20px;color:${v.c}">${R.per[k] || 0}</b><div class="small">${v.n}</div></div>`).join('')}
      <div style="padding:10px 12px;border-radius:12px;background:rgba(24,35,58,.05)"><b style="font-size:20px">${R.pctLengkap}%</b><div class="small">rata-rata kelengkapan</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:14px">
      ${kri.map(x => `<div><div class="small"><b>Kriteria ${x.k}</b> · ${x.s}/${x.n} siap</div><div class="bar"><i style="width:${x.pct}%;--c:${KRIT_C[x.k]}"></i></div></div>`).join('')}
    </div></div>
  ${kartuBahan(pilih)}
  <div class="card" style="margin-top:16px"><div class="filters">
    <select class="inp" id="l-k"><option value="">Semua kriteria</option>${[1, 2, 3, 4].map(k => `<option value="${k}" ${fK === String(k) ? 'selected' : ''}>Kriteria ${k}</option>`).join('')}</select>
    <select class="inp" id="l-s"><option value="">Semua status</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${fS === k ? 'selected' : ''}>${v.n}</option>`).join('')}</select>
    <input class="inp" id="l-q" placeholder="Cari kata di aitem atau narasi" value="${esc(fQ)}" style="min-width:220px"></div>
    ${[...new Set(daftar.map(i => i.sub))].map(sub => { const li = daftar.filter(i => i.sub === sub); return `<details open style="margin-top:12px"><summary style="cursor:pointer;font-weight:700"><span class="tag" style="--c:${KRIT_C[li[0].k]}">${sub}</span> ${esc(LED_SUB[sub].id.slice(0, 150))}${LED_SUB[sub].id.length > 150 ? '…' : ''}</summary>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Aitem evaluasi</th><th>Status</th><th>Kelengkapan</th><th>Bukti</th><th>Penanggung jawab</th><th></th></tr></thead><tbody>
      ${li.map(it => { const a = dataAitem(d, it.no), s = ST[a.status], pc = pctCek(a, it); return `<tr><td><b>${it.no}</b></td><td class="small" style="max-width:420px">${esc(it.id.slice(0, 170))}${it.id.length > 170 ? '…' : ''}${it.tabel.length ? ` <span class="tag" style="--c:#64748b">${it.tabel.join(' · ')}</span>` : ''}</td>
        <td><span class="tag" style="--c:${s.c}">${s.n}</span>${a.nilai ? ` <span class="tag" style="--c:${a.nilai === 'A' ? '#10b981' : a.nilai === 'C' ? '#f5a524' : '#f0616d'}">${a.nilai}</span>` : ''}</td>
        <td style="min-width:110px"><div class="bar"><i style="width:${pc}%;--c:${pc === 100 ? '#10b981' : '#8b5cf6'}"></i></div><span class="small muted">${pc}%</span></td>
        <td class="small">${(a.bukti || []).length}</td><td class="small">${esc(a.pj || pjDefault(it))}${a.tenggat ? `<br><span class="muted">${tglID(a.tenggat)}</span>` : ''}</td>
        <td><button class="btn sm" data-no="${it.no}">${isi ? 'Isi' : 'Buka'}</button></td></tr>`; }).join('')}
      </tbody></table></div></details>`; }).join('') || '<div class="empty">Tidak ada aitem yang cocok dengan filter.</div>'}</div>`;

  const ulang = () => ledView(el);
  const sp = el.querySelector('#l-p'); if (sp) sp.onchange = () => { pilih = sp.value; ulang(); };
  el.querySelector('#l-k').onchange = (e) => { fK = e.target.value; ulang(); };
  el.querySelector('#l-s').onchange = (e) => { fS = e.target.value; ulang(); };
  el.querySelector('#l-q').onchange = (e) => { fQ = e.target.value; ulang(); };
  el.querySelector('#l-x').onclick = () => bukaBerkas(p, 'xlsx');
  el.querySelector('#l-w').onclick = () => bukaBerkas(p, 'docx');
  el.querySelectorAll('[data-no]').forEach(b => b.onclick = () => drawerAitem(p, LED_AITEM.find(i => i.no === +b.dataset.no), buka, ulang));
}

/* ---------- drawer satu aitem ---------- */
function drawerAitem(p, it, buka, ulang) {
  const d0 = dokLed(p.id), a0 = JSON.parse(JSON.stringify(dataAitem(d0, it.no)));
  const isi = buka && bolehIsi(p.id), audit = buka && bolehAudit(p.id) && ['siap', 'audit'].includes(a0.status), sah = buka && bolehSah() && a0.status === 'audit';
  const baris = (b = {}) => `<div class="bk" style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-bottom:8px"><input class="inp" placeholder="Label (mis. SK Kurikulum 2023)" value="${esc(b.label || '')}" ${isi ? '' : 'disabled'}><input class="inp" placeholder="https://drive.google.com/..." value="${esc(b.url || '')}" ${isi ? '' : 'disabled'}></div>`;
  const sub = LED_SUB[it.sub], ss = LED_SS[it.ss];
  openDrawer(`<div class="card-h"><h3>Aitem ${it.no}) · ${esc(it.sub)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="card"><div class="small muted">${esc(sub.id.slice(0, 220))}${sub.id.length > 220 ? '…' : ''}</div>
    ${ss && it.ss !== it.sub ? `<div class="small" style="margin-top:6px"><b>${esc(it.ss)}</b> ${esc(ss.id.slice(0, 220))}${ss.id.length > 220 ? '…' : ''}</div>` : ''}
    <p style="margin:10px 0 4px"><b>${esc(it.id)}</b></p><details><summary class="small muted" style="cursor:pointer">English</summary><p class="small">${esc(it.en)}</p></details></div>
  ${[25, 47].includes(it.no) ? kartuRealisasi(p.id) : ''}
  <div class="card" style="margin-top:12px"><div class="card-h"><h3>Narasi deskripsi evaluasi diri</h3><div class="sp"></div><span class="small muted" id="a-cnt"></span></div>
    <textarea class="inp" id="a-n" rows="11" style="width:100%;resize:vertical" ${isi ? '' : 'disabled'} placeholder="Tulis jawaban berdasarkan bukti. Gunakan kerangka bila perlu.">${esc(a0.narasi)}</textarea>
    ${isi ? `<div class="filters"><button class="btn sm" id="a-k">${icon('spark')} Pakai kerangka tulisan</button><span class="small muted">Kerangka berisi penanda [isi ...] untuk Anda lengkapi.</span></div>` : ''}
    <div id="a-cek" style="margin-top:8px"></div></div>
  <div class="card" style="margin-top:12px"><div class="card-h"><h3>Bukti (tautan)</h3></div><div id="a-b">${((a0.bukti || []).length ? a0.bukti : [{}]).map(baris).join('')}</div>${isi ? `<button class="btn sm" id="a-add">${icon('plus')} Tambah tautan</button>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px"><div class="field"><label>Penanggung jawab</label><input class="inp" id="a-pj" value="${esc(a0.pj || '')}" placeholder="${esc(pjDefault(it))}" ${isi ? '' : 'disabled'}></div><div class="field"><label>Tenggat aitem</label><input class="inp" type="date" id="a-t" value="${esc(a0.tenggat || '')}" ${isi ? '' : 'disabled'}></div></div>
    ${isi ? `<div class="filters"><button class="btn" id="a-s">${icon('check')} Simpan draf</button><button class="btn pri" id="a-r">${icon('flag')} Simpan dan tandai siap diaudit</button></div>` : ''}</div>
  ${audit ? `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Hasil audit</h3></div><div class="field"><label>Penilaian</label><select class="inp" id="u-n"><option value="">Pilih penilaian</option>${Object.entries(NILAI).map(([k, v]) => `<option value="${k}" ${a0.nilai === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div><div class="field"><label>Catatan auditor</label><textarea class="inp" id="u-c" rows="4" style="width:100%">${esc(a0.catatan || '')}</textarea></div><button class="btn pri" id="u-s">${icon('audit')} Simpan hasil audit</button></div>` : (a0.nilai ? `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Hasil audit</h3></div><p><span class="tag" style="--c:#8b5cf6">${a0.nilai}</span> ${esc(NILAI[a0.nilai] || '')}</p><p class="small">${esc(a0.catatan || '')}</p></div>` : '')}
  ${sah ? `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Pengesahan</h3></div><div class="small muted" style="margin-bottom:8px">Final hanya untuk penilaian A atau C. Penilaian W atau D dikembalikan ke prodi untuk diperbaiki.</div><div class="filters"><button class="btn pri" id="h-f" ${['A', 'C'].includes(a0.nilai) ? '' : 'disabled'}>${icon('check')} Sahkan final</button><button class="btn" id="h-b">Kembalikan ke prodi</button></div></div>` : ''}
  ${(a0.riwayat || []).length ? `<div class="card" style="margin-top:12px"><div class="card-h"><h3>Riwayat</h3></div>${a0.riwayat.map(r => `<div class="small"><span class="muted">${new Date(r.t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span> · ${esc(r.oleh)} · ${esc(r.aksi)}</div>`).join('')}</div>` : ''}`, d => {
    const $ = (s) => d.querySelector(s), nar = $('#a-n');
    const baca = () => { const out = []; d.querySelectorAll('.bk').forEach(r => { const [x, y] = r.querySelectorAll('input'); const label = x.value.trim(), url = y.value.trim(); if (label || url) out.push({ label: label || url, url }); }); return out; };
    const live = () => {
      const a = { narasi: nar.value, bukti: baca() }, c = cek(a, it);
      $('#a-cnt').textContent = `${nar.value.trim().length} karakter · kelengkapan ${Math.round(c.filter(x => x[1]).length / c.length * 100)}%`;
      $('#a-cek').innerHTML = c.map(([t, ok]) => `<div class="small" style="color:${ok ? '#047857' : '#92400e'}">${ok ? '✓' : '○'} ${esc(t)}</div>`).join('');
    };
    live(); nar.oninput = live; d.querySelector('#a-b').oninput = live;
    if (isi) {
      $('#a-add').onclick = () => { d.querySelector('#a-b').insertAdjacentHTML('beforeend', baris()); d.querySelectorAll('.bk:last-child input').forEach(i => i.disabled = false); };
      $('#a-k').onclick = () => { const k = kerangka(it, p); nar.value = nar.value.trim() ? nar.value.trim() + '\n\n' + k : k; live(); };
    }
    const tulis = async (fn, aksi, rtl) => {
      const doc = JSON.parse(JSON.stringify(dokLed(p.id))); delete doc._baru; doc.aitem = doc.aitem || {};
      const a = doc.aitem[it.no] = Object.assign(dataAitem(doc, it.no), doc.aitem[it.no] || {});
      fn(a); riw(a, aksi);
      await save('led', doc, `LED ${p.id} aitem ${it.no}: ${aksi}`);
      if (rtl) await sinkronRtl(p, it, a);
      kirimRingkas(p.id);
      closeDrawer(); ulang();
    };
    const simpanIsi = (jadiSiap) => {
      const narasi = nar.value.trim(), bukti = baca();
      if (bukti.some(b => !urlOk(b.url))) return toast('Setiap tautan harus diawali http:// atau https://');
      if (jadiSiap && cek({ narasi, bukti }, it).some(x => !x[1])) return toast('Lengkapi semua butir pemeriksaan sebelum ditandai siap diaudit');
      const berubah = narasi !== (a0.narasi || '').trim() || JSON.stringify(bukti) !== JSON.stringify(a0.bukti || []);
      tulis(a => {
        a.narasi = narasi; a.bukti = bukti; a.pj = $('#a-pj').value.trim(); a.tenggat = $('#a-t').value;
        if (jadiSiap) a.status = 'siap';
        else if (a.status === 'belum' && (narasi || bukti.length)) a.status = 'draf';
        else if (['siap', 'audit', 'final'].includes(a.status) && berubah) a.status = 'draf';
      }, jadiSiap ? 'ditandai siap diaudit' : 'draf disimpan');
    };
    if (isi) { $('#a-s').onclick = () => simpanIsi(false); $('#a-r').onclick = () => simpanIsi(true); }
    if (audit) $('#u-s').onclick = () => { const n = $('#u-n').value; if (!n) return toast('Pilih penilaian A, C, W, atau D'); if (['W', 'D'].includes(n) && !$('#u-c').value.trim()) return toast('Penilaian W atau D wajib disertai catatan'); tulis(a => { a.nilai = n; a.catatan = $('#u-c').value.trim(); a.status = 'audit'; }, 'diaudit: ' + n, true); };
    if (sah) { $('#h-f').onclick = () => tulis(a => { a.status = 'final'; }, 'disahkan final'); $('#h-b').onclick = () => tulis(a => { a.status = 'draf'; }, 'dikembalikan ke prodi'); }
  });
}
