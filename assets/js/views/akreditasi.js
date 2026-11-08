import { S, icon, esc } from '../app.js';
import { chart, AX, countUp } from '../charts.js';
import { UNIT, PRODI, AKR_RIIL } from '../seed.js';
import { LAM, IABEE } from '../config.js';
import { fmt } from '../scoring.js';
import { evalAll } from './common.js';

const LV = { unggul5: 3, unggul3: 2, terakreditasi: 1, gagal: 0 };
const LVN = ['Belum', 'Terakreditasi', 'Unggul 3 th', 'Unggul 5 th'];

export default function akreditasi(el) {
  const ev = evalAll();
  const now = new Date(`${S.settings.tahun}-${String(S.settings.bulan + 1).padStart(2, '0')}-07`);
  el.innerHTML = `
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
    ${ev.map(e => { const u = UNIT[e.prodi]; const bln = Math.round((new Date(u.reakr) - now) / (30.4 * 864e5)); return `
    <div class="status-card tilt" style="--c:${e.status.warna}">
      <div class="lb">${e.prodi}${u.pilot ? ' · pilot IABEE' : ''}</div>
      <div class="big" style="font-size:38px"><span data-n="${e.NA}">0</span></div>
      <div class="lb">NA simulasi kondisi kini / 400${AKR_RIIL[e.prodi] ? ' · NA SK ' + AKR_RIIL[e.prodi].na : ''}</div>
      <div class="nm" style="font-size:14px">${e.status.nama}</div>
      <div class="lb" style="margin-top:6px">${icon('calendar')} Re-akreditasi ${u.reakr} · ${bln} bulan lagi</div>
    </div>`; }).join('')}
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('medal')}</span><div><h3>Nilai Akreditasi per prodi</h3><div class="sub">Ditumpuk per kriteria LAM 2025</div></div></div><div class="chart" id="na"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#7c3aed">${icon('grid4')}</span><div><h3>Peta syarat perlu</h3><div class="sub">Tingkat tertinggi terpenuhi per syarat</div></div></div><div class="chart" id="hm"></div></div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('globe')}</span><div><h3>Matriks prediksi IABEE</h3><div class="sub">Rating per kriteria & keputusan</div></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th>${IABEE.kriteria.map(k => `<th title="${esc(k.nama)}">${k.id}</th>`).join('')}<th>Keputusan</th></tr></thead><tbody>
      ${ev.map(e => `<tr><td><b>${e.prodi}</b></td>${e.iabee.kriteria.map(k => { const r = IABEE.rating.find(x => x.kode === k.rating); return `<td><span class="acwd" style="--c:${r.warna};width:26px;height:26px;font-size:12px" title="${r.nama}">${k.rating}</span></td>`; }).join('')}<td><span class="tag" style="--c:${e.iabee.keputusan.kode === 'AC5' ? '#10b981' : e.iabee.keputusan.kode === 'IE2' ? '#f5a524' : '#f0616d'}">${e.iabee.keputusan.nama}</span></td></tr>`).join('')}
      </tbody></table></div>
      <div class="note" style="margin-top:8px">${IABEE.kriteria.map(k => `<b>${k.id}</b> ${esc(k.nama)}`).join(' · ')}</div>
    </div>
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f472b6">${icon('loop')}</span><div><h3>Aspek penjaminan mutu (SP9)</h3><div class="sub">Dihitung otomatis dari aktivitas di SIMANTAP</div></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Aspek</th>${ev.map(e => `<th>${e.prodi}</th>`).join('')}</tr></thead><tbody>
      ${ev[0].aspek.map((a, ai) => `<tr><td class="small">${esc(a.nama)}</td>${ev.map(e => `<td title="${esc(e.aspek[ai].detail)}">${e.aspek[ai].ok ? `<span style="color:#10b981">${icon('check')}</span>` : `<span style="color:#f0616d">${icon('close')}</span>`}</td>`).join('')}</tr>`).join('')}
      <tr><td><b>Skor SP9</b></td>${ev.map(e => `<td><b>${e.sp9}</b>/4</td>`).join('')}</tr>
      </tbody></table></div>
      <div class="note" style="margin-top:8px">Unggul 5 tahun memerlukan rerata ≥ 3,5 → keempat aspek harus terpenuhi. Arahkan kursor ke ikon untuk melihat rinciannya.</div>
    </div>
  </div>`;
  el.querySelectorAll('[data-n]').forEach(n => countUp(n, +n.dataset.n, 1));

  chart(el.querySelector('#na'), {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } }, legend: { bottom: 0, icon: 'circle', itemWidth: 8, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 60, top: 14, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: ev.map(e => e.prodi), ...AX }, yAxis: { type: 'value', max: 400, ...AX },
    series: [...LAM.kriteria.map((k, i) => ({ name: k.nama, type: 'bar', stack: 'na', barWidth: 30, data: ev.map(e => +(e.kriteria[i].bobot * e.kriteria[i].skor).toFixed(1)), itemStyle: { color: ['#10b981', '#0ea5e9', '#8b5cf6', '#f5a524'][i], borderRadius: i === 3 ? [8, 8, 0, 0] : 0 } })),
      { type: 'line', data: [], markLine: { symbol: 'none', label: { position: 'end', fontSize: 10.5, fontWeight: 700 }, data: [
        { yAxis: LAM.ambang.unggul, lineStyle: { color: '#10b981', type: 'dashed' }, label: { formatter: 'Unggul ' + LAM.ambang.unggul, color: '#047857' } },
        { yAxis: LAM.ambang.unggulBawah, lineStyle: { color: '#16a3b8', type: 'dashed' }, label: { formatter: LAM.ambang.unggulBawah, color: '#0e7490' } },
        { yAxis: LAM.ambang.terakreditasi, lineStyle: { color: '#f5a524', type: 'dashed' }, label: { formatter: 'T ' + LAM.ambang.terakreditasi, color: '#92400e' } }] } }]
  });
  const sps = ev[0].sp.map(s => s.id);
  const hm = [];
  ev.forEach((e, pi) => e.sp.forEach((s, si) => hm.push([si, pi, LV[s.level], s.nilai])));
  chart(el.querySelector('#hm'), {
    tooltip: { formatter: p => `${ev[p.value[1]].prodi} · ${sps[p.value[0]]} ${esc(ev[0].sp[p.value[0]].nama)}<br>Nilai: <b>${p.value[3] == null ? '–' : fmt(p.value[3], p.value[3] % 1 ? 2 : 0)}</b> → ${LVN[p.value[2]]}` },
    grid: { left: 8, right: 10, top: 10, bottom: 46, containLabel: true },
    xAxis: { type: 'category', data: sps, ...AX, splitArea: { show: false } }, yAxis: { type: 'category', data: ev.map(e => e.prodi), ...AX, axisLabel: { ...AX.axisLabel, fontWeight: 700, color: '#3b4760' } },
    visualMap: { type: 'piecewise', dimension: 2, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 10.5 }, pieces: [{ value: 3, label: 'Unggul 5', color: '#10b981' }, { value: 2, label: 'Unggul 3', color: '#38bdf8' }, { value: 1, label: 'Terakreditasi', color: '#fbbf24' }, { value: 0, label: 'Belum', color: '#f0616d' }] },
    series: [{ type: 'heatmap', data: hm, itemStyle: { borderColor: '#fff', borderWidth: 3, borderRadius: 8 }, label: { show: true, formatter: p => p.value[3] == null ? '–' : fmt(p.value[3], p.value[3] % 1 ? 1 : 0), fontSize: 10, color: '#fff', fontWeight: 700 } }]
  });
  void PRODI;
}
