import { S, icon, esc } from '../app.js';
import { chart, countUp, AX, grad, gaugeOption, PAL } from '../charts.js';
import { UNITS, UNIT, PRODI, RENSTRA, IKU, EIS } from '../seed.js';
import { BLN, BULAN, KELAS, fmt } from '../scoring.js';
import { LAM } from '../config.js';
import { active, summary, indStat, evalAll, sparkPath } from './common.js';

let filt = 'ALL';

export default function dashboard(el) {
  const m = S.settings.bulan;
  const all = active();
  const inds = filt === 'ALL' ? all : all.filter(i => i.unit === filt);
  const sum = summary(inds);
  const months = BLN.slice(0, m + 1);
  const series = months.map((_, k) => summary(inds, k));
  const ev = evalAll();

  const kpis = [
    { l: 'Indeks capaian', v: sum.idx, d: 1, u: '%', c: '#0ea5e9', ic: 'target', s: series.map(x => x.idx), meta: 'rata-rata capaian/target' },
    { l: 'Tercapai', v: sum.ok, d: 0, u: `/${sum.n}`, c: '#10b981', ic: 'check', s: series.map(x => x.ok), meta: `${Math.round(sum.pct)}% indikator` },
    { l: 'Hampir tercapai', v: sum.near, d: 0, u: '', c: '#f5a524', ic: 'pulse', s: series.map(x => x.near), meta: '85–99% target' },
    { l: 'Belum tercapai', v: sum.bad, d: 0, u: '', c: '#f0616d', ic: 'alert', s: series.map(x => x.bad), meta: 'perlu intervensi' }
  ];

  el.innerHTML = `
  <div class="filters">
    <div class="seg scroll" id="seg">
      <button data-u="ALL" class="${filt === 'ALL' ? 'on' : ''}">Institusi</button>
      ${UNITS.map(u => `<button data-u="${u.id}" class="${filt === u.id ? 'on' : ''}">${u.id}</button>`).join('')}
    </div>
    <span class="muted small">Per ${BULAN[m]} ${S.settings.tahun} · ${filt === 'ALL' ? 'seluruh unit' : esc(UNIT[filt].nama)}</span>
  </div>

  <div class="grid g4">${kpis.map((k, i) => `
    <div class="card kpi tilt" style="--c:${k.c}">
      <div class="lbl"><span class="ico-badge" style="--c:${k.c};width:28px;height:28px">${icon(k.ic)}</span>${k.l}</div>
      <div class="val"><span id="k${i}">0</span><small>${k.u}</small></div>
      <svg class="spark" viewBox="0 0 120 34" preserveAspectRatio="none" width="100%"><polyline points="${sparkPath(k.s)}" fill="none" stroke="${k.c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="meta">${k.meta}</div>
    </div>`).join('')}
  </div>

  <div class="grid g-12" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('target')}</span><div><h3>Indeks Capaian Mutu</h3><div class="sub">100 = seluruh target tepat tercapai</div></div></div><div class="chart" id="gauge"></div></div>
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('grid4')}</span><div><h3>Peta 3D capaian unit × bulan</h3><div class="sub">Tinggi batang = indeks capaian (%) · seret untuk memutar</div></div></div><div class="chart lg" id="bar3d"></div></div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('medal')}</span><div><h3>Radar kriteria LAM Teknik 2025</h3><div class="sub">Skor 0–4 per kriteria, hasil konversi capaian</div></div></div><div class="chart" id="radar"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#14b8a6">${icon('layers')}</span><div><h3>Kaskade Renstra → IKU/IKT</h3><div class="sub">Klik cincin untuk fokus · warna = status capaian</div></div></div><div class="chart" id="sun"></div></div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('dash')}</span><div><h3>Status indikator per unit</h3><div class="sub">Jumlah indikator menurut status</div></div></div><div class="chart" id="stack"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('grid4')}</span><div><h3>Matriks Eisenhower</h3><div class="sub">Prioritas tindak lanjut indikator</div></div></div><div class="chart" id="eis"></div></div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('arrowUp')}</span><div><h3>5 capaian tertinggi</h3><div class="sub">Rasio capaian/target</div></div></div><div class="chart sm" id="top"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('arrowDown')}</span><div><h3>5 capaian terendah</h3><div class="sub">Prioritas intervensi</div></div></div><div class="chart sm" id="bot"></div></div>
  </div>`;

  kpis.forEach((k, i) => countUp(el.querySelector('#k' + i), k.v, k.d));
  el.querySelectorAll('#seg button').forEach(b => b.onclick = () => { filt = b.dataset.u; dashboard(el); });

  chart(el.querySelector('#gauge'), gaugeOption(Math.round(sum.idx * 10) / 10, 120, 'Indeks capaian', '#10b981', 1));

  // 3D bar
  const units = UNITS.map(u => u.id);
  const data3 = [];
  units.forEach((u, ui) => { const ui_ = all.filter(i => i.unit === u); months.forEach((_, k) => data3.push([k, ui, Math.round(summary(ui_, k).idx)])); });
  chart(el.querySelector('#bar3d'), {
    tooltip: { formatter: p => `${units[p.value[1]]} · ${months[p.value[0]]}<br><b>${p.value[2]}%</b>` },
    visualMap: { show: false, min: 40, max: 120, inRange: { color: ['#f0616d', '#f5a524', '#fde68a', '#6ee7b7', '#10b981', '#0ea5e9'] } },
    xAxis3D: { type: 'category', data: months, name: '', axisLabel: { color: '#6b778c' } },
    yAxis3D: { type: 'category', data: units, name: '', axisLabel: { color: '#3b4760', fontWeight: 700 } },
    zAxis3D: { type: 'value', name: '%', max: 130, axisLabel: { color: '#6b778c' } },
    grid3D: { boxWidth: 150, boxDepth: 110, boxHeight: 60, environment: 'none', axisLine: { lineStyle: { color: '#cbd5e1' } }, splitLine: { lineStyle: { color: 'rgba(24,35,58,.06)' } }, axisPointer: { show: false },
      viewControl: { alpha: 24, beta: 38, distance: 210, autoRotate: true, autoRotateSpeed: 4, autoRotateAfterStill: 4 },
      light: { main: { intensity: 1.2, shadow: true, alpha: 40, beta: 30 }, ambient: { intensity: 0.45 } } },
    series: [{ type: 'bar3D', data: data3, shading: 'lambert', bevelSize: 0.35, bevelSmoothness: 4, barSize: 5.5, itemStyle: { opacity: 0.95 }, animationDurationUpdate: 1200, emphasis: { itemStyle: { color: '#8b5cf6' } } }]
  });

  // Radar
  chart(el.querySelector('#radar'), {
    tooltip: {}, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } },
    radar: { indicator: LAM.kriteria.map(k => ({ name: `${k.nama}\n(${k.bobot}%)`, max: 4 })), radius: '64%', center: ['50%', '46%'], splitNumber: 4, axisName: { color: '#3b4760', fontSize: 11, fontWeight: 600 }, splitArea: { areaStyle: { color: ['rgba(14,165,233,.02)', 'rgba(14,165,233,.05)'] } }, splitLine: { lineStyle: { color: 'rgba(24,35,58,.08)' } }, axisLine: { lineStyle: { color: 'rgba(24,35,58,.08)' } } },
    series: [{ type: 'radar', symbolSize: 5, data: ev.map((e, i) => ({ name: e.prodi, value: e.kriteria.map(k => k.skor), lineStyle: { width: 2.2, color: PAL[i] }, itemStyle: { color: PAL[i] }, areaStyle: { color: PAL[i] + '22' } })) }]
  });

  // Sunburst Renstra → IKU → status
  const sunData = RENSTRA.map((ss, si) => ({
    name: ss.id, itemStyle: { color: PAL[si] }, children: IKU.filter(k => k.ss === ss.id).map(k => {
      const x = inds.filter(i => i.iku === k.id); const c = summary(x);
      return { name: k.id, value: Math.max(1, x.length), ket: k.nama, children: ['ok', 'near', 'bad', 'na'].filter(s => c[s]).map(s => ({ name: KELAS[s].nama, value: c[s], itemStyle: { color: KELAS[s].warna } })) };
    }).filter(k => k.children.length)
  })).filter(s => s.children.length);
  chart(el.querySelector('#sun'), {
    tooltip: { formatter: p => `${p.data.ket || p.name}<br>${p.value} indikator` },
    series: [{ type: 'sunburst', data: sunData, radius: ['12%', '92%'], sort: null, itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 6 },
      label: { fontSize: 10, color: '#fff', fontWeight: 700, minAngle: 8 },
      levels: [{}, { r0: '12%', r: '38%', label: { rotate: 0, fontSize: 12 } }, { r0: '38%', r: '72%', label: { rotate: 'tangential' } }, { r0: '72%', r: '80%', label: { show: false } }] }]
  });

  // Stacked per unit
  const byU = UNITS.map(u => summary(all.filter(i => i.unit === u.id)));
  chart(el.querySelector('#stack'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 16, top: 10, bottom: 30, containLabel: true },
    xAxis: { type: 'value', ...AX }, yAxis: { type: 'category', data: units, ...AX, axisLabel: { ...AX.axisLabel, fontWeight: 700, color: '#3b4760' } },
    series: ['ok', 'near', 'bad', 'na'].map((s, i) => ({ name: KELAS[s].nama, type: 'bar', stack: 'a', barWidth: 14, data: byU.map(x => x[s]), itemStyle: { color: KELAS[s].warna, borderRadius: i === 3 ? [0, 6, 6, 0] : 0 } }))
  });

  // Eisenhower
  const eisPts = inds.map(i => {
    const st = indStat(i); const q = (i.peningkatan && i.peningkatan.eis) || 'NI-NU';
    const imp = q.startsWith('I-') ? 1 : 0, urg = q.endsWith('-U') ? 1 : 0;
    const jit = (n) => ((parseInt(i.id.slice(3), 10) * n) % 100) / 100 * 0.8 + 0.1;
    return { value: [urg + jit(37), imp + jit(53)], name: i.teks, unit: i.unit, q, itemStyle: { color: EIS[q].warna }, k: st.k };
  });
  chart(el.querySelector('#eis'), {
    tooltip: { formatter: p => `<b>${p.data.unit}</b> · ${EIS[p.data.q].nama}<br>${esc(p.data.name).slice(0, 80)}` },
    grid: { left: 30, right: 16, top: 16, bottom: 30 },
    xAxis: { min: 0, max: 2, interval: 1, ...AX, name: 'Mendesak →', nameLocation: 'middle', nameGap: 12, axisLabel: { show: false }, splitLine: { lineStyle: { color: 'rgba(24,35,58,.15)' } } },
    yAxis: { min: 0, max: 2, interval: 1, ...AX, name: 'Penting →', nameLocation: 'middle', nameGap: 12, axisLabel: { show: false }, splitLine: { lineStyle: { color: 'rgba(24,35,58,.15)' } } },
    series: [{ type: 'scatter', symbolSize: 11, data: eisPts, itemStyle: { opacity: .85, borderColor: '#fff', borderWidth: 1.5 },
      markArea: { silent: true, label: { color: '#6b778c', fontSize: 11, fontWeight: 700, position: 'insideTopLeft' }, data: [
        [{ name: 'Jadwalkan', coord: [0, 1], itemStyle: { color: 'rgba(245,165,36,.07)' } }, { coord: [1, 2] }],
        [{ name: 'Kerjakan segera', coord: [1, 1], itemStyle: { color: 'rgba(240,97,109,.08)' } }, { coord: [2, 2] }],
        [{ name: 'Pantau', coord: [0, 0], itemStyle: { color: 'rgba(148,163,184,.07)' } }, { coord: [1, 1] }],
        [{ name: 'Delegasikan', coord: [1, 0], itemStyle: { color: 'rgba(56,189,248,.07)' } }, { coord: [2, 1] }]] } }]
  });

  const seen = new Set();
  const ranked = inds.map(i => ({ i, s: indStat(i) })).filter(x => x.s.r != null).sort((a, b) => b.s.r - a.s.r).filter(x => { const k = x.i.key || x.i.id; if (seen.has(k)) return false; seen.add(k); return true; });
  const barOpt = (arr, c1, c2) => ({
    tooltip: { formatter: p => `${esc(arr[p.dataIndex].i.teks)}<br><b>${Math.round(p.value)}%</b> dari target` },
    grid: { left: 8, right: 40, top: 6, bottom: 6, containLabel: true },
    xAxis: { type: 'value', show: false, max: v => Math.max(130, v.max) },
    yAxis: { type: 'category', inverse: true, data: arr.map(x => x.i.unit + ' · ' + x.i.teks.slice(0, 32) + (x.i.teks.length > 32 ? '…' : '')), ...AX, axisLabel: { ...AX.axisLabel, width: 210, overflow: 'truncate' } },
    series: [{ type: 'bar', barWidth: 12, data: arr.map(x => Math.round(Math.min(2, x.s.r) * 100)), itemStyle: { borderRadius: 8, color: grad(c1, c2, true) }, label: { show: true, position: 'right', formatter: '{c}%', fontSize: 11, fontWeight: 700 } }]
  });
  chart(el.querySelector('#top'), barOpt(ranked.slice(0, 5), '#6ee7b7', '#10b981'));
  chart(el.querySelector('#bot'), barOpt(ranked.slice(-5).reverse(), '#fda4af', '#f0616d'));
  void fmt;
}
