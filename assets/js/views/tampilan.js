/* Tampilan fokus per peran: Prodi, Unit, Kasubbag AK, dan Auditor hanya melihat menu yang sesuai tugasnya; menu lain masuk "Menu lainnya".
   SPM atau Wakil Direktur I mengatur menu dan layar awal per peran di Database & Pengaturan. Tersimpan sebagai dokumen "tampilan" di koleksi settings.
   Ini pengaturan tampilan, bukan hak akses data: hak akses tetap dijaga peran di aplikasi dan aturan Firestore. */
import { S, ctx, icon, esc, toast, semuaSettings, ROUTES } from '../app.js';
import { DB } from '../db.js';
import { ROLES } from '../seed.js';

export const FOKUS = ['prodi', 'unit', 'kasubbag', 'auditor'];
const BAWAAN = {
  prodi: ['beranda', 'monitoring', 'ami', 'rtl', 'jalur', 'led', 'amilam', 'laporan', 'dokumen'],
  unit: ['beranda', 'monitoring', 'ami', 'rtl', 'laporan', 'dokumen'],
  kasubbag: ['beranda', 'monitoring', 'ami', 'rtl', 'amilam', 'laporan', 'dokumen'],
  auditor: ['beranda', 'ami', 'rtl', 'laporan', 'dokumen']
};

/** Auditor yang ditugaskan pada AMI kesiapan IABEE atau LAM sebuah prodi mendapat menu akreditasi tersebut. */
export function auditorDitugaskan() {
  const a = String(ctx.auditor || '').toLowerCase(), em = String((ctx.me && ctx.me.email) || '').toLowerCase();
  return S.iabee.some(d => (d.auditor || []).some(x => [x.id, x.email].filter(Boolean).some(v => [a, em].includes(String(v).toLowerCase()))));
}
export function menuTampil(role) {
  const cfg = S.tampilan && S.tampilan.menu && S.tampilan.menu[role];
  const s = new Set(cfg || BAWAAN[role] || []); s.add('beranda');
  if (!cfg && role === 'auditor' && auditorDitugaskan()) { s.add('amiiabee'); s.add('amilam'); }
  return s;
}
export const berandaTugas = (role) => FOKUS.includes(role) && (((S.tampilan && S.tampilan.beranda) || {})[role] || 'tugas') === 'tugas';
export function bagiMenu(routes) {
  if (!FOKUS.includes(ctx.role)) return { utama: routes, lain: [] };
  const s = menuTampil(ctx.role);
  return { utama: routes.filter(r => s.has(r.id)), lain: routes.filter(r => !s.has(r.id)) };
}

/** Kartu pengaturan di halaman Database & Pengaturan (SPM dan Wakil Direktur I). */
export function kartuTampilan(el) {
  const rute = ROUTES.filter(r => r.id !== 'beranda' && r.id !== 'pengguna' && r.id !== 'pengaturan');
  const box = document.createElement('div'); box.className = 'card'; box.style.marginTop = '18px';
  box.innerHTML = `<div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('eye')}</span><div><h3>Tampilan per peran</h3><div class="sub">Centang menu yang tampil di menu utama. Yang tidak dicentang masuk "Menu lainnya" dan tetap bisa dibuka. Ini pengaturan tampilan, bukan hak akses data.</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Menu</th>${FOKUS.map(r => `<th>${esc(ROLES[r].nama)}</th>`).join('')}</tr></thead><tbody>
    ${rute.map(r => `<tr><td>${esc(r.t)}</td>${FOKUS.map(f => `<td><input type="checkbox" data-m="${f}|${r.id}" ${menuTampil(f).has(r.id) ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}
    <tr><td><b>Layar awal</b></td>${FOKUS.map(f => `<td><select class="inp" data-b="${f}"><option value="tugas" ${berandaTugas(f) ? 'selected' : ''}>Tugas saya</option><option value="penuh" ${berandaTugas(f) ? '' : 'selected'}>Beranda lengkap</option></select></td>`).join('')}</tr>
    </tbody></table></div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" id="tmS">${icon('check')} Simpan tampilan</button><button class="btn" id="tmB">${icon('loop')} Pulihkan bawaan</button></div>`;
  el.appendChild(box);
  const simpan = async (doc, pesan) => {
    S.tampilan = doc;
    try { await DB.put('settings', doc, semuaSettings()); toast(pesan); } catch (e) { toast('Gagal menyimpan tampilan: ' + e.message); }
  };
  box.querySelector('#tmS').onclick = async () => {
    const doc = { id: 'tampilan', menu: {}, beranda: {} };
    FOKUS.forEach(f => {
      doc.menu[f] = ['beranda'].concat(Array.from(box.querySelectorAll(`[data-m^="${f}|"]:checked`)).map(c => c.dataset.m.split('|')[1]));
      doc.beranda[f] = box.querySelector(`[data-b="${f}"]`).value;
    });
    await simpan(doc, 'Tampilan tersimpan; berlaku saat pengguna memuat ulang halaman');
  };
  box.querySelector('#tmB').onclick = async () => {
    await simpan({ id: 'tampilan', menu: {}, beranda: {} }, 'Tampilan dikembalikan ke bawaan');
    box.remove(); kartuTampilan(el);
  };
}
