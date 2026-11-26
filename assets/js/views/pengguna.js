/* Pengguna dan peran SIMANTAP 2.0.
   Aturan: data diisi satu kali di aplikasi pemiliknya. SPM, Prodi (Tim Kurikulum Prodi), Kasubbag AK, dan Wakil Direktur I didaftarkan di KUREKAM
   dan dibaca otomatis di sini. Menu ini hanya untuk akun khusus SIMANTAP: Pimpinan, Auditor, dan Unit. */
import { S, ctx, icon, esc, save, remove, toast, openDrawer, closeDrawer, peranDariKurekam, spmLevel, eDeveloper, eEmailDeveloper } from '../app.js';
import { ROLES, UNITS, UNIT } from '../seed.js';
import { DB } from '../db.js';

const PILIH = ['pimpinan', 'auditor', 'unit'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tag = (k) => `<span class="tag" style="--c:#6366f1">${esc((ROLES[k] || { nama: k }).nama)}</span>`;
const namaPeran = (k, u) => (k === 'auditee' ? ((UNIT[u.unit] || {}).jenis === 'prodi' ? 'prodi' : 'unit') : k);

export default function penggunaView(el) {
  if (!spmLevel()) { el.innerHTML = '<div class="card empty">Menu ini hanya untuk SPM.</div>'; return; }
  const sembunyi = (e) => !eDeveloper() && eEmailDeveloper(e);
  const rows = S.pengguna.filter(u => !sembunyi(u.email)).sort((a, b) => (a.email || '').localeCompare(b.email || ''));
  const kur = S.kurPengguna.map(k => ({ k, p: peranDariKurekam(k) })).filter(x => x.p.length && !sembunyi(x.k.email)).sort((a, b) => (a.k.email || '').localeCompare(b.k.email || ''));
  const demo = DB.mode !== 'firebase';
  el.innerHTML = `
  ${ctx.bootstrap ? `<div class="ribbon">${icon('info')} Daftar pengguna KUREKAM dan SIMANTAP masih kosong, sehingga akun yang sedang masuk diperlakukan sebagai SPM. Daftarkan SPM di KUREKAM (menu Data induk).</div>` : ''}
  ${demo ? `<div class="ribbon">${icon('info')} Mode demo: daftar pengguna hanya tersimpan di peramban ini dan tidak membatasi akses. Pembatasan peran berlaku setelah masuk dengan akun.</div>` : ''}
  <div class="card">
    <div class="card-h"><span class="ico-badge" style="--c:#10b981">${icon('users')}</span><div><h3>Pengguna dari KUREKAM</h3><div class="sub">Dibaca otomatis, tidak diisi dua kali. Tambah atau ubah di KUREKAM, menu Data induk, Pengguna dan peran.</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Email</th><th>Nama</th><th>Peran di SIMANTAP</th><th>Prodi/Unit</th></tr></thead><tbody>
    ${kur.map(({ k, p }) => `<tr><td><b>${esc(k.email)}</b></td><td>${esc(k.nama || '')}</td><td>${p.map(tag).join(' ')}</td><td>${esc(p.includes('prodi') ? k.prodi : p.includes('kasubbag') ? 'AKD' : '')}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">${demo ? 'Daftar KUREKAM hanya terbaca setelah masuk dengan akun.' : 'Belum ada pengguna KUREKAM yang berperan di SIMANTAP.'}</td></tr>`}
    </tbody></table></div>
    <div class="muted small" style="margin-top:8px">Pemetaan: SPM, Admin, dan Developer KUREKAM menjadi SPM. Tim Kurikulum Prodi menjadi Prodi (unit = prodinya). Kasubbag AK menjadi Kasubbag AK (unit AKD). Wakil Direktur I tetap. Dosen tidak punya tugas di SIMANTAP.</div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('users')}</span><div><h3>Pengguna khusus SIMANTAP</h3><div class="sub">Pimpinan, Auditor, dan Unit. Email harus sama dengan email akun masuk.</div></div><div class="sp"></div><button class="btn pri" id="u-add">${icon('plus')} Tambah pengguna</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Email</th><th>Nama</th><th>Peran</th><th>Unit</th><th>Unit asal auditor</th></tr></thead><tbody>
    ${rows.map(u => `<tr class="click" data-u="${esc(u.id)}"><td><b>${esc(u.email)}</b></td><td>${esc(u.nama || '')}</td><td>${(u.peran || []).map(k => tag(namaPeran(k, u))).join(' ')}</td><td>${esc(u.unit || '')}</td><td>${esc(u.home || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Belum ada pengguna khusus SIMANTAP.</td></tr>'}
    </tbody></table></div>
  </div>
  <div class="card" style="margin-top:18px"><div class="card-h"><span class="ico-badge" style="--c:#0ea5e9">${icon('check')}</span><div><h3>Hak akses per peran</h3><div class="sub">Pengesahan, pengaturan jadwal, dan pengisian dipisahkan</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><tbody>${Object.keys(ROLES).filter(k => k !== 'tamu' && (k !== 'developer' || eDeveloper())).map(k => `<tr><td><b>${ROLES[k].nama}</b></td><td class="small">${ROLES[k].ket}</td></tr>`).join('')}</tbody></table></div>
  </div>`;

  const form = (u) => {
    const baru = !u.id;
    const lama = (u.peran || []).map(k => namaPeran(k, u)), daftar = PILIH.concat(lama.filter(k => !PILIH.includes(k) && ROLES[k]));
    openDrawer(`<div class="card-h"><h3>${baru ? 'Tambah pengguna' : 'Ubah pengguna'}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div style="display:grid;gap:12px">
      <div class="field"><label>Email akun masuk</label><input class="inp" id="u-e" type="email" value="${esc(u.email || '')}" ${baru ? '' : 'readonly'}></div>
      <div class="field"><label>Nama</label><input class="inp" id="u-n" value="${esc(u.nama || '')}"></div>
      <div class="field"><label>Peran (boleh lebih dari satu)</label><div style="display:grid;gap:6px">${daftar.map(k => `<label class="small"><input type="checkbox" name="u-p" value="${k}" ${lama.includes(k) ? 'checked' : ''}> <b>${ROLES[k].nama}</b> · ${ROLES[k].ket}</label>`).join('')}</div></div>
      <div class="field"><label>Unit (untuk peran Unit)</label><select class="inp" id="u-u"><option value="">-</option>${UNITS.map(x => `<option value="${x.id}" ${u.unit === x.id ? 'selected' : ''}>${x.id} · ${esc(x.nama)}</option>`).join('')}</select></div>
      <div class="field"><label>Unit asal (untuk peran Auditor; tidak boleh mengaudit unit ini)</label><select class="inp" id="u-h"><option value="">-</option>${UNITS.map(x => `<option ${u.home === x.id ? 'selected' : ''}>${x.id}</option>`).join('')}</select></div>
      <div class="muted small">SPM, Prodi, Kasubbag AK, dan Wakil Direktur I tidak didaftarkan di sini, melainkan di KUREKAM.</div>
      <button class="btn pri" id="u-s">${icon('check')} Simpan</button>
      ${baru ? '' : `<button class="btn" id="u-d" style="color:#b42335">${icon('trash')} Hapus pengguna</button>`}
      ${DB.mode === 'firebase' && !baru ? `<div class="filters" style="margin:0"><input class="inp" id="u-pw" type="text" placeholder="Kata sandi sementara (min. 8 karakter)" style="flex:1;min-width:180px"><button class="btn sm" id="u-akun">${icon('plus')} Buatkan akun masuk</button><button class="btn sm" id="u-rst">Kirim tautan atur kata sandi</button></div>` : ''}
    </div></div>`, d => {
      d.querySelector('#u-s').onclick = async () => {
        const email = d.querySelector('#u-e').value.trim().toLowerCase();
        const peran = Array.from(d.querySelectorAll('input[name=u-p]:checked')).map(c => c.value);
        const unit = d.querySelector('#u-u').value, home = d.querySelector('#u-h').value;
        if (!EMAIL.test(email)) return toast('Email tidak valid');
        if (!peran.length) return toast('Pilih minimal satu peran');
        if (peran.includes('unit') && (UNIT[unit] || {}).jenis !== 'unit') return toast('Pilih unit (bukan prodi) untuk peran Unit');
        if (peran.includes('prodi') && (UNIT[unit] || {}).jenis !== 'prodi') return toast('Pilih prodi untuk peran Prodi');
        if (peran.includes('auditor') && !home) return toast('Pilih unit asal untuk peran Auditor');
        if (sembunyi(email)) return toast('Email sudah terdaftar');
        if (baru && S.pengguna.some(x => x.id === email)) return toast('Email sudah terdaftar');
        await save('pengguna', { id: email, email, nama: d.querySelector('#u-n').value.trim(), peran, unit: unit || '', home: home || '' }, (baru ? 'Menambah' : 'Mengubah') + ' pengguna ' + email);
        closeDrawer(); toast('Pengguna tersimpan'); penggunaView(el);
      };
      const dl = d.querySelector('#u-d');
      if (dl) dl.onclick = async () => {
        if (!confirm('Hapus pengguna ' + u.email + '?')) return;
        await remove('pengguna', u.id, 'Menghapus pengguna ' + u.email); closeDrawer(); toast('Pengguna dihapus'); penggunaView(el);
      };
      const ak = d.querySelector('#u-akun');
      if (ak) ak.onclick = async () => {
        const pw = d.querySelector('#u-pw').value;
        if (pw.length < 8) return toast('Kata sandi minimal 8 karakter');
        try { const r = await DB.buatAkun(u.email, pw); toast(r === 'ada' ? 'Akun sudah ada untuk email ini' : 'Akun masuk dibuat. Sampaikan kata sandi sementara kepada pengguna'); }
        catch (e) { toast('Gagal membuat akun: ' + e.message); }
      };
      const rs = d.querySelector('#u-rst');
      if (rs) rs.onclick = async () => { try { await DB.resetPassword(u.email); toast('Tautan dikirim ke ' + u.email); } catch (e) { toast(e.message); } };
    });
  };
  el.querySelector('#u-add').onclick = () => form({});
  el.querySelectorAll('tr.click').forEach(tr => tr.onclick = () => form(S.pengguna.find(x => x.id === tr.dataset.u) || {}));
}
