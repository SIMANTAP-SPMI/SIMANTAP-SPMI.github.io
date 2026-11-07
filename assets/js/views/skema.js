import { S, icon, esc } from '../app.js';
import { chart, PAL } from '../charts.js';
import { LAM, IABEE, SKEMA_CAPAIAN } from '../config.js';
import { SUMBER } from '../seed.js';
import { skorDariRasio, ratioOf, fmt } from '../scoring.js';
import { active } from './common.js';

const WARNA_SKOR = { 4: '#10b981', 3.5: '#14b8a6', 3: '#0ea5e9', 2: '#f5a524', 1: '#fb923c', 0: '#f0616d' };

export default function skema(el) {
  el.innerHTML = `
  <div class="card">
    <div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('layers')}</span><div><h3>Dari capaian indikator ke status akreditasi</h3><div class="sub">Logika yang dipakai dashboard dan simulator</div></div></div>
    <div class="flow">
      ${[['pulse', '#0ea5e9', '1. Capaian', 'Unit mengisi capaian bulanan + bukti'], ['target', '#14b8a6', '2. Rasio', 'capaian ÷ target (dibalik bila arah ≤; pro-rata bila kumulatif)'], ['layers', '#8b5cf6', '3. Skor butir', 'Rasio dikonversi ke skor 0–4 (skema di bawah)'], ['grid4', '#f5a524', '4. Skor kriteria', 'Rerata skor butir per kriteria LAM (K1–K4)'], ['medal', '#10b981', '5. Nilai Akreditasi', 'NA = Σ bobot% × skor × 100 → 0–400'], ['flag', '#f472b6', '6. Status', 'NA + syarat perlu → Unggul/Terakreditasi']]
        .map(([ic, c, t, s]) => `<div class="fbox tilt"><span class="ico-badge" style="--c:${c}">${icon(ic)}</span><b>${t}</b><small>${s}</small></div>`).join('')}
    </div>
  </div>

  <div class="grid g-21" style="margin-top:18px">
    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('target')}</span><div><h3>Skema capaian → skor butir</h3><div class="sub">Dapat dikalibrasi SPM (config.js · SKEMA_CAPAIAN)</div></div></div>
      <div class="skema-step">${SKEMA_CAPAIAN.map(s => `<div style="--c:${WARNA_SKOR[s.skor]}"><b>${s.skor}</b>${s.label}<small>${s.ket}</small></div>`).join('')}</div>
      <div class="formula" style="margin-top:14px">
<b>rasio</b> = capaian / target            <span style="color:#94a3b8">// arah ≥</span>
<b>rasio</b> = target / capaian            <span style="color:#94a3b8">// arah ≤ (mis. waktu tunggu)</span>
<b>target_berjalan</b> = target × bulan/12  <span style="color:#94a3b8">// indikator kumulatif (publikasi, pendapatan)</span>
<b>skor_kriteria</b> = rerata(skor butir terpetakan)  <span style="color:#94a3b8">// K4 + skor aspek SPMI (SP9)</span>
<b>NA</b> = Σ (bobot_k / 100 × skor_k) × 100   <span style="color:#94a3b8">// 0–400</span></div>
    </div>
    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('sim')}</span><div><h3>Kalkulator cepat</h3><div class="sub">Uji satu indikator</div></div></div>
      <div class="grid g2" style="gap:10px">
        <div class="field"><label>Target</label><input class="inp" id="kt" type="number" step="any" value="15"></div>
        <div class="field"><label>Capaian</label><input class="inp" id="kc" type="number" step="any" value="13"></div>
        <div class="field span2"><label>Arah</label><select class="inp" id="ka"><option value=">=">≥ makin besar makin baik</option><option value="<=">≤ makin kecil makin baik</option></select></div>
      </div>
      <div id="kres" style="margin-top:14px"></div>
    </div>
  </div>

  <div class="grid g3" style="margin-top:18px">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('medal')}</span><div><h3>Kriteria LAM Teknik 2025</h3><div class="sub">Bobot kerja (verifikasi)</div></div></div><div class="chart" id="dk"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('layers')}</span><div><h3>Komponen penilaian</h3><div class="sub">Input · Proses · Output/Outcome</div></div></div><div class="chart" id="dp"></div></div>
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('flag')}</span><div><h3>Ambang status</h3><div class="sub">Nilai Akreditasi 0–400</div></div></div><div class="chart" id="amb"></div></div>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('link')}</span><div><h3>Peta aliran: sumber kebijakan → kriteria LAM → status capaian</h3><div class="sub">Bagaimana RSB, BLU, Kokin, dan usulan IKU/IKT PEM menopang butir akreditasi · hanya indikator berkorelasi akreditasi</div></div></div>
    <div class="chart lg" id="sankey"></div>
  </div>

  <div class="grid g2" style="margin-top:18px">
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#7c3aed">${icon('check')}</span><div><h3>Aturan status LAM Teknik 2025</h3><div class="sub">Pedoman Penilaian (Lampiran 10 Per-LAM Teknik No. 6/2025)</div></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kondisi</th><th>Status</th></tr></thead><tbody>
        <tr><td>NA ≥ ${LAM.ambang.unggul} dan semua syarat perlu Unggul (5 th) terpenuhi</td><td><span class="tag" style="--c:#0e9f6e">Unggul 5 tahun</span></td></tr>
        <tr><td>NA ≥ ${LAM.ambang.unggulBawah} dan syarat perlu Unggul (3 th) terpenuhi</td><td><span class="tag" style="--c:#16a3b8">Unggul 3 tahun</span></td></tr>
        <tr><td>NA ≥ ${LAM.ambang.terakreditasi} dan syarat perlu terakreditasi terpenuhi</td><td><span class="tag" style="--c:#f59f0b">Terakreditasi 5 tahun</span></td></tr>
        <tr><td>NA &lt; ${LAM.ambang.terakreditasi} atau syarat perlu terakreditasi gagal</td><td><span class="tag" style="--c:#ef5350">Tidak Terakreditasi</span></td></tr>
      </tbody></table></div>
      <h4 style="margin:14px 0 6px">Syarat perlu Sarjana Terapan</h4>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Syarat</th><th class="num">Terakreditasi</th><th class="num">Unggul 3 th</th><th class="num">Unggul 5 th</th></tr></thead><tbody>
      ${LAM.syaratPerluSTr.map(s => { const op = s.jenis === 'max' ? '≤' : '≥'; return `<tr><td><b>${s.id}</b></td><td>${esc(s.nama)}<div class="muted small">${esc(s.satuan)}</div></td><td class="num">${s.terakreditasi == null ? '–' : op + ' ' + s.terakreditasi}</td><td class="num">${op} ${s.unggul3}</td><td class="num">${op} ${s.unggul5}</td></tr>`; }).join('')}
      </tbody></table></div>
    </div>
    <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('globe')}</span><div><h3>Metode IABEE</h3><div class="sub">Accreditation Evaluation and Decision</div></div></div>
      <div class="grid g2" style="gap:10px">${IABEE.rating.map(r => `<div class="card" style="padding:12px;display:flex;gap:10px;align-items:center"><span class="acwd" style="--c:${r.warna}">${r.kode}</span><div><b>${r.nama}</b><div class="muted small">${r.ket}</div></div></div>`).join('')}</div>
      <div class="flow" style="margin-top:12px">${IABEE.keputusan.map((k, i) => `<div class="fbox"><span class="acwd" style="--c:${['#10b981', '#f5a524', '#f0616d'][i]}">${k.kode.slice(0, 2)}</span><b>${k.nama}</b><small>${k.aturan}</small></div>`).join('')}</div>
      <h4 style="margin:14px 0 6px">Kriteria umum & disiplin</h4>
      ${IABEE.kriteria.map(k => `<div class="small" style="padding:4px 0"><b>${k.id}</b> ${esc(k.nama)} — <span class="muted">${esc(k.ket)}</span></div>`).join('')}
      <div class="note" style="margin-top:8px">Rating per kriteria di simulator: skor ≥ 3,5 → A; ≥ 3 → C; ≥ 2 → W; &lt; 2 → D. Jalur PEM: program teknologi keteknikan (Sydney Accord).</div>
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('book')}</span><div><h3>Rujukan & catatan verifikasi</h3></div></div>
    <ul class="small" style="margin:0;padding-left:18px;line-height:1.9">
      ${LAM.sumber.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.nama)}</a></li>`).join('')}
      <li><a href="${IABEE.sumber.url}" target="_blank" rel="noopener">${esc(IABEE.sumber.nama)}</a></li>
      <li class="muted">Perlu verifikasi dengan lampiran resmi: bobot per butir (tabel "Bobot Butir Penilaian" STr di Pedoman), ambang doktor 12,5% untuk Unggul 3 tahun, dan bobot kerja kriteria K1–K4 di atas. Semua parameter dapat diubah di <code>assets/js/config.js</code>.</li>
    </ul>
  </div>`;

  // kalkulator
  const calc = () => {
    const ind = { target: +el.querySelector('#kt').value, arah: el.querySelector('#ka').value, cum: false };
    const v = +el.querySelector('#kc').value;
    const r = ratioOf(ind, v); const sk = skorDariRasio(r); const s = SKEMA_CAPAIAN.find(x => x.skor === sk);
    el.querySelector('#kres').innerHTML = `<div class="status-card" style="--c:${WARNA_SKOR[sk]};padding:16px"><div class="lb">Rasio capaian</div><div class="big" style="font-size:34px">${fmt(r * 100, 1)}%</div><div class="nm">Skor butir ${sk} · ${s.label}</div></div>`;
  };
  ['#kt', '#kc', '#ka'].forEach(s => el.querySelector(s).addEventListener('input', calc));
  calc();

  const donut = (data, colors) => ({
    tooltip: { formatter: '{b}: {c}%' },
    series: [{ type: 'pie', radius: ['48%', '78%'], center: ['50%', '52%'], itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 3 }, color: colors,
      label: { formatter: '{b}\n{c}%', fontSize: 11, fontWeight: 700, color: '#3b4760' }, data }]
  });
  chart(el.querySelector('#dk'), donut(LAM.kriteria.map(k => ({ name: k.nama, value: k.bobot })), ['#10b981', '#0ea5e9', '#8b5cf6', '#f5a524']));
  chart(el.querySelector('#dp'), donut(LAM.komponen.map(k => ({ name: k.nama, value: k.bobot })), ['#14b8a6', '#6366f1', '#f472b6']));
  const A = LAM.ambang;
  chart(el.querySelector('#amb'), {
    tooltip: {}, grid: { left: 10, right: 10, top: 20, bottom: 30 },
    xAxis: { type: 'value', max: 400, interval: 100, axisLabel: { color: '#6b778c' }, splitLine: { show: false } }, yAxis: { type: 'category', data: [''], show: false },
    series: [
      ['Tidak Terakreditasi', A.terakreditasi, '#f0616d'], ['Terakreditasi', A.unggulBawah - A.terakreditasi, '#f5a524'], ['Unggul 3 th*', A.unggul - A.unggulBawah, '#16a3b8'], ['Unggul', 400 - A.unggul, '#10b981']
    ].map(([n, v, c], i) => ({ name: n, type: 'bar', stack: 'a', barWidth: 46, data: [v], itemStyle: { color: c, borderRadius: i === 0 ? [12, 0, 0, 12] : i === 3 ? [0, 12, 12, 0] : 0 }, label: { show: true, formatter: n.replace(' ', '\n'), fontSize: 9.5, fontWeight: 700, color: '#fff' } }))
  });

  // sankey
  const inds = active();
  const nodes = [...SUMBER.map(s => ({ name: s.id, itemStyle: { color: s.warna } })), ...LAM.kriteria.map((k, i) => ({ name: k.id + ' ' + k.nama, itemStyle: { color: PAL[i] } })), { name: 'Tercapai', itemStyle: { color: '#10b981' } }, { name: 'Hampir', itemStyle: { color: '#f5a524' } }, { name: 'Belum', itemStyle: { color: '#f0616d' } }];
  const links = [];
  const kn = k => k.id + ' ' + k.nama;
  SUMBER.forEach(s => LAM.kriteria.forEach(k => { const n = inds.filter(i => i.sumber.includes(s.id) && i.lam === k.id).length; if (n) links.push({ source: s.id, target: kn(k), value: n }); }));
  LAM.kriteria.forEach(k => {
    const x = inds.filter(i => i.lam === k.id);
    const c = { Tercapai: 0, Hampir: 0, Belum: 0 };
    x.forEach(i => { const v = i.cap.slice(0, S.settings.bulan + 1).filter(z => z != null).pop(); const r = ratioOf(i, v, i.cum ? S.settings.bulan : 11); if (r == null) return; c[r >= 1 ? 'Tercapai' : r >= .85 ? 'Hampir' : 'Belum']++; });
    Object.entries(c).forEach(([t, v]) => { if (v) links.push({ source: kn(k), target: t, value: v }); });
  });
  chart(el.querySelector('#sankey'), {
    tooltip: { trigger: 'item' },
    series: [{ type: 'sankey', data: nodes, links, nodeWidth: 14, nodeGap: 10, left: 10, right: 110, top: 10, bottom: 10, emphasis: { focus: 'adjacency' }, lineStyle: { color: 'gradient', opacity: .35, curveness: .55 }, label: { fontSize: 11.5, fontWeight: 700, color: '#3b4760' }, itemStyle: { borderRadius: 4 } }]
  });
}
