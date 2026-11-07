import { S, icon, esc, toast } from '../app.js';
import { UNITS, UNIT, AUDITORS } from '../seed.js';
import { BULAN, KELAS, fmt } from '../scoring.js';
import { active, summary, indStat, fmtV, targetTxt, isAkr } from './common.js';

const R = { jenis: 'capaian', unit: 'ALL', ami: null, rtm: null };
const JENIS = [['capaian', 'Capaian Indikator'], ['ami', 'Hasil AMI'], ['rtl', 'Tindak Lanjut (RTL)'], ['rtm', 'Tinjauan Manajemen (RTM)']];
const audName = id => (AUDITORS.find(a => a.id === id) || {}).nama || id;

function kop(judul, meta) {
  return `<div class="kop"><img src="assets/img/logo-esdm.png" alt="ESDM"><div class="t"><b>KEMENTERIAN ENERGI DAN SUMBER DAYA MINERAL</b><b>POLITEKNIK ENERGI DAN MINERAL AKAMIGAS</b><span>Satuan Penjaminan Mutu · SIMANTAP 2.0</span></div><img src="assets/img/logo-pem-akamigas.png" alt="PEM Akamigas"></div>
  <h2>${judul}</h2><div class="meta">${meta}</div>`;
}
const ttd = (a, b) => `<div class="ttd"><div><span>${a}</span><span>( ............................................ )</span></div><div><span>${b}</span><span>( ............................................ )</span></div></div>`;

export default function laporan(el) {
  const m = S.settings.bulan, per = `${BULAN[m]} ${S.settings.tahun}`;
  const amiDone = S.ami.filter(a => a.status === 'Selesai');
  if (!R.ami && amiDone.length) R.ami = amiDone[0].id;
  if (!R.rtm && S.rtm.length) R.rtm = S.rtm[0].id;
  let body = '', rows = [];

  if (R.jenis === 'capaian') {
    const inds = active().filter(i => R.unit === 'ALL' || i.unit === R.unit);
    const s = summary(inds);
    rows = [['No', 'Kode', 'Indikator', 'Unit', 'Jenis', 'Target', 'Satuan', `Capaian ${BULAN[m]}`, 'Rasio (%)', 'Status', 'Korelasi']];
    inds.forEach((i, n) => { const st = indStat(i); rows.push([n + 1, i.kode, i.teks, i.unit, i.jenis, (i.arah === '<=' ? '≤ ' : '≥ ') + i.target, i.satuan, st.v ?? '', st.r == null ? '' : Math.round(st.r * 100), KELAS[st.k].nama, isAkr(i) ? 'Akreditasi' : 'Audit internal']); });
    body = kop('LAPORAN CAPAIAN INDIKATOR KINERJA', `Periode ${per} · ${R.unit === 'ALL' ? 'Seluruh unit' : esc(UNIT[R.unit].nama)}`) + `
      <p class="small">Dari <b>${s.n}</b> indikator: <b>${s.ok}</b> tercapai, <b>${s.near}</b> hampir tercapai, <b>${s.bad}</b> belum tercapai, dan <b>${s.na}</b> belum diisi. Indeks capaian ${fmt(s.idx, 1)}%.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>${rows[0].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${inds.map((i, n) => { const st = indStat(i); return `<tr><td>${n + 1}</td><td>${i.kode}</td><td>${esc(i.teks)}</td><td>${i.unit}</td><td>${i.jenis}</td><td class="num" colspan="2">${targetTxt(i)}</td><td class="num">${fmtV(i, st.v)}</td><td class="num">${st.r == null ? '–' : Math.round(st.r * 100)}</td><td>${KELAS[st.k].nama}</td><td>${isAkr(i) ? 'Akreditasi' : 'Audit internal'}</td></tr>`; }).join('')}
      </tbody></table></div>` + ttd('Mengetahui,<br>Kepala Satuan Penjaminan Mutu', `Cepu, ............ ${S.settings.tahun}<br>Pimpinan Unit`);
  }

  if (R.jenis === 'ami') {
    const a = S.ami.find(x => x.id === R.ami);
    if (!a) body = '<div class="empty">Belum ada AMI yang selesai.</div>';
    else {
      const inds = active().filter(i => i.unit === a.auditee && i.ami);
      const cnt = {}; inds.forEach(i => { cnt[i.ami.temuan] = (cnt[i.ami.temuan] || 0) + 1; });
      rows = [['No', 'Kode', 'Indikator', 'Target', 'Satuan', 'Hasil ED', 'Skor ED', 'Temuan', 'Skor akhir', 'Uraian']];
      inds.forEach((i, n) => rows.push([n + 1, i.kode, i.teks, i.target, i.satuan, i.ed ? i.ed.hasil : '', i.ed ? i.ed.skala : '', i.ami.temuan, i.ami.akhir, i.ami.uraian]));
      body = kop('LAPORAN HASIL AUDIT MUTU INTERNAL', `${a.id} · Auditee: ${esc(UNIT[a.auditee].nama)} · Tanggal ${a.tgl}`) + `
        <table class="tbl" style="max-width:520px;margin:0 auto 12px"><tbody><tr><td>Auditee</td><td><b>${esc(UNIT[a.auditee].nama)}</b></td></tr><tr><td>Auditor</td><td>${a.auditor.map(audName).join(', ')}</td></tr><tr><td>Ringkasan temuan</td><td>${Object.entries(cnt).map(([k, v]) => `${k}: <b>${v}</b>`).join(' · ') || '–'}</td></tr></tbody></table>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>No</th><th>Kode</th><th>Indikator</th><th class="num">Target</th><th class="num">Hasil ED</th><th>Skor ED</th><th>Temuan</th><th>Skor akhir</th><th>Uraian</th></tr></thead><tbody>
        ${inds.map((i, n) => `<tr><td>${n + 1}</td><td>${i.kode}</td><td>${esc(i.teks)}</td><td class="num">${targetTxt(i)}</td><td class="num">${i.ed ? fmtV(i, i.ed.hasil) : '–'}</td><td>${i.ed ? i.ed.skala : '–'}</td><td><b>${i.ami.temuan}</b></td><td>${i.ami.akhir}</td><td class="small">${esc(i.ami.uraian)}</td></tr>`).join('')}
        </tbody></table></div>
        <h4>Permintaan tindakan koreksi</h4>
        <ul class="small">${S.rtl.filter(r => r.unit === a.auditee).map(r => `<li><b>${r.id}</b> (${r.temuan}) — ${esc(r.tindakan)} · PIC ${esc(r.pic)} · tenggat ${r.tenggat} · <i>${r.status}</i></li>`).join('') || '<li>Tidak ada.</li>'}</ul>` + ttd('Auditor', 'Auditee');
    }
  }

  if (R.jenis === 'rtl') {
    const list = S.rtl.filter(r => R.unit === 'ALL' || r.unit === R.unit);
    const ver = list.filter(r => r.status === 'Terverifikasi').length;
    rows = [['ID', 'Unit', 'Kode indikator', 'Indikator', 'Sumber', 'Temuan', 'Tindakan', 'PIC', 'Tenggat', 'Status']];
    list.forEach(r => { const i = S.indikator.find(x => x.id === r.ind) || {}; rows.push([r.id, r.unit, i.kode || '', i.teks || '', r.sumberRTL, r.temuan, r.tindakan, r.pic, r.tenggat, r.status]); });
    body = kop('LAPORAN RENCANA TINDAK LANJUT', `Per ${per} · ${R.unit === 'ALL' ? 'Seluruh unit' : esc(UNIT[R.unit].nama)}`) + `
      <p class="small">${list.length} RTL; <b>${ver}</b> terverifikasi (${list.length ? Math.round(ver / list.length * 100) : 0}%), ${list.filter(r => r.status === 'Selesai').length} menunggu verifikasi, ${list.filter(r => r.status === 'Proses').length} dalam proses, ${list.filter(r => r.status === 'Terbuka').length} terbuka.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr>${['ID', 'Unit', 'Indikator', 'Temuan', 'Tindakan', 'PIC', 'Tenggat', 'Status'].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${list.map(r => { const i = S.indikator.find(x => x.id === r.ind) || {}; return `<tr><td>${r.id}</td><td>${r.unit}</td><td class="small">${esc(i.teks || '')}</td><td>${r.temuan}</td><td class="small">${esc(r.tindakan)}</td><td>${esc(r.pic)}</td><td>${r.tenggat}</td><td><b>${r.status}</b></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">Tidak ada RTL.</td></tr>'}
      </tbody></table></div>` + ttd('Mengetahui,<br>Kepala Satuan Penjaminan Mutu', 'Auditor/Verifikator');
  }

  if (R.jenis === 'rtm') {
    const r = S.rtm.find(x => x.id === R.rtm);
    const inds = active(); const s = summary(inds);
    const usulan = inds.filter(i => i.peningkatan && i.peningkatan.status === 'Tingkatkan');
    rows = [['Bagian', 'Isi'], ['RTM', r.judul], ['Tanggal', r.tgl], ['Status', r.status], ['Capaian', `${Math.round(s.pct)}% tercapai (${s.ok}/${s.n})`], ['AMI', `${inds.filter(i => i.ami).length} indikator diaudit`], ['RTL', `${S.rtl.length} RTL; ${S.rtl.filter(x => x.status !== 'Terverifikasi').length} belum terverifikasi`], ...r.keputusan.map((k, n) => ['Keputusan ' + (n + 1), k]), ...usulan.map(i => ['Usulan peningkatan', `${i.kode} ${i.teks} (${i.peningkatan.rtm ? 'disahkan' : 'menunggu'})`])];
    body = kop('NOTULEN & LAPORAN RAPAT TINJAUAN MANAJEMEN', `${esc(r.judul)} · ${r.tgl} · Pimpinan rapat: ${esc(r.pimpinan)} · Status: ${r.status}`) + `
      <h4>A. Masukan tinjauan</h4>
      <table class="tbl"><tbody>
        <tr><td>1. Capaian IKU/IKT & kebijakan (RSB, BLU, Kokin)</td><td>${Math.round(s.pct)}% indikator tercapai (${s.ok}/${s.n}); indeks capaian ${fmt(s.idx, 1)}%</td></tr>
        <tr><td>2. Hasil AMI</td><td>${inds.filter(i => i.ami).length} indikator diaudit; ${inds.filter(i => i.ami && ['KTS Minor', 'KTS Mayor'].includes(i.ami.temuan)).length} KTS</td></tr>
        <tr><td>3. Status tindak lanjut</td><td>${S.rtl.length} RTL; ${S.rtl.filter(x => x.status === 'Terverifikasi').length} terverifikasi</td></tr>
        <tr><td>4. Kesiapan akreditasi</td><td>Lihat simulasi LAM Teknik 2025 & IABEE per prodi</td></tr>
      </tbody></table>
      <h4>B. Keputusan</h4><ol class="small">${r.keputusan.map(k => `<li>${esc(k)}</li>`).join('') || '<li>Belum ada (RTM belum dilaksanakan).</li>'}</ol>
      <h4>C. Peningkatan standar</h4><ul class="small">${usulan.map(i => `<li>${i.kode} · ${esc(i.teks)} (${i.unit}) — ${i.peningkatan.rtm ? '<b>disahkan</b>' : 'menunggu pengesahan'}</li>`).join('') || '<li>Tidak ada usulan.</li>'}</ul>` + ttd('Notulis', 'Direktur PEM Akamigas');
  }

  el.innerHTML = `
  <div class="card no-print" style="margin-bottom:18px">
    <div class="filters" style="margin:0">
      <div class="seg scroll" id="lj">${JENIS.map(([k, n]) => `<button data-j="${k}" class="${R.jenis === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      ${R.jenis === 'capaian' || R.jenis === 'rtl' ? `<select class="inp" id="lu"><option value="ALL">Seluruh unit</option>${UNITS.map(u => `<option value="${u.id}" ${R.unit === u.id ? 'selected' : ''}>${u.id} · ${esc(u.nama)}</option>`).join('')}</select>` : ''}
      ${R.jenis === 'ami' ? `<select class="inp" id="la">${amiDone.map(a => `<option value="${a.id}" ${R.ami === a.id ? 'selected' : ''}>${a.id} · ${a.auditee}</option>`).join('')}</select>` : ''}
      ${R.jenis === 'rtm' ? `<select class="inp" id="lr">${S.rtm.map(r => `<option value="${r.id}" ${R.rtm === r.id ? 'selected' : ''}>${esc(r.judul)}</option>`).join('')}</select>` : ''}
      <div class="sp" style="flex:1"></div>
      <button class="btn pri" id="lp">${icon('download')} Cetak / simpan PDF</button>
      <button class="btn" id="lx">${icon('grid4')} Unduh Excel (CSV)</button>
    </div>
  </div>
  <div class="report">${body}</div>`;

  el.querySelectorAll('#lj button').forEach(b => b.onclick = () => { R.jenis = b.dataset.j; laporan(el); });
  const on = (s, f) => { const x = el.querySelector(s); if (x) x.onchange = f; };
  on('#lu', e => { R.unit = e.target.value; laporan(el); });
  on('#la', e => { R.ami = e.target.value; laporan(el); });
  on('#lr', e => { R.rtm = e.target.value; laporan(el); });
  el.querySelector('#lp').onclick = () => window.print();
  el.querySelector('#lx').onclick = () => {
    if (!rows.length) return toast('Tidak ada data');
    const csv = '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `Laporan_${R.jenis}_${R.jenis === 'ami' ? R.ami : R.jenis === 'rtm' ? R.rtm : R.unit}_${BULAN[m]}${S.settings.tahun}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
}
