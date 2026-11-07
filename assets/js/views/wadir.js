import { S, ctx, icon, esc } from '../app.js';
import { chart, AX, countUp, grad } from '../charts.js';
import { UNITS, WADIR } from '../seed.js';
import { BLN, BULAN, KELAS, fmt } from '../scoring.js';
import { active, summary, indStat, stBadge, fmtV, targetTxt, evalAll, isAkr, akrTag } from './common.js';
import { detail } from './indikator.js';

export default function wadir(el, id) {
  const W = WADIR.find(w => w.id === id);
  const units = UNITS.filter(u => u.wadir === id);
  const uid = new Set(units.map(u => u.id));
  const inds = active().filter(i => uid.has(i.unit));
  const m = S.settings.bulan;
  const sum = summary(inds);
  const kts = inds.filter(i => i.ami && ['KTS Minor', 'KTS Mayor'].includes(i.ami.temuan)).length;
  const rtlOpen = S.rtl.filter(r => uid.has(r.unit) && r.status !== 'Terverifikasi').length;
  const ev = id === 1 ? evalAll() : [];
  const worst = inds.map(i => ({ i, s: indStat(i) })).filter(x => x.s.r != null).sort((a, b) => a.s.r - b.s.r).slice(0, 8);

  el.innerHTML = `
  <div class="wadir-tabs card" style="padding:10px 12px">
    <div class="seg scroll">${WADIR.map(w => `<button class="${w.id === id ? 'on' : ''}" data-w="${w.id}">${w.nama} · ${w.bidang}</button>`).join('')}</div>
  </div>
  <div class="card" style="margin-bottom:18px;background:linear-gradient(120deg, color-mix(in srgb, ${W.warna} 14%, #fff), rgba(255,255,255,.85))">
    <div class="card-h" style="margin:0"><span class="ico-badge" style="--c:${W.warna}">${icon('user')}</span><div><h3>${W.nama} — ${W.bidang}</h3><div class="sub">${units.map(u => `<b>${u.id}</b> ${esc(u.nama)}`).join(' · ')}</div></div><div class="sp"></div>
      ${ctx.role === 'admin' ? `<a class="btn pri" href="#/indikator">${icon('plus')} Input indikator</a>` : ''}<a class="btn" href="#/laporan">${icon('download')} Laporan</a></div>
  </div>
  <div class="grid g4">
    ${[['Indikator unit', inds.length, '', '#0ea5e9', 'target', `${inds.filter(isAkr).length} berkorelasi akreditasi`], ['Tercapai', Math.round(sum.pct), '%', '#10b981', 'check', `${sum.ok} dari ${sum.n} indikator`], ['Temuan KTS AMI', kts, '', '#f0616d', 'audit', 'minor + mayor'], ['RTL belum terverifikasi', rtlOpen, '', '#f5a524', 'loop', 'perlu tindak lanjut']]
      .map((k, n) => `<div class="card kpi tilt" style="--c:${k[3]}"><div class="lbl"><span class="ico-badge" style="--c:${k[3]};width:28px;height:28px">${icon(k[4])}</span>${k[0]}</div><div class="val"><span id="wk${n}">0</span><small>${k[2]}</small></div><div class="meta">${k[5]}</div></div>`).join('')}
  </div>
  ${id === 1 ? `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-top:18px">${ev.map(e => `<a class="status-card tilt" href="#/akreditasi" style="--c:${e.status.warna};padding:14px"><div class="lb">${e.prodi} · NA simulasi</div><div class="big" style="font-size:30px">${fmt(e.NA, 1)}</div><div class="lb" style="font-weight:800">${e.status.nama}</div></a>`).join('')}</div>` : ''}
  <div class="grid g2" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:${W.warna}">${icon('dash')}</span><div><h3>Status indikator per unit</h3><div class="sub">Per ${BULAN[m]} ${S.settings.tahun}</div></div></div><div class="chart" id="wst"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('pulse')}</span><div><h3>Tren indeks capaian bidang</h3><div class="sub">Rata-rata capaian/target</div></div></div><div class="chart" id="wtr"></div></div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('alert')}</span><div><h3>Perlu perhatian</h3><div class="sub">8 capaian terendah di bidang ini · klik untuk jejak PPEPP</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Unit</th><th>Indikator</th><th class="num">Target</th><th class="num">Capaian</th><th>Status</th></tr></thead><tbody>
    ${worst.map(x => `<tr class="click" data-id="${x.i.id}"><td><b>${x.i.unit}</b></td><td>${esc(x.i.teks)} ${akrTag(x.i)}</td><td class="num">${targetTxt(x.i)}</td><td class="num"><b>${fmtV(x.i, x.s.v)}</b></td><td>${stBadge(x.s.k)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Belum ada data.</td></tr>'}
    </tbody></table></div>
  </div>`;

  [inds.length, Math.round(sum.pct), kts, rtlOpen].forEach((v, n) => countUp(el.querySelector('#wk' + n), v));
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { location.hash = '#/wadir-' + b.dataset.w; });
  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => detail(tr.dataset.id, () => wadir(el, id)));
  const byU = units.map(u => summary(inds.filter(i => i.unit === u.id)));
  chart(el.querySelector('#wst'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 16, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'value', ...AX, minInterval: 1 }, yAxis: { type: 'category', data: units.map(u => u.id), ...AX, axisLabel: { ...AX.axisLabel, fontWeight: 700, color: '#3b4760' } },
    series: ['ok', 'near', 'bad', 'na'].map((s, i) => ({ name: KELAS[s].nama, type: 'bar', stack: 'a', barWidth: 14, data: byU.map(x => x[s]), itemStyle: { color: KELAS[s].warna, borderRadius: i === 3 ? [0, 6, 6, 0] : 0 } }))
  });
  const months = BLN.slice(0, m + 1);
  chart(el.querySelector('#wtr'), {
    tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: months, boundaryGap: false, ...AX },
    yAxis: { type: 'value', ...AX, scale: true, axisLabel: { ...AX.axisLabel, formatter: '{value}%' } },
    series: [{ type: 'line', smooth: true, symbolSize: 7, data: months.map((_, k) => Math.round(summary(inds, k).idx * 10) / 10), lineStyle: { width: 3.5, color: W.warna }, itemStyle: { color: W.warna }, areaStyle: { color: grad(W.warna + '44', W.warna + '00') } }]
  });
}
