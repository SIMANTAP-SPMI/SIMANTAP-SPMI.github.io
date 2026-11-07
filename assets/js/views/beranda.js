import { S, icon } from '../app.js';
import { chart, countUp, AX, grad } from '../charts.js';
import { mountHero } from '../hero3d.js';
import { SUMBER, PRODI } from '../seed.js';
import { BULAN, BLN } from '../scoring.js';
import { active, summary, evalAll, indStat } from './common.js';

export default function beranda(el) {
  const m = S.settings.bulan;
  const inds = active();
  const sum = summary(inds);
  const ev = evalAll();
  const unggul = ev.filter(e => e.status.kode === 'U5' || e.status.kode === 'U3').length;
  const rtlV = S.rtl.filter(r => r.status === 'Terverifikasi').length;
  const ppepp = [
    { t: 'Penetapan', ic: 'flag', c: '#10b981', n: inds.length, s: 'indikator ditetapkan' },
    { t: 'Pelaksanaan', ic: 'pulse', c: '#0ea5e9', n: inds.filter(i => indStat(i).m != null && indStat(i).m >= m - 1).length, s: 'capaian mutakhir' },
    { t: 'Evaluasi (AMI)', ic: 'audit', c: '#8b5cf6', n: inds.filter(i => i.ami).length, s: 'indikator diaudit' },
    { t: 'Pengendalian', ic: 'loop', c: '#f5a524', n: S.rtl.length, s: `RTL · ${rtlV} terverifikasi` },
    { t: 'Peningkatan', ic: 'spark', c: '#f472b6', n: inds.filter(i => i.peningkatan && i.peningkatan.status === 'Tingkatkan').length, s: 'standar ditingkatkan' }
  ];

  el.innerHTML = `
  <section class="hero">
    <canvas class="h3d" id="h3d"></canvas>
    <div class="hcontent">
      <span class="eyebrow">${icon('spark')} SPMI Digital · Siklus PPEPP · ${BULAN[m]} ${S.settings.tahun}</span>
      <h2>Mutu yang terukur,<br>akreditasi yang terencana.</h2>
      <p>SIMANTAP 2.0 menautkan RSB, target BLU, dan Kontrak Kinerja Kepala Badan dengan IKU/IKT, standar SPMI, serta instrumen LAM Teknik 2025 dan IABEE, lalu mensimulasikan dampaknya terhadap status akreditasi.</p>
      <a class="btn pri" href="#/simulasi">${icon('sim')} Buka simulasi skenario</a>
      <a class="btn ghost" href="#/dashboard">${icon('dash')} Dashboard pimpinan</a>
      <div class="hstats">
      <div class="glass"><b id="c1">0</b><span class="gl">indikator aktif · 7 sumber</span></div>
      <div class="glass"><b><span id="c2">0</span>%</b><span class="gl">indikator tercapai per ${BULAN[m]}</span></div>
      <div class="glass"><b><span id="c3">0</span>/${PRODI.length}</b><span class="gl">prodi Unggul (simulasi LAM 2025)</span></div>
      <div class="glass"><b id="c4">0</b><span class="gl">RTL hasil AMI terverifikasi</span></div>
      </div>
    </div>
    <div class="h3d-space"></div>
  </section>

  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('loop')}</span><div><h3>Alur PPEPP berjalan</h3><div class="sub">Setiap indikator membawa jejak Penetapan → Pelaksanaan → Evaluasi → Pengendalian → Peningkatan</div></div></div>
    <div class="ppepp">${ppepp.map(p => `<div class="pstep" style="--c:${p.c}"><div class="orb">${icon(p.ic)}</div><b>${p.t}</b><div class="n" data-n="${p.n}">0</div><small>${p.s}</small></div>`).join('')}</div>
  </div>

  <div class="grid g-21" style="margin-top:18px">
    <div class="card tilt">
      <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('pulse')}</span><div><h3>Tren indeks capaian institusi</h3><div class="sub">Rata-rata rasio capaian/target seluruh indikator, per bulan</div></div></div>
      <div class="chart" id="trend"></div>
    </div>
    <div class="card tilt">
      <div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('grid4')}</span><div><h3>Capaian per sumber kebijakan</h3><div class="sub">% indikator tercapai</div></div></div>
      <div class="chart" id="polar"></div>
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('calendar')}</span><div><h3>Kalender mutu berlapis</h3><div class="sub">Ritme pemantauan yang dijalankan sistem</div></div></div>
    <div class="flow">
      <div class="fbox"><span class="ico-badge" style="--c:#0ea5e9">${icon('pulse')}</span><b>Bulanan</b><small>Unit memutakhirkan capaian & unggah bukti; dashboard otomatis.</small></div>
      <div class="fbox"><span class="ico-badge" style="--c:#14b8a6">${icon('target')}</span><b>Triwulanan</b><small>Evaluasi IKU/IKT terhadap RSB, PK BLU, dan Kokin.</small></div>
      <div class="fbox"><span class="ico-badge" style="--c:#8b5cf6">${icon('audit')}</span><b>Semester/Tahunan</b><small>AMI berbasis indikator; temuan → RTL dengan PIC & tenggat.</small></div>
      <div class="fbox"><span class="ico-badge" style="--c:#f472b6">${icon('meet')}</span><b>Tahunan</b><small>RTM menetapkan peningkatan standar & target tahun berikut.</small></div>
    </div>
  </div>`;

  countUp(el.querySelector('#c1'), inds.length);
  countUp(el.querySelector('#c2'), sum.pct, 0);
  countUp(el.querySelector('#c3'), unggul);
  countUp(el.querySelector('#c4'), rtlV);
  el.querySelectorAll('.pstep .n').forEach(n => countUp(n, +n.dataset.n));

  const pal = ['#6ee7b7', '#7dd3fc', '#c4b5fd', '#fcd34d', '#f9a8d4'];
  mountHero(el.querySelector('#h3d'), ev.map((e, i) => ({ v: e.NA / 400, c: pal[i % pal.length] })));

  const months = BLN.slice(0, m + 1);
  const idx = months.map((_, k) => Math.round(summary(inds, k).idx * 10) / 10);
  chart(el.querySelector('#trend'), {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months, boundaryGap: false, ...AX },
    yAxis: { type: 'value', min: v => Math.floor(v.min / 10) * 10, ...AX, axisLabel: { ...AX.axisLabel, formatter: '{value}%' } },
    series: [{
      type: 'line', data: idx, smooth: true, symbolSize: 8, lineStyle: { width: 3.5, color: grad('#10b981', '#0ea5e9', true) },
      itemStyle: { color: '#0ea5e9', borderColor: '#fff', borderWidth: 2 },
      areaStyle: { color: grad('rgba(14,165,233,.28)', 'rgba(14,165,233,0)') },
      markLine: { symbol: 'none', lineStyle: { color: '#f0616d', type: 'dashed' }, label: { formatter: 'Target 100%', color: '#f0616d' }, data: [{ yAxis: 100 }] }
    }]
  });
  const bySum = SUMBER.map(s => { const x = inds.filter(i => i.sumber.includes(s.id)); return { s, pct: Math.round(summary(x).pct), n: x.length }; });
  chart(el.querySelector('#polar'), {
    tooltip: { formatter: p => `${bySum[p.dataIndex].s.nama}<br><b>${p.value}%</b> tercapai · ${bySum[p.dataIndex].n} indikator` },
    angleAxis: { max: 100, startAngle: 90, show: false },
    radiusAxis: { type: 'category', data: bySum.map(x => `${x.s.id}  ${x.pct}%`), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 10.5, color: '#3b4760', fontWeight: 700, interval: 0 } },
    polar: { radius: ['14%', '86%'] },
    series: [{ type: 'bar', coordinateSystem: 'polar', roundCap: true, barWidth: 9, showBackground: true, backgroundStyle: { color: 'rgba(24,35,58,.05)' }, data: bySum.map(x => ({ value: x.pct, itemStyle: { color: x.s.warna } })), label: { show: false } }]
  });
}
