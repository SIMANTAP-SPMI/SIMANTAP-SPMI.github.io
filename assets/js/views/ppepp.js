/* Siklus PPEPP: satu tahun satu layar (AMI, temuan, perbaikan, berita acara, RTM, RTL, pemantauan, risiko), tren 2022 sampai 2026, dan risiko.
   Rincian temuan, RTM, dan RTL tidak diulang di sini; tiap tahap menautkan ke menu AMI, RTL, atau RTM pada tahun yang sama.
   Data arsip (koleksi "ppepp", ppepp-awal.js) berlabel ILUSTRATIF sampai diganti data asli; lihat siklus-core.js untuk sumber data. */
import { S, ctx, icon, esc, can, save, toast, openDrawer, closeDrawer, spmLevel } from '../app.js';
import { chart, AX } from '../charts.js';
import { PPEPP_AWAL } from '../ppepp-awal.js';
import { xlsx, unduh } from '../ekspor.js';
import { TAHUN, KAT, RST, setTahun, tahunBar, bindTahun, tahunAktif, berjalan, temuanTahun, semuaTemuan, cariTemuan, rtlRtmTahun, amiTahun, rtmTahun, statTahun, ringkasSiklus, riskDoc, drawerTemuan, drawerRtlRtm, beritaAcara, ketepatan, tg, tgl, today } from './siklus-core.js';

const MIME_X = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
let tab = 'siklus';
const skor = (r) => r.kemungkinan * r.dampak;
const skorKel = (v) => v >= 15 ? ['bad', 'Tinggi'] : v >= 8 ? ['near', 'Sedang'] : ['ok', 'Rendah'];

export default function ppeppView(el) {
  const admin = spmLevel(), ulang = () => ppeppView(el), kosong = !S.ppepp.length;
  el.innerHTML = `
  ${kosong ? `<div class="card empty" style="margin-bottom:14px">Belum ada data arsip siklus 2022–2025. ${admin ? '<button class="btn pri" id="p-muat">Muat data contoh arsip 2022–2025</button>' : 'SPM dapat memuat data contoh.'}</div>` : ''}
  <div class="card" style="padding:10px 14px;margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    ${[['siklus', 'Siklus per tahun', 'loop'], ['tren', 'Tren 2022–2026', 'pulse'], ['risiko', 'Risiko dan mitigasi', 'alert']].map(([k, t, ic]) => `<button class="btn ${tab === k ? 'pri' : 'ghost'}" data-tab="${k}">${icon(ic)} ${t}</button>`).join('')}
    <span style="flex:1"></span><button class="btn sm" id="p-xl">${icon('download')} Excel</button></div>
  ${tab === 'siklus' ? tahunBar() : ''}
  ${S.ppepp.some(d => d.ilustratif) ? '<div class="card" style="margin-bottom:14px;background:rgba(245,165,36,.1);border:1px solid rgba(245,165,36,.4)"><div class="small"><b>Data contoh (ilustratif).</b> Siklus arsip 2022–2025 dan daftar risiko disusun sebagai contoh alur, bukan rekam jejak resmi. Siklus 2026 memakai data operasional aplikasi.</div></div>' : ''}
  <div id="p-isi"></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; ulang(); });
  bindTahun(el, ulang);
  const m = el.querySelector('#p-muat'); if (m) m.onclick = async () => { for (const a of PPEPP_AWAL) await save('ppepp', JSON.parse(JSON.stringify(a))); toast('Data contoh dimuat'); ulang(); };
  el.querySelector('#p-xl').onclick = ekspor;
  ({ siklus: siklusTab, tren: trenTab, risiko: risikoTab })[tab](el.querySelector('#p-isi'), ulang);
}

/* ---------- satu siklus satu layar ---------- */
function siklusTab(el, ulang) {
  const y = tahunAktif(), A = amiTahun(y), R = rtmTahun(y), st = statTahun(y), T = temuanTahun(y), rtl = rtlRtmTahun(y);
  const lanjut = TAHUN.includes(y + 1) ? temuanTahun(y + 1).filter(t => t.berulangDari && T.some(x => x.id === t.berulangDari)).length : null;
  const risk = (riskDoc().daftar || []).filter(r => (r.sumber || []).some(i => T.some(t => t.id === i)));
  const go = (h) => `<a href="#/${h}" class="btn sm ghost" style="margin-top:8px">Buka ${icon('eye')}</a>`;
  const tahap = [
    ['1', 'Perencanaan dan pelaksanaan AMI', '#0ea5e9', A ? `<b>${esc(A.id)}</b><div class="small">${tgl(A.mulai)} – ${tgl(A.selesai)}</div><div class="muted small">${A.baris.length} auditee · ${esc(A.tahap)}</div>` : '<div class="muted small">Belum ada AMI</div>', go('ami')],
    ['2', 'Temuan', '#f0616d', `<b>${st.n} temuan</b><div class="small">${st.mayor} Mayor · ${st.minor} Minor · ${st.obs} Observasi</div><div class="muted small">${st.rep} berulang dari siklus sebelumnya</div>`, go('ami')],
    ['3', 'Tanggapan dan perbaikan', '#f5a524', `<b>${st.close}/${st.n} Close</b><div class="small">${st.sel ? Math.round(st.tepat / st.sel * 100) : 0}% selesai tepat waktu atau lebih cepat</div><div class="muted small">${st.lewat ? `${st.lewat} lewat tenggat` : 'Tidak ada yang lewat tenggat'}</div>`, go('rtl')],
    ['4', 'Berita acara AMI', '#8b5cf6', A && A.ba ? `<b>${esc(A.ba.no)}</b><div class="small">${tgl(A.ba.tgl)}</div><button class="btn sm" id="ba" style="margin-top:6px">${icon('download')} Unduh</button>` : '<div class="muted small">Belum diterbitkan</div>', ''],
    ['5', 'Rapat Tinjauan Manajemen', '#f472b6', R ? `<b>${esc(R.id)}</b><div class="small">${tgl(R.tgl)} · ${esc(R.status)}</div><div class="muted small">${R.keputusan.length} keputusan</div>` : '<div class="muted small">Belum ada RTM</div>', go('rtm')],
    ['6', 'RTL dari RTM', '#6366f1', rtl.length ? `<b>${st.rtlV}/${st.rtl} terverifikasi</b><div class="muted small">${rtl.filter(r => r.status !== 'Terverifikasi').length} belum terverifikasi</div>` : '<div class="muted small">Menunggu RTM disahkan</div>', go('rtl')],
    ['7', `Pemantauan pada AMI ${y + 1}`, '#14b8a6', lanjut === null ? '<div class="muted small">AMI berikutnya belum dilaksanakan</div>' : `<b>${lanjut} temuan muncul lagi</b><div class="muted small">dari ${st.n} temuan ${y}</div>`, ''],
    ['8', 'Risiko dan mitigasi', '#10b981', `<b>${risk.length} risiko</b><div class="muted small">${risk.filter(r => skor(r) >= 15).length} tingkat tinggi bersumber dari temuan ${y}</div>`, `<button class="btn sm ghost" id="k-risiko" style="margin-top:8px">Lihat ${icon('eye')}</button>`]];
  const bT = T.filter(t => t.status !== 'Close').sort((a, b) => a.tenggat.localeCompare(b.tenggat)), bR = rtl.filter(r => r.status !== 'Terverifikasi');
  el.innerHTML = `<div class="grid g4">${tahap.map(([n, t, c, isi, aksi]) => `<div class="card" style="border-top:3px solid ${c}"><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><span class="tag" style="--c:${c}">${n}</span><b class="small">${t}</b></div>${isi}${aksi}</div>`).join('')}</div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('alert')}</span><div><h3>Temuan belum Close</h3><div class="sub">${bT.length} dari ${T.length} temuan siklus ${y}</div></div></div>
      ${bT.slice(0, 6).map(t => `<div class="small" style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(148,163,184,.2);cursor:pointer" data-t="${t.id}"><b>${t.id}</b><span class="tag" style="--c:${KAT[t.kategori] || '#94a3b8'}">${t.kategori}</span><span style="flex:1">${esc(t.unit)} · ${esc(t.uraian.length > 70 ? t.uraian.slice(0, 70) + '…' : t.uraian)}</span><span class="st ${ketepatan(t).k}">${ketepatan(t).teks}</span></div>`).join('') || '<div class="muted small">Semua temuan sudah Close.</div>'}
      ${bT.length > 6 ? `<div class="muted small" style="margin-top:6px">dan ${bT.length - 6} lainnya, lihat menu RTL.</div>` : ''}</div>
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('loop')}</span><div><h3>RTL dari RTM belum terverifikasi</h3><div class="sub">${bR.length} dari ${rtl.length} RTL</div></div></div>
      ${bR.map(r => `<div class="small" style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(148,163,184,.2);cursor:pointer" data-r="${r.id}"><b>${r.id}</b>${tg(RST[r.status], r.status)}<span style="flex:1">${esc(r.uraian.length > 80 ? r.uraian.slice(0, 80) + '…' : r.uraian)}</span></div>`).join('') || `<div class="muted small">${rtl.length ? 'Semua RTL sudah terverifikasi.' : 'Belum ada RTL dari RTM.'}</div>`}</div>
  </div>`;
  const ba = el.querySelector('#ba'); if (ba) ba.onclick = () => beritaAcara(y);
  const kr = el.querySelector('#k-risiko'); if (kr) kr.onclick = () => { tab = 'risiko'; ulang(); };
  el.querySelectorAll('[data-t]').forEach(d => d.onclick = () => drawerTemuan(d.dataset.t, ulang));
  el.querySelectorAll('[data-r]').forEach(d => d.onclick = () => drawerRtlRtm(d.dataset.r, y, ulang));
}

/* ---------- tren lintas tahun ---------- */
function trenTab(el, ulang) {
  const st = TAHUN.map(statTahun), R = ringkasSiklus(), kpi = (c, l, v, s) => `<div class="card kpi" style="--c:${c}"><div class="lbl"><span class="dot" style="--c:${c}"></span>${l}</div><div class="val">${v}</div><div class="muted small" style="margin-top:4px">${s}</div></div>`;
  el.innerHTML = `<div class="grid g4">
    ${kpi('#0ea5e9', 'Temuan AMI 2022–2026', R.n, `${TAHUN.length} siklus tahunan`)}${kpi('#10b981', 'Sudah Close', `${R.closePct}<small>%</small>`, `${R.close} dari ${R.n}; ${R.belum} belum Close`)}
    ${kpi('#f5a524', 'Selesai tepat waktu atau lebih cepat', `${R.tepatPct}<small>%</small>`, `${R.lewat} temuan terbuka lewat tenggat`)}${kpi('#f0616d', 'Temuan berulang', R.rep, `${R.risikoTinggi} risiko tingkat tinggi`)}</div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('audit')}</span><div><h3>Temuan per tahun dan kategori</h3></div></div><div class="chart" id="c1"></div></div>
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('check')}</span><div><h3>Penutupan dan ketepatan waktu</h3><div class="sub">Tanda * : siklus masih berjalan</div></div></div><div class="chart" id="c2"></div></div></div>
  <div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('loop')}</span><div><h3>Rekam siklus per tahun</h3><div class="sub">Klik tahun untuk membuka satu siklus penuh</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahun</th><th>AMI</th><th class="num">Temuan (Mayor)</th><th class="num">Close</th><th class="num">Belum Close</th><th class="num">Tepat waktu</th><th class="num">Berulang</th><th>RTM</th><th class="num">RTL terverifikasi</th></tr></thead><tbody>
    ${TAHUN.map((y, i) => { const s = st[i], A = amiTahun(y), R = rtmTahun(y); return `<tr class="click" data-y="${y}"><td><b>${y}</b></td><td>${A ? `${esc(A.id)}<div class="muted small">${tgl(A.mulai)} – ${tgl(A.selesai)}</div>` : '–'}</td><td class="num"><b>${s.n}</b> (${s.mayor})</td><td class="num">${s.close}</td><td class="num">${s.belum ? `<b style="color:#b42335">${s.belum}</b>` : 0}</td><td class="num">${s.sel ? Math.round(s.tepat / s.sel * 100) + '%' : '–'}</td><td class="num">${s.rep}</td><td>${R ? `${tgl(R.tgl)}<div><span class="st ${R.status === 'Selesai' ? 'ok' : 'near'}">${esc(R.status)}</span></div>` : '–'}</td><td class="num">${s.rtl ? `${s.rtlV}/${s.rtl}` : '–'}</td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="muted small" style="margin-top:8px">Tepat waktu dihitung dari temuan yang sudah selesai dikerjakan terhadap tenggat terakhir (termasuk perpanjangan). Temuan berulang adalah masalah yang sama pada siklus sebelumnya.</div></div>`;
  const th = TAHUN.map(y => { const A = amiTahun(y); return String(y) + (A && A.tahap === 'Selesai' ? '' : '*'); });
  chart(el.querySelector('#c1'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 10, top: 10, bottom: 34, containLabel: true },
    xAxis: { type: 'category', data: th, ...AX }, yAxis: { type: 'value', ...AX, minInterval: 1 },
    series: Object.keys(KAT).map(k => ({ name: k, type: 'bar', stack: 'a', barWidth: 34, data: TAHUN.map(y => temuanTahun(y).filter(t => t.kategori === k).length), itemStyle: { color: KAT[k] } })) });
  chart(el.querySelector('#c2'), { tooltip: { trigger: 'axis', valueFormatter: v => v + '%' }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 14, top: 14, bottom: 34, containLabel: true },
    xAxis: { type: 'category', data: th, ...AX }, yAxis: { type: 'value', max: 100, ...AX, axisLabel: { formatter: '{value}%' } },
    series: [{ name: 'Close', type: 'line', smooth: true, symbolSize: 8, data: st.map(s => s.n ? Math.round(s.close / s.n * 100) : 0), itemStyle: { color: '#10b981' } }, { name: 'Tepat waktu', type: 'line', smooth: true, symbolSize: 8, data: st.map(s => s.sel ? Math.round(s.tepat / s.sel * 100) : 0), itemStyle: { color: '#0ea5e9' } }] });
  el.querySelectorAll('tr[data-y]').forEach(tr => tr.onclick = () => { setTahun(+tr.dataset.y); tab = 'siklus'; ulang(); });
}

/* ---------- risiko ---------- */
function risikoTab(el, ulang) {
  const rd = riskDoc(), daftar = rd.daftar || [], boleh = spmLevel() || can('rtm');
  const sel = (k, d) => daftar.filter(r => r.kemungkinan === k && r.dampak === d);
  const warna = (k, d) => { const v = k * d; return v >= 15 ? 'rgba(240,97,109,.28)' : v >= 8 ? 'rgba(245,165,36,.25)' : 'rgba(16,185,129,.2)'; };
  el.innerHTML = `<div class="grid g-21">
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('alert')}</span><div><h3>Daftar risiko dan mitigasi</h3><div class="sub">Risiko berasal dari temuan Mayor, temuan berulang, dan capaian akreditasi yang tipis</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Risiko</th><th>Unit</th><th class="num">Skor</th><th class="num">Sisa</th><th>Status</th><th>Tren</th></tr></thead><tbody>
    ${daftar.map(r => { const v = skor(r), sv = r.kemungkinanSisa * r.dampakSisa, k = skorKel(v), ks = skorKel(sv); return `<tr class="click" data-r="${r.id}"><td><b>${r.id}</b></td><td style="max-width:360px">${esc(r.risiko)}<div class="muted small">${esc(r.kategori)} · pemilik ${esc(r.pemilik)}</div></td><td>${esc(r.unit)}</td><td class="num"><span class="st ${k[0]}">${v} ${k[1]}</span></td><td class="num"><span class="st ${ks[0]}">${sv} ${ks[1]}</span></td><td>${tg(r.status === 'Terkendali' ? '#10b981' : r.status === 'Ditutup' ? '#64748b' : '#f5a524', r.status)}</td><td class="small" title="${(r.reviu || []).map(x => x.tahun + ': ' + x.skor).join('; ')}" style="white-space:nowrap">${(r.reviu || []).map(x => x.skor).join(' · ')}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Belum ada risiko.</td></tr>'}
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
      <div class="small" style="margin-top:8px"><b>Sumber temuan.</b> ${(r.sumber || []).filter(i => cariTemuan(i)).map(i => `<a href="#" class="tag" style="--c:#0ea5e9" data-t="${i}">${i}</a>`).join(' ') || 'Akreditasi dan kebijakan'}</div>
      <div class="field" style="margin-top:10px"><label>Mitigasi</label><textarea class="inp" id="r-m" rows="3" ${boleh ? '' : 'disabled'}>${esc(r.mitigasi)}</textarea></div>
      <div class="grid g2" style="gap:8px"><div class="field"><label>Status</label><select class="inp" id="r-s" ${boleh ? '' : 'disabled'}>${['Terbuka', 'Dalam mitigasi', 'Terkendali', 'Ditutup'].map(s => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>Skor sisa (kemungkinan × dampak)</label><div style="display:flex;gap:6px"><input class="inp" type="number" min="1" max="5" id="r-k" value="${r.kemungkinanSisa}" ${boleh ? '' : 'disabled'}><input class="inp" type="number" min="1" max="5" id="r-d" value="${r.dampakSisa}" ${boleh ? '' : 'disabled'}></div></div></div>
      ${boleh ? `<button class="btn pri" id="r-simpan" style="margin-top:10px">${icon('check')} Simpan</button>` : '<div class="muted small" style="margin-top:8px">Pengubahan risiko oleh SPM atau pimpinan.</div>'}</div>`, d => {
      d.querySelectorAll('[data-t]').forEach(a => a.onclick = (e) => { e.preventDefault(); closeDrawer(); setTimeout(() => drawerTemuan(a.dataset.t, ulang), 120); });
      const s = d.querySelector('#r-simpan'); if (!s) return;
      s.onclick = async () => {
        const k = +d.querySelector('#r-k').value, dp = +d.querySelector('#r-d').value;
        if (!(k >= 1 && k <= 5 && dp >= 1 && dp <= 5)) return toast('Skor sisa harus 1 sampai 5');
        r.mitigasi = d.querySelector('#r-m').value.trim(); r.status = d.querySelector('#r-s').value; r.kemungkinanSisa = k; r.dampakSisa = dp;
        r.reviu = (r.reviu || []).filter(x => x.tahun !== berjalan()).concat([{ tahun: berjalan(), skor: k * dp }]);
        await save('ppepp', rd, `Risiko ${r.id} diperbarui`); closeDrawer(); toast('Risiko diperbarui'); ulang();
      };
    });
  });
}

/* ---------- ekspor ---------- */
function ekspor() {
  const H = (a) => a.map(v => ({ v, s: 1 }));
  const tm = [H(['ID', 'Tahun', 'Unit', 'Standar', 'Kategori', 'Uraian', 'Akar masalah', 'Tindakan', 'PIC', 'Tgl temuan', 'Tenggat', 'Tgl selesai', 'Ketepatan', 'Status', 'Berulang dari', 'Tanggapan auditee', 'Tanggapan auditor']),
    ...semuaTemuan().map(t => [t.id, t.tahun, t.unit, t.standar, t.kategori, t.uraian, t.akar, t.tindakan, t.pic, t.tglTemuan, t.tenggat, t.tglSelesai || '', ketepatan(t).teks, t.status, t.berulangDari || '', t.tanggapanAuditee, t.tanggapanAuditor])];
  const rt = [H(['RTL', 'Tahun', 'Aksi', 'PIC', 'Tenggat', 'Tgl selesai', 'Status', 'Temuan terkait']), ...TAHUN.flatMap(y => rtlRtmTahun(y).map(r => [r.id, y, r.uraian, r.pic, r.tenggat, r.tglSelesai || '', r.status, r.temuanTerkait.join(', ')]))];
  const rk = [H(['ID', 'Risiko', 'Kategori', 'Unit', 'Kemungkinan', 'Dampak', 'Skor', 'Mitigasi', 'Pemilik', 'Status', 'Skor sisa', 'Sumber temuan']), ...(riskDoc().daftar || []).map(r => [r.id, r.risiko, r.kategori, r.unit, r.kemungkinan, r.dampak, skor(r), r.mitigasi, r.pemilik, r.status, r.kemungkinanSisa * r.dampakSisa, (r.sumber || []).join(', ')])];
  unduh(`Siklus_PPEPP_${today()}.xlsx`, xlsx([{ nama: 'Temuan AMI', lebar: [9, 7, 8, 26, 12, 60, 50, 50, 24, 12, 12, 12, 20, 18, 12, 50, 50], baris: tm }, { nama: 'RTL dari RTM', lebar: [10, 7, 60, 24, 12, 12, 14, 30], baris: rt }, { nama: 'Risiko', lebar: [7, 60, 16, 14, 11, 8, 7, 60, 20, 16, 9, 30], baris: rk }]), MIME_X);
}
