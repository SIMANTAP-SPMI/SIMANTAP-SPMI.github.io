import { S, ctx, icon, esc, toast, saveSettings, resetData, addLog } from '../app.js';
import { DB, COLLECTIONS, getFirebaseConfig, saveFirebaseConfig } from '../db.js';
import { BULAN } from '../scoring.js';

export default function pengaturan(el) {
  const admin = ctx.role === 'admin';
  const cfg = getFirebaseConfig();
  el.innerHTML = `
  <div class="grid g2">
    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:${DB.mode === 'firebase' ? '#10b981' : '#f5a524'}">${icon('db')}</span><div><h3>Status database</h3><div class="sub">${DB.mode === 'firebase' ? 'Terhubung ke Cloud Firestore · proyek ' + esc(cfg.projectId) : 'Mode lokal (tersimpan di peramban ini saja)'}</div></div></div>
      ${DB.error ? `<div class="ribbon">${icon('alert')} Gagal terhubung ke Firestore: ${esc(DB.error)}. Periksa konfigurasi & aturan keamanan.</div>` : ''}
      <dl class="kv">${COLLECTIONS.map(c => `<dt>${c}</dt><dd>${c === 'settings' ? 1 : (S[c] || []).length} dokumen</dd>`).join('')}</dl>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn" id="exp">${icon('download')} Unduh cadangan (JSON)</button>
        ${DB.user ? `<button class="btn" id="lgo">Keluar (${esc(DB.user.email || '')})</button>` : ''}
        ${admin ? `<label class="btn">${icon('upload')} Pulihkan dari JSON<input type="file" id="imp" accept="application/json" hidden></label>` : ''}
        ${admin ? `<button class="btn danger" id="rst">${icon('loop')} Muat ulang data ilustratif</button>` : ''}
      </div>
      ${admin ? `<div class="field" style="margin-top:14px;max-width:260px"><label>Bulan pelaporan berjalan</label><select class="inp" id="bln">${BULAN.map((b, i) => `<option value="${i}" ${i === S.settings.bulan ? 'selected' : ''}>${b} ${S.settings.tahun}</option>`).join('')}</select></div>` : '<div class="note" style="margin-top:12px">Pengaturan hanya dapat diubah oleh Admin UPM.</div>'}
    </div>

    <div class="card">
      <div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('bolt')}</span><div><h3>Sambungkan Firebase Firestore</h3><div class="sub">Database awan bersama untuk semua pengguna</div></div></div>
      <ol class="small" style="padding-left:18px;margin:0 0 10px;line-height:1.8">
        <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener">Firebase Console</a> → <b>Add project</b> (mis. <i>simantap-pem</i>).</li>
        <li><b>Build → Firestore Database → Create database</b> (lokasi asia-southeast2 Jakarta).</li>
        <li><b>Project settings → Your apps → Web (&lt;/&gt;)</b>, salin objek <code>firebaseConfig</code>.</li>
        <li>Tempel di bawah lalu klik <b>Sambungkan</b>. Untuk permanen, isi juga <code>assets/js/config.js</code> di repo.</li>
      </ol>
      <textarea class="inp" id="fbc" rows="7" style="width:100%;font-family:ui-monospace,monospace;font-size:12px" placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "...", "storageBucket": "...", "messagingSenderId": "...", "appId": "..." }' ${admin ? '' : 'disabled'}>${cfg ? esc(JSON.stringify(cfg, null, 2)) : ''}</textarea>
      ${admin ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn pri" id="fbs">${icon('link')} Sambungkan</button>${cfg ? `<button class="btn" id="fbu">${icon('upload')} Unggah data saat ini ke Firestore</button><button class="btn ghost danger" id="fbd">Putuskan</button>` : ''}</div>` : ''}
      <details style="margin-top:12px"><summary class="small" style="cursor:pointer;font-weight:700">Contoh aturan keamanan Firestore</summary><pre class="formula" style="margin-top:8px">rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // hanya akun yang dibuat Admin SPM (Authentication → Email/Password)
    match /{col}/{id} {
      allow read, write: if request.auth != null;
    }
  }
}</pre><div class="note">Selama uji coba tanpa login, aturan <code>allow write: if true</code> dapat dipakai sementara. Tahap berikut: Firebase Authentication (akun @esdm.go.id) dan aturan per peran.</div></details>
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('book')}</span><div><h3>Log aktivitas</h3><div class="sub">Jejak audit perubahan data (300 terakhir)</div></div></div>
    <div class="tbl-wrap" style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th></tr></thead><tbody>
    ${S.log.slice(0, 300).map(l => `<tr><td class="small muted" style="white-space:nowrap">${new Date(l.t).toLocaleString('id-ID')}</td><td>${esc(l.user)}</td><td>${esc(l.aksi)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;

  el.querySelector('#exp').onclick = () => {
    const data = Object.fromEntries(COLLECTIONS.map(c => [c, c === 'settings' ? [Object.assign({ id: 'app' }, S.settings)] : S[c]]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `simantap2_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const lgo = el.querySelector('#lgo'); if (lgo) lgo.onclick = async () => { await DB.logout(); location.reload(); };
  if (!admin) return;
  el.querySelector('#imp').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.indikator)) throw new Error('format tidak dikenali');
      if (!confirm(`Pulihkan ${d.indikator.length} indikator dari cadangan? Data saat ini akan diganti.`)) return;
      for (const c of COLLECTIONS) if (d[c]) await DB.replaceAll(c, d[c]);
      toast('Data dipulihkan'); setTimeout(() => location.reload(), 600);
    } catch (err) { toast('Gagal memulihkan: ' + err.message); }
  };
  el.querySelector('#rst').onclick = async () => { if (!confirm('Ganti seluruh data dengan data ilustratif awal?')) return; await resetData(); toast('Data ilustratif dimuat ulang'); pengaturan(el); };
  el.querySelector('#bln').onchange = async (e) => { S.settings.bulan = +e.target.value; await saveSettings(); await addLog('Bulan pelaporan → ' + BULAN[S.settings.bulan]); toast('Bulan pelaporan diperbarui'); };
  el.querySelector('#fbs').onclick = () => {
    try {
      let txt = el.querySelector('#fbc').value.trim();
      txt = txt.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      let c;
      try { c = JSON.parse(txt); }
      catch (e1) { c = JSON.parse(txt.replace(/'/g, '"').replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/,\s*}/g, '}')); }
      if (!c.projectId || !c.apiKey) throw new Error('projectId/apiKey kosong');
      saveFirebaseConfig(c); toast('Menyambungkan ke Firestore…'); setTimeout(() => location.reload(), 500);
    } catch (err) { toast('Konfigurasi tidak valid: ' + err.message); }
  };
  const fbu = el.querySelector('#fbu');
  if (fbu) fbu.onclick = async () => {
    if (DB.mode !== 'firebase') return toast('Belum terhubung ke Firestore');
    if (!confirm('Unggah seluruh data saat ini ke Firestore (menimpa isi koleksi)?')) return;
    for (const c of COLLECTIONS) await DB.replaceAll(c, c === 'settings' ? [Object.assign({ id: 'app' }, S.settings)] : S[c]);
    toast('Data terunggah ke Firestore');
  };
  const fbd = el.querySelector('#fbd');
  if (fbd) fbd.onclick = () => { saveFirebaseConfig(null); toast('Kembali ke database lokal'); setTimeout(() => location.reload(), 500); };
}
