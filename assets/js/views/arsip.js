/* Arsip tahun: potret data siklus AMI satu tahun (indikator, jadwal, hasil audit, tindak lanjut, timeline, skor kinerja) agar rekam jejak tahun lalu tetap bisa dilihat.
   Potret dibuat otomatis (semua jadwal AMI tahun itu Selesai, pergantian bulan pelaporan) atau manual oleh SPM.
   SPM boleh mengoreksi isi arsip dengan alasan wajib; setiap koreksi tercatat di riwayat. Hanya Developer yang boleh menghapus arsip atau riwayat koreksi dan menyunting data mentah.
   Koleksi Firestore "arsip" (aturan: baca anggota, tulis SPM). Dokumen induk memuat ringkasan; isi dipecah per bagian agar tidak melewati batas ukuran dokumen. */
import { S, ctx, icon, esc, toast, openDrawer, closeDrawer, spmLevel, eDeveloper, addLog, userName } from '../app.js';
import { DB } from '../db.js';
import { UNIT, AUDITORS } from '../seed.js';
import { tgl, berjalan, docTahun } from './siklus-core.js';
import { KIN, hitungSPM, hitungAuditor, hitungAuditee, barisPeriode, lencana, detail } from './kinerja.js';

const COL = 'arsip';
const BAGIAN = ['indikator', 'ami', 'rtl', 'rtm', 'siklus', 'ppepp'];
const TEMUAN = ['Terlampaui', 'Sesuai', 'Observasi', 'KTS Minor', 'KTS Mayor'];
const clone = (x) => JSON.parse(JSON.stringify(x));
const yy = (y) => String(y).slice(2);
const waktu = (t) => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const audNama = (id) => (AUDITORS.find(a => a.id === id) || {}).nama || id;
const tahunRtl = (r) => { const m = String(r.sumberRTL || '').match(/\d{4}/); return m ? +m[0] : berjalan(); };

/* ---------- akses jalur tulis dan baca ---------- */
const BATAS = 600000;
function pecah(arr) {
  const out = []; let cur = [], n = 0;
  arr.forEach(x => { const s = JSON.stringify(x).length; if (cur.length && n + s > BATAS) { out.push(cur); cur = []; n = 0; } cur.push(x); n += s; });
  out.push(cur); return out;
}
async function tulisBagian(induk, nama, arr) {
  const baru = pecah(arr).map((c, k) => ({ id: `${induk}-${nama}-${k}`, tipe: 'bagian', induk, bagian: nama, k, data: c }));
  for (const d of baru) await DB.simpanDok(COL, d);
  const lama = (await DB.daftarDok(COL, 'induk', induk)).filter(d => d.tipe === 'bagian' && d.bagian === nama && !baru.some(b => b.id === d.id));
  for (const d of lama) await DB.hapusDok(COL, d.id);
}
async function hapusSemua(induk) { for (const d of await DB.daftarDok(COL, 'induk', induk)) await DB.hapusDok(COL, d.id); }

/** Susun ulang ke bentuk datar yang aman untuk Firestore (tanpa larik di dalam larik). */
const ringan = (r) => Object.assign({}, r, { komp: r.komp.map(k => ({ n: k[0], b: k[1], v: k[2], k: k[3] })) });
const kompAsli = (r) => (r.komp || []).map(k => [k.n, k.b, k.v, k.k]);

/** Tukar sementara data aplikasi dengan isi arsip agar fungsi skor yang membaca S memakai data arsip. Sinkron, selalu dipulihkan. */
function dengan(data, fn) {
  const lama = {};
  BAGIAN.forEach(k => { lama[k] = S[k]; S[k] = data[k] || []; });
  try { return fn(); } finally { BAGIAN.forEach(k => { S[k] = lama[k]; }); }
}
function hitungSemua(y) {
  const saved = Object.assign({}, KIN); KIN.tipe = 'siklus'; KIN.tahun = y;
  try {
    const rows = barisPeriode(), aud = [...new Set(rows.flatMap(a => a.auditor || []))];
    return { spm: ringan(hitungSPM()), auditor: aud.map(id => ringan(hitungAuditor(id))), auditee: rows.map(a => ringan(hitungAuditee(a))) };
  } finally { Object.assign(KIN, saved); }
}

/* ---------- membuat potret ---------- */
function ambilData(y) {
  const p = yy(y), d = docTahun(y);
  return { indikator: clone(S.indikator), ami: clone(S.ami.filter(a => String(a.id).startsWith('AMI-' + p))), rtl: clone(S.rtl.filter(r => tahunRtl(r) === y)),
    rtm: clone(S.rtm.filter(r => r.id === 'RTM-' + p)), siklus: clone((S.siklus || []).filter(s => s.tahun === y)), ppepp: d ? [clone(d)] : [] };
}
export async function buatPotret({ tahun = berjalan(), jenis = 'manual', pemicu = '', catatan = '', id } = {}) {
  id = id || `A${tahun}-${Date.now().toString(36)}`;
  const data = ambilData(tahun), skor = hitungSemua(tahun);
  if (await DB.bacaDok(COL, id)) await hapusSemua(id);
  for (const b of BAGIAN) await tulisBagian(id, b, data[b]);
  await tulisBagian(id, 'skor', [skor]);
  await DB.simpanDok(COL, { id: id + '-koreksi', tipe: 'koreksi', induk: id, daftar: [] });
  const head = { id, tipe: 'induk', induk: id, tahun, jenis, pemicu, catatan, oleh: userName(), peran: ctx.role, t: new Date().toISOString(),
    ringkas: { indikator: data.indikator.length, diaudit: data.indikator.filter(i => i.ami).length, ami: data.ami.length, tindakan: data.rtl.length, skorSPM: skor.spm.skor } };
  await DB.simpanDok(COL, head);
  await addLog(`Arsip ${tahun} (${jenis}${pemicu ? ': ' + pemicu : ''}) dibuat`);
  return head;
}
/** Potret otomatis: hanya dijalankan oleh SPM atau Developer (aturan tulis koleksi arsip). Kegagalan tidak boleh mengganggu pekerjaan utama. */
export async function arsipOtomatis(tahun, pemicu, id) {
  if (!spmLevel()) return false;
  try { await buatPotret({ tahun, jenis: 'otomatis', pemicu, id }); toast(`Arsip otomatis ${tahun} tersimpan (${pemicu})`); return true; }
  catch (e) { console.warn('Arsip otomatis gagal:', e); toast('Arsip otomatis belum tersimpan: ' + (e.code === 'permission-denied' ? 'aturan Firestore koleksi arsip belum ditambahkan' : e.message)); return false; }
}
/** Dipanggil setelah sebuah jadwal AMI ditandai selesai: bila semua jadwal tahun itu selesai, buat arsip. */
export async function cekAmiSelesai(a) {
  const p = String(a.id).slice(0, 6), rows = S.ami.filter(x => String(x.id).startsWith(p));
  if (rows.length && rows.every(x => x.status === 'Selesai')) await arsipOtomatis(2000 + (+String(a.id).slice(4, 6)), 'seluruh jadwal AMI selesai', `A${2000 + (+String(a.id).slice(4, 6))}-ami-selesai`);
}

/* ---------- membaca potret ---------- */
async function muat(id) {
  const docs = await DB.daftarDok(COL, 'induk', id), head = docs.find(d => d.tipe === 'induk');
  if (!head) return null;
  const data = {}; [...BAGIAN, 'skor'].forEach(b => { data[b] = docs.filter(d => d.tipe === 'bagian' && d.bagian === b).sort((a, c) => a.k - c.k).flatMap(d => d.data); });
  return { head, data, skor: data.skor[0] || null, koreksi: docs.find(d => d.tipe === 'koreksi') || { id: id + '-koreksi', tipe: 'koreksi', induk: id, daftar: [] } };
}

/* ---------- koreksi ---------- */
const ambil = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function taruh(o, p, v) { const ks = p.split('.'); ks.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); o[ks[ks.length - 1]] = v; }
const tampil = (v) => v == null || v === '' ? '(kosong)' : String(v);
function kolom(f, nilai) {
  const v = nilai == null ? '' : nilai;
  if (f.tipe === 'select') return `<select class="inp" data-f="${f.path}">${f.opsi.map(o => `<option ${String(o) === String(v) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (f.tipe === 'area') return `<textarea class="inp" rows="3" data-f="${f.path}">${esc(v)}</textarea>`;
  return `<input class="inp" type="${f.tipe || 'text'}" ${f.tipe === 'number' ? 'min="1"' : ''} data-f="${f.path}" value="${esc(v)}">`;
}
/** Dialog koreksi umum: kolom yang boleh diubah ditentukan pemanggil; alasan wajib; hanya bidang yang berubah dicatat. */
function dialogKoreksi(judul, fields, obj, simpan) {
  openDrawer(`<div class="card-h"><h3>${esc(judul)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="grid g2" style="gap:12px">${fields.map(f => `<div class="field ${f.tipe === 'area' ? 'span2' : ''}"><label>${esc(f.label)}</label>${kolom(f, ambil(obj, f.path))}</div>`).join('')}</div>
    <div class="field" style="margin-top:12px"><label>Alasan koreksi (wajib)</label><textarea class="inp" id="kAl" rows="2" placeholder="Mis. tanggal salah catat, sesuai Berita Acara nomor ..."></textarea></div>
    <div class="muted small" style="margin:8px 0">Koreksi tersimpan di riwayat arsip beserta nama pelaksana, nilai lama, nilai baru, dan alasan.</div>
    <button class="btn pri" id="kS">${icon('check')} Simpan koreksi</button></div>`, d => {
    d.querySelector('#kS').onclick = async () => {
      const alasan = d.querySelector('#kAl').value.trim(); if (alasan.length < 5) return toast('Alasan koreksi wajib diisi');
      const ubah = [];
      fields.forEach(f => { let v = d.querySelector(`[data-f="${f.path}"]`).value; if (f.tipe === 'number') v = v === '' ? null : +v; else if (f.tipe === 'date' && v === '') v = null;
        const lama = ambil(obj, f.path); if (String(lama == null ? '' : lama) !== String(v == null ? '' : v)) ubah.push({ path: f.path, bidang: f.label, lama: lama == null ? null : lama, baru: v }); });
      if (!ubah.length) return toast('Tidak ada yang berubah');
      ubah.forEach(u => taruh(obj, u.path, u.baru));
      await simpan(ubah, alasan); closeDrawer();
    };
  });
}
/** Developer: sunting data mentah satu objek sebagai JSON. */
function dialogJson(judul, obj, simpan) {
  openDrawer(`<div class="card-h"><h3>${esc(judul)} · data mentah</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="note">Hanya Developer. Isi JSON ini menggantikan objek secara utuh; pastikan tetap valid.</div>
    <textarea class="inp" id="jS" rows="16" style="width:100%;font-family:monospace;font-size:12px;margin-top:10px">${esc(JSON.stringify(obj, null, 2))}</textarea>
    <div class="field" style="margin-top:12px"><label>Alasan koreksi (wajib)</label><textarea class="inp" id="jAl" rows="2"></textarea></div>
    <button class="btn pri" id="jB" style="margin-top:10px">${icon('check')} Simpan</button></div>`, d => {
    d.querySelector('#jB').onclick = async () => {
      const alasan = d.querySelector('#jAl').value.trim(); if (alasan.length < 5) return toast('Alasan koreksi wajib diisi');
      let baru; try { baru = JSON.parse(d.querySelector('#jS').value); } catch (e) { return toast('JSON tidak valid: ' + e.message); }
      const lama = JSON.stringify(obj); Object.keys(obj).forEach(k => delete obj[k]); Object.assign(obj, baru);
      await simpan([{ path: '(data mentah)', bidang: 'Data mentah (JSON)', lama: lama.slice(0, 300), baru: JSON.stringify(baru).slice(0, 300) }], alasan); closeDrawer();
    };
  });
}

/* ---------- jadwal AMI di layar berjalan: ubah tanggal dan status dengan alasan ---------- */
export function ubahJadwalLive(a, ulang, simpanDok) {
  dialogKoreksi('Ubah jadwal AMI · ' + a.id, [{ path: 'tgl', label: 'Tanggal AMI', tipe: 'date' }, { path: 'status', label: 'Status', tipe: 'select', opsi: ['Terjadwal', 'Selesai'] }], a, async (ubah, alasan) => {
    await simpanDok(a, `Jadwal ${a.id} diubah (${ubah.map(u => `${u.bidang}: ${tampil(u.lama)} → ${tampil(u.baru)}`).join('; ')}). Alasan: ${alasan}`);
    toast('Jadwal AMI diperbarui'); ulang();
  });
}

/* ---------- tampilan ---------- */
const ST = { id: null, tab: 'skor', unit: '' };
const TAB = [['skor', 'Skor kinerja'], ['jadwal', 'Jadwal dan timeline'], ['hasil', 'Hasil audit indikator'], ['tindak', 'Tindak lanjut'], ['riwayat', 'Riwayat koreksi']];

export default function arsipView(el) {
  const ulang = () => arsipView(el);
  el.innerHTML = '<div class="card"><div class="muted">Memuat arsip…</div></div>';
  (async () => {
    let daftar = [];
    try { daftar = (await DB.daftarDok(COL, 'tipe', 'induk')).sort((a, b) => String(b.t).localeCompare(String(a.t))); }
    catch (e) { el.innerHTML = `<div class="card"><div class="note">Arsip belum dapat dibaca${e.code === 'permission-denied' ? ': aturan Firestore untuk koleksi <b>arsip</b> belum ditambahkan (baca: anggota, tulis: SPM).' : ': ' + esc(e.message)}</div></div>`; return; }
    const boleh = spmLevel(), dev = eDeveloper();
    let h = `<div class="card"><div class="card-h"><span class="ico-badge" style="--c:#64748b">${icon('folder')}</span><div><h3>Arsip tahun</h3><div class="sub">Potret data siklus AMI tiap tahun, otomatis dan manual. Arsip PPEPP 2022–2025 tetap ada di menu Siklus PPEPP.</div></div><div class="sp"></div>${boleh ? `<button class="btn pri" id="arB">${icon('plus')} Buat arsip sekarang</button>` : ''}</div>
      ${daftar.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahun</th><th>Dibuat</th><th>Jenis</th><th>Isi</th><th></th></tr></thead><tbody>${daftar.map(a => `<tr class="${a.id === ST.id ? 'on' : ''}"><td><b>${a.tahun}</b></td><td>${waktu(a.t)}<div class="muted small">${esc(a.oleh || '')}</div></td>
        <td><span class="tag" style="--c:${a.jenis === 'otomatis' ? '#0ea5e9' : '#8b5cf6'}">${esc(a.jenis)}</span>${a.pemicu ? `<div class="muted small">${esc(a.pemicu)}</div>` : ''}${a.catatan ? `<div class="muted small">${esc(a.catatan)}</div>` : ''}</td>
        <td class="small">${a.ringkas.ami} jadwal AMI · ${a.ringkas.diaudit} indikator diaudit · ${a.ringkas.tindakan} tindakan koreksi${a.ringkas.skorSPM != null ? ` · skor SPM ${a.ringkas.skorSPM}` : ''}</td>
        <td><button class="btn sm" data-buka="${a.id}">${icon('eye')} Buka</button>${dev ? ` <button class="btn sm ghost danger" data-hapus="${a.id}">${icon('close')} Hapus</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty">Belum ada arsip. Arsip otomatis dibuat saat seluruh jadwal AMI satu tahun selesai atau bulan pelaporan diganti; arsip manual dibuat SPM kapan saja.</div>'}</div><div id="arD"></div>`;
    el.innerHTML = h;
    const b = el.querySelector('#arB'); if (b) b.onclick = () => dialogBuat(ulang);
    el.querySelectorAll('[data-buka]').forEach(x => x.onclick = () => { ST.id = x.dataset.buka; ST.tab = 'skor'; ST.unit = ''; ulang(); });
    el.querySelectorAll('[data-hapus]').forEach(x => x.onclick = async () => {
      if (!confirm('Hapus arsip ini beserta riwayat koreksinya? Tindakan ini tidak dapat dibatalkan.')) return;
      await hapusSemua(x.dataset.hapus); await addLog('Arsip ' + x.dataset.hapus + ' dihapus oleh Developer'); if (ST.id === x.dataset.hapus) ST.id = null; toast('Arsip dihapus'); ulang();
    });
    if (ST.id) { const cur = await muat(ST.id); if (cur) detailArsip(el.querySelector('#arD'), cur, ulang); else ST.id = null; }
  })();
}

function dialogBuat(ulang) {
  const th = [berjalan() - 1, berjalan(), berjalan() + 1];
  openDrawer(`<div class="card-h"><h3>Buat arsip sekarang</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="field"><label>Tahun siklus AMI</label><select class="inp" id="bT">${th.map(y => `<option ${y === berjalan() ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
    <div class="field" style="margin-top:10px"><label>Catatan (opsional)</label><input class="inp" id="bC" placeholder="Mis. kondisi setelah rapat penutup"></div>
    <div class="muted small" style="margin:10px 0">Potret memuat seluruh indikator, jadwal, hasil audit, tindak lanjut, timeline, dan skor kinerja saat ini. Beberapa potret per tahun boleh dibuat.</div>
    <button class="btn pri" id="bS">${icon('check')} Buat arsip</button></div>`, d => {
    d.querySelector('#bS').onclick = async () => {
      const tahun = +d.querySelector('#bT').value, catatan = d.querySelector('#bC').value.trim();
      try { const hd = await buatPotret({ tahun, catatan }); ST.id = hd.id; ST.tab = 'skor'; closeDrawer(); toast('Arsip tersimpan'); ulang(); }
      catch (e) { toast('Gagal membuat arsip: ' + (e.code === 'permission-denied' ? 'aturan Firestore koleksi arsip belum ditambahkan' : e.message)); }
    };
  });
}

function detailArsip(box, cur, ulang) {
  const { head, data } = cur, boleh = spmLevel(), dev = eDeveloper();
  const rekam = async (bagian, objek, ubah, alasan) => {
    cur.koreksi.daftar.push(...ubah.map(u => ({ t: new Date().toISOString(), oleh: userName(), peran: ctx.role, bagian, objek, bidang: u.bidang, lama: u.lama, baru: u.baru, alasan })));
    await tulisBagian(head.id, bagian, data[bagian]);
    cur.skor = dengan(data, () => hitungSemua(head.tahun)); await tulisBagian(head.id, 'skor', [cur.skor]);
    await DB.simpanDok(COL, cur.koreksi);
    head.ringkas.skorSPM = cur.skor.spm.skor; head.ringkas.diaudit = data.indikator.filter(i => i.ami).length; await DB.simpanDok(COL, head);
    await addLog(`Koreksi arsip ${head.tahun} · ${objek}: ${ubah.map(u => `${u.bidang} ${tampil(u.lama)} → ${tampil(u.baru)}`).join('; ')}. Alasan: ${alasan}`);
    toast('Koreksi tersimpan dan skor dihitung ulang'); ulang();
  };
  const tombol = (bagian, idx, judul, fields) => boleh ? `<button class="btn sm" data-k="${bagian}|${idx}">${icon('edit')} Koreksi</button>${dev ? ` <button class="btn sm ghost" data-j="${bagian}|${idx}" title="Sunting data mentah (Developer)">{ }</button>` : ''}` : '';
  const isi = {
    skor: () => { const s = cur.skor; if (!s) return '<div class="empty">Skor tidak tersimpan.</div>';
      const tb = (judul, arr, nm) => `<h4 style="margin:14px 0 6px">${judul}</h4>${arr.length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${arr.map(r => `<tr><td style="width:180px"><b>${esc(nm(r))}</b></td><td style="width:170px">${lencana(r.skor)}</td><td>${detail(kompAsli(r))}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted small">Tidak ada data.</div>'}`;
      return `<div class="muted small">Skor dihitung dari isi arsip ini; dihitung ulang otomatis setelah setiap koreksi. Rumus sama dengan laporan Kinerja Pelaksana SPMI.</div>${tb('SPM', [s.spm], () => 'SPM')}${tb('Auditor', s.auditor, r => `${r.nama}`)}${tb('Auditee', s.auditee, r => `${r.unit} · ${r.nama}`)}`; },
    jadwal: () => `<h4 style="margin:6px 0">Jadwal AMI</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Auditee</th><th>Auditor</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>${data.ami.map((a, i) => `<tr><td><b>${esc(a.id)}</b></td><td>${esc(a.auditee)}</td><td>${(a.auditor || []).map(audNama).map(esc).join(', ')}</td><td>${tgl(a.tgl)}</td><td>${esc(a.status)}</td><td>${tombol('ami', i)}</td></tr>`).join('') || '<tr><td class="empty" colspan="6">Tidak ada jadwal.</td></tr>'}</tbody></table></div>
      <h4 style="margin:16px 0 6px">Tinjauan Manajemen</h4><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Judul</th><th>Tanggal</th><th>Status</th><th></th></tr></thead><tbody>${data.rtm.map((r, i) => `<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.judul || '')}</td><td>${tgl(r.tgl)}</td><td>${esc(r.status)}</td><td>${tombol('rtm', i)}</td></tr>`).join('') || '<tr><td class="empty" colspan="5">Tidak ada RTM.</td></tr>'}</tbody></table></div>
      <h4 style="margin:16px 0 6px">Timeline siklus</h4>${data.siklus.map((s, si) => s.gelombang.map((g, gi) => `<div class="small" style="margin:8px 0 4px"><b>${esc(g.nama)}</b> · mulai ${tgl(g.mulai)} · ${g.baris.map(b => b.auditee).join(', ')}</div><div class="tbl-wrap"><table class="tbl"><tbody>${g.tahap.map((t, ti) => `<tr><td>${esc(t.nama)}</td><td>${tgl(t.mulai)}</td><td>${t.hari} hari</td><td>${boleh ? `<button class="btn sm" data-k="tahap|${si}.${gi}.${ti}">${icon('edit')} Koreksi</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`).join('')).join('') || '<div class="muted small">Siklus tahun ini tidak memiliki timeline tersimpan.</div>'}`,
    hasil: () => { const units = [...new Set(data.indikator.filter(i => i.ami).map(i => i.unit))]; if (!units.includes(ST.unit)) ST.unit = units[0] || '';
      const rows = data.indikator.map((i, n) => [i, n]).filter(([i]) => i.ami && i.unit === ST.unit);
      return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><label class="small">Unit <select class="inp" id="arU" style="width:auto">${units.map(u => `<option ${u === ST.unit ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label><span class="muted small">${rows.length} indikator diaudit</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Indikator</th><th>Evaluasi diri</th><th>Audit</th><th>Hasil</th><th></th></tr></thead><tbody>${rows.map(([i, n]) => `<tr><td><b>${esc(i.kode)}</b></td><td>${esc(i.teks)}</td><td class="small">${i.ed ? `skala ${i.ed.skala} · ${tgl(i.ed.tgl)}` : '–'}</td><td class="small">${tgl(i.ami.tgl)}<div class="muted">${esc(audNama(i.ami.auditor))}</div></td><td><b>${esc(i.ami.temuan)}</b><div class="muted small">${esc(String(i.ami.uraian || '').slice(0, 100))}</div></td><td>${tombol('indikator', n)}</td></tr>`).join('') || '<tr><td class="empty" colspan="6">Tidak ada hasil audit.</td></tr>'}</tbody></table></div>`; },
    tindak: () => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Unit</th><th>Temuan dan tindakan</th><th>Tenggat</th><th>Selesai</th><th>Status</th><th></th></tr></thead><tbody>${data.rtl.map((r, i) => `<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.unit)}</td><td><b class="small">${esc(r.temuan || '')}</b><div class="small">${esc(String(r.tindakan || '').slice(0, 110))}</div></td><td>${tgl(r.tenggat)}</td><td>${tgl(r.tglSelesai)}</td><td>${esc(r.status)}</td><td>${tombol('rtl', i)}</td></tr>`).join('') || '<tr><td class="empty" colspan="7">Tidak ada tindakan koreksi pada arsip ini.</td></tr>'}</tbody></table></div>${data.ppepp.length ? `<div class="muted small" style="margin-top:8px">Arsip PPEPP tahun ini juga ikut tersimpan (${(data.ppepp[0].temuan || []).length} temuan) dan dapat dibuka di menu Siklus PPEPP.</div>` : ''}`,
    riwayat: () => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pelaksana</th><th>Objek</th><th>Perubahan</th><th>Alasan</th><th></th></tr></thead><tbody>${cur.koreksi.daftar.map((k, i) => `<tr><td class="small">${waktu(k.t)}</td><td class="small">${esc(k.oleh)}<div class="muted">${esc(k.peran)}</div></td><td class="small">${esc(k.objek)}</td><td class="small"><b>${esc(k.bidang)}</b><div class="muted">${esc(tampil(k.lama))} → ${esc(tampil(k.baru))}</div></td><td class="small">${esc(k.alasan)}</td><td>${dev ? `<button class="btn sm ghost danger" data-rh="${i}">${icon('close')}</button>` : ''}</td></tr>`).reverse().join('') || '<tr><td class="empty" colspan="6">Belum ada koreksi pada arsip ini.</td></tr>'}</tbody></table></div>${dev ? '<div class="muted small" style="margin-top:6px">Hanya Developer yang dapat menghapus baris riwayat.</div>' : ''}`
  };
  box.innerHTML = `<div class="card" style="margin-top:16px"><div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('book')}</span><div><h3>Arsip siklus AMI ${head.tahun}</h3><div class="sub">${waktu(head.t)} · ${esc(head.jenis)}${head.pemicu ? ' · ' + esc(head.pemicu) : ''} · oleh ${esc(head.oleh || '')}</div></div><div class="sp"></div><button class="btn sm" id="arJ">${icon('download')} Unduh JSON</button></div>
    <div class="tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${TAB.map(([k, n]) => `<button class="btn sm ${ST.tab === k ? 'pri' : ''}" data-tab="${k}">${n}${k === 'riwayat' ? ` (${cur.koreksi.daftar.length})` : ''}</button>`).join('')}</div>
    <div id="arT">${isi[ST.tab]()}</div></div>`;
  box.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { ST.tab = b.dataset.tab; ulang(); });
  const u = box.querySelector('#arU'); if (u) u.onchange = () => { ST.unit = u.value; ulang(); };
  box.querySelector('#arJ').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ head, data, skor: cur.skor, koreksi: cur.koreksi.daftar }, null, 1)], { type: 'application/json' })); a.download = `arsip-ami-${head.tahun}-${head.id}.json`; a.click(); };
  const objek = (bagian, idx) => {
    if (bagian === 'tahap') { const [si, gi, ti] = idx.split('.').map(Number); return { o: data.siklus[si].gelombang[gi].tahap[ti], ket: 'Tahap ' + data.siklus[si].gelombang[gi].tahap[ti].nama, bag: 'siklus' }; }
    const o = data[bagian][+idx];
    return { o, bag: bagian, ket: bagian === 'indikator' ? `Indikator ${o.kode} (${o.unit})` : bagian === 'ami' ? 'Jadwal ' + o.id : bagian === 'rtm' ? 'RTM ' + o.id : 'Tindakan ' + o.id };
  };
  const FIELD = {
    ami: [{ path: 'tgl', label: 'Tanggal AMI', tipe: 'date' }, { path: 'status', label: 'Status', tipe: 'select', opsi: ['Terjadwal', 'Selesai'] }],
    rtm: [{ path: 'tgl', label: 'Tanggal RTM', tipe: 'date' }, { path: 'status', label: 'Status', tipe: 'select', opsi: ['Terjadwal', 'Selesai'] }],
    tahap: [{ path: 'mulai', label: 'Tanggal mulai tahap', tipe: 'date' }, { path: 'hari', label: 'Durasi (hari)', tipe: 'number' }],
    rtl: [{ path: 'tenggat', label: 'Tenggat', tipe: 'date' }, { path: 'tglSelesai', label: 'Tanggal selesai', tipe: 'date' }, { path: 'status', label: 'Status', tipe: 'select', opsi: ['Terbuka', 'Proses', 'Selesai', 'Terverifikasi'] }],
    indikator: [{ path: 'ed.tgl', label: 'Tanggal evaluasi diri', tipe: 'date' }, { path: 'ami.tgl', label: 'Tanggal audit', tipe: 'date' }, { path: 'ami.temuan', label: 'Hasil audit', tipe: 'select', opsi: TEMUAN }, { path: 'ami.uraian', label: 'Uraian hasil audit', tipe: 'area' }]
  };
  box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const [bg, idx] = b.dataset.k.split('|'), { o, ket, bag } = objek(bg, idx);
    const f = bg === 'indikator' ? FIELD.indikator.filter(x => !x.path.startsWith('ed.') || o.ed) : FIELD[bg];
    dialogKoreksi(`Koreksi · ${ket}`, f, o, (ubah, alasan) => rekam(bag, ket, ubah, alasan)); });
  box.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { const [bg, idx] = b.dataset.j.split('|'), { o, ket, bag } = objek(bg, idx); dialogJson(ket, o, (ubah, alasan) => rekam(bag, ket, ubah, alasan)); });
  box.querySelectorAll('[data-rh]').forEach(b => b.onclick = async () => {
    if (!confirm('Hapus baris riwayat koreksi ini?')) return;
    cur.koreksi.daftar.splice(+b.dataset.rh, 1); await DB.simpanDok(COL, cur.koreksi); await addLog('Baris riwayat koreksi arsip ' + head.tahun + ' dihapus oleh Developer'); ulang();
  });
}
