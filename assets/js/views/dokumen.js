import { S, ctx, icon, esc, save, remove, toast, openDrawer, closeDrawer } from '../app.js';
import { chart } from '../charts.js';

const JENIS = ['Kebijakan', 'Manual', 'Standar', 'Formulir', 'SOP', 'Tambahan'];
const STC = { 'Disetujui': 'ok', 'Review SPM': 'near', 'Draft': 'na', 'Referensi': 'na' };
let fj = 'ALL';

export default function dokumen(el) {
  const admin = ctx.role === 'admin', pimp = ctx.role === 'pimpinan';
  const list = S.dokumen.filter(d => fj === 'ALL' || d.jenis === fj);
  el.innerHTML = `
  <div class="grid g-12">
    <div class="card tilt"><div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('folder')}</span><div><h3>Pustaka dokumen SPMI</h3><div class="sub">${S.dokumen.length} dokumen · status pengesahan</div></div></div><div class="chart" id="tree"></div></div>
    <div class="card">
      <div class="filters"><div class="seg" id="seg"><button data-j="ALL" class="${fj === 'ALL' ? 'on' : ''}">Semua</button>${JENIS.map(j => `<button data-j="${j}" class="${fj === j ? 'on' : ''}">${j}</button>`).join('')}</div><div class="sp" style="flex:1"></div>${admin ? `<button class="btn pri" id="add">${icon('plus')} Dokumen</button>` : ''}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Judul</th><th>Jenis</th><th>Periode</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map(d => `<tr><td><b>${esc(d.kode)}</b></td><td>${esc(d.judul)}${d.url ? ` <a href="${esc(d.url)}" target="_blank" rel="noopener">${icon('link')}</a>` : ''}</td><td>${d.jenis}</td><td>${esc(d.periode)}</td><td><span class="st ${STC[d.status]}">${d.status}</span></td>
        <td style="white-space:nowrap">${(pimp || admin) && d.status === 'Review SPM' ? `<button class="btn sm pri" data-ok="${d.id}">${icon('check')} Sahkan</button>` : ''}${admin && d.status === 'Draft' ? `<button class="btn sm" data-rv="${d.id}">Ajukan review</button>` : ''}${admin && (d.status !== 'Disetujui' || d.jenis === 'Tambahan') ? `<button class="btn sm ghost danger" data-del="${d.id}" title="Hapus">${icon('trash')}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="note" style="margin-top:8px">Dokumen SPMI yang sudah disahkan tidak dapat dihapus (rekaman mutu); dokumen tambahan/referensi dapat dihapus Admin SPM. Berkas fisik disimpan di Google Drive/Storage dan ditautkan.</div>
    </div>
  </div>`;
  el.querySelectorAll('#seg button').forEach(b => b.onclick = () => { fj = b.dataset.j; dokumen(el); });
  const upd = async (id, st) => { const d = S.dokumen.find(x => x.id === id); d.status = st; await save('dokumen', d, `Dokumen ${d.kode} → ${st}`); toast(`${d.kode} → ${st}`); dokumen(el); };
  el.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => upd(b.dataset.ok, 'Disetujui'));
  el.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => upd(b.dataset.rv, 'Review SPM'));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const d = S.dokumen.find(x => x.id === b.dataset.del); if (!confirm(`Hapus ${d.kode}?`)) return; await remove('dokumen', d.id, 'Menghapus dokumen ' + d.kode); dokumen(el); });
  const add = el.querySelector('#add');
  if (add) add.onclick = () => openDrawer(`<div class="card-h"><h3>Dokumen baru</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="grid g2" style="gap:12px">
      <div class="field"><label>Jenis</label><select class="inp" id="dJ">${JENIS.map(j => `<option>${j}</option>`).join('')}</select></div>
      <div class="field"><label>Kode</label><input class="inp" id="dK" placeholder="SOP-SPM-05"></div>
      <div class="field span2"><label>Judul</label><input class="inp" id="dT"></div>
      <div class="field"><label>Periode</label><input class="inp" id="dP" value="2026–2030"></div>
      <div class="field"><label>Tautan berkas (Drive)</label><input class="inp" id="dU" placeholder="https://drive.google.com/…"></div>
    </div><button class="btn pri" id="dS" style="margin-top:12px">${icon('check')} Simpan sebagai Draft</button></div>`, d => {
    d.querySelector('#dS').onclick = async () => {
      const g = s => d.querySelector(s).value.trim();
      if (!g('#dK') || !g('#dT')) return toast('Kode dan judul wajib diisi');
      const url = g('#dU'); if (url && !/^https:\/\//.test(url)) return toast('Tautan harus diawali https://');
      await save('dokumen', { id: 'DOC' + Date.now().toString(36).toUpperCase(), jenis: g('#dJ'), kode: g('#dK'), judul: g('#dT'), periode: g('#dP'), status: 'Draft', url, tgl: new Date().toISOString().slice(0, 10) }, 'Menambah dokumen ' + g('#dK'));
      closeDrawer(); toast('Dokumen tersimpan'); dokumen(el);
    };
  });
  const col = { Disetujui: '#10b981', 'Review SPM': '#f5a524', Draft: '#94a3b8', Referensi: '#c4b5fd' };
  chart(el.querySelector('#tree'), {
    tooltip: { formatter: p => `${p.name}: ${p.value} dokumen` },
    series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, width: '100%', height: '100%', top: 0, left: 0,
      itemStyle: { borderColor: '#fff', borderWidth: 3, gapWidth: 3, borderRadius: 10 }, upperLabel: { show: true, height: 22, color: '#18233a', fontWeight: 800, fontSize: 11.5, backgroundColor: 'transparent' },
      levels: [{ itemStyle: { borderWidth: 0, gapWidth: 6 } }, { itemStyle: { borderColor: 'rgba(24,35,58,.05)', borderWidth: 4, gapWidth: 3, borderRadius: 12 }, upperLabel: { show: true } }],
      label: { fontSize: 11, fontWeight: 700, formatter: '{b}\n{c}' },
      data: JENIS.map(j => ({ name: j, children: Object.keys(col).map(s => ({ name: s, value: S.dokumen.filter(d => d.jenis === j && d.status === s).length, itemStyle: { color: col[s] } })).filter(c => c.value) })).filter(x => x.children.length) }]
  });
}
