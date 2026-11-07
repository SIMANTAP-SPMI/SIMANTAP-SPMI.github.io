import { S, ctx, icon, esc, can, save, toast, openDrawer, closeDrawer, route_ } from '../app.js';
import { chart, AX, grad } from '../charts.js';
import { UNITS, UNIT, SUMBER, SUMBERMAP, STANDAR, STD, IKU, IKUMAP, EIS, AUDITORS } from '../seed.js';
import { LAM, IABEE } from '../config.js';
import { BLN, BULAN, fmt, skorDariRasio } from '../scoring.js';
import { active, indStat, stBadge, sumberTags, fmtV, targetTxt, summary } from './common.js';

const F = { q: '', sumber: 'ALL', unit: 'ALL', jenis: 'ALL', status: 'ALL' };

function ppeppDots(i) {
  const st = indStat(i);
  const steps = [
    ['Penetapan', true, '#10b981'],
    ['Pelaksanaan', st.m != null, '#0ea5e9'],
    ['AMI', !!i.ami, '#8b5cf6'],
    ['Pengendalian', !!i.pengendalian || (i.ami && ['Sesuai', 'Terlampaui'].includes(i.ami.temuan)), '#f5a524'],
    ['Peningkatan', !!(i.peningkatan && i.peningkatan.status), '#f472b6']
  ];
  return `<span style="display:inline-flex;gap:3px">${steps.map(s => `<i title="${s[0]}" style="width:9px;height:9px;border-radius:3px;background:${s[1] ? s[2] : 'rgba(24,35,58,.1)'}"></i>`).join('')}</span>`;
}

export function katalog(el) {
  const all = active();
  const list = S.indikator.filter(i =>
    (F.sumber === 'ALL' || i.sumber.includes(F.sumber)) && (F.unit === 'ALL' || i.unit === F.unit) &&
    (F.jenis === 'ALL' || i.jenis === F.jenis) && (F.status === 'ALL' || indStat(i).k === F.status) &&
    (!F.q || (i.teks + i.kode + i.unit).toLowerCase().includes(F.q.toLowerCase())));
  el.innerHTML = `
  <div class="grid g4" style="margin-bottom:18px">${SUMBER.slice(0, 4).map(s => {
    const x = all.filter(i => i.sumber.includes(s.id)); const c = summary(x);
    return `<div class="card kpi tilt" style="--c:${s.warna}"><div class="lbl"><span class="dot" style="--c:${s.warna}"></span>${s.nama}</div><div class="val">${x.length}<small>indikator</small></div><div class="bar" style="margin-top:8px"><i style="width:${c.pct}%;--c:${s.warna}"></i></div><div class="meta">${Math.round(c.pct)}% tercapai</div></div>`;
  }).join('')}</div>
  <div class="card">
    <div class="filters">
      <div class="search">${icon('search')}<input class="inp" id="q" placeholder="Cari indikator, kode, unit…" value="${esc(F.q)}"></div>
      <select class="inp" id="fu"><option value="ALL">Semua unit</option>${UNITS.map(u => `<option ${F.unit === u.id ? 'selected' : ''} value="${u.id}">${u.id} · ${u.nama}</option>`).join('')}</select>
      <select class="inp" id="fj">${['ALL', 'IKU', 'IKT', 'IK'].map(j => `<option ${F.jenis === j ? 'selected' : ''} value="${j}">${j === 'ALL' ? 'Semua jenis' : j === 'IK' ? 'IK (indikator standar)' : j}</option>`).join('')}</select>
      <select class="inp" id="fs">${[['ALL', 'Semua status'], ['ok', 'Tercapai'], ['near', 'Hampir'], ['bad', 'Belum'], ['na', 'Belum diisi']].map(([k, n]) => `<option ${F.status === k ? 'selected' : ''} value="${k}">${n}</option>`).join('')}</select>
      ${can('indikator') ? `<button class="btn pri" id="add">${icon('plus')} Indikator baru</button>` : ''}
    </div>
    <div class="seg" id="sseg" style="margin-bottom:12px"><button data-s="ALL" class="${F.sumber === 'ALL' ? 'on' : ''}">Semua sumber</button>${SUMBER.map(s => `<button data-s="${s.id}" class="${F.sumber === s.id ? 'on' : ''}" title="${s.nama}">${s.id}</button>`).join('')}</div>
    <div class="muted small" style="margin-bottom:8px">${list.length} indikator · klik baris untuk melihat jejak PPEPP</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Indikator</th><th>Unit</th><th class="num">Target</th><th class="num">Capaian</th><th>Status</th><th>PPEPP</th></tr></thead><tbody>
    ${list.map(i => { const st = indStat(i); return `<tr class="click" data-id="${i.id}" style="${i.aktif ? '' : 'opacity:.45'}">
      <td><b>${i.kode}</b><div class="muted small">${i.jenis}${i.iku ? ' · ' + i.iku : ''}</div></td>
      <td style="min-width:260px">${esc(i.teks)}<div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">${sumberTags(i)}${i.lam ? `<span class="tag" style="--c:#0f766e">LAM ${i.lam}</span>` : ''}${i.sp ? `<span class="tag" style="--c:#7c3aed">${i.sp}</span>` : ''}</div></td>
      <td><b>${i.unit}</b></td><td class="num">${targetTxt(i)}</td><td class="num"><b>${fmtV(i, st.v)}</b></td><td>${stBadge(st.k)}</td><td>${ppeppDots(i)}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Tidak ada indikator yang cocok.</td></tr>'}
    </tbody></table></div>
  </div>`;
  const re = () => katalog(el);
  el.querySelector('#q').oninput = e => { F.q = e.target.value; clearTimeout(el._t); el._t = setTimeout(() => { re(); const q = el.querySelector('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
  el.querySelector('#fu').onchange = e => { F.unit = e.target.value; re(); };
  el.querySelector('#fj').onchange = e => { F.jenis = e.target.value; re(); };
  el.querySelector('#fs').onchange = e => { F.status = e.target.value; re(); };
  el.querySelectorAll('#sseg button').forEach(b => b.onclick = () => { F.sumber = b.dataset.s; re(); });
  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => detail(tr.dataset.id, re));
  const add = el.querySelector('#add'); if (add) add.onclick = () => formIndikator(null, re);
}

/* ---------- Detail + jejak PPEPP ---------- */
export function detail(id, after) {
  const i = S.indikator.find(x => x.id === id);
  if (!i) return;
  const m = S.settings.bulan, st = indStat(i);
  const ed = i.ed || {}, ami = i.ami || {}, pg = i.pengendalian || {}, pn = i.peningkatan || {};
  const rtls = S.rtl.filter(r => r.ind === i.id);
  const canCap = can('capaian', i), canAudit = can('audit', i), canPn = ctx.role === 'admin' || ctx.role === 'pimpinan';
  const bukti = (i.bukti && i.bukti[m]) || [];
  const tagsLam = [i.lam && `LAM ${i.lam} · ${(LAM.kriteria.find(k => k.id === i.lam) || {}).nama}`, i.komp && `Komponen ${(LAM.komponen.find(k => k.id === i.komp) || {}).nama}`, i.sp && `Syarat perlu ${i.sp}`, ...(i.iabee || []).map(k => `IABEE ${k}`), i.iapt && `IAPT ${i.iapt}`].filter(Boolean);
  openDrawer(`
    <div class="card-h"><span class="ico-badge" style="--c:#14b8a6">${icon('target')}</span><div><div class="muted small">${i.kode} · ${i.jenis} · ${esc(UNIT[i.unit].nama)}</div><h3>${esc(i.teks)}</h3></div><div class="sp"></div><button class="btn ghost" data-close aria-label="Tutup">${icon('close')}</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${sumberTags(i)} ${tagsLam.map(t => `<span class="tag" style="--c:#0f766e">${esc(t)}</span>`).join(' ')}</div>
    ${i.catatan ? `<div class="ribbon">${icon('info')} ${esc(i.catatan)}</div>` : ''}
    <div class="card" style="margin-bottom:14px"><div class="card-h"><h3>Capaian ${S.settings.tahun}</h3><div class="sp"></div>${stBadge(st.k)}<b style="margin-left:8px">${fmtV(i, st.v)} ${esc(i.satuan)}</b></div><div class="chart sm" id="dchart"></div></div>
    <div class="trail">
      ${step('#10b981', 'flag', '1 · Penetapan', `<dl class="kv"><dt>Target</dt><dd>${targetTxt(i)}</dd><dt>Standar</dt><dd>${i.std} · ${esc(STD[i.std])}</dd><dt>IKU/IKT Renstra</dt><dd>${i.iku ? i.iku + ' · ' + esc((IKUMAP[i.iku] || {}).nama) : '–'}</dd><dt>Data / Risiko</dt><dd>${i.data} · ${i.risk}</dd><dt>Rencana</dt><dd>${esc(i.rencana)}</dd></dl>${ctx.role === 'admin' ? `<button class="btn sm" id="editInd" style="margin-top:8px">${icon('edit')} Ubah penetapan</button>` : ''}`)}
      ${step('#0ea5e9', 'pulse', `2 · Pelaksanaan & Evaluasi Diri (${BULAN[m]})`, `
        <div class="grid g2" style="gap:10px">
          <div class="field"><label>Capaian ${BULAN[m]} (${esc(i.satuan)})</label><input class="inp" id="capIn" type="number" step="any" value="${i.cap[m] ?? ''}" ${canCap ? '' : 'disabled'}></div>
          <div class="field"><label>Skala ED (1–4)</label><select class="inp" id="edSk" ${canCap ? '' : 'disabled'}>${[1, 2, 3, 4].map(n => `<option ${ed.skala === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field span2"><label>Analisis evaluasi diri</label><textarea class="inp" id="edAn" rows="2" ${canCap ? '' : 'disabled'}>${esc(ed.analisis || '')}</textarea></div>
          <div class="field span2"><label>Bukti (${bukti.length})</label><div class="small">${bukti.map(b => `${icon('folder')} ${esc(b.nama)} ${b.verified ? '<span class="st ok">terverifikasi</span>' : '<span class="st near">menunggu</span>'}`).join('<br>') || '<span class="muted">Belum ada bukti bulan ini</span>'}</div>
          ${canCap ? `<input class="inp" id="bkIn" placeholder="Nama berkas / tautan Drive bukti" style="margin-top:6px">` : ''}</div>
        </div>
        ${canCap ? `<button class="btn pri sm" id="saveCap" style="margin-top:10px">${icon('upload')} Simpan capaian & ED</button>` : `<div class="note" style="margin-top:6px">Pengisian oleh auditee ${i.unit} (pilih peran Auditee ${i.unit}).</div>`}`)}
      ${step('#8b5cf6', 'audit', '3 · Evaluasi — Audit Mutu Internal', i.ami || canAudit ? `
        <div class="grid g2" style="gap:10px">
          <div class="field"><label>Temuan</label><select class="inp" id="amT" ${canAudit ? '' : 'disabled'}>${['Terlampaui', 'Sesuai', 'Observasi', 'KTS Minor', 'KTS Mayor'].map(t => `<option ${ami.temuan === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Skor akhir auditor (1–4)</label><select class="inp" id="amS" ${canAudit ? '' : 'disabled'}>${[1, 2, 3, 4].map(n => `<option ${ami.akhir === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field span2"><label>Uraian</label><textarea class="inp" id="amU" rows="2" ${canAudit ? '' : 'disabled'}>${esc(ami.uraian || '')}</textarea></div>
        </div>
        <div class="note">Auditor: ${esc((AUDITORS.find(a => a.id === ami.auditor) || {}).nama || '–')} · ${ami.tgl || ''}</div>
        ${canAudit ? `<button class="btn vio sm" id="saveAmi" style="margin-top:8px">${icon('check')} Simpan hasil audit</button>` : ''}` : `<div class="muted small">Belum diaudit pada siklus ini.${ctx.role === 'auditor' ? ' Auditor tidak boleh mengaudit unit asalnya.' : ''}</div>`)}
      ${step('#f5a524', 'loop', '4 · Pengendalian', `${pg.pelaksanaan ? `<dl class="kv"><dt>Pelaksanaan</dt><dd>${esc(pg.pelaksanaan)}</dd><dt>Efektivitas</dt><dd>${esc(pg.efektivitas)}</dd><dt>Rekomendasi</dt><dd>${esc(pg.rekomendasi)}</dd></dl>` : '<div class="muted small">Tidak ada tindakan koreksi.</div>'}
        ${rtls.map(r => `<div class="small" style="margin-top:6px">${icon('loop')} <b>${r.id}</b> · ${esc(r.tindakan)} <span class="st ${r.status === 'Terverifikasi' ? 'ok' : r.status === 'Terbuka' ? 'bad' : 'near'}">${r.status}</span></div>`).join('')}`)}
      ${step('#f472b6', 'spark', '5 · Peningkatan', `
        <div class="grid g2" style="gap:10px">
          <div class="field"><label>Keputusan standar</label><select class="inp" id="pnS" ${canPn ? '' : 'disabled'}>${['', 'Tingkatkan', 'Sesuaikan', 'Tetap', 'Nonaktif'].map(t => `<option ${pn.status === t ? 'selected' : ''} value="${t}">${t || '— belum —'}</option>`).join('')}</select></div>
          <div class="field"><label>Kuadran Eisenhower</label><select class="inp" id="pnE" ${canPn ? '' : 'disabled'}>${Object.entries(EIS).map(([k, v]) => `<option ${pn.eis === k ? 'selected' : ''} value="${k}">${v.nama} — ${v.aksi}</option>`).join('')}</select></div>
        </div>
        <div class="note">${pn.rtm ? '✔ Disahkan dalam RTM' : 'Belum disahkan RTM'}</div>
        ${canPn ? `<button class="btn sm" id="savePn" style="margin-top:8px">${icon('check')} Simpan keputusan</button>` : ''}`)}
    </div>`, (d) => {
    const months = BLN.slice(0, m + 1);
    const tgt = months.map((_, k) => i.cum ? Math.round(i.target * (k + 1) / 12 * 100) / 100 : i.target);
    chart(d.querySelector('#dchart'), {
      tooltip: { trigger: 'axis' }, legend: { right: 0, top: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } },
      xAxis: { type: 'category', data: months, ...AX }, yAxis: { type: 'value', ...AX, scale: true },
      series: [
        { name: 'Capaian', type: 'bar', data: i.cap.slice(0, m + 1), barWidth: 14, itemStyle: { borderRadius: [6, 6, 0, 0], color: grad('#0ea5e9', '#10b981') } },
        { name: 'Target', type: 'line', data: tgt, symbol: 'none', lineStyle: { type: 'dashed', color: '#f0616d', width: 2 } }
      ]
    });
    const on = (sel, fn) => { const b = d.querySelector(sel); if (b) b.onclick = fn; };
    const done = async (msg) => { toast(msg); closeDrawer(); after ? after() : route_(); };
    on('#editInd', () => formIndikator(i, after));
    on('#saveCap', async () => {
      const v = d.querySelector('#capIn').value;
      i.cap[m] = v === '' ? null : Number(v);
      i.ed = Object.assign({}, i.ed, { skala: +d.querySelector('#edSk').value, analisis: d.querySelector('#edAn').value, hasil: i.cap[m], status: 'Dikirim', tgl: new Date().toISOString().slice(0, 10) });
      const bk = d.querySelector('#bkIn').value.trim();
      if (bk) { i.bukti = i.bukti || {}; (i.bukti[m] = i.bukti[m] || []).push({ nama: bk, verified: false }); }
      await save('indikator', i, `Capaian ${i.kode} (${BLN[m]}) = ${v}`);
      done('Capaian & evaluasi diri tersimpan');
    });
    on('#saveAmi', async () => {
      i.ami = { akhir: +d.querySelector('#amS').value, temuan: d.querySelector('#amT').value, uraian: d.querySelector('#amU').value, auditor: ctx.role === 'auditor' ? ctx.auditor : (i.ami || {}).auditor || 'AU01', tgl: new Date().toISOString().slice(0, 10) };
      if (['Observasi', 'KTS Minor', 'KTS Mayor'].includes(i.ami.temuan) && !S.rtl.some(r => r.ind === i.id && r.status !== 'Terverifikasi')) {
        const n = S.rtl.length + 1;
        await save('rtl', { id: 'RTL' + String(n).padStart(3, '0') + '-' + Date.now().toString(36).slice(-3), ind: i.id, unit: i.unit, sumberRTL: 'AMI ' + S.settings.tahun, temuan: i.ami.temuan, tindakan: 'Menyusun rencana perbaikan dengan PIC dan tenggat.', pic: 'Ka. ' + i.unit, tenggat: `${S.settings.tahun}-12-31`, status: 'Terbuka' });
      }
      await save('indikator', i, `Hasil AMI ${i.kode}: ${i.ami.temuan}`);
      done('Hasil audit tersimpan' + (['Observasi', 'KTS Minor', 'KTS Mayor'].includes(i.ami.temuan) ? ' · RTL dibuat otomatis' : ''));
    });
    on('#savePn', async () => {
      i.peningkatan = Object.assign({}, i.peningkatan, { status: d.querySelector('#pnS').value, eis: d.querySelector('#pnE').value });
      if (i.peningkatan.status === 'Nonaktif') i.aktif = false; else i.aktif = true;
      await save('indikator', i, `Peningkatan ${i.kode}: ${i.peningkatan.status || '-'}`);
      done('Keputusan peningkatan tersimpan');
    });
  });
}
function step(c, ic, title, body) {
  return `<div class="tstep"><div class="orbsm" style="--c:${c}">${icon(ic)}</div><div class="card" style="padding:14px"><h4 style="margin-bottom:8px">${title}</h4>${body}</div></div>`;
}

/* ---------- Form indikator (Admin UPM) ---------- */
function formIndikator(i, after) {
  const isNew = !i;
  const x = i || { unit: 'UPM', std: 'S13', teks: '', target: 0, satuan: '%', arah: '>=', jenis: 'IKT', iku: 'IKT-1', sumber: [], lam: 'K4', komp: 'P', iabee: [], sp: null, risk: 'Sedang', dec: 0 };
  const opt = (arr, v) => arr.map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${n}</option>`).join('');
  openDrawer(`
    <div class="card-h"><span class="ico-badge" style="--c:#14b8a6">${icon(isNew ? 'plus' : 'edit')}</span><h3>${isNew ? 'Indikator baru' : 'Ubah penetapan ' + x.kode}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="grid g2" style="gap:12px">
      <div class="field span2"><label>Rumusan indikator</label><textarea class="inp" id="fT" rows="2">${esc(x.teks)}</textarea></div>
      <div class="field"><label>Unit</label><select class="inp" id="fU">${opt(UNITS.map(u => [u.id, u.id + ' · ' + u.nama]), x.unit)}</select></div>
      <div class="field"><label>Standar</label><select class="inp" id="fS">${opt(STANDAR.map(s => [s[0], s[0] + ' ' + s[1]]), x.std)}</select></div>
      <div class="field"><label>Jenis</label><select class="inp" id="fJ">${opt([['IKU', 'IKU'], ['IKT', 'IKT'], ['IK', 'IK (indikator standar)']], x.jenis)}</select></div>
      <div class="field"><label>IKU/IKT Renstra</label><select class="inp" id="fI">${opt([['', '—'], ...IKU.map(k => [k.id, k.id + ' ' + k.nama])], x.iku || '')}</select></div>
      <div class="field"><label>Target</label><input class="inp" id="fG" type="number" step="any" value="${x.target}"></div>
      <div class="field"><label>Satuan</label><input class="inp" id="fN" value="${esc(x.satuan)}"></div>
      <div class="field"><label>Arah</label><select class="inp" id="fA">${opt([['>=', '≥ (makin besar makin baik)'], ['<=', '≤ (makin kecil makin baik)']], x.arah)}</select></div>
      <div class="field"><label>Risiko</label><select class="inp" id="fR">${opt([['Tinggi', 'Tinggi'], ['Sedang', 'Sedang'], ['Rendah', 'Rendah']], x.risk)}</select></div>
      <div class="field"><label>Kriteria LAM 2025</label><select class="inp" id="fL">${opt([['', '—'], ...LAM.kriteria.map(k => [k.id, k.id + ' ' + k.nama])], x.lam || '')}</select></div>
      <div class="field"><label>Komponen</label><select class="inp" id="fK">${opt([['', '—'], ...LAM.komponen.map(k => [k.id, k.nama])], x.komp || '')}</select></div>
      <div class="field span2"><label>Sumber kebijakan</label><div style="display:flex;gap:10px;flex-wrap:wrap">${SUMBER.map(s => `<label class="small"><input type="checkbox" class="fSb" value="${s.id}" ${x.sumber.includes(s.id) ? 'checked' : ''}> ${s.id}</label>`).join('')}</div></div>
      <div class="field span2"><label>Kriteria IABEE</label><div style="display:flex;gap:10px;flex-wrap:wrap">${IABEE.kriteria.map(k => `<label class="small"><input type="checkbox" class="fIb" value="${k.id}" ${(x.iabee || []).includes(k.id) ? 'checked' : ''}> ${k.id} ${k.nama}</label>`).join('')}</div></div>
    </div>
    <button class="btn pri" id="fSave" style="margin-top:14px">${icon('check')} Simpan</button></div>`, (d) => {
    d.querySelector('#fSave').onclick = async () => {
      const g = s => d.querySelector(s).value;
      if (!g('#fT').trim()) { toast('Rumusan indikator wajib diisi'); return; }
      const o = i || { id: 'IND' + Date.now().toString(36).toUpperCase(), aktif: true, cum: false, dec: 0, cap: Array(12).fill(null), bukti: {}, ed: null, ami: null, pengendalian: null, peningkatan: { status: '', eis: 'NI-NU', rtm: false }, rencana: 'Pemantauan bulanan; evaluasi triwulanan.', catatan: '' };
      Object.assign(o, { teks: g('#fT').trim(), unit: g('#fU'), std: g('#fS'), jenis: g('#fJ'), iku: g('#fI') || null, target: Number(g('#fG')), satuan: g('#fN'), arah: g('#fA'), risk: g('#fR'), lam: g('#fL') || null, komp: g('#fK') || null,
        sumber: Array.from(d.querySelectorAll('.fSb:checked')).map(c => c.value), iabee: Array.from(d.querySelectorAll('.fIb:checked')).map(c => c.value), data: g('#fN').startsWith('terpenuhi') ? 'Kualitatif' : 'Kuantitatif' });
      if (!o.kode) o.kode = `${o.jenis}${String(S.settings.tahun).slice(2)}${String(S.indikator.filter(z => z.jenis === o.jenis).length + 1).padStart(3, '0')}`;
      await save('indikator', o, (isNew ? 'Menambah' : 'Mengubah') + ' indikator ' + o.kode);
      toast('Indikator tersimpan'); closeDrawer(); after ? after() : route_();
    };
  });
}

/* ---------- Monitoring bulanan ---------- */
let monUnit = null;
export function monitoring(el) {
  const m = S.settings.bulan;
  if (ctx.role === 'auditee') monUnit = ctx.unit;
  if (!monUnit) monUnit = 'TPM';
  const inds = active().filter(i => i.unit === monUnit);
  const fill = UNITS.map(u => { const x = active().filter(i => i.unit === u.id); return { u: u.id, p: x.length ? Math.round(x.filter(i => i.cap[m] != null).length / x.length * 100) : 0 }; });
  const editable = inds.length && can('capaian', inds[0]);
  el.innerHTML = `
  <div class="grid g-12">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('calendar')}</span><div><h3>Kelengkapan pengisian ${BULAN[m]}</h3><div class="sub">% indikator yang sudah dimutakhirkan per unit</div></div></div><div class="chart" id="fill"></div></div>
    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('pulse')}</span><div><h3>Lembar monitoring · ${esc(UNIT[monUnit].nama)}</h3><div class="sub">${editable ? 'Isi capaian bulan berjalan lalu simpan' : 'Mode baca. Pilih peran Auditee unit ini untuk mengisi.'}</div></div><div class="sp"></div>
        ${ctx.role !== 'auditee' ? `<select class="inp" id="mu">${UNITS.map(u => `<option ${u.id === monUnit ? 'selected' : ''} value="${u.id}">${u.id}</option>`).join('')}</select>` : ''}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indikator</th><th class="num">Target</th>${BLN.slice(Math.max(0, m - 3), m).map(b => `<th class="num">${b}</th>`).join('')}<th class="num">${BLN[m]}</th><th>Status</th></tr></thead><tbody>
      ${inds.map(i => { const st = indStat(i); return `<tr><td style="min-width:220px"><a href="javascript:void 0" data-id="${i.id}" class="dl">${esc(i.teks)}</a><div class="muted small">${i.kode}</div></td><td class="num">${targetTxt(i)}</td>
        ${i.cap.slice(Math.max(0, m - 3), m).map(v => `<td class="num muted">${fmtV(i, v)}</td>`).join('')}
        <td class="num">${editable ? `<input class="inp mi" data-id="${i.id}" type="number" step="any" value="${i.cap[m] ?? ''}" style="width:90px;text-align:right">` : `<b>${fmtV(i, i.cap[m])}</b>`}</td><td>${stBadge(st.k)}</td></tr>`; }).join('')}
      </tbody></table></div>
      ${editable ? `<button class="btn pri" id="msave" style="margin-top:12px">${icon('upload')} Simpan capaian ${BULAN[m]}</button>` : ''}
    </div>
  </div>`;
  const mu = el.querySelector('#mu'); if (mu) mu.onchange = e => { monUnit = e.target.value; monitoring(el); };
  el.querySelectorAll('a.dl').forEach(a => a.onclick = () => detail(a.dataset.id, () => monitoring(el)));
  const ms = el.querySelector('#msave');
  if (ms) ms.onclick = async () => {
    let n = 0;
    for (const inp of el.querySelectorAll('input.mi')) {
      const i = S.indikator.find(x => x.id === inp.dataset.id);
      const v = inp.value === '' ? null : Number(inp.value);
      if (v !== i.cap[m]) { i.cap[m] = v; await save('indikator', i); n++; }
    }
    const { addLog } = await import('../app.js'); await addLog(`Monitoring ${monUnit} ${BLN[m]}: ${n} capaian diperbarui`);
    toast(`${n} capaian diperbarui`); monitoring(el);
  };
  chart(el.querySelector('#fill'), {
    tooltip: {}, grid: { left: 8, right: 30, top: 6, bottom: 6, containLabel: true },
    xAxis: { type: 'value', max: 100, show: false }, yAxis: { type: 'category', inverse: true, data: fill.map(f => f.u), ...AX, axisLabel: { ...AX.axisLabel, fontWeight: 700, color: '#3b4760' } },
    series: [{ type: 'bar', barWidth: 12, showBackground: true, backgroundStyle: { color: 'rgba(24,35,58,.05)', borderRadius: 8 }, data: fill.map(f => ({ value: f.p, itemStyle: { color: f.p >= 90 ? '#10b981' : f.p >= 60 ? '#f5a524' : '#f0616d', borderRadius: 8 } })), label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11, fontWeight: 700 } }]
  });
  void fmt; void skorDariRasio; void SUMBERMAP;
}
