import { S, icon, esc } from '../app.js';
import { chart, AX, grad, PAL } from '../charts.js';
import { PRODI, UNIT, AKR_RIIL } from '../seed.js';
import { LAM, IABEE } from '../config.js';
import { evalProdi, LEVERS, SKENARIO, scenarioValues, sp9Scenario, fmt, round } from '../scoring.js';

const ST = { prodi: 'TP', sken: 'mod', year: null, vals: null, sp9: null, custom: false };
const LVL_NAMA = { unggul5: 'Unggul 5 th', unggul3: 'Unggul 3 th', terakreditasi: 'Terakreditasi', gagal: 'Belum memenuhi' };

function baseline(prodi) {
  const e = evalProdi(S, prodi);
  const b = {}; e.rows.forEach(r => { b[r.key] = r.v; });
  return { e, b, sp9: e.sp9 };
}
function reakrYear(prodi) { return Math.min(2030, Math.max(S.settings.tahun, +(UNIT[prodi].reakr || '2028').slice(0, 4))); }
function applySken() {
  const { b, sp9 } = baseline(ST.prodi);
  const n = ST.year - S.settings.tahun;
  ST.vals = scenarioValues(b, ST.sken, n, ST.prodi);
  ST.sp9 = sp9Scenario(sp9, ST.sken, n);
  ST.custom = false;
}

export default function simulasi(el) {
  if (!ST.year) ST.year = reakrYear(ST.prodi);
  if (!ST.vals) applySken();
  const { e: e0, b } = baseline(ST.prodi);
  const e = evalProdi(S, ST.prodi, ST.vals, ST.sp9);
  const yrs = []; for (let y = S.settings.tahun; y <= 2030; y++) yrs.push(y);

  el.innerHTML = `
  <div class="card" style="margin-bottom:18px">
    <div class="filters" style="margin:0">
      <div class="field"><label>Program studi</label><div class="seg" id="sp">${PRODI.map(p => `<button data-p="${p.id}" class="${ST.prodi === p.id ? 'on' : ''}" title="${p.nama}">${p.id}</button>`).join('')}</div></div>
      <div class="field"><label>Skenario</label><div class="seg" id="sk">${SKENARIO.map(s => `<button data-s="${s.id}" class="${ST.sken === s.id && !ST.custom ? 'on' : ''}" title="${s.ket}">${s.nama}</button>`).join('')}${ST.custom ? '<button class="on">Kustom</button>' : ''}</div></div>
      <div class="field" style="min-width:200px;flex:1"><label>Tahun proyeksi: <b id="yv">${ST.year}</b> ${ST.year === reakrYear(ST.prodi) ? '<span class="tag" style="--c:#8b5cf6">tahun re-akreditasi</span>' : ''}</label><input type="range" id="yr" min="${S.settings.tahun}" max="2030" step="1" value="${ST.year}" style="accent-color:#8b5cf6"></div>
      <button class="btn" id="reset">${icon('loop')} Kembali ke skenario</button>
    </div>
    <div class="note" style="margin-top:8px">${esc(UNIT[ST.prodi].nama)} · jenjang Sarjana Terapan · re-akreditasi ${UNIT[ST.prodi].reakr || '–'} · NA SK terakhir ${AKR_RIIL[ST.prodi] ? AKR_RIIL[ST.prodi].na : '–'} · SP4 dan SP5 dihitung dari dosen homebase · ${esc((SKENARIO.find(s => s.id === ST.sken) || {}).ket || '')}</div>
  </div>

  <div class="grid g-12">
    <div class="card" style="align-self:start">
      <div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('sim')}</span><div><h3>Tuas capaian</h3><div class="sub">Geser untuk menguji "bagaimana jika"</div></div></div>
      ${LEVERS.filter(L => b[L.key] != null).map(L => {
        const v = ST.vals[L.key]; const d = v - b[L.key];
        return `<div class="lever ${L.sp ? 'sp' : ''}"><label for="lv_${L.key}">${L.nama}</label><div class="vv" id="vv_${L.key}">${fmt(v, L.step < 1 ? (L.step < .1 ? 2 : 1) : 0)}</div>
          <input type="range" id="lv_${L.key}" data-k="${L.key}" min="${L.min}" max="${L.max}" step="${L.step}" value="${v}">
          <div class="hint"><span>kini ${fmt(b[L.key], L.step < 1 ? (L.step < .1 ? 2 : 1) : 0)}</span><span style="color:${(L.mod < 0 ? -d : d) > 0 ? '#10b981' : (d === 0 ? '#94a3b8' : '#f0616d')}">${d === 0 ? '±0' : (d > 0 ? '+' : '') + fmt(d, L.step < 1 ? 2 : 0)}</span></div></div>`;
      }).join('')}
      <div class="lever sp"><label for="lv_sp9">Aspek penjaminan mutu terpenuhi (SP9)</label><div class="vv">${ST.sp9}/4</div><input type="range" id="lv_sp9" min="0" max="4" step="1" value="${ST.sp9}"><div class="hint"><span>kini ${e0.sp9}/4 (dihitung dari aktivitas AMI/RTM/RTL)</span><span></span></div></div>
    </div>

    <div class="grid" style="align-content:start">
      <div class="grid g2">
        <div class="status-card tilt" style="--c:${e.status.warna}">
          <div class="lb">Nilai Akreditasi (NA) simulasi ${ST.year}</div>
          <div class="big"><span id="na">${fmt(e.NA, 1)}</span><span style="font-size:18px;opacity:.75"> / 400</span></div>
          <div class="nm">${e.status.nama}</div>
          <div class="lb" style="margin-top:6px">Kondisi kini: NA ${fmt(e0.NA, 1)} · ${e0.status.nama} · Δ ${e.NA - e0.NA >= 0 ? '+' : ''}${fmt(e.NA - e0.NA, 1)}</div>
        </div>
        <div class="card tilt" style="padding:10px"><div class="chart sm" id="gna"></div></div>
      </div>
      <div class="grid g2">
        <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('medal')}</span><div><h3>Kontribusi kriteria</h3><div class="sub">bobot × skor (0–4) × 100</div></div></div><div class="chart sm" id="kr"></div></div>
        <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('sim')}</span><div><h3>Jembatan NA</h3><div class="sub">Dari kondisi kini ke simulasi</div></div></div><div class="chart sm" id="wf"></div></div>
      </div>
      <div class="grid">
        <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#7c3aed">${icon('check')}</span><div><h3>Syarat perlu (Sarjana Terapan)</h3><div class="sub">Tingkat tertinggi yang terpenuhi</div></div></div>
          ${e.sp.map(s => `<div class="sp-row"><b>${s.id}</b><span>${esc(s.nama)}<div class="muted small">${s.terakreditasi != null ? `T: ${s.jenis === 'max' ? '≤' : '≥'}${s.terakreditasi} · ` : ''}U3: ${s.jenis === 'max' ? '≤' : '≥'}${s.unggul3} · U5: ${s.jenis === 'max' ? '≤' : '≥'}${s.unggul5} ${esc(s.satuan)}</div></span><span class="num"><b>${s.nilai == null ? '–' : fmt(s.nilai, s.nilai % 1 ? 2 : 0)}</b></span><span class="lvl ${s.level} lv2">${LVL_NAMA[s.level]}</span></div>`).join('')}
        </div>
        <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('globe')}</span><div><h3>Prediksi IABEE</h3><div class="sub">Rating per kriteria: A · C · W · D</div></div></div>
          ${e.iabee.kriteria.map(k => { const r = IABEE.rating.find(x => x.kode === k.rating); return `<div class="sp-row" style="grid-template-columns:40px minmax(0,1fr) 54px"><span class="acwd" style="--c:${r.warna}">${k.rating}</span><span><b>${k.id} · ${esc(k.nama)}</b><div class="muted small">${k.n ? 'skor ' + fmt(k.skor, 2) + ' dari ' + k.n + ' indikator' : 'belum ada indikator — diasumsikan Concern'}</div></span><span class="small muted">${r.nama}</span></div>`; }).join('')}
          <div class="status-card" style="--c:${e.iabee.keputusan.kode === 'AC5' ? '#10b981' : e.iabee.keputusan.kode === 'IE2' ? '#f5a524' : '#f0616d'};margin-top:12px;padding:14px"><div class="lb">Keputusan IABEE (prediksi)</div><div class="nm" style="margin-top:2px">${e.iabee.keputusan.nama}</div><div class="lb">${e.iabee.keputusan.aturan}</div></div>
        </div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('pulse')}</span><div><h3>Proyeksi NA ${S.settings.tahun}–2030 · ${ST.prodi}</h3><div class="sub">Garis = skenario; pita = ambang status LAM Teknik</div></div></div>
    <div class="chart lg" id="proj"></div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('grid4')}</span><div><h3>Perbandingan skenario seluruh prodi pada tahun re-akreditasi</h3><div class="sub">Status yang diperoleh jika skenario dijalankan sampai tahun re-akreditasi</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>Re-akreditasi</th>${SKENARIO.map(s => `<th>${s.nama}</th>`).join('')}</tr></thead><tbody>
    ${PRODI.map(p => { const { b: bb, sp9 } = baseline(p.id); const n = reakrYear(p.id) - S.settings.tahun; return `<tr><td><b>${p.id}</b><div class="muted small">${esc(p.nama)}</div></td><td>${p.reakr || '–'}</td>${SKENARIO.map(s => { const r = evalProdi(S, p.id, scenarioValues(bb, s.id, n, p.id), sp9Scenario(sp9, s.id, n)); return `<td><span class="tag" style="--c:${r.status.warna}">${r.status.kode}</span> <b>${fmt(r.NA, 1)}</b><div class="muted small">${r.status.nama}</div></td>`; }).join('')}</tr>`; }).join('')}
    </tbody></table></div>
  </div>`;

  // interaksi
  el.querySelectorAll('#sp button').forEach(x => x.onclick = () => { ST.prodi = x.dataset.p; ST.year = reakrYear(ST.prodi); applySken(); simulasi(el); });
  el.querySelectorAll('#sk button[data-s]').forEach(x => x.onclick = () => { ST.sken = x.dataset.s; applySken(); simulasi(el); });
  el.querySelector('#yr').oninput = ev => { el.querySelector('#yv').textContent = ev.target.value; };
  el.querySelector('#yr').onchange = ev => { ST.year = +ev.target.value; applySken(); simulasi(el); };
  el.querySelector('#reset').onclick = () => { applySken(); simulasi(el); };
  el.querySelectorAll('input[data-k]').forEach(inp => {
    const L = LEVERS.find(l => l.key === inp.dataset.k);
    inp.oninput = () => { el.querySelector('#vv_' + L.key).textContent = fmt(+inp.value, L.step < 1 ? (L.step < .1 ? 2 : 1) : 0); };
    inp.onchange = () => { ST.vals[L.key] = +inp.value; ST.custom = true; simulasi(el); };
  });
  el.querySelector('#lv_sp9').onchange = ev => { ST.sp9 = +ev.target.value; ST.custom = true; simulasi(el); };

  // gauge NA dengan pita ambang
  const A = LAM.ambang;
  chart(el.querySelector('#gna'), {
    series: [{
      type: 'gauge', min: 0, max: 400, startAngle: 200, endAngle: -20, radius: '88%', center: ['50%', '58%'], splitNumber: 4,
      axisLine: { lineStyle: { width: 14, color: [[A.terakreditasi / 400, '#f0616d'], [A.unggulBawah / 400, '#f5a524'], [A.unggul / 400, '#16a3b8'], [1, '#10b981']] } },
      pointer: { length: '62%', width: 6, itemStyle: { color: '#18233a' } }, anchor: { show: true, size: 12, itemStyle: { color: '#18233a' } },
      axisTick: { show: false }, splitLine: { length: 14, lineStyle: { color: '#fff', width: 2 } }, axisLabel: { distance: -38, fontSize: 10, color: '#6b778c' },
      detail: { valueAnimation: true, offsetCenter: [0, '62%'], fontSize: 22, fontWeight: 800, formatter: v => fmt(v, 1) },
      title: { show: false }, data: [{ value: e.NA }]
    }]
  });
  chart(el.querySelector('#kr'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => ps.map(p => `${p.seriesName}: <b>${fmt(p.value, 1)}</b>`).join('<br>') },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } }, grid: { left: 8, right: 10, top: 10, bottom: 28, containLabel: true },
    xAxis: { type: 'category', data: e.kriteria.map(k => k.id), ...AX }, yAxis: { type: 'value', ...AX },
    series: [
      { name: 'Kini', type: 'bar', data: e0.kriteria.map(k => k.bobot * k.skor), barWidth: 12, itemStyle: { color: '#cbd5e1', borderRadius: [6, 6, 0, 0] } },
      { name: 'Simulasi', type: 'bar', data: e.kriteria.map(k => k.bobot * k.skor), barWidth: 12, itemStyle: { color: grad('#8b5cf6', '#0ea5e9'), borderRadius: [6, 6, 0, 0] } },
      { name: 'Maksimum', type: 'scatter', data: e.kriteria.map(k => k.bobot * 4), symbol: 'rect', symbolSize: [22, 3], itemStyle: { color: '#f0616d' } }
    ]
  });
  // waterfall
  const deltas = e.kriteria.map((k, i) => round(k.bobot * k.skor - e0.kriteria[i].bobot * e0.kriteria[i].skor, 1));
  const cats = ['Kini', ...e.kriteria.map(k => k.id), 'Simulasi'];
  let run = e0.NA; const helper = [0], pos = [e0.NA], neg = [0];
  deltas.forEach(d => { if (d >= 0) { helper.push(run); pos.push(d); neg.push(0); run += d; } else { run += d; helper.push(run); pos.push(0); neg.push(-d); } });
  helper.push(0); pos.push(e.NA); neg.push(0);
  chart(el.querySelector('#wf'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => { const i = ps[0].dataIndex; return i === 0 || i === cats.length - 1 ? `${cats[i]}: <b>${fmt(pos[i], 1)}</b>` : `${cats[i]}: <b>${deltas[i - 1] >= 0 ? '+' : ''}${fmt(deltas[i - 1], 1)}</b>`; } },
    grid: { left: 8, right: 10, top: 10, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: cats, ...AX }, yAxis: { type: 'value', ...AX, min: Math.max(0, Math.floor((Math.min(e0.NA, e.NA) - 30) / 10) * 10), max: v => Math.ceil((v.max + 5) / 10) * 10 },
    series: [
      { type: 'bar', stack: 'w', data: helper, itemStyle: { color: 'transparent' }, emphasis: { disabled: true } },
      { type: 'bar', stack: 'w', data: pos.map((v, i) => ({ value: v, itemStyle: { color: i === 0 ? '#94a3b8' : i === cats.length - 1 ? e.status.warna : '#10b981', borderRadius: 6 } })), barWidth: 22 },
      { type: 'bar', stack: 'w', data: neg, itemStyle: { color: '#f0616d', borderRadius: 6 } }
    ]
  });
  // proyeksi
  const { b: bb, sp9: s9 } = baseline(ST.prodi);
  const scen = SKENARIO.filter(s => s.id !== 'base');
  chart(el.querySelector('#proj'), {
    tooltip: { trigger: 'axis', formatter: ps => `<b>${ps[0].axisValue}</b><br>` + ps.map(p => `${p.marker}${p.seriesName}: <b>${fmt(p.value, 1)}</b> ${p.data.st || ''}`).join('<br>') },
    legend: { top: 0, icon: 'roundRect', itemWidth: 14, textStyle: { fontSize: 12 } }, grid: { left: 8, right: 70, top: 40, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: yrs.map(String), boundaryGap: false, ...AX }, yAxis: { type: 'value', min: 150, max: 400, ...AX },
    series: [{ id: 'base', nama: 'Tanpa intervensi' }, ...scen.map(s => ({ id: s.id, nama: s.nama }))].map((s, si) => ({
      name: s.nama, type: 'line', smooth: true, symbolSize: 9, lineStyle: { width: si === 0 ? 2 : 3.5, type: si === 0 ? 'dashed' : 'solid' },
      itemStyle: { color: si === 0 ? '#94a3b8' : PAL[[2, 0, 1][si - 1]] },
      data: yrs.map(y => { const r = evalProdi(S, ST.prodi, scenarioValues(bb, s.id, y - S.settings.tahun, ST.prodi), sp9Scenario(s9, s.id, y - S.settings.tahun)); return { value: r.NA, st: r.status.kode }; }),
      markArea: si === 0 ? { silent: true, label: { position: 'right', fontSize: 10.5, fontWeight: 700 }, data: [
        [{ name: 'Unggul', yAxis: A.unggul, itemStyle: { color: 'rgba(16,185,129,.08)' }, label: { color: '#047857' } }, { yAxis: 400 }],
        [{ name: 'Unggul*', yAxis: A.unggulBawah, itemStyle: { color: 'rgba(22,163,184,.07)' }, label: { color: '#0e7490' } }, { yAxis: A.unggul }],
        [{ name: 'Terakreditasi', yAxis: A.terakreditasi, itemStyle: { color: 'rgba(245,165,36,.06)' }, label: { color: '#92400e' } }, { yAxis: A.unggulBawah }]] } : undefined,
      markLine: si === 0 ? { symbol: 'none', lineStyle: { color: '#8b5cf6', type: 'dotted', width: 2 }, label: { formatter: 'Re-akreditasi', color: '#7c3aed', fontWeight: 700 }, data: [{ xAxis: String(reakrYear(ST.prodi)) }] } : undefined
    }))
  });
}
