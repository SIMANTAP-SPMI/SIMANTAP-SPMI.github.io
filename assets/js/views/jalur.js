/* Jalur IABEE: delapan langkah dari pemahaman sampai keputusan, kelayakan PA/GA, surat tugas dan registrasi, serta progres per prodi.
   Data per prodi disimpan di koleksi "iabee" (satu dokumen per prodi). Hanya tautan bukti, tanpa berkas. */
import { S, ctx, icon, esc, save, toast, openDrawer, closeDrawer, userName } from '../app.js';
import { PRODI, UNIT } from '../seed.js';
import { IABEE_JALUR } from '../config.js';

const HARI = 864e5;
const tglID = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';
const hariIni = () => new Date(new Date().toDateString());
const sisa = (s) => Math.ceil((new Date(s + 'T00:00:00') - hariIni()) / HARI);
const urlOk = (u) => /^https?:\/\/\S+$/i.test(u || '');
const STNAMA = { belum: 'Belum', proses: 'Proses', selesai: 'Selesai' };
const STKLS = { belum: 'na', proses: 'near', selesai: 'ok' };
let pilih = null;

export function dokIabee(pid) {
  const d = S.iabee.find(x => x.id === pid);
  if (d) return d;
  const pilot = !!(UNIT[pid] && UNIT[pid].pilot);
  return { id: pid, jalur: pilot ? 'PA' : '', tahun: pilot ? 2027 : 0, penetapan: 'Usulan', kelayakan: {}, registrasi: {}, langkah: {}, obe: {}, _baru: true };
}
/** Data OBE efektif: isian manual menang, bila kosong dipakai umpan dari KUREKAM. */
export function obeEf(d) {
  const k = ((S.kurekam || []).find(u => u.unit === d.id) || {}).obe || {}, m = d.obe || {};
  const pil = (a, b) => (a !== undefined && a !== null && a !== '') ? [a, 'manual'] : (b !== undefined && b !== null && b !== '' ? [b, 'KUREKAM'] : ['', '']);
  const [angkatan, sa] = pil(m.angkatan, k.angkatan), [wisuda, sw] = pil(m.wisuda, k.wisuda), [lulusan, sl] = pil(m.lulusan, k.lulusan && k.lulusan > 0 ? k.lulusan : '');
  return { angkatan, wisuda, lulusan, dari: [sa, sw, sl].includes('KUREKAM') ? 'KUREKAM' : '' };
}
const tglLangkah = (d, l, k) => { const o = (d.langkah[l.no] || {})[k]; if (o) return o; const [off, md] = l[k]; return `${d.tahun + off}-${md}`; };

/* Syarat kelayakan: butir lulusan OBE terhitung otomatis dari tanggal wisuda pertama. */
const syaratList = (d) => (IABEE_JALUR.syarat[d.jalur] || []).map((t, i) => {
  const k = String(i); const x = d.kelayakan[k] || {};
  const auto = /lulusan OBE sebelum kunjungan/.test(t) && obeEf(d).wisuda && obeEf(d).wisuda <= `${d.tahun}-09-30`;
  return { k, t, ok: !!x.ok || !!auto, auto: !!auto && !x.ok, bukti: x.bukti || [] };
});
const regItems = (d) => { const r = d.registrasi || {}; return [
  ['Surat tugas Wakil Prodi (nomor, tanggal, tautan)', !!(r.suratTugas && r.suratTugas.nomor && r.suratTugas.tgl && urlOk(r.suratTugas.url))],
  ['Wakil Prodi (Program Representative) tercatat', !!(r.wakil && r.wakil.nama && r.wakil.email)],
  ['Akun Wakil Prodi di sistem IABEE aktif', !!r.akun],
  ['Pendaftaran prodi terkirim di sistem IABEE', !!r.terkirim]]; };
export const aksesLed = (pid) => { const d = dokIabee(pid); return d.penetapan === 'Disahkan' && regItems(d)[0][1]; };

function persen(d, l) {
  const man = (d.langkah[l.no] || {}).status || 'belum';
  if (man === 'selesai') return 100;
  if (l.no === 2) { const s = syaratList(d); return s.length ? Math.round(s.filter(x => x.ok).length / s.length * 100) : 0; }
  if (l.no === 4) { const dl = S.led.find(x => x.id === d.id); if (dl) { const n = Object.values(dl.aitem || {}).filter(a => ['siap', 'audit', 'final'].includes(a.status)).length; return Math.round(n / 53 * 100); } }
  if (l.no === 3) { const r = regItems(d); return Math.round(r.filter(x => x[1]).length / r.length * 100); }
  return man === 'proses' ? 50 : 0;
}
/** Ringkasan progres satu prodi: persen total, langkah aktif, tenggat terdekat. */
export function ringkas(pid) {
  const d = dokIabee(pid);
  if (!d.jalur || !d.tahun) return { d, ada: false };
  const L = IABEE_JALUR.langkah.map(l => {
    const p = persen(d, l), st = p >= 100 ? 'selesai' : (p > 0 || (d.langkah[l.no] || {}).status === 'proses') ? 'proses' : 'belum';
    const mulai = tglLangkah(d, l, 'mulai'), tenggat = tglLangkah(d, l, 'tenggat');
    return { ...l, p, st, mulai, tenggat, telat: st !== 'selesai' && sisa(tenggat) < 0 };
  });
  const aktif = L.find(x => x.st !== 'selesai') || L[L.length - 1];
  return { d, ada: true, L, aktif, pct: Math.round(L.reduce((a, x) => a + x.p, 0) / L.length), telat: L.filter(x => x.telat).length };
}
const sisaTxt = (s) => { const n = sisa(s); return n < 0 ? `terlambat ${-n} hari` : n === 0 ? 'hari ini' : `${n} hari lagi`; };

/** Kartu ringkas untuk Beranda dan dasbor pimpinan. */
export function kartuProgres() {
  const lihat = PRODI.filter(p => ctx.role !== 'prodi' || p.id === ctx.unit);
  const rows = lihat.map(p => ({ p, r: ringkas(p.id) })).filter(x => x.r.ada);
  return `<div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('flag')}</span><div><h3>Progres Jalur IABEE</h3><div class="sub">Tahap, tenggat, dan kemajuan per prodi</div></div><div class="sp"></div><a class="btn sm" href="#/jalur">Buka Jalur IABEE</a></div>
    ${rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>Rencana</th><th>Progres</th><th>Langkah saat ini</th><th>Tenggat</th></tr></thead><tbody>${rows.map(({ p, r }) => `<tr><td><b>${p.id}</b></td><td>${r.d.jalur} ${r.d.tahun} <span class="tag" style="--c:${r.d.penetapan === 'Disahkan' ? '#10b981' : '#f5a524'}">${r.d.penetapan}</span></td><td style="min-width:120px"><div class="bar"><i style="width:${r.pct}%;--c:#8b5cf6"></i></div><span class="small muted">${r.pct}%</span></td><td class="small">${r.aktif.no}. ${esc(r.aktif.nama)}</td><td class="small"><span class="st ${r.aktif.telat ? 'bad' : 'near'}">${tglID(r.aktif.tenggat)}</span> ${sisaTxt(r.aktif.tenggat)}</td></tr>`).join('')}</tbody></table></div>`
    : '<div class="empty">Belum ada prodi yang dijadwalkan. SPM menetapkan jalur dan tahun di menu Jalur IABEE.</div>'}</div>`;
}

function drawerBukti(judul, list, simpan) {
  const baris = (b = {}) => `<div class="bk" style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-bottom:8px"><input class="inp" placeholder="Label (mis. SK OBE 2023)" value="${esc(b.label || '')}"><input class="inp" placeholder="https://drive.google.com/..." value="${esc(b.url || '')}"></div>`;
  openDrawer(`<div class="card-h"><h3>${esc(judul)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="small muted" style="margin-bottom:8px">Tautan bukti boleh lebih dari satu (Google Drive atau situs resmi).</div><div id="bkl">${(list.length ? list : [{}]).map(baris).join('')}</div>
    <div class="filters"><button class="btn sm" id="bk-add">${icon('plus')} Tambah tautan</button><button class="btn pri" id="bk-s">${icon('check')} Simpan</button></div></div>`, d => {
    d.querySelector('#bk-add').onclick = () => d.querySelector('#bkl').insertAdjacentHTML('beforeend', baris());
    d.querySelector('#bk-s').onclick = async () => {
      const out = []; let salah = false;
      d.querySelectorAll('.bk').forEach(r => { const [a, b] = r.querySelectorAll('input'); const label = a.value.trim(), url = b.value.trim(); if (!label && !url) return; if (!urlOk(url)) salah = true; out.push({ label: label || url, url }); });
      if (salah) return toast('Setiap tautan harus diawali http:// atau https://');
      await simpan(out); closeDrawer();
    };
  });
}
const links = (arr) => (arr || []).map(b => `<a class="small" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.label)}</a>`).join(' · ') || '<span class="small muted">belum ada bukti</span>';

export default function jalurView(el) {
  const admin = ctx.role === 'admin', sah = ctx.role === 'pimpinan' || ctx.role === 'wadir1';
  if (!pilih || !PRODI.some(p => p.id === pilih)) pilih = (ctx.role === 'prodi' && PRODI.some(p => p.id === ctx.unit)) ? ctx.unit : 'TP';
  const pid = pilih, R = ringkas(pid), d = R.d, isi = admin || (ctx.role === 'prodi' && ctx.unit === pid);
  const ubah = async (fn, aksi) => { const x = JSON.parse(JSON.stringify(dokIabee(pid))); delete x._baru; fn(x); await save('iabee', x, aksi + ' ' + pid); jalurView(el); };
  const sum = PRODI.map(p => ({ p, r: ringkas(p.id) }));

  el.innerHTML = `
  <div class="ribbon">${icon('info')} <span><b>Mulai dari sini.</b> Jalur IABEE memandu delapan langkah. SPM mengatur jalur dan jadwal, Pimpinan atau Wadir I mengesahkan, Prodi mengisi kelayakan, registrasi, dan bukti. Ringkasan syarat diambil dari RPEA 2026; periksa dokumen resmi sebelum mendaftar.</span></div>
  <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('flag')}</span><div><h3>Progres lima prodi</h3><div class="sub">Klik baris untuk melihat langkah dan panduan</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>Rencana</th><th>Progres</th><th>Langkah saat ini</th><th>Tenggat</th><th>Akses LED</th></tr></thead><tbody>
    ${sum.map(({ p, r }) => `<tr class="click ${p.id === pid ? 'on' : ''}" data-p="${p.id}" style="${p.id === pid ? 'background:rgba(139,92,246,.08)' : ''}"><td><b>${p.id}</b><div class="muted small">${esc(UNIT[p.id].nama)}</div></td>
      <td>${r.ada ? `${r.d.jalur} ${r.d.tahun} <span class="tag" style="--c:${r.d.penetapan === 'Disahkan' ? '#10b981' : '#f5a524'}">${r.d.penetapan}</span>` : '<span class="muted small">Belum ditetapkan</span>'}</td>
      <td style="min-width:120px">${r.ada ? `<div class="bar"><i style="width:${r.pct}%;--c:#8b5cf6"></i></div><span class="small muted">${r.pct}%</span>` : '–'}</td>
      <td class="small">${r.ada ? `${r.aktif.no}. ${esc(r.aktif.nama)}` : '–'}</td>
      <td class="small">${r.ada ? `<span class="st ${r.aktif.telat ? 'bad' : 'near'}">${tglID(r.aktif.tenggat)}</span><div class="muted">${sisaTxt(r.aktif.tenggat)}</div>` : '–'}</td>
      <td>${r.ada ? (aksesLed(p.id) ? '<span class="st ok">Terbuka</span>' : '<span class="st na">Terkunci</span>') : '–'}</td></tr>`).join('')}
    </tbody></table></div></div>

  <div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('target')}</span><div><h3>Penetapan ${pid}</h3><div class="sub">${esc(UNIT[pid].nama)}</div></div></div>
    <div class="grid g3" style="gap:12px;align-items:end">
      <div class="field"><label>Jalur</label><select class="inp" id="j-j" ${admin ? '' : 'disabled'}><option value="">Belum ditetapkan</option><option value="PA" ${d.jalur === 'PA' ? 'selected' : ''}>PA (Provisional)</option><option value="GA" ${d.jalur === 'GA' ? 'selected' : ''}>GA (General)</option></select></div>
      <div class="field"><label>Tahun pendaftaran (April)</label><select class="inp" id="j-t" ${admin ? '' : 'disabled'}>${[2027, 2028, 2029, 2030].map(y => `<option ${d.tahun === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
      <div class="filters" style="margin:0">${admin ? `<button class="btn pri" id="j-s">${icon('check')} Simpan usulan</button>` : ''}${sah && d.jalur ? (d.penetapan === 'Disahkan' ? `<button class="btn" id="j-u">Kembalikan ke usulan</button>` : `<button class="btn pri" id="j-h">${icon('check')} Sahkan</button>`) : ''}</div>
    </div>
    <div class="small muted" style="margin-top:8px">Status: <b>${d.penetapan}</b>${d.disahkanOleh ? ` oleh ${esc(d.disahkanOleh)} pada ${tglID(d.disahkanTgl)}` : ''}. Akses pengisian LED terbuka setelah penetapan disahkan dan surat tugas tercatat: <b>${aksesLed(pid) ? 'Terbuka' : 'Terkunci'}</b>.</div>
  </div>
  ${R.ada ? langkahHtml(R, isi, admin) + kelayakanHtml(d, isi) + registrasiHtml(d, isi) : ''}`;

  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => { pilih = tr.dataset.p; jalurView(el); });
  const val = (id) => el.querySelector(id).value;
  const bs = el.querySelector('#j-s'); if (bs) bs.onclick = () => ubah(x => { const baru = val('#j-j'), thn = +val('#j-t'); if (x.jalur !== baru || x.tahun !== thn) x.penetapan = 'Usulan'; x.jalur = baru; x.tahun = baru ? thn : 0; }, 'Mengatur jalur IABEE');
  const bh = el.querySelector('#j-h'); if (bh) bh.onclick = () => ubah(x => { x.penetapan = 'Disahkan'; x.disahkanOleh = userName(); x.disahkanTgl = new Date().toISOString().slice(0, 10); }, 'Mengesahkan jalur IABEE');
  const bu = el.querySelector('#j-u'); if (bu) bu.onclick = () => ubah(x => { x.penetapan = 'Usulan'; delete x.disahkanOleh; delete x.disahkanTgl; }, 'Mengembalikan jalur IABEE ke usulan');
  if (!R.ada) return;

  /* langkah: ubah status/tanggal/catatan/bukti */
  el.querySelectorAll('[data-lg]').forEach(b => b.onclick = () => {
    const l = R.L.find(x => x.no === +b.dataset.lg), cur = d.langkah[l.no] || {};
    openDrawer(`<div class="card-h"><h3>Langkah ${l.no}. ${esc(l.nama)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
      <div class="card" style="display:grid;gap:12px">
      <div class="field"><label>Status</label><select class="inp" id="l-st"><option value="belum" ${(cur.status || 'belum') === 'belum' ? 'selected' : ''}>Belum</option><option value="proses" ${cur.status === 'proses' ? 'selected' : ''}>Proses</option><option value="selesai" ${cur.status === 'selesai' ? 'selected' : ''}>Selesai</option></select></div>
      <div class="grid g2" style="gap:12px"><div class="field"><label>Mulai</label><input class="inp" type="date" id="l-m" value="${l.mulai}" ${admin ? '' : 'disabled'}></div><div class="field"><label>Tenggat</label><input class="inp" type="date" id="l-t" value="${l.tenggat}" ${admin ? '' : 'disabled'}></div></div>
      <div class="field"><label>Catatan</label><textarea class="inp" id="l-c" rows="3">${esc(cur.catatan || '')}</textarea></div>
      <button class="btn pri" id="l-s">${icon('check')} Simpan</button></div>`, dr => {
      dr.querySelector('#l-s').onclick = async () => {
        await ubah(x => { const o = x.langkah[l.no] || {}; o.status = dr.querySelector('#l-st').value; o.catatan = dr.querySelector('#l-c').value.trim(); if (admin) { o.mulai = dr.querySelector('#l-m').value; o.tenggat = dr.querySelector('#l-t').value; } x.langkah[l.no] = o; }, 'Memperbarui langkah ' + l.no + ' IABEE');
        closeDrawer(); toast('Langkah tersimpan');
      };
    });
  });
  el.querySelectorAll('[data-lb]').forEach(b => b.onclick = () => { const n = +b.dataset.lb; drawerBukti('Bukti langkah ' + n, (d.langkah[n] || {}).bukti || [], (out) => ubah(x => { const o = x.langkah[n] || {}; o.bukti = out; x.langkah[n] = o; }, 'Bukti langkah ' + n + ' IABEE')); });
  /* kelayakan */
  el.querySelectorAll('[data-sy]').forEach(c => c.onchange = () => ubah(x => { const o = x.kelayakan[c.dataset.sy] || {}; o.ok = c.checked; x.kelayakan[c.dataset.sy] = o; }, 'Memperbarui kelayakan IABEE'));
  el.querySelectorAll('[data-sb]').forEach(b => b.onclick = () => { const k = b.dataset.sb; drawerBukti('Bukti syarat', (d.kelayakan[k] || {}).bukti || [], (out) => ubah(x => { const o = x.kelayakan[k] || {}; o.bukti = out; x.kelayakan[k] = o; }, 'Bukti kelayakan IABEE')); });
  const bo = el.querySelector('#o-s'); if (bo) bo.onclick = () => ubah(x => { x.obe = { angkatan: val('#o-a').trim(), wisuda: val('#o-w'), lulusan: val('#o-l') === '' ? '' : +val('#o-l') }; }, 'Mengisi data OBE');
  /* registrasi */
  const br = el.querySelector('#r-s'); if (br) br.onclick = () => {
    const url = val('#r-u').trim(); if (url && !urlOk(url)) return toast('Tautan surat tugas harus diawali http:// atau https://');
    ubah(x => { x.registrasi = { suratTugas: { nomor: val('#r-n').trim(), tgl: val('#r-d'), url }, wakil: { nama: val('#r-w').trim(), email: val('#r-e').trim().toLowerCase() }, akun: el.querySelector('#r-a').checked, terkirim: val('#r-k') }; }, 'Memperbarui registrasi IABEE');
  };
}

function langkahHtml(R, isi, admin) {
  return `<div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('calendar')}</span><div><h3>Delapan langkah ${R.d.id} · ${R.d.jalur} ${R.d.tahun}</h3><div class="sub">Progres ${R.pct}%${R.telat ? ` · ${R.telat} langkah melewati tenggat` : ''}</div></div></div>
  <div style="display:grid;gap:10px">${R.L.map(l => { const c = R.d.langkah[l.no] || {}; return `<div class="card" style="padding:12px 14px;${l.no === R.aktif.no ? 'border:1px solid rgba(139,92,246,.5)' : ''}">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="tag" style="--c:#8b5cf6">${l.no}</span><b>${esc(l.nama)}</b><span class="st ${l.telat ? 'bad' : STKLS[l.st]}">${l.telat ? 'Terlambat' : STNAMA[l.st]}</span><div class="sp"></div><span class="small muted">${tglID(l.mulai)} sampai ${tglID(l.tenggat)}${l.st !== 'selesai' ? ' · ' + sisaTxt(l.tenggat) : ''}</span></div>
    <div class="bar" style="margin:8px 0"><i style="width:${l.p}%;--c:#8b5cf6"></i></div>
    ${c.catatan ? `<div class="small" style="margin-bottom:6px">Catatan: ${esc(c.catatan)}</div>` : ''}
    <div class="small" style="margin-bottom:6px">Bukti: ${links(c.bukti)}</div>
    <details><summary class="small" style="cursor:pointer;font-weight:700">Cara menyelesaikan</summary><ol class="small" style="margin:6px 0 6px 18px">${l.panduan.map(x => `<li>${esc(x)}</li>`).join('')}</ol><a class="small" href="${l.menu.h}">Menu terkait: ${esc(l.menu.t)}</a></details>
    ${isi ? `<div class="filters" style="margin:8px 0 0"><button class="btn sm" data-lg="${l.no}">${icon('edit')} Ubah status</button><button class="btn sm" data-lb="${l.no}">${icon('link')} Bukti</button></div>` : ''}</div>`; }).join('')}</div></div>`;
}
function kelayakanHtml(d, isi) {
  const s = syaratList(d), n = s.filter(x => x.ok).length;
  return `<div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('check')}</span><div><h3>Kelayakan jalur ${d.jalur}</h3><div class="sub">${n} dari ${s.length} syarat terpenuhi</div></div></div>
  <div class="tbl-wrap"><table class="tbl"><tbody>${s.map(x => `<tr><td style="width:34px"><input type="checkbox" data-sy="${x.k}" ${x.ok ? 'checked' : ''} ${isi && !x.auto ? '' : 'disabled'}></td><td class="small">${esc(x.t)}${x.auto ? ' <span class="tag" style="--c:#0ea5e9">otomatis dari tanggal wisuda</span>' : ''}</td><td class="small">${links(x.bukti)}</td><td>${isi ? `<button class="btn sm" data-sb="${x.k}">${icon('link')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
  <div class="card" style="margin-top:12px;background:rgba(14,165,233,.05)"><div class="small" style="margin-bottom:8px"><b>Data OBE</b>. ${obeEf(d).dari ? 'Sebagian terisi otomatis dari KUREKAM (menu Bahan LED); isian di sini mengutamakan data yang Anda ketik.' : 'Terisi otomatis dari KUREKAM (menu Bahan LED) bila Prodi sudah mengisinya.'} Wisuda PEM Akamigas umumnya sekali setahun pada bulan Juli.</div>
    <div class="grid g3" style="gap:12px;align-items:end"><div class="field"><label>Angkatan OBE pertama</label><input class="inp" id="o-a" placeholder="mis. 2023" value="${esc(obeEf(d).angkatan)}" ${isi ? '' : 'disabled'}></div><div class="field"><label>Tanggal wisuda pertama</label><input class="inp" type="date" id="o-w" value="${esc(obeEf(d).wisuda)}" ${isi ? '' : 'disabled'}></div><div class="field"><label>Jumlah lulusan OBE</label><input class="inp" type="number" min="0" id="o-l" value="${esc(obeEf(d).lulusan)}" ${isi ? '' : 'disabled'}></div></div>
    ${isi ? `<button class="btn pri" id="o-s" style="margin-top:10px">${icon('check')} Simpan data OBE</button>` : ''}</div></div>`;
}
function registrasiHtml(d, isi) {
  const r = d.registrasi || {}, it = regItems(d), st = r.suratTugas || {}, w = r.wakil || {};
  return `<div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('folder')}</span><div><h3>Surat tugas dan registrasi</h3><div class="sub">${it.filter(x => x[1]).length} dari ${it.length} terpenuhi · akses pengisian LED: ${aksesLed(d.id) ? 'terbuka' : 'terkunci'}</div></div></div>
  <ul class="small" style="margin:0 0 12px 18px">${it.map(x => `<li>${x[1] ? '✓' : '○'} ${esc(x[0])}</li>`).join('')}</ul>
  <div class="grid g3" style="gap:12px"><div class="field"><label>Nomor surat tugas</label><input class="inp" id="r-n" value="${esc(st.nomor || '')}" ${isi ? '' : 'disabled'}></div><div class="field"><label>Tanggal surat tugas</label><input class="inp" type="date" id="r-d" value="${esc(st.tgl || '')}" ${isi ? '' : 'disabled'}></div><div class="field"><label>Tautan surat tugas</label><input class="inp" id="r-u" placeholder="https://drive.google.com/..." value="${esc(st.url || '')}" ${isi ? '' : 'disabled'}></div>
  <div class="field"><label>Nama Wakil Prodi</label><input class="inp" id="r-w" value="${esc(w.nama || '')}" ${isi ? '' : 'disabled'}></div><div class="field"><label>Email Wakil Prodi</label><input class="inp" type="email" id="r-e" value="${esc(w.email || '')}" ${isi ? '' : 'disabled'}></div><div class="field"><label>Tanggal pendaftaran terkirim</label><input class="inp" type="date" id="r-k" value="${esc(r.terkirim || '')}" ${isi ? '' : 'disabled'}></div></div>
  <label class="small" style="display:block;margin-top:10px"><input type="checkbox" id="r-a" ${r.akun ? 'checked' : ''} ${isi ? '' : 'disabled'}> Akun Wakil Prodi di sistem IABEE sudah aktif</label>
  ${isi ? `<button class="btn pri" id="r-s" style="margin-top:10px">${icon('check')} Simpan registrasi</button>` : ''}</div>`;
}
