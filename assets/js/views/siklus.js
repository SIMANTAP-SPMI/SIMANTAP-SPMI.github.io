import { S, ctx, icon, esc, can, save, toast, openDrawer, closeDrawer, eAuditee, spmLevel } from '../app.js';
import { chart, AX, countUp, gaugeOption } from '../charts.js';
import { UNITS, UNIT, AUDITORS } from '../seed.js';
import { BULAN } from '../scoring.js';
import { active, summary, indStat, stBadge, fmtV, targetTxt } from './common.js';
import { detail } from './indikator.js';
import { siklusTab, dalamLingkup } from './amisiklus.js';
import { cekAmiSelesai, ubahJadwalLive } from './arsip.js';
import { temuanTahun, tahunBar, bindTahun, tahunAktif, berjalan, temuanTabel, drawerTemuan, drawerRtlRtm, kartuTL, amiTahun, rtmTahun, statTahun, tulis, bolehAuditee, bolehAuditor, ketBadge, tg, tgl, beritaAcara, notulen, KAT, RST, today as hariIni } from './siklus-core.js';

const TEMUAN = { 'Terlampaui': '#0ea5e9', 'Sesuai': '#10b981', 'Observasi': '#f5a524', 'KTS Minor': '#fb923c', 'KTS Mayor': '#f0616d' };
const audName = id => (AUDITORS.find(a => a.id === id) || {}).nama || id;

/* ---------------- AMI (tampilan operasional tahun berjalan) ---------------- */
function amiLive(el, ulang) {
  const inds = active().filter(i => i.ami);
  const cnt = Object.fromEntries(Object.keys(TEMUAN).map(t => [t, inds.filter(i => i.ami.temuan === t).length]));
  const me = AUDITORS.find(a => a.id === ctx.auditor);
  const myAudits = ctx.role === 'auditor' ? S.ami.filter(a => a.auditor.includes(ctx.auditor)) : [];
  el.innerHTML = `
  <div class="grid g4">${Object.entries(cnt).map(([t, n]) => `<div class="card kpi tilt" style="--c:${TEMUAN[t]}"><div class="lbl"><span class="dot" style="--c:${TEMUAN[t]}"></span>${t}</div><div class="val" data-n="${n}">0</div><div class="meta">temuan AMI ${S.settings.tahun}</div></div>`).join('').replace(/^/, '')}</div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('audit')}</span><div><h3>Komposisi temuan</h3><div class="sub">Seluruh indikator yang diaudit</div></div></div><div class="chart" id="pie"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('dash')}</span><div><h3>Temuan per auditee</h3><div class="sub">Siklus AMI berjalan</div></div></div><div class="chart" id="bar"></div></div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('calendar')}</span><div><h3>Jadwal AMI</h3><div class="sub">Auditor tidak ditugaskan ke unit asalnya</div></div><div class="sp"></div>${spmLevel() ? `<button class="btn pri" id="addAmi">${icon('plus')} Jadwal baru</button>` : ''}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Auditee</th><th>Auditor</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>
    ${S.ami.map(a => `<tr><td><b>${a.id}</b></td><td><b>${a.auditee}</b><div class="muted small">${esc(UNIT[a.auditee].nama)}</div></td><td>${a.auditor.map(audName).join(', ')}</td><td>${a.tgl}</td><td><span class="st ${a.status === 'Selesai' ? 'ok' : 'near'}">${a.status}</span></td>
      <td>${spmLevel() ? `${a.status !== 'Selesai' ? `<button class="btn sm" data-done="${a.id}">${icon('check')} Tandai selesai</button> ` : ''}<button class="btn sm ghost" data-ubah="${a.id}">${icon('edit')} Ubah</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  ${ctx.role === 'auditor' ? `<div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('user')}</span><div><h3>Penugasan ${esc(me.nama)}</h3><div class="sub">Unit asal: ${me.home} (tidak dapat diaudit oleh Anda)</div></div></div>
    ${myAudits.length ? myAudits.map(a => `<h4 style="margin:10px 0 6px">${a.auditee} · ${a.tgl}</h4><div class="tbl-wrap"><table class="tbl"><tbody>${active().filter(i => i.unit === a.auditee && dalamLingkup(i)).map(i => `<tr class="click" data-id="${i.id}"><td>${esc(i.teks)}</td><td class="num">${targetTxt(i)}</td><td class="num">${fmtV(i, indStat(i).v)}</td><td>${i.ami ? `<span class="st" style="background:${TEMUAN[i.ami.temuan]}22">${i.ami.temuan}</span>` : '<span class="st na">belum</span>'}</td></tr>`).join('')}</tbody></table></div>`).join('') : '<div class="muted">Tidak ada penugasan.</div>'}</div>` : ''}`;
  el.querySelectorAll('.kpi .val').forEach(v => countUp(v, +v.dataset.n));
  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => detail(tr.dataset.id, () => ulang()));
  el.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => { const a = S.ami.find(x => x.id === b.dataset.done); a.status = 'Selesai'; await save('ami', a, `AMI ${a.id} selesai`); toast('Jadwal AMI ditandai selesai'); await cekAmiSelesai(a); ulang(); });
  el.querySelectorAll('[data-ubah]').forEach(b => b.onclick = () => ubahJadwalLive(S.ami.find(x => x.id === b.dataset.ubah), ulang, (a, aksi) => save('ami', a, aksi)));
  const add = el.querySelector('#addAmi');
  if (add) add.onclick = () => openDrawer(`<div class="card-h"><h3>Jadwal AMI baru</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="grid g2" style="gap:12px"><div class="field"><label>Auditee</label><select class="inp" id="aU">${UNITS.map(u => `<option>${u.id}</option>`).join('')}</select></div><div class="field"><label>Tanggal</label><input class="inp" type="date" id="aT" value="${S.settings.tahun + 1}-02-10"></div>
    <div class="field span2"><label>Auditor (unit asal berbeda)</label><div id="aA" style="display:flex;gap:10px;flex-wrap:wrap">${AUDITORS.map(a => `<label class="small"><input type="checkbox" value="${a.id}" data-home="${a.home}"> ${a.nama} (${a.home})</label>`).join('')}</div></div></div>
    <button class="btn pri" id="aS" style="margin-top:12px">${icon('check')} Simpan</button></div>`, d => {
    d.querySelector('#aS').onclick = async () => {
      const u = d.querySelector('#aU').value; const sel = Array.from(d.querySelectorAll('#aA input:checked'));
      if (!sel.length) return toast('Pilih minimal satu auditor');
      if (sel.some(c => c.dataset.home === u)) return toast('Auditor tidak boleh mengaudit unit asalnya');
      await save('ami', { id: 'AMI-' + String(S.settings.tahun).slice(2) + '-' + String(S.ami.length + 1).padStart(2, '0'), auditee: u, auditor: sel.map(c => c.value), tgl: d.querySelector('#aT').value, status: 'Terjadwal' }, 'Menjadwalkan AMI ' + u);
      closeDrawer(); toast('Jadwal AMI tersimpan'); ulang();
    };
  });
  chart(el.querySelector('#pie'), { tooltip: { formatter: '{b}: {c} ({d}%)' }, series: [{ type: 'pie', roseType: 'radius', radius: ['22%', '80%'], itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 3 }, label: { fontSize: 11, fontWeight: 700 }, data: Object.entries(cnt).filter(([, n]) => n).map(([t, n]) => ({ name: t, value: n, itemStyle: { color: TEMUAN[t] } })) }] });
  const aud = [...new Set(inds.map(i => i.unit))];
  chart(el.querySelector('#bar'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 10, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: aud, ...AX }, yAxis: { type: 'value', ...AX },
    series: Object.keys(TEMUAN).map(t => ({ name: t, type: 'bar', stack: 'a', barWidth: 26, data: aud.map(u => inds.filter(i => i.unit === u && i.ami.temuan === t).length), itemStyle: { color: TEMUAN[t] } }))
  });
}

/* Menu AMI per tahun: tahun berjalan memakai tampilan indikator (data operasional), tahun arsip memakai data siklus; tab Temuan sama untuk semua tahun. */
let amiTab = 'siklus';
export function amiView(el) {
  const y = tahunAktif(), live = y === berjalan(), ulang = () => amiView(el), A = amiTahun(y);
  el.innerHTML = `${tahunBar()}
  <div class="card" style="padding:10px 14px;margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    ${[['siklus', 'Siklus dan timeline', 'calendar'], ['ringkas', 'Ringkasan dan jadwal', 'pulse'], ['temuan', 'Temuan dan tanggapan', 'audit']].map(([k, t, ic]) => `<button class="btn ${amiTab === k ? 'pri' : 'ghost'}" data-tab="${k}">${icon(ic)} ${t}</button>`).join('')}
    <span style="flex:1"></span>${A && A.ba ? `<button class="btn sm" id="ba">${icon('download')} Berita Acara AMI ${y}</button>` : ''}</div>
  ${A && A.ilustratif ? '<div class="card" style="margin-bottom:14px;background:rgba(245,165,36,.1);border:1px solid rgba(245,165,36,.4)"><div class="small"><b>Data contoh (ilustratif).</b> Siklus arsip 2022 sampai 2025 disusun sebagai contoh alur, bukan rekam jejak resmi.</div></div>' : ''}
  <div id="ami-isi"></div>`;
  bindTahun(el, ulang);
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { amiTab = b.dataset.tab; ulang(); });
  const ba = el.querySelector('#ba'); if (ba) ba.onclick = () => beritaAcara(y);
  const isi = el.querySelector('#ami-isi');
  if (amiTab === 'siklus') siklusTab(isi, ulang);
  else if (amiTab === 'temuan') temuanTabel(isi, y, ulang);
  else if (live) amiLive(isi, ulang);
  else if (A) amiArsip(isi, y, A, ulang);
  else isi.innerHTML = '<div class="card empty">Belum ada data AMI untuk tahun ini.</div>';
}
function amiArsip(el, y, A) {
  const st = statTahun(y), T = [['KTS Mayor', st.mayor], ['KTS Minor', st.minor], ['Observasi', st.obs]];
  const units = [...new Set(A.baris.map(b => b.auditee))];
  const per = (u, k) => temuanTahun(y).filter(t => t.unit === u && t.kategori === k).length;
  el.innerHTML = `<div class="grid g4">${T.map(([k, n]) => `<div class="card kpi tilt" style="--c:${KAT[k]}"><div class="lbl"><span class="dot" style="--c:${KAT[k]}"></span>${k}</div><div class="val">${n}</div></div>`).join('')}
    <div class="card kpi tilt" style="--c:#10b981"><div class="lbl"><span class="dot" style="--c:#10b981"></span>Sudah Close</div><div class="val">${st.close}<small>/${st.n}</small></div></div></div>
  <div class="grid g2" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('audit')}</span><div><h3>Komposisi temuan</h3><div class="sub">AMI ${y}</div></div></div><div class="chart" id="pie"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('dash')}</span><div><h3>Temuan per auditee</h3><div class="sub">Siklus ${y}</div></div></div><div class="chart" id="bar"></div></div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('calendar')}</span><div><h3>Jadwal dan tim AMI ${y}</h3><div class="sub">${esc(A.id)} · ${tgl(A.mulai)} – ${tgl(A.selesai)} · ${esc(A.tahap)}${A.ba ? ` · BA ${esc(A.ba.no)}, ${tgl(A.ba.tgl)}` : ''}</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Auditee</th><th>Auditor</th><th>Tanggal</th><th>Status</th><th class="num">Temuan</th></tr></thead><tbody>
    ${A.baris.map(b => `<tr><td><b>${b.auditee}</b><div class="muted small">${esc((UNIT[b.auditee] || {}).nama || '')}</div></td><td>${b.auditor.map(audName).join(', ')}</td><td>${tgl(b.tgl)}</td><td><span class="st ok">${esc(b.status)}</span></td><td class="num">${temuanTahun(y).filter(t => t.unit === b.auditee).length}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  chart(el.querySelector('#pie'), { tooltip: { formatter: '{b}: {c} ({d}%)' }, series: [{ type: 'pie', roseType: 'radius', radius: ['22%', '80%'], itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 3 }, label: { fontSize: 11, fontWeight: 700 }, data: T.filter(([, n]) => n).map(([k, n]) => ({ name: k, value: n, itemStyle: { color: KAT[k] } })) }] });
  chart(el.querySelector('#bar'), { tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 10, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: units, ...AX }, yAxis: { type: 'value', ...AX, minInterval: 1 },
    series: Object.keys(KAT).map(k => ({ name: k, type: 'bar', stack: 'a', barWidth: 26, data: units.map(u => per(u, k)), itemStyle: { color: KAT[k] } })) });
}

/* ---------------- RTL ---------------- */
const KOL = [['Terbuka', '#f0616d'], ['Proses', '#f5a524'], ['Selesai', '#0ea5e9'], ['Terverifikasi', '#10b981']];
let semuaV = false;
export function rtlView(el) {
  const y = tahunAktif(), ulang = () => rtlView(el);
  const list = kartuTL(y).filter(r => !eAuditee() || !r.unit || r.unit === ctx.unit);
  const ver = list.filter(r => r.kol === 'Terverifikasi').length, aE = (r) => bolehAuditee(r), aA = (r) => bolehAuditor(r);
  const kartu = (r) => { const lw = r.kol !== 'Terverifikasi' && r.tenggat < hariIni(); const rtm = r.kind === 'rtm';
    return `<div class="card tilt" data-open="${r.id}" style="padding:12px;box-shadow:var(--shadow);cursor:pointer">
      <div style="display:flex;gap:6px;align-items:center"><b class="small">${r.id}</b>${rtm ? tg('#f472b6', 'RTL hasil RTM') : tg(KAT[r.kategori] || '#94a3b8', r.kategori)}<span style="flex:1"></span><b class="small">${rtm ? '' : r.unit}</b></div>
      <div class="small" style="margin:6px 0">${esc(r.uraian.length > 150 ? r.uraian.slice(0, 150) + '…' : r.uraian)}</div>
      ${rtm ? '' : `<div class="muted small">${esc(r.tindakan.length > 110 ? r.tindakan.slice(0, 110) + '…' : r.tindakan)}</div>`}
      <div class="small" style="margin-top:6px;color:${lw ? '#f0616d' : 'var(--muted)'}">${icon('calendar')} ${tgl(r.tenggat)}${lw ? ' · lewat tenggat' : ''} · ${esc(r.pic)}</div><div style="margin-top:4px">${ketBadge(r)}</div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap" data-stop>
        ${!rtm && aE(r) && r.status === 'Open' ? `<button class="btn sm" data-act="mulai" data-id="${r.id}">Mulai</button>` : ''}
        ${!rtm && aE(r) && ['Open', 'Proses', 'Tidak efektif'].includes(r.status) ? `<button class="btn sm" data-act="lapor" data-id="${r.id}">${icon('upload')} Lapor selesai</button>` : ''}
        ${!rtm && aA(r) && r.status === 'Menunggu verifikasi' ? `<button class="btn sm pri" data-act="ver" data-id="${r.id}">${icon('check')} Verifikasi</button>` : ''}
        <button class="btn sm ghost" data-act="rinci" data-id="${r.id}">${icon('eye')} Rincian</button></div></div>`; };
  el.innerHTML = `${tahunBar()}
  <div class="grid g-12">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('check')}</span><div><h3>Efektivitas tindak lanjut ${y}</h3><div class="sub">% terverifikasi (aspek SP9 ≥ 80%)</div></div></div><div class="chart" id="g"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('loop')}</span><div><h3>Status per unit</h3><div class="sub">${list.length} tindak lanjut dari AMI dan RTM</div></div></div><div class="chart" id="b"></div></div>
  </div>
  <div class="grid g4" style="margin-top:18px">
    ${KOL.map(([k, c]) => { const isi = list.filter(r => r.kol === k), potong = k === 'Terverifikasi' && !semuaV && isi.length > 3; return `<div class="card" style="padding:12px;background:color-mix(in srgb, ${c} 6%, rgba(255,255,255,.8))"><div class="card-h" style="margin-bottom:8px"><span class="dot" style="--c:${c}"></span><h3>${k}</h3><div class="sp"></div><span class="tag" style="--c:${c}">${isi.length}</span></div>
      <div class="grid" style="gap:10px;max-height:620px;overflow:auto;padding:2px">${(potong ? isi.slice(0, 3) : isi).map(kartu).join('') || '<div class="muted small">—</div>'}
      ${potong ? `<button class="btn sm ghost" id="semua-v">Tampilkan semua (${isi.length})</button>` : (k === 'Terverifikasi' && semuaV && isi.length > 3 ? '<button class="btn sm ghost" id="semua-v">Ringkas</button>' : '')}</div></div>`; }).join('')}
  </div>`;
  bindTahun(el, ulang);
  const sv = el.querySelector('#semua-v'); if (sv) sv.onclick = () => { semuaV = !semuaV; ulang(); };
  const cari = (id) => list.find(r => r.id === id);
  const buka = (r) => r.kind === 'rtm' ? drawerRtlRtm(r.id, y, ulang) : drawerTemuan(r.id, ulang);
  el.querySelectorAll('[data-open]').forEach(c => c.onclick = () => buka(cari(c.dataset.open)));
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation(); const r = cari(b.dataset.id), a = b.dataset.act;
    if (a === 'rinci') return buka(r);
    const [patch, aksi] = a === 'mulai' ? [{ status: 'Proses' }, 'Perbaikan dimulai'] : a === 'lapor' ? [{ status: 'Menunggu verifikasi', tglSelesai: hariIni() }, 'Perbaikan dilaporkan selesai'] : [{ status: 'Close' }, 'Diverifikasi auditor: Close'];
    await tulis(r, patch, aksi); toast(`${r.id}: ${aksi}`); ulang();
  });
  chart(el.querySelector('#g'), gaugeOption(list.length ? Math.round(ver / list.length * 100) : 0, 100, 'Terverifikasi (%)', '#10b981'));
  const units = [...new Set(list.map(r => r.unit || 'RTM'))];
  chart(el.querySelector('#b'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 10, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: units, ...AX }, yAxis: { type: 'value', ...AX, minInterval: 1 },
    series: KOL.map(([k, c]) => ({ name: k, type: 'bar', stack: 'a', barWidth: 26, data: units.map(u => list.filter(r => (r.unit || 'RTM') === u && r.kol === k).length), itemStyle: { color: c } }))
  });
}

/* ---------------- RTM ---------------- */
export function rtmView(el) {
  const y = tahunAktif(), live = y === berjalan(), ulang = () => rtmView(el), R = rtmTahun(y), st = statTahun(y);
  const m = S.settings.bulan, inds = active(), sum = summary(inds);
  const usulan = inds.filter(i => i.peningkatan && i.peningkatan.status === 'Tingkatkan');
  const temuan = inds.filter(i => i.ami && ['KTS Minor', 'KTS Mayor'].includes(i.ami.temuan)).length;
  const rtlOpen = S.rtl.filter(r => r.status !== 'Terverifikasi').length;
  const bahan = live ? `
        <tr><td><b>1. Capaian IKU/IKT & kebijakan</b></td><td>${Math.round(sum.pct)}% indikator tercapai (${sum.ok}/${sum.n}); indeks capaian ${Math.round(sum.idx)}%</td></tr>
        <tr><td><b>2. Hasil AMI (masukan RTM)</b></td><td>${inds.filter(i => i.ami).length} dari ${inds.filter(i => dalamLingkup(i)).length} indikator dalam lingkup diaudit; ${temuan} KTS (minor/mayor)</td></tr>
        <tr><td><b>3. Tindakan koreksi temuan AMI</b></td><td>${S.rtl.length} tindakan koreksi unit; ${rtlOpen} belum terverifikasi. RTM memutuskan RTL tingkat institusi dari masukan ini.</td></tr>
        <tr><td><b>4. Umpan balik pemangku kepentingan</b></td><td>Indeks kepuasan pengguna lulusan & mahasiswa (lihat katalog S01/S13)</td></tr>
        <tr><td><b>5. Usulan peningkatan standar</b></td><td>${usulan.length} indikator melampaui target ≥ 110% → usul "Tingkatkan"</td></tr>
        <tr><td><b>6. Kesiapan akreditasi</b></td><td>Simulasi LAM 2025 & IABEE per prodi (menu Akreditasi)</td></tr>` : `
        <tr><td><b>1. Hasil AMI ${y}</b></td><td>${st.n} temuan: ${st.mayor} KTS Mayor, ${st.minor} KTS Minor, ${st.obs} Observasi; ${st.rep} berulang dari siklus sebelumnya</td></tr>
        <tr><td><b>2. Status perbaikan</b></td><td>${st.close} dari ${st.n} temuan Close; ${st.belum} belum Close; ${st.sel ? Math.round(st.tepat / st.sel * 100) : 0}% selesai tepat waktu atau lebih cepat</td></tr>
        <tr><td><b>3. Tindak lanjut hasil RTM</b></td><td>${st.rtl ? `${st.rtlV} dari ${st.rtl} RTL terverifikasi` : 'Belum ada RTL'}</td></tr>`;
  el.innerHTML = `${tahunBar()}
  ${R && R.ilustratif ? '<div class="card" style="margin-bottom:14px;background:rgba(245,165,36,.1);border:1px solid rgba(245,165,36,.4)"><div class="small"><b>Data contoh (ilustratif).</b> RTM dan RTL arsip 2022 sampai 2025 disusun sebagai contoh alur, bukan rekam jejak resmi.</div></div>' : ''}
  <div class="grid ${live ? 'g-21' : ''}">
    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:#f472b6">${icon('meet')}</span><div><h3>${R ? esc(R.judul) : 'RTM ' + y}</h3><div class="sub">${R ? `${esc(R.id)} · ${tgl(R.tgl)} · ` : ''}${R ? `<span class="st ${R.status === 'Selesai' ? 'ok' : 'near'}">${esc(R.status)}</span>` : 'Belum ada data'}</div></div><div class="sp"></div>
        ${R ? `<button class="btn sm" id="nt">${icon('download')} Notulen RTM</button>` : ''}</div>
      ${R && R.peserta ? `<div class="small muted" style="margin-bottom:8px">Peserta: ${esc(R.peserta)}</div>` : ''}
      ${R && R.keputusan.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Keputusan RTM</th><th>RTL</th><th>PIC</th><th>Tenggat</th><th>Status</th></tr></thead><tbody>
        ${R.keputusan.map(k => `<tr><td>${k.no}</td><td>${esc(k.teks)}</td><td>${k.rtl ? `<a href="#" data-rtl="${k.rtl.id}"><b>${k.rtl.id}</b></a>` : '–'}</td><td>${k.rtl ? esc(k.rtl.pic) : ''}</td><td>${k.rtl ? tgl(k.rtl.tenggat) : ''}</td><td>${k.rtl ? tg(RST[k.rtl.status], k.rtl.status) : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted small">Keputusan RTM belum ada.</div>'}
      ${R && R.src === 'legacy' && can('rtm') && R.status !== 'Selesai' ? `<button class="btn sm pri" id="tutup" style="margin-top:10px">${icon('check')} Sahkan & tutup RTM</button>` : ''}
      <h4 style="margin:16px 0 8px">${live ? `Bahan RTM otomatis · disusun dari data PPEPP per ${BULAN[m]} ${S.settings.tahun}` : `Bahan tinjauan siklus ${y}`}</h4>
      <div class="tbl-wrap"><table class="tbl"><tbody>${bahan}</tbody></table></div>
    </div>
    ${live ? `<div class="card" style="min-width:0">
    <div class="card-h"><span class="ico-badge" style="--c:#f472b6">${icon('spark')}</span><div><h3>Usulan peningkatan standar</h3><div class="sub">${can('rtm') ? 'Pimpinan mengesahkan usulan dalam RTM' : 'Pengesahan oleh Pimpinan (pilih peran Pimpinan)'}</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indikator</th><th>Unit</th><th>Status</th><th>RTM</th></tr></thead><tbody>
    ${usulan.map(i => `<tr><td>${esc(i.teks)}<div class="muted small">${i.kode} · target ${targetTxt(i)} · capaian <b>${fmtV(i, indStat(i).v)}</b></div></td><td><b>${i.unit}</b></td><td>${stBadge(indStat(i).k)}</td>
      <td>${i.peningkatan.rtm ? '<span class="st ok">disahkan</span>' : can('rtm') ? `<button class="btn sm" data-sah="${i.id}">${icon('check')} Sahkan</button>` : '<span class="st na">menunggu</span>'}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">Belum ada usulan.</td></tr>'}
    </tbody></table></div></div>` : ''}
  </div>`;
  bindTahun(el, ulang);
  const nt = el.querySelector('#nt'); if (nt) nt.onclick = () => notulen(y);
  el.querySelectorAll('[data-rtl]').forEach(a => a.onclick = (e) => { e.preventDefault(); drawerRtlRtm(a.dataset.rtl, y, ulang); });
  el.querySelectorAll('[data-sah]').forEach(b => b.onclick = async () => { const i = S.indikator.find(x => x.id === b.dataset.sah); i.peningkatan.rtm = true; await save('indikator', i, `RTM mengesahkan peningkatan ${i.kode}`); toast('Peningkatan disahkan'); ulang(); });
  const tt = el.querySelector('#tutup'); if (tt) tt.onclick = async () => {
    const r = R.raw; r.status = 'Selesai'; r.tgl = new Date().toISOString().slice(0, 10);
    r.keputusan = [`Mengesahkan ${usulan.filter(i => i.peningkatan.rtm).length} peningkatan standar`, `Menindaklanjuti ${rtlOpen} tindakan koreksi terbuka dengan tenggat triwulan I`, 'Menetapkan target IKU/IKT tahun berikut selaras RSB, PK BLU, dan Kokin'];
    await save('rtm', r, 'RTM ' + r.judul + ' disahkan'); toast('RTM disahkan'); ulang();
  };
}
