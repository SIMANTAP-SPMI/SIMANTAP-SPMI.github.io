import { S, ctx, icon, esc, can, save, toast, openDrawer, closeDrawer } from '../app.js';
import { chart, AX, countUp, gaugeOption } from '../charts.js';
import { UNITS, UNIT, AUDITORS } from '../seed.js';
import { BULAN } from '../scoring.js';
import { active, summary, indStat, stBadge, fmtV, targetTxt } from './common.js';
import { detail } from './indikator.js';

const TEMUAN = { 'Terlampaui': '#0ea5e9', 'Sesuai': '#10b981', 'Observasi': '#f5a524', 'KTS Minor': '#fb923c', 'KTS Mayor': '#f0616d' };
const audName = id => (AUDITORS.find(a => a.id === id) || {}).nama || id;

/* ---------------- AMI ---------------- */
export function amiView(el) {
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
    <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('calendar')}</span><div><h3>Jadwal AMI</h3><div class="sub">Auditor tidak ditugaskan ke unit asalnya</div></div><div class="sp"></div>${ctx.role === 'admin' ? `<button class="btn pri" id="addAmi">${icon('plus')} Jadwal baru</button>` : ''}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Auditee</th><th>Auditor</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>
    ${S.ami.map(a => `<tr><td><b>${a.id}</b></td><td><b>${a.auditee}</b><div class="muted small">${esc(UNIT[a.auditee].nama)}</div></td><td>${a.auditor.map(audName).join(', ')}</td><td>${a.tgl}</td><td><span class="st ${a.status === 'Selesai' ? 'ok' : 'near'}">${a.status}</span></td>
      <td>${ctx.role === 'admin' && a.status !== 'Selesai' ? `<button class="btn sm" data-done="${a.id}">${icon('check')} Tandai selesai</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  ${ctx.role === 'auditor' ? `<div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('user')}</span><div><h3>Penugasan ${esc(me.nama)}</h3><div class="sub">Unit asal: ${me.home} (tidak dapat diaudit oleh Anda)</div></div></div>
    ${myAudits.length ? myAudits.map(a => `<h4 style="margin:10px 0 6px">${a.auditee} · ${a.tgl}</h4><div class="tbl-wrap"><table class="tbl"><tbody>${active().filter(i => i.unit === a.auditee).map(i => `<tr class="click" data-id="${i.id}"><td>${esc(i.teks)}</td><td class="num">${targetTxt(i)}</td><td class="num">${fmtV(i, indStat(i).v)}</td><td>${i.ami ? `<span class="st" style="background:${TEMUAN[i.ami.temuan]}22">${i.ami.temuan}</span>` : '<span class="st na">belum</span>'}</td></tr>`).join('')}</tbody></table></div>`).join('') : '<div class="muted">Tidak ada penugasan.</div>'}</div>` : ''}`;
  el.querySelectorAll('.kpi .val').forEach(v => countUp(v, +v.dataset.n));
  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => detail(tr.dataset.id, () => amiView(el)));
  el.querySelectorAll('[data-done]').forEach(b => b.onclick = async () => { const a = S.ami.find(x => x.id === b.dataset.done); a.status = 'Selesai'; await save('ami', a, `AMI ${a.id} selesai`); toast('Jadwal AMI ditandai selesai'); amiView(el); });
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
      closeDrawer(); toast('Jadwal AMI tersimpan'); amiView(el);
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

/* ---------------- RTL ---------------- */
const KOL = [['Terbuka', '#f0616d'], ['Proses', '#f5a524'], ['Selesai', '#0ea5e9'], ['Terverifikasi', '#10b981']];
export function rtlView(el) {
  const list = ctx.role === 'auditee' ? S.rtl.filter(r => r.unit === ctx.unit) : S.rtl;
  const ver = list.filter(r => r.status === 'Terverifikasi').length;
  const today = new Date().toISOString().slice(0, 10);
  el.innerHTML = `
  <div class="grid g-12">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('check')}</span><div><h3>Efektivitas tindak lanjut</h3><div class="sub">% RTL terverifikasi (aspek SP9 ≥ 80%)</div></div></div><div class="chart" id="g"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('loop')}</span><div><h3>Status RTL per unit</h3><div class="sub">${list.length} RTL dari AMI & RTM</div></div></div><div class="chart" id="b"></div></div>
  </div>
  <div class="grid g4" style="margin-top:18px">
    ${KOL.map(([k, c]) => `<div class="card" style="padding:12px;background:color-mix(in srgb, ${c} 6%, rgba(255,255,255,.8))"><div class="card-h" style="margin-bottom:8px"><span class="dot" style="--c:${c}"></span><h3>${k}</h3><div class="sp"></div><span class="tag" style="--c:${c}">${list.filter(r => r.status === k).length}</span></div>
      <div class="grid" style="gap:10px">${list.filter(r => r.status === k).map(r => { const ind = S.indikator.find(i => i.id === r.ind); const late = r.status !== 'Terverifikasi' && r.tenggat < today; return `<div class="card tilt" style="padding:12px;box-shadow:var(--shadow)">
        <div style="display:flex;gap:6px;align-items:center"><b class="small">${r.id}</b><span class="tag" style="--c:${TEMUAN[r.temuan] || '#94a3b8'}">${r.temuan}</span><span class="sp" style="flex:1"></span><b class="small">${r.unit}</b></div>
        <div class="small" style="margin:6px 0">${esc(ind ? ind.teks : '')}</div>
        <div class="muted small">${esc(r.tindakan)}</div>
        <div class="small" style="margin-top:6px;color:${late ? '#f0616d' : 'var(--muted)'}">${icon('calendar')} ${r.tenggat}${late ? ' · lewat tenggat' : ''} · ${esc(r.pic)}</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
          ${can('rtl', r) && r.status === 'Terbuka' ? `<button class="btn sm" data-mv="${r.id}" data-to="Proses">Mulai</button>` : ''}
          ${can('rtl', r) && r.status === 'Proses' ? `<button class="btn sm" data-mv="${r.id}" data-to="Selesai">${icon('upload')} Lapor selesai</button>` : ''}
          ${can('verifikasi') && r.status === 'Selesai' ? `<button class="btn sm pri" data-mv="${r.id}" data-to="Terverifikasi">${icon('check')} Verifikasi</button>` : ''}
          ${ind ? `<button class="btn sm ghost" data-ind="${ind.id}">${icon('eye')} Indikator</button>` : ''}
        </div></div>`; }).join('') || '<div class="muted small">—</div>'}</div></div>`).join('')}
  </div>`;
  el.querySelectorAll('[data-mv]').forEach(b => b.onclick = async () => {
    const r = S.rtl.find(x => x.id === b.dataset.mv); r.status = b.dataset.to;
    const ind = S.indikator.find(i => i.id === r.ind);
    if (ind) { ind.pengendalian = Object.assign({ rekomendasi: 'Pantau 3 bulan melalui monitoring bulanan.' }, ind.pengendalian, { pelaksanaan: r.status === 'Proses' ? 'Perbaikan sedang berjalan.' : 'Tindakan perbaikan dilaksanakan; bukti diunggah.', efektivitas: r.status === 'Terverifikasi' ? 'Efektif' : r.status === 'Selesai' ? 'Menunggu verifikasi' : 'Dalam proses' }); await save('indikator', ind); }
    await save('rtl', r, `RTL ${r.id} → ${r.status}`); toast(`RTL ${r.id} → ${r.status}`); rtlView(el);
  });
  el.querySelectorAll('[data-ind]').forEach(b => b.onclick = () => detail(b.dataset.ind, () => rtlView(el)));
  chart(el.querySelector('#g'), gaugeOption(list.length ? Math.round(ver / list.length * 100) : 0, 100, 'RTL terverifikasi (%)', '#10b981'));
  const units = [...new Set(list.map(r => r.unit))];
  chart(el.querySelector('#b'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 10, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: units, ...AX }, yAxis: { type: 'value', ...AX, minInterval: 1 },
    series: KOL.map(([k, c]) => ({ name: k, type: 'bar', stack: 'a', barWidth: 26, data: units.map(u => list.filter(r => r.unit === u && r.status === k).length), itemStyle: { color: c } }))
  });
}

/* ---------------- RTM ---------------- */
export function rtmView(el) {
  const m = S.settings.bulan;
  const inds = active();
  const sum = summary(inds);
  const usulan = inds.filter(i => i.peningkatan && i.peningkatan.status === 'Tingkatkan');
  const temuan = inds.filter(i => i.ami && ['KTS Minor', 'KTS Mayor'].includes(i.ami.temuan)).length;
  const rtlOpen = S.rtl.filter(r => r.status !== 'Terverifikasi').length;
  const next = S.rtm.find(r => r.status !== 'Selesai');
  el.innerHTML = `
  <div class="grid g-21">
    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:#f472b6">${icon('meet')}</span><div><h3>Bahan RTM otomatis · ${next ? esc(next.judul) : 'RTM'}</h3><div class="sub">Disusun sistem dari data PPEPP per ${BULAN[m]} ${S.settings.tahun}</div></div></div>
      <div class="tbl-wrap"><table class="tbl"><tbody>
        <tr><td><b>1. Capaian IKU/IKT & kebijakan</b></td><td>${Math.round(sum.pct)}% indikator tercapai (${sum.ok}/${sum.n}); indeks capaian ${Math.round(sum.idx)}%</td></tr>
        <tr><td><b>2. Hasil AMI</b></td><td>${inds.filter(i => i.ami).length} indikator diaudit; ${temuan} KTS (minor/mayor)</td></tr>
        <tr><td><b>3. Status tindak lanjut</b></td><td>${S.rtl.length} RTL; ${rtlOpen} belum terverifikasi</td></tr>
        <tr><td><b>4. Umpan balik pemangku kepentingan</b></td><td>Indeks kepuasan pengguna lulusan & mahasiswa (lihat katalog S01/S13)</td></tr>
        <tr><td><b>5. Usulan peningkatan standar</b></td><td>${usulan.length} indikator melampaui target ≥ 110% → usul "Tingkatkan"</td></tr>
        <tr><td><b>6. Kesiapan akreditasi</b></td><td>Simulasi LAM 2025 & IABEE per prodi (menu Akreditasi)</td></tr>
      </tbody></table></div>
    </div>
    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('calendar')}</span><div><h3>Riwayat RTM</h3></div></div>
      ${S.rtm.map(r => `<div class="card" style="padding:12px;margin-bottom:10px"><div style="display:flex;gap:8px;align-items:center"><b>${esc(r.judul)}</b><span class="sp" style="flex:1"></span><span class="st ${r.status === 'Selesai' ? 'ok' : 'near'}">${r.status}</span></div><div class="muted small">${r.tgl} · ${esc(r.pimpinan)}</div>${r.keputusan.length ? `<ul class="small" style="margin:6px 0 0;padding-left:18px">${r.keputusan.map(k => `<li>${esc(k)}</li>`).join('')}</ul>` : ''}
        ${can('rtm') && r.status !== 'Selesai' ? `<button class="btn sm pri" data-close-rtm="${r.id}" style="margin-top:8px">${icon('check')} Sahkan & tutup RTM</button>` : ''}</div>`).join('')}
    </div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#f472b6">${icon('spark')}</span><div><h3>Usulan peningkatan standar</h3><div class="sub">${can('rtm') ? 'Pimpinan mengesahkan usulan dalam RTM' : 'Pengesahan oleh Pimpinan (pilih peran Pimpinan)'}</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indikator</th><th>Unit</th><th class="num">Target kini</th><th class="num">Capaian</th><th>Status</th><th>RTM</th></tr></thead><tbody>
    ${usulan.map(i => `<tr><td>${esc(i.teks)}<div class="muted small">${i.kode}</div></td><td><b>${i.unit}</b></td><td class="num">${targetTxt(i)}</td><td class="num"><b>${fmtV(i, indStat(i).v)}</b></td><td>${stBadge(indStat(i).k)}</td>
      <td>${i.peningkatan.rtm ? '<span class="st ok">disahkan</span>' : can('rtm') ? `<button class="btn sm" data-sah="${i.id}">${icon('check')} Sahkan</button>` : '<span class="st na">menunggu</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Belum ada usulan.</td></tr>'}
    </tbody></table></div>
  </div>`;
  el.querySelectorAll('[data-sah]').forEach(b => b.onclick = async () => { const i = S.indikator.find(x => x.id === b.dataset.sah); i.peningkatan.rtm = true; await save('indikator', i, `RTM mengesahkan peningkatan ${i.kode}`); toast('Peningkatan disahkan'); rtmView(el); });
  el.querySelectorAll('[data-close-rtm]').forEach(b => b.onclick = async () => {
    const r = S.rtm.find(x => x.id === b.dataset.closeRtm);
    r.status = 'Selesai'; r.tgl = new Date().toISOString().slice(0, 10);
    r.keputusan = [`Mengesahkan ${usulan.filter(i => i.peningkatan.rtm).length} peningkatan standar`, `Menindaklanjuti ${rtlOpen} RTL terbuka dengan tenggat triwulan I`, 'Menetapkan target IKU/IKT tahun berikut selaras RSB, PK BLU, dan Kokin'];
    await save('rtm', r, 'RTM ' + r.judul + ' disahkan'); toast('RTM disahkan'); rtmView(el);
  });
}
