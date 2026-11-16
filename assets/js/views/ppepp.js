/* Riwayat Siklus PPEPP: AMI, temuan, tanggapan, berita acara, RTM, RTL, pemantauan, dan risiko, tahun 2022 sampai 2026.
   Koleksi "ppepp": satu dokumen per tahun { id:'P2022', tahun, ami, temuan[], rtm, rtl[] } dan satu dokumen { id:'risiko', daftar[] }.
   Data awal di ppepp-awal.js berlabel ILUSTRATIF sampai diganti data asli. */
import { S, ctx, icon, esc, can, save, toast, openDrawer, closeDrawer, userName } from '../app.js';
import { chart, AX } from '../charts.js';
import { UNIT, AUDITORS } from '../seed.js';
import { PPEPP_AWAL } from '../ppepp-awal.js';
import { xlsx, docx, unduh } from '../ekspor.js';

const KAT = { 'KTS Mayor': '#f0616d', 'KTS Minor': '#fb923c', 'Observasi': '#f5a524' };
const STA = { 'Open': '#f0616d', 'Proses': '#f5a524', 'Menunggu verifikasi': '#0ea5e9', 'Close': '#10b981', 'Tidak efektif': '#8b5cf6' };
const RST = { 'Terbuka': '#f0616d', 'Proses': '#f5a524', 'Selesai': '#0ea5e9', 'Terverifikasi': '#10b981' };
const MIME_X = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', MIME_D = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const today = () => new Date().toISOString().slice(0, 10);
const hari = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
const tgl = (s) => { if (!s) return '–'; const [y, m, d] = s.split('-'); return `${+d} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+m - 1]} ${y}`; };
const audName = (id) => (AUDITORS.find(a => a.id === id) || {}).nama || id;
let tab = 'ringkas'; const F = { th: '', u: '', kat: '', st: '', q: '' };

/* ---------- data ---------- */
const tahunDocs = () => S.ppepp.filter(d => d.tahun).sort((a, b) => a.tahun - b.tahun);
const semua = () => tahunDocs().flatMap(d => d.temuan || []);
const riskDoc = () => S.ppepp.find(d => d.id === 'risiko') || { id: 'risiko', daftar: [], _baru: true };
const cariT = (id) => semua().find(t => t.id === id);
const docDari = (t) => S.ppepp.find(d => d.tahun === t.tahun);
export function ketepatan(t) {
  if (t.tglSelesai) { const d = hari(t.tenggat, t.tglSelesai); return d < 0 ? { k: 'ok', teks: `Lebih cepat ${-d} hari`, d } : d === 0 ? { k: 'ok', teks: 'Tepat waktu', d } : { k: 'bad', teks: `Terlambat ${d} hari`, d }; }
  const s = hari(today(), t.tenggat);
  return s < 0 ? { k: 'bad', teks: `Lewat tenggat ${-s} hari`, d: -s, lewat: true } : { k: 'na', teks: `Sisa ${s} hari`, d: null };
}
export function statTahun(doc) {
  const t = doc.temuan || [], sel = t.filter(x => x.tglSelesai), tepat = sel.filter(x => ketepatan(x).d <= 0);
  const rtl = doc.rtl || [];
  return { n: t.length, mayor: t.filter(x => x.kategori === 'KTS Mayor').length, close: t.filter(x => x.status === 'Close').length, belum: t.filter(x => x.status !== 'Close').length, sel: sel.length, tepat: tepat.length, rep: t.filter(x => x.berulangDari).length, lewat: t.filter(x => !x.tglSelesai && ketepatan(x).lewat).length, rtl: rtl.length, rtlV: rtl.filter(r => r.status === 'Terverifikasi').length };
}
export function ringkasSiklus() {
  const docs = tahunDocs(), st = docs.map(statTahun), sum = (k) => st.reduce((a, s) => a + s[k], 0);
  const n = sum('n'), risk = riskDoc().daftar || [];
  return { n, close: sum('close'), belum: sum('belum'), lewat: sum('lewat'), rep: sum('rep'), tepatPct: sum('sel') ? Math.round(sum('tepat') / sum('sel') * 100) : 0, closePct: n ? Math.round(sum('close') / n * 100) : 0, risikoTinggi: risk.filter(r => r.kemungkinan * r.dampak >= 15 && r.status !== 'Ditutup').length };
}
async function catat(t, aksi) { t.riwayat = (t.riwayat || []).concat([{ t: new Date().toISOString(), oleh: userName(), aksi }]); await save('ppepp', docDari(t), `Temuan ${t.id}: ${aksi}`); }
const bolehAuditee = (t) => ctx.role === 'admin' || (ctx.role === 'auditee' && ctx.unit === t.unit);
const bolehAuditor = (t) => ctx.role === 'admin' || (ctx.role === 'auditor' && can('audit', { unit: t.unit }));
const tg = (c, s) => `<span class="tag" style="--c:${c}">${esc(s)}</span>`;
const stBadge = (t) => tg(STA[t.status] || '#94a3b8', t.status);
const ketBadge = (t) => { const k = ketepatan(t); return `<span class="st ${k.k}">${k.teks}</span>`; };
const skor = (r) => r.kemungkinan * r.dampak;
const skorKel = (v) => v >= 15 ? ['bad', 'Tinggi'] : v >= 8 ? ['near', 'Sedang'] : ['ok', 'Rendah'];

/* ---------- tampilan utama ---------- */
export default function ppeppView(el) {
  const ilus = S.ppepp.some(d => d.ilustratif);
  const kosong = !S.ppepp.length;
  const admin = ctx.role === 'admin';
  el.innerHTML = `
  ${ilus ? `<div class="card" style="margin-bottom:14px;background:rgba(245,165,36,.1);border:1px solid rgba(245,165,36,.4)"><div class="small"><b>Data contoh (ilustratif).</b> Temuan, tanggapan, berita acara, RTM, RTL, dan risiko 2022 sampai 2026 di halaman ini disusun sebagai contoh alur, bukan rekam jejak resmi. Ganti dengan data asli dari laporan AMI dan notulen RTM sebelum dipakai sebagai bukti.</div></div>` : ''}
  ${kosong ? `<div class="card empty" style="margin-bottom:14px">Belum ada data siklus. ${admin ? '<button class="btn pri" id="p-muat">Muat data contoh 2022–2026</button>' : 'Admin SPM dapat memuat data contoh.'}</div>` : ''}
  <div class="card" style="padding:10px 14px;margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    ${[['ringkas', 'Ringkasan siklus', 'pulse'], ['temuan', 'Temuan AMI', 'audit'], ['rtm', 'RTM dan RTL', 'meet'], ['risiko', 'Risiko dan mitigasi', 'alert']].map(([k, t, ic]) => `<button class="btn ${tab === k ? 'pri' : 'ghost'}" data-tab="${k}">${icon(ic)} ${t}</button>`).join('')}
    <span style="flex:1"></span>
    <button class="btn sm" id="p-xl">${icon('download')} Excel</button>
  </div>
  <div id="p-isi"></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ppeppView(el); });
  const m = el.querySelector('#p-muat');
  if (m) m.onclick = async () => { for (const a of PPEPP_AWAL) await save('ppepp', JSON.parse(JSON.stringify(a))); toast('Data contoh dimuat'); ppeppView(el); };
  el.querySelector('#p-xl').onclick = () => ekspor();
  const isi = el.querySelector('#p-isi');
  if (!S.ppepp.length) return;
  ({ ringkas, temuan: temuanTab, rtm: rtmTab, risiko: risikoTab })[tab](isi, () => ppeppView(el));
}

/* ---------- ringkasan ---------- */
function ringkas(el) {
  const docs = tahunDocs(), st = docs.map(statTahun), R = ringkasSiklus();
  const kpi = (c, l, v, s) => `<div class="card kpi" style="--c:${c}"><div class="lbl"><span class="dot" style="--c:${c}"></span>${l}</div><div class="val">${v}</div><div class="muted small" style="margin-top:4px">${s}</div></div>`;
  el.innerHTML = `
  <div class="grid g4">
    ${kpi('#0ea5e9', 'Temuan AMI 2022–2026', R.n, `${docs.length} siklus tahunan`)}
    ${kpi('#10b981', 'Sudah Close', `${R.closePct}<small>%</small>`, `${R.close} dari ${R.n}; ${R.belum} belum Close`)}
    ${kpi('#f5a524', 'Selesai tepat waktu atau lebih cepat', `${R.tepatPct}<small>%</small>`, `${R.lewat} temuan terbuka lewat tenggat`)}
    ${kpi('#f0616d', 'Temuan berulang', R.rep, `${R.risikoTinggi} risiko tingkat tinggi`)}
  </div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('audit')}</span><div><h3>Temuan per tahun dan kategori</h3><div class="sub">Hasil AMI tiap siklus</div></div></div><div class="chart" id="c1"></div></div>
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('check')}</span><div><h3>Penutupan dan ketepatan waktu</h3><div class="sub">Persen temuan Close dan selesai tepat waktu</div></div></div><div class="chart" id="c2"></div></div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('loop')}</span><div><h3>Rekam siklus PPEPP per tahun</h3><div class="sub">AMI, temuan, berita acara, RTM, RTL, lalu AMI berikutnya memantau temuan sebelumnya</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahun</th><th>AMI</th><th class="num">Auditee</th><th class="num">Temuan (Mayor)</th><th class="num">Close</th><th class="num">Belum Close</th><th class="num">Tepat waktu</th><th class="num">Berulang</th><th>RTM</th><th class="num">RTL terverifikasi</th></tr></thead><tbody>
    ${docs.map((d, i) => { const s = st[i]; return `<tr><td><b>${d.tahun}</b></td><td>${esc(d.ami.id)}<div class="muted small">${tgl(d.ami.mulai)} – ${tgl(d.ami.selesai)}</div><div class="muted small">${esc(d.ami.ba.no)}</div></td><td class="num">${d.ami.unit.length}</td><td class="num"><b>${s.n}</b> (${s.mayor})</td><td class="num">${s.close}</td><td class="num">${s.belum ? `<b style="color:#b42335">${s.belum}</b>` : 0}</td><td class="num">${s.sel ? Math.round(s.tepat / s.sel * 100) + '%' : '–'}</td><td class="num">${s.rep}</td><td>${tgl(d.rtm.tgl)}<div><span class="st ${d.rtm.status === 'Selesai' ? 'ok' : 'near'}">${esc(d.rtm.status)}</span></div></td><td class="num">${s.rtl ? `${s.rtlV}/${s.rtl}` : '–'}</td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="muted small" style="margin-top:8px">Tepat waktu dihitung dari temuan yang sudah selesai dikerjakan terhadap tenggat terakhir (termasuk perpanjangan). Temuan berulang adalah temuan dengan masalah yang sama pada siklus sebelumnya. Tanda * pada grafik: siklus masih berjalan.</div>
  </div>`;
  const th = docs.map(d => String(d.tahun) + (d.ami.tahap === 'Selesai' ? '' : '*'));
  chart(el.querySelector('#c1'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 10, top: 10, bottom: 34, containLabel: true },
    xAxis: { type: 'category', data: th, ...AX }, yAxis: { type: 'value', ...AX, minInterval: 1 },
    series: Object.keys(KAT).map(k => ({ name: k, type: 'bar', stack: 'a', barWidth: 34, data: docs.map(d => (d.temuan || []).filter(t => t.kategori === k).length), itemStyle: { color: KAT[k] } }))
  });
  chart(el.querySelector('#c2'), {
    tooltip: { trigger: 'axis', valueFormatter: v => v + '%' }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 14, top: 14, bottom: 34, containLabel: true },
    xAxis: { type: 'category', data: th, ...AX }, yAxis: { type: 'value', max: 100, ...AX, axisLabel: { formatter: '{value}%' } },
    series: [{ name: 'Close', type: 'line', smooth: true, symbolSize: 8, data: st.map(s => s.n ? Math.round(s.close / s.n * 100) : 0), itemStyle: { color: '#10b981' } }, { name: 'Tepat waktu', type: 'line', smooth: true, symbolSize: 8, data: st.map(s => s.sel ? Math.round(s.tepat / s.sel * 100) : 0), itemStyle: { color: '#0ea5e9' } }]
  });
}

/* ---------- temuan ---------- */
function temuanTab(el, ulang) {
  const unitList = [...new Set(semua().map(t => t.unit))];
  const q = F.q.toLowerCase();
  const list = semua().filter(t => (!F.th || String(t.tahun) === F.th) && (!F.u || t.unit === F.u) && (!F.kat || t.kategori === F.kat) && (!F.st || t.status === F.st) && (!q || (t.id + ' ' + t.uraian + ' ' + t.standar + ' ' + t.unit).toLowerCase().includes(q)));
  const opt = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  el.innerHTML = `<div class="card">
    <div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('audit')}</span><div><h3>Temuan AMI</h3><div class="sub">${list.length} dari ${semua().length} temuan. Klik baris untuk tanggapan, perbaikan, dan verifikasi.</div></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <select class="inp" id="f-th"><option value="">Semua tahun</option>${opt(['2022', '2023', '2024', '2025', '2026'], F.th)}</select>
      <select class="inp" id="f-u"><option value="">Semua unit</option>${opt(unitList, F.u)}</select>
      <select class="inp" id="f-kat"><option value="">Semua kategori</option>${opt(Object.keys(KAT), F.kat)}</select>
      <select class="inp" id="f-st"><option value="">Semua status</option>${opt(Object.keys(STA), F.st)}</select>
      <input class="inp" id="f-q" placeholder="Cari temuan" value="${esc(F.q)}" style="min-width:180px">
    </div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Unit</th><th>Standar dan uraian</th><th>Kategori</th><th>Tenggat</th><th>Selesai</th><th>Ketepatan</th><th>Status</th></tr></thead><tbody>
    ${list.map(t => `<tr class="click" data-id="${t.id}"><td><b>${t.id}</b>${t.berulangDari ? `<div class="muted small">berulang dari ${t.berulangDari}</div>` : ''}</td><td><b>${t.unit}</b></td><td style="max-width:420px"><div class="muted small">${esc(t.standar)}</div>${esc(t.uraian)}</td><td>${tg(KAT[t.kategori], t.kategori)}</td><td>${tgl(t.tenggat)}${t.perpanjang && t.perpanjang.length ? '<div class="muted small">diperpanjang</div>' : ''}</td><td>${tgl(t.tglSelesai)}</td><td>${ketBadge(t)}</td><td>${stBadge(t)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Tidak ada temuan yang cocok.</td></tr>'}
    </tbody></table></div></div>`;
  const bind = (id, k) => el.querySelector(id).onchange = (e) => { F[k] = e.target.value; ulang(); };
  bind('#f-th', 'th'); bind('#f-u', 'u'); bind('#f-kat', 'kat'); bind('#f-st', 'st');
  el.querySelector('#f-q').onchange = (e) => { F.q = e.target.value; ulang(); };
  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => drawerTemuan(tr.dataset.id, ulang));
}

function drawerTemuan(id, ulang) {
  const t = cariT(id); if (!t) return;
  const rtl = (docDari(t).rtl || []).filter(r => (r.temuan || []).includes(t.id));
  const lanjut = semua().filter(x => x.berulangDari === t.id);
  const aE = bolehAuditee(t), aA = bolehAuditor(t);
  const garis = [['Temuan', t.tglTemuan], ['Tenggat awal', t.perpanjang && t.perpanjang.length ? t.perpanjang[0].dari : t.tenggat], ...(t.perpanjang || []).map(p => ['Perpanjangan', p.ke]), ['Selesai', t.tglSelesai]];
  openDrawer(`<div class="card-h"><h3>${t.id} · ${t.unit}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
  <div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${tg(KAT[t.kategori], t.kategori)}${stBadge(t)}${ketBadge(t)}<span class="tag" style="--c:#64748b">${t.tahun}</span></div>
    <div class="muted small">${esc(t.standar)}</div><p style="margin:4px 0 10px"><b>${esc(t.uraian)}</b></p>
    <div class="small"><b>Akar masalah.</b> ${esc(t.akar)}</div>
    <div class="small" style="margin-top:6px"><b>Tindakan yang disepakati.</b> ${esc(t.tindakan)}</div>
    <div class="small" style="margin-top:6px"><b>Penanggung jawab.</b> ${esc(t.pic)} · <b>Auditor.</b> ${(t.auditor || []).map(audName).join(', ')}</div>
    <div class="small" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">${garis.map(([a, b]) => `<span class="tag" style="--c:#0ea5e9">${a}: ${tgl(b)}</span>`).join('')}</div>
    ${t.berulangDari ? `<div class="small" style="margin-top:8px">Berulang dari <a href="#" data-go="${t.berulangDari}">${t.berulangDari}</a>.</div>` : ''}
    ${lanjut.length ? `<div class="small" style="margin-top:4px">Muncul lagi sebagai ${lanjut.map(x => `<a href="#" data-go="${x.id}">${x.id}</a>`).join(', ')}.</div>` : ''}
    ${(t.perpanjang || []).map(p => `<div class="small muted" style="margin-top:4px">Perpanjangan ke ${tgl(p.ke)}: ${esc(p.alasan)}</div>`).join('')}
  </div>
  <div class="card" style="margin-top:12px"><h4 style="margin:0 0 6px">Tanggapan auditee</h4>
    <textarea class="inp" id="t-ae" rows="3" ${aE ? '' : 'disabled'}>${esc(t.tanggapanAuditee || '')}</textarea>
    <h4 style="margin:10px 0 6px">Tanggapan auditor</h4>
    <textarea class="inp" id="t-au" rows="3" ${aA ? '' : 'disabled'}>${esc(t.tanggapanAuditor || '')}</textarea>
    ${aE || aA ? `<button class="btn sm" id="t-simpan" style="margin-top:8px">${icon('check')} Simpan tanggapan</button>` : '<div class="muted small" style="margin-top:6px">Hanya auditee unit ini, auditor, dan Admin SPM yang dapat mengisi tanggapan.</div>'}
  </div>
  <div class="card" style="margin-top:12px"><h4 style="margin:0 0 8px">Tindak lanjut</h4>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${aE && ['Open', 'Proses', 'Tidak efektif'].includes(t.status) ? `${t.status === 'Open' ? '<button class="btn sm" id="t-mulai">Mulai perbaikan</button>' : ''}<button class="btn sm" id="t-lapor">${icon('upload')} Lapor selesai</button>` : ''}
      ${aA && t.status === 'Menunggu verifikasi' ? `<button class="btn sm pri" id="t-close">${icon('check')} Verifikasi: Close</button><button class="btn sm" id="t-tidak">Tidak efektif</button>` : ''}
      ${aE && t.status !== 'Close' ? `<button class="btn sm ghost" id="t-perp">${icon('calendar')} Perpanjang tenggat</button>` : ''}
    </div>
    <div id="t-perp-f"></div>
    ${rtl.length ? `<div class="small" style="margin-top:10px"><b>Terkait RTL.</b> ${rtl.map(r => `${r.id} (${r.status})`).join(', ')}</div>` : ''}
  </div>
  ${(t.riwayat || []).length ? `<div class="card" style="margin-top:12px"><h4 style="margin:0 0 6px">Riwayat perubahan</h4>${t.riwayat.slice().reverse().map(r => `<div class="small muted">${r.t.slice(0, 10)} · ${esc(r.oleh)} · ${esc(r.aksi)}</div>`).join('')}</div>` : ''}`, d => {
    d.querySelectorAll('[data-go]').forEach(a => a.onclick = (e) => { e.preventDefault(); closeDrawer(); setTimeout(() => drawerTemuan(a.dataset.go, ulang), 120); });
    const selesaiAksi = async (fn, aksi, pesan) => { fn(); await catat(t, aksi); closeDrawer(); toast(pesan); ulang(); };
    const b = (i, f) => { const x = d.querySelector(i); if (x) x.onclick = f; };
    b('#t-simpan', async () => { if (aE) t.tanggapanAuditee = d.querySelector('#t-ae').value.trim(); if (aA) t.tanggapanAuditor = d.querySelector('#t-au').value.trim(); await catat(t, 'Tanggapan disimpan'); closeDrawer(); toast('Tanggapan tersimpan'); ulang(); });
    b('#t-mulai', () => selesaiAksi(() => { t.status = 'Proses'; }, 'Perbaikan dimulai', 'Status: Proses'));
    b('#t-lapor', () => selesaiAksi(() => { t.status = 'Menunggu verifikasi'; t.tglSelesai = today(); }, 'Perbaikan dilaporkan selesai', 'Menunggu verifikasi auditor'));
    b('#t-close', () => selesaiAksi(() => { t.status = 'Close'; }, 'Diverifikasi auditor: Close', 'Temuan ditutup'));
    b('#t-tidak', () => selesaiAksi(() => { t.status = 'Tidak efektif'; t.tglSelesai = null; }, 'Diverifikasi auditor: tidak efektif, perbaikan diulang', 'Dikembalikan ke auditee'));
    b('#t-perp', () => {
      const f = d.querySelector('#t-perp-f');
      f.innerHTML = `<div class="grid g2" style="gap:8px;margin-top:10px"><div class="field"><label>Tenggat baru</label><input class="inp" type="date" id="pp-t" value="${t.tenggat}" min="${t.tenggat}"></div><div class="field"><label>Alasan</label><input class="inp" id="pp-a"></div></div><button class="btn sm pri" id="pp-s" style="margin-top:8px">Simpan perpanjangan</button>`;
      f.querySelector('#pp-s').onclick = () => { const ke = f.querySelector('#pp-t').value, al = f.querySelector('#pp-a').value.trim(); if (!ke || ke <= t.tenggat) return toast('Tenggat baru harus setelah tenggat saat ini'); if (al.length < 10) return toast('Isi alasan perpanjangan'); selesaiAksi(() => { (t.perpanjang = t.perpanjang || []).push({ tgl: today(), dari: t.tenggat, ke, alasan: al }); t.tenggat = ke; }, `Tenggat diperpanjang ke ${ke}`, 'Tenggat diperpanjang'); };
    });
  });
}

/* ---------- RTM dan RTL ---------- */
function rtmTab(el, ulang) {
  const docs = tahunDocs().slice().reverse();
  el.innerHTML = docs.map(d => { const s = statTahun(d), rtl = d.rtl || [], rtm = d.rtm; return `<div class="card" style="margin-bottom:16px">
    <div class="card-h"><span class="ico-badge" style="--c:#f472b6">${icon('meet')}</span><div><h3>Siklus ${d.tahun}</h3><div class="sub">${esc(d.ami.id)} · ${tgl(d.ami.mulai)} – ${tgl(d.ami.selesai)} · ${s.n} temuan · ${esc(d.ami.tahap)}</div></div><div class="sp"></div>
      <button class="btn sm" data-ba="${d.tahun}">${icon('download')} Berita Acara AMI</button><button class="btn sm" data-notulen="${d.tahun}">${icon('download')} Notulen RTM</button></div>
    <div class="small"><b>Berita Acara.</b> ${esc(d.ami.ba.no)}, ${tgl(d.ami.ba.tgl)}. ${esc(d.ami.ba.ringkas)}</div>
    <div class="small" style="margin-top:6px"><b>${esc(rtm.id)}</b> · ${tgl(rtm.tgl)} · <span class="st ${rtm.status === 'Selesai' ? 'ok' : 'near'}">${esc(rtm.status)}</span><div class="muted">${esc(rtm.ringkas)}</div></div>
    ${rtm.keputusan.length ? `<div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>No</th><th>Keputusan RTM</th><th>RTL</th><th>PIC</th><th>Tenggat</th><th>Status</th><th>Temuan terkait</th></tr></thead><tbody>
    ${rtm.keputusan.map(k => { const r = rtl.find(x => x.id === k.rtl) || {}; const lw = r.status !== 'Terverifikasi' && r.tenggat && r.tenggat < today(); return `<tr><td>${k.no}</td><td>${esc(k.teks)}</td><td><b>${esc(k.rtl)}</b></td><td>${esc(r.pic || '')}</td><td>${tgl(r.tenggat)}${lw ? '<div class="small" style="color:#b42335">lewat tenggat</div>' : ''}</td><td>${tg(RST[r.status] || '#94a3b8', r.status || '–')}</td><td>${(r.temuan || []).map(i => `<a href="#" class="tag" style="--c:#0ea5e9" data-t="${i}">${i}</a>`).join(' ') || '–'}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="muted small" style="margin-top:8px">RTM belum dilaksanakan. Bahan RTM tersedia di menu Tinjauan Manajemen.</div>'}
  </div>`; }).join('');
  el.querySelectorAll('[data-t]').forEach(a => a.onclick = (e) => { e.preventDefault(); drawerTemuan(a.dataset.t, ulang); });
  el.querySelectorAll('[data-ba]').forEach(b => b.onclick = () => beritaAcara(+b.dataset.ba));
  el.querySelectorAll('[data-notulen]').forEach(b => b.onclick = () => notulen(+b.dataset.notulen));
}

function beritaAcara(y) {
  const d = S.ppepp.find(x => x.tahun === y), a = d.ami, t = d.temuan || [], s = statTahun(d);
  const blok = [{ t: 'h1', v: `BERITA ACARA AUDIT MUTU INTERNAL ${y}` }, { t: 'p', v: `Nomor: ${a.ba.no}` }, { t: 'p', v: `Pada tanggal ${tgl(a.ba.tgl)} telah dilaksanakan Audit Mutu Internal (${a.id}) pada periode ${tgl(a.mulai)} sampai ${tgl(a.selesai)} di PEM Akamigas.` },
    { t: 'h2', v: 'Lingkup dan tim' }, { t: 'p', v: `Auditee: ${a.unit.join(', ')}.` }, { t: 'p', v: `Auditor: ${(a.auditor || []).map(audName).join(', ')}.` },
    { t: 'h2', v: 'Ringkasan hasil' }, { t: 'p', v: `Ditemukan ${s.n} temuan: ${t.filter(x => x.kategori === 'KTS Mayor').length} KTS Mayor, ${t.filter(x => x.kategori === 'KTS Minor').length} KTS Minor, dan ${t.filter(x => x.kategori === 'Observasi').length} Observasi. Temuan berulang dari siklus sebelumnya: ${s.rep}.` },
    { t: 'h2', v: 'Daftar temuan' }, ...t.map(x => ({ t: 'li', v: `${x.id} (${x.unit}, ${x.kategori}): ${x.uraian} Tenggat perbaikan ${tgl(x.tenggat)}; penanggung jawab ${x.pic}.` })),
    { t: 'h2', v: 'Penutup' }, { t: 'p', v: 'Auditee menyatakan menerima hasil audit dan akan menyampaikan rencana perbaikan sesuai tenggat. Hasil audit dibawa ke Rapat Tinjauan Manajemen.' },
    { t: 'p', v: `Penandatangan: ${a.ba.ttd.join(', ')}.` }, { t: 'cat', v: d.ilustratif ? 'Dokumen contoh (ilustratif), bukan dokumen resmi.' : '' }];
  unduh(`Berita_Acara_AMI_${y}.docx`, docx(blok), MIME_D);
}
function notulen(y) {
  const d = S.ppepp.find(x => x.tahun === y), r = d.rtm, rtl = d.rtl || [];
  const blok = [{ t: 'h1', v: `NOTULEN RAPAT TINJAUAN MANAJEMEN ${y}` }, { t: 'p', v: `${r.id}, ${tgl(r.tgl)}. Status: ${r.status}.` }, { t: 'p', v: `Peserta: ${r.peserta}.` }, { t: 'h2', v: 'Bahan tinjauan' }, { t: 'p', v: r.ringkas },
    { t: 'h2', v: 'Keputusan dan tindak lanjut' }, ...(r.keputusan.length ? r.keputusan.map(k => { const x = rtl.find(z => z.id === k.rtl) || {}; return { t: 'li', v: `${k.no}. ${k.teks} (${k.rtl}; PIC ${x.pic || '–'}; tenggat ${tgl(x.tenggat)}; status ${x.status || '–'}).` }; }) : [{ t: 'p', v: 'Belum ada keputusan.' }]),
    { t: 'cat', v: d.ilustratif ? 'Dokumen contoh (ilustratif), bukan dokumen resmi.' : '' }];
  unduh(`Notulen_RTM_${y}.docx`, docx(blok), MIME_D);
}

/* ---------- risiko ---------- */
function risikoTab(el, ulang) {
  const rd = riskDoc(), daftar = rd.daftar || [];
  const boleh = ctx.role === 'admin' || can('rtm');
  const sel = (k, d) => daftar.filter(r => r.kemungkinan === k && r.dampak === d);
  const warna = (k, d) => { const v = k * d; return v >= 15 ? 'rgba(240,97,109,.28)' : v >= 8 ? 'rgba(245,165,36,.25)' : 'rgba(16,185,129,.2)'; };
  el.innerHTML = `<div class="grid g-21">
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('alert')}</span><div><h3>Daftar risiko dan mitigasi</h3><div class="sub">Risiko berasal dari temuan Mayor, temuan berulang, dan capaian akreditasi yang tipis</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Risiko</th><th>Unit</th><th class="num">Skor</th><th class="num">Sisa</th><th>Status</th><th>Tren</th></tr></thead><tbody>
    ${daftar.map(r => { const v = skor(r), sv = r.kemungkinanSisa * r.dampakSisa, k = skorKel(v), ks = skorKel(sv); return `<tr class="click" data-r="${r.id}"><td><b>${r.id}</b></td><td style="max-width:360px">${esc(r.risiko)}<div class="muted small">${esc(r.kategori)} · pemilik ${esc(r.pemilik)}</div></td><td>${esc(r.unit)}</td><td class="num"><span class="st ${k[0]}">${v} ${k[1]}</span></td><td class="num"><span class="st ${ks[0]}">${sv} ${ks[1]}</span></td><td>${tg(r.status === 'Terkendali' ? '#10b981' : r.status === 'Ditutup' ? '#64748b' : '#f5a524', r.status)}</td><td class="small" title="${(r.reviu || []).map(x => x.tahun + ': ' + x.skor).join('; ')}" style="white-space:nowrap">${(r.reviu || []).map(x => x.skor).join(' · ')}</td></tr>`; }).join('')}
    </tbody></table></div></div>
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('target')}</span><div><h3>Peta risiko</h3><div class="sub">Kemungkinan (kanan) dan dampak (atas)</div></div></div>
    <table style="border-collapse:separate;border-spacing:3px;width:100%;table-layout:fixed;font-size:11px">
    ${[5, 4, 3, 2, 1].map(dp => `<tr><td style="width:18px;color:var(--muted);text-align:center">${dp}</td>${[1, 2, 3, 4, 5].map(k => `<td style="background:${warna(k, dp)};height:46px;border-radius:8px;text-align:center;font-weight:700;vertical-align:middle">${sel(k, dp).map(r => r.id).join(' ')}</td>`).join('')}</tr>`).join('')}
    <tr><td></td>${[1, 2, 3, 4, 5].map(k => `<td style="text-align:center;color:var(--muted)">${k}</td>`).join('')}</tr></table>
    <div class="muted small" style="margin-top:8px">Skor = kemungkinan × dampak (1–25). Tinggi ≥ 15, sedang 8–14, rendah &lt; 8. Skor sisa adalah perkiraan setelah mitigasi berjalan.</div></div></div>`;
  el.querySelectorAll('tr[data-r]').forEach(tr => tr.onclick = () => {
    const r = daftar.find(x => x.id === tr.dataset.r);
    openDrawer(`<div class="card-h"><h3>${r.id} · ${esc(r.kategori)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><p style="margin:0 0 8px"><b>${esc(r.risiko)}</b></p><div class="small">Unit: ${esc(r.unit)} · Pemilik: ${esc(r.pemilik)}</div>
      <div class="small" style="margin-top:8px"><b>Skor.</b> kemungkinan ${r.kemungkinan} × dampak ${r.dampak} = ${skor(r)}; sisa ${r.kemungkinanSisa} × ${r.dampakSisa} = ${r.kemungkinanSisa * r.dampakSisa}</div>
      <div class="small" style="margin-top:8px"><b>Sumber temuan.</b> ${(r.sumber || []).map(i => `<a href="#" class="tag" style="--c:#0ea5e9" data-t="${i}">${i}</a>`).join(' ') || 'Akreditasi dan kebijakan'}</div>
      <div class="field" style="margin-top:10px"><label>Mitigasi</label><textarea class="inp" id="r-m" rows="3" ${boleh ? '' : 'disabled'}>${esc(r.mitigasi)}</textarea></div>
      <div class="grid g2" style="gap:8px"><div class="field"><label>Status</label><select class="inp" id="r-s" ${boleh ? '' : 'disabled'}>${['Terbuka', 'Dalam mitigasi', 'Terkendali', 'Ditutup'].map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Skor sisa (kemungkinan × dampak)</label><div style="display:flex;gap:6px"><input class="inp" type="number" min="1" max="5" id="r-k" value="${r.kemungkinanSisa}" ${boleh ? '' : 'disabled'}><input class="inp" type="number" min="1" max="5" id="r-d" value="${r.dampakSisa}" ${boleh ? '' : 'disabled'}></div></div></div>
      ${boleh ? `<button class="btn pri" id="r-simpan" style="margin-top:10px">${icon('check')} Simpan</button>` : '<div class="muted small" style="margin-top:8px">Pengubahan risiko oleh Admin SPM atau pimpinan.</div>'}
    </div>`, d => {
      d.querySelectorAll('[data-t]').forEach(a => a.onclick = (e) => { e.preventDefault(); closeDrawer(); setTimeout(() => drawerTemuan(a.dataset.t, ulang), 120); });
      const s = d.querySelector('#r-simpan'); if (!s) return;
      s.onclick = async () => {
        const k = +d.querySelector('#r-k').value, dp = +d.querySelector('#r-d').value;
        if (!(k >= 1 && k <= 5 && dp >= 1 && dp <= 5)) return toast('Skor sisa harus 1 sampai 5');
        r.mitigasi = d.querySelector('#r-m').value.trim(); r.status = d.querySelector('#r-s').value; r.kemungkinanSisa = k; r.dampakSisa = dp;
        r.reviu = (r.reviu || []).filter(x => x.tahun !== new Date().getFullYear()).concat([{ tahun: new Date().getFullYear(), skor: k * dp }]);
        await save('ppepp', rd, `Risiko ${r.id} diperbarui`); closeDrawer(); toast('Risiko diperbarui'); ulang();
      };
    });
  });
}

/* ---------- ekspor ---------- */
function ekspor() {
  const H = (a) => a.map(v => ({ v, s: 1 }));
  const tm = [H(['ID', 'Tahun', 'Unit', 'Standar', 'Kategori', 'Uraian', 'Akar masalah', 'Tindakan', 'PIC', 'Tgl temuan', 'Tenggat', 'Tgl selesai', 'Ketepatan', 'Status', 'Berulang dari', 'Tanggapan auditee', 'Tanggapan auditor']),
    ...semua().map(t => [t.id, t.tahun, t.unit, t.standar, t.kategori, t.uraian, t.akar, t.tindakan, t.pic, t.tglTemuan, t.tenggat, t.tglSelesai || '', ketepatan(t).teks, t.status, t.berulangDari || '', t.tanggapanAuditee || '', t.tanggapanAuditor || ''])];
  const rt = [H(['RTL', 'Tahun', 'Aksi', 'PIC', 'Tenggat', 'Tgl selesai', 'Status', 'Temuan terkait']), ...tahunDocs().flatMap(d => (d.rtl || []).map(r => [r.id, d.tahun, r.aksi, r.pic, r.tenggat, r.tglSelesai || '', r.status, (r.temuan || []).join(', ')]))];
  const rk = [H(['ID', 'Risiko', 'Kategori', 'Unit', 'Kemungkinan', 'Dampak', 'Skor', 'Mitigasi', 'Pemilik', 'Status', 'Skor sisa', 'Sumber temuan']), ...(riskDoc().daftar || []).map(r => [r.id, r.risiko, r.kategori, r.unit, r.kemungkinan, r.dampak, skor(r), r.mitigasi, r.pemilik, r.status, r.kemungkinanSisa * r.dampakSisa, (r.sumber || []).join(', ')])];
  unduh(`Riwayat_Siklus_PPEPP_${today()}.xlsx`, xlsx([{ nama: 'Temuan AMI', lebar: [9, 7, 8, 26, 12, 60, 50, 50, 24, 12, 12, 12, 20, 18, 12, 50, 50], baris: tm }, { nama: 'RTL', lebar: [10, 7, 60, 24, 12, 12, 14, 30], baris: rt }, { nama: 'Risiko', lebar: [7, 60, 16, 14, 11, 8, 7, 60, 20, 16, 9, 30], baris: rk }]), MIME_X);
}
