/* Siklus AMI: penetapan lingkup indikator per auditee, timeline tahapan, dan monitoring kemajuan.
   Yang menetapkan tanggal, lingkup, dan penguncian adalah SPM (peran admin); peran lain hanya melihat.
   Data: dokumen "siklus-<tahun>" di koleksi settings (aturan Firestore settings: baca anggota, tulis SPM), sehingga tidak perlu koleksi baru.
   Bentuk dokumen: { id, tahun, gelombang: [{ id, nama, mulai, tahap: [{ k, nama, pj, mulai, hari, kunci }], baris: [{ auditee, lingkup: { mode: 'semua'|'sebagian', ids: [] } }] }] }.
   Tanpa dokumen siklus, semua indikator aktif ikut AMI (perilaku lama). */
import { S, ctx, icon, esc, toast, openDrawer, closeDrawer, semuaSettings } from '../app.js';
import { DB } from '../db.js';
import { UNITS, UNIT, SUMBER } from '../seed.js';
import { active, isAkr, sumberTags } from './common.js';
import { tgl, today, tg, temuanTahun, berjalan, tahunAktif } from './siklus-core.js';

const DASAR = [
  { k: 'tetap', nama: 'Penetapan lingkup, jadwal, dan auditor', pj: 'SPM', hari: 7 },
  { k: 'ed', nama: 'Evaluasi diri dan unggah bukti', pj: 'Auditee', hari: 14 },
  { k: 'dok', nama: 'Pemeriksaan dokumen', pj: 'Auditor', hari: 7 },
  { k: 'lap', nama: 'Audit lapangan', pj: 'Auditor, Auditee', hari: 5 },
  { k: 'ba', nama: 'Berita Acara dan rapat penutup', pj: 'Auditor, SPM', hari: 3 },
  { k: 'tk', nama: 'Tindakan koreksi unit dan verifikasi', pj: 'Auditee, Auditor', hari: 30 }
];
const adaSPM = () => ctx.role === 'admin';
const tambah = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const selisih = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
export const selesai = (t) => tambah(t.mulai, Math.max(1, +t.hari || 1) - 1);

export const daftarSiklus = () => S.siklus || [];
export const siklusTahun = (y) => daftarSiklus().find(s => s.tahun === y) || null;

/** Gelombang terakhir yang memuat auditee tertentu, atau null bila siklus belum menetapkan. */
export function gelombangUnit(unit, y = berjalan()) {
  const s = siklusTahun(y); if (!s) return null;
  const g = (s.gelombang || []).filter(x => (x.baris || []).some(b => b.auditee === unit));
  return g.length ? g[g.length - 1] : null;
}
export function barisUnit(unit, y = berjalan()) { const g = gelombangUnit(unit, y); return g ? g.baris.find(b => b.auditee === unit) : null; }

/** Indikator masuk lingkup AMI siklus berjalan? Tanpa penetapan SPM, semua indikator aktif ikut (perilaku lama). */
export function dalamLingkup(i, y = berjalan()) {
  const b = barisUnit(i.unit, y);
  if (!b || !b.lingkup || b.lingkup.mode !== 'sebagian') return true;
  return (b.lingkup.ids || []).includes(i.id);
}
export const lingkupUnit = (unit, y = berjalan()) => active().filter(i => i.unit === unit && dalamLingkup(i, y));

/** Isian terkunci bila SPM mengunci tahap itu dan batasnya lewat. 'ed' = evaluasi diri auditee, 'lap' = audit lapangan auditor. SPM tidak pernah terkunci. */
export function terkunci(i, k) {
  if (adaSPM()) return false;
  const g = gelombangUnit(i.unit); if (!g) return false;
  const t = g.tahap.find(x => x.k === k);
  return !!(t && t.kunci && today() > selesai(t));
}

function hitungUlang(g) { let t = g.mulai; g.tahap.forEach(x => { x.mulai = t; t = tambah(t, Math.max(1, +x.hari || 1)); }); }

async function simpan(s, aksi) {
  const i = S.siklus.findIndex(x => x.id === s.id); if (i >= 0) S.siklus[i] = s; else S.siklus.push(s);
  try { await DB.put('settings', s, semuaSettings()); } catch (e) { toast('Gagal menyimpan siklus: ' + e.message); return false; }
  return true;
}

/** Susun siklus awal dari jadwal AMI yang sudah ada: jadwal berjarak lebih dari 30 hari dipisah menjadi gelombang. */
function buatDariJadwal(y) {
  const yy = String(y).slice(2), rows = S.ami.filter(a => a.id.startsWith('AMI-' + yy)).sort((a, b) => a.tgl.localeCompare(b.tgl));
  const grup = [];
  rows.forEach(a => { const g = grup[grup.length - 1]; if (g && selisih(g[0].tgl, a.tgl) <= 30) g.push(a); else grup.push([a]); });
  if (!grup.length) grup.push([]);
  const mundur = DASAR.slice(0, 3).reduce((n, t) => n + t.hari, 0);
  return { id: 'siklus-' + y, tahun: y, gelombang: grup.map((g, n) => {
    const w = { id: 'G' + (n + 1), nama: grup.length > 1 ? 'Tahap ' + (n + 1) : 'Siklus ' + y, mulai: g.length ? tambah(g[0].tgl, -mundur) : tambah(today(), 0), tahap: DASAR.map(t => Object.assign({ kunci: false }, t)), baris: g.map(a => ({ auditee: a.auditee, lingkup: { mode: 'semua', ids: [] } })) };
    hitungUlang(w); return w;
  }) };
}

/* ---------- kemajuan per auditee ---------- */
function kemajuan(g, b, y) {
  const semuaAktif = active().filter(i => i.unit === b.auditee), ling = semuaAktif.filter(i => b.lingkup && b.lingkup.mode === 'sebagian' ? (b.lingkup.ids || []).includes(i.id) : true);
  const T = Object.fromEntries(g.tahap.map(t => [t.k, t])), h = today();
  const ed = ling.filter(i => i.ed).length, aud = ling.filter(i => i.ami).length;
  const tm = temuanTahun(y).filter(t => t.unit === b.auditee), cl = tm.filter(t => t.status === 'Close').length;
  const telat = (k, selesaiOk) => !selesaiOk && T[k] && h > selesai(T[k]);
  return { semuaAktif: semuaAktif.length, n: ling.length, ed, aud, tm: tm.length, cl,
    tED: telat('ed', ed >= ling.length), tLap: telat('lap', aud >= ling.length), tTK: telat('tk', cl >= tm.length) };
}
const bar = (a, n, c) => `<div style="display:flex;align-items:center;gap:6px"><div class="bar" style="flex:1"><i style="width:${n ? Math.round(a / n * 100) : 100}%;--c:${c}"></i></div><b class="small">${a}/${n}</b></div>`;

/* ---------- timeline ---------- */
function gantt(g, rtmTgl) {
  const awal = tambah(g.tahap[0].mulai, -1), akhir = tambah(selesai(g.tahap[g.tahap.length - 1]), 2), total = Math.max(1, selisih(awal, akhir));
  const pos = (d) => Math.max(0, Math.min(100, selisih(awal, d) / total * 100)), h = today();
  const garis = (d, warna, ket) => d >= awal && d <= akhir ? `<div title="${esc(ket)}" style="position:absolute;top:0;bottom:0;left:${pos(d)}%;width:2px;background:${warna}"></div>` : '';
  const kolom = '230px 1fr';
  return `<div style="overflow-x:auto"><div style="min-width:640px">
    <div style="display:grid;grid-template-columns:${kolom};align-items:center;font-size:11px;color:var(--muted);padding-bottom:4px"><div></div><div style="display:flex;justify-content:space-between"><span>${tgl(awal)}</span><span>${tgl(akhir)}</span></div></div>
    ${g.tahap.map((t, n) => { const m = t.mulai, s = selesai(t), lw = h > s, aktif = h >= m && h <= s;
      return `<div style="display:grid;grid-template-columns:${kolom};align-items:center;border-top:1px solid rgba(148,163,184,.2);padding:7px 0">
        <div><b style="font-size:13px">${n + 1}. ${esc(t.nama)}</b>${t.kunci ? ` <span class="tag" style="--c:#f0616d">${icon('check')} terkunci setelah batas</span>` : ''}<div class="muted small">${esc(t.pj)} · ${tgl(m)} – ${tgl(s)} (${t.hari} hari)</div></div>
        <div style="position:relative;height:22px;background:rgba(24,35,58,.05);border-radius:8px"><div style="position:absolute;top:3px;bottom:3px;left:${pos(m)}%;width:${Math.max(1.5, pos(tambah(s, 1)) - pos(m))}%;border-radius:6px;background:${aktif ? '#6366f1' : lw ? '#94a3b8' : '#a5b4fc'}"></div>${garis(h, '#ef4444', 'Hari ini')}${rtmTgl ? garis(rtmTgl, '#a855f7', 'RTM ' + tgl(rtmTgl)) : ''}</div></div>`; }).join('')}
    <div class="muted small" style="margin-top:6px"><span style="color:#ef4444">■</span> hari ini ${tgl(h)}${rtmTgl && rtmTgl >= awal && rtmTgl <= akhir ? ` · <span style="color:#a855f7">■</span> RTM ${tgl(rtmTgl)}` : ''}</div></div></div>`;
}

/* ---------- tampilan tab ---------- */
export function siklusTab(el, ulang) {
  const y = tahunAktif(), s = siklusTahun(y), spm = adaSPM();
  const rtm = S.rtm.find(r => r.id === 'RTM-' + String(y).slice(2)), rtmTgl = rtm && rtm.tgl ? rtm.tgl : '';
  if (!s) {
    el.innerHTML = `<div class="card empty" style="text-align:center;padding:28px"><h3>Siklus AMI ${y} belum ditetapkan</h3>
      <p class="muted small" style="max-width:560px;margin:8px auto">Selama belum ditetapkan, semua indikator aktif setiap unit ikut diaudit. SPM menetapkan tanggal tahapan dan lingkup indikator per auditee di sini.</p>
      ${spm && y === berjalan() ? `<button class="btn pri" id="buat">${icon('plus')} Susun siklus ${y} dari jadwal AMI</button>` : `<div class="muted small">${spm ? 'Hanya siklus tahun berjalan yang dapat disusun.' : 'Penetapan dilakukan oleh SPM.'}</div>`}</div>`;
    const b = el.querySelector('#buat'); if (b) b.onclick = async () => { if (await simpan(buatDariJadwal(y))) { toast('Siklus disusun dari jadwal AMI; atur tanggal dan lingkup sesuai kebutuhan'); ulang(); } };
    return;
  }
  el.innerHTML = `<div class="card" style="padding:10px 14px;margin-bottom:14px"><div class="small">${spm ? 'SPM menentukan tanggal, lingkup, dan penguncian. ' : 'Tanggal dan lingkup ditetapkan SPM; Anda dapat melihatnya. '}Urutan satu siklus: lingkup dan jadwal, evaluasi diri, pemeriksaan dokumen, audit lapangan, Berita Acara, <b>tindakan koreksi unit</b>, lalu <b>RTM</b> (menerima hasil AMI sebagai masukan) yang memutuskan <b>RTL institusi</b>.</div></div>
  ${s.gelombang.map((g, gi) => {
    const dobel = g.baris.length;
    return `<div class="card" style="margin-bottom:16px">
      <div class="card-h"><span class="ico-badge" style="--c:#6366f1">${icon('calendar')}</span><div><h3>${esc(g.nama)}</h3><div class="sub">Mulai ${tgl(g.mulai)} · ${dobel} auditee: ${g.baris.map(b => b.auditee).join(', ') || 'belum ada'}</div></div><div class="sp"></div>
        ${spm ? `<button class="btn sm" data-tgl="${gi}">${icon('calendar')} Atur tanggal</button><button class="btn sm" data-aud="${gi}">${icon('user')} Auditee</button>${s.gelombang.length > 1 ? `<button class="btn sm" data-del="${gi}">${icon('close')} Hapus</button>` : ''}` : ''}</div>
      ${gantt(g, rtmTgl)}
      <h4 style="margin:16px 0 6px">Lingkup dan kemajuan per auditee</h4>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Auditee</th><th>Lingkup AMI</th><th>Evaluasi diri</th><th>Sudah diaudit</th><th>Tindakan koreksi</th><th>Penanda</th>${spm ? '<th></th>' : ''}</tr></thead><tbody>
      ${g.baris.map(b => { const k = kemajuan(g, b, y), sebagian = b.lingkup && b.lingkup.mode === 'sebagian'; const lw = [k.tED && 'Evaluasi diri terlambat', k.tLap && 'Audit terlambat', k.tTK && 'Tindakan koreksi terlambat'].filter(Boolean);
        return `<tr><td><b>${b.auditee}</b><div class="muted small">${esc((UNIT[b.auditee] || {}).nama || '')}</div></td>
          <td>${sebagian ? tg('#8b5cf6', 'Sebagian') : tg('#10b981', 'Semua')} <b>${k.n}</b> dari ${k.semuaAktif} indikator</td>
          <td style="min-width:120px">${bar(k.ed, k.n, '#0ea5e9')}</td><td style="min-width:120px">${bar(k.aud, k.n, '#8b5cf6')}</td>
          <td style="min-width:120px">${k.tm ? bar(k.cl, k.tm, '#10b981') : '<span class="muted small">belum ada temuan</span>'}</td>
          <td>${lw.length ? lw.map(x => tg('#f0616d', x)).join(' ') : '<span class="muted small">sesuai jadwal</span>'}</td>
          ${spm ? `<td><button class="btn sm" data-ling="${gi}|${b.auditee}">${icon('target')} Atur lingkup</button></td>` : ''}</tr>`; }).join('') || `<tr><td colspan="7" class="empty">Belum ada auditee di tahap ini.${spm ? ' Tambahkan lewat tombol Auditee.' : ''}</td></tr>`}
      </tbody></table></div></div>`; }).join('')}
  ${spm ? `<button class="btn" id="gel">${icon('plus')} Tambah gelombang</button>` : ''}
  <div class="muted small" style="margin-top:10px">Indikator di luar lingkup tetap dipantau bulanan, tetapi tidak wajib evaluasi diri dan tidak diaudit pada siklus ini.</div>`;

  el.querySelectorAll('[data-tgl]').forEach(b => b.onclick = () => dialogTanggal(s, +b.dataset.tgl, ulang));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => dialogHapus(s, +b.dataset.del, ulang));
  el.querySelectorAll('[data-aud]').forEach(b => b.onclick = () => dialogAuditee(s, +b.dataset.aud, ulang));
  el.querySelectorAll('[data-ling]').forEach(b => { const [gi, u] = b.dataset.ling.split('|'); b.onclick = () => dialogLingkup(s, +gi, u, ulang); });
  const gel = el.querySelector('#gel');
  if (gel) gel.onclick = async () => { const nx = Math.max(0, ...s.gelombang.map(x => +String(x.id).replace(/\D/g, '') || 0)) + 1; const w = { id: 'G' + nx, nama: 'Tahap ' + nx, mulai: today(), tahap: DASAR.map(t => Object.assign({ kunci: false }, t)), baris: [] }; hitungUlang(w); s.gelombang.push(w); if (await simpan(s)) { toast('Gelombang ditambahkan'); ulang(); } };
}

function dialogTanggal(s, gi, ulang) {
  const g = s.gelombang[gi];
  openDrawer(`<div class="card-h"><h3>Atur tanggal · ${esc(g.nama)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="field"><label>Nama gelombang</label><input class="inp" id="gN" value="${esc(g.nama)}"></div>
    <div class="field" style="margin-top:10px"><label>Tanggal mulai siklus</label><input class="inp" type="date" id="gM" value="${g.mulai}"></div>
    <div class="muted small" style="margin:10px 0">Tiap tahap dapat diatur sendiri. Tombol di bawah menyusun ulang tahap berurutan dari tanggal mulai dan durasi.</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahap</th><th>Mulai</th><th>Hari</th><th>Kunci</th></tr></thead><tbody>
    ${g.tahap.map((t, n) => `<tr><td>${esc(t.nama)}</td><td><input class="inp" type="date" data-m="${n}" value="${t.mulai}"></td><td><input class="inp" type="number" min="1" style="width:70px" data-h="${n}" value="${t.hari}"></td>
      <td>${t.k === 'ed' || t.k === 'lap' ? `<input type="checkbox" data-k="${n}" ${t.kunci ? 'checked' : ''} title="Kunci isian setelah batas"> <span class="small">kunci</span>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn" id="gU">${icon('loop')} Susun ulang berurutan</button><button class="btn pri" id="gS">${icon('check')} Simpan</button></div></div>`, d => {
    const baca = () => { g.nama = d.querySelector('#gN').value.trim() || g.nama; g.mulai = d.querySelector('#gM').value || g.mulai;
      g.tahap.forEach((t, n) => { t.mulai = d.querySelector(`[data-m="${n}"]`).value || t.mulai; t.hari = Math.max(1, +d.querySelector(`[data-h="${n}"]`).value || t.hari); const k = d.querySelector(`[data-k="${n}"]`); if (k) t.kunci = k.checked; }); };
    d.querySelector('#gU').onclick = () => { baca(); hitungUlang(g); d.querySelectorAll('[data-m]').forEach((i, n) => { i.value = g.tahap[n].mulai; }); toast('Tanggal disusun berurutan; tekan Simpan'); };
    d.querySelector('#gS').onclick = async () => { baca(); if (await simpan(s)) { closeDrawer(); toast('Tanggal tersimpan'); ulang(); } };
  });
}

function dialogAuditee(s, gi, ulang) {
  const g = s.gelombang[gi], pakai = new Set(s.gelombang.flatMap(x => x.baris.map(b => b.auditee)));
  openDrawer(`<div class="card-h"><h3>Auditee · ${esc(g.nama)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="small muted" style="margin-bottom:8px">Satu auditee diaudit satu kali per siklus; pilih unit yang belum masuk gelombang mana pun.</div>
    <div style="margin-bottom:12px">${g.baris.map(b => `<div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(148,163,184,.2)"><b style="width:46px">${b.auditee}</b><span class="muted small" style="flex:1">${esc((UNIT[b.auditee] || {}).nama || '')}</span>
      ${s.gelombang.length > 1 ? `<select class="inp" data-pindah="${b.auditee}" style="max-width:170px"><option value="">Pindahkan ke…</option>${s.gelombang.filter((x, n) => n !== gi).map(x => `<option value="${x.id}">${esc(x.nama)}</option>`).join('')}</select>` : ''}
      <a href="#" class="btn sm ghost" data-hapus="${b.auditee}" title="Keluarkan dari siklus">${icon('close')}</a></div>`).join('') || '<span class="muted small">Belum ada.</span>'}</div>
    <div style="display:flex;gap:8px"><select class="inp" id="aU">${UNITS.filter(u => !pakai.has(u.id)).map(u => `<option value="${u.id}">${u.id} · ${esc(u.nama)}</option>`).join('')}</select><button class="btn pri" id="aT">${icon('plus')} Tambah</button></div></div>`, d => {
    d.querySelectorAll('[data-pindah]').forEach(sel => sel.onchange = async () => { if (!sel.value) return; const tujuan = s.gelombang.find(x => x.id === sel.value), b = g.baris.find(x => x.auditee === sel.dataset.pindah);
      g.baris = g.baris.filter(x => x !== b); tujuan.baris.push(b); if (await simpan(s)) { closeDrawer(); toast(`${b.auditee} dipindah ke ${tujuan.nama}`); ulang(); } });
    d.querySelectorAll('[data-hapus]').forEach(a => a.onclick = async e => { e.preventDefault(); g.baris = g.baris.filter(b => b.auditee !== a.dataset.hapus); if (await simpan(s)) { closeDrawer(); ulang(); } });
    d.querySelector('#aT').onclick = async () => { const u = d.querySelector('#aU').value; if (!u) return toast('Semua unit sudah masuk siklus'); g.baris.push({ auditee: u, lingkup: { mode: 'semua', ids: [] } }); if (await simpan(s)) { closeDrawer(); toast(u + ' masuk siklus'); ulang(); } };
  });
}

function dialogLingkup(s, gi, unit, ulang) {
  const g = s.gelombang[gi], b = g.baris.find(x => x.auditee === unit), inds = active().filter(i => i.unit === unit);
  const pilih = new Set(b.lingkup && b.lingkup.mode === 'sebagian' ? b.lingkup.ids : inds.map(i => i.id));
  const sumberAda = SUMBER.filter(x => inds.some(i => (i.sumber || []).includes(x.id)));
  openDrawer(`<div class="card-h"><h3>Lingkup AMI · ${unit}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div style="display:flex;gap:16px;margin-bottom:10px"><label class="small"><input type="radio" name="md" value="semua" ${b.lingkup && b.lingkup.mode === 'sebagian' ? '' : 'checked'}> Semua indikator aktif (${inds.length})</label><label class="small"><input type="radio" name="md" value="sebagian" ${b.lingkup && b.lingkup.mode === 'sebagian' ? 'checked' : ''}> Sebagian</label></div>
    <div id="pil"><div class="small muted" style="margin-bottom:6px">Pilih menurut penyaring, lalu sesuaikan dengan centang manual.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${sumberAda.map(x => `<button class="btn sm ghost" data-sb="${x.id}">+ ${x.id}</button>`).join('')}
      ${['IKU', 'IKT', 'IK'].map(j => `<button class="btn sm ghost" data-jn="${j}">+ ${j}</button>`).join('')}<button class="btn sm ghost" data-akr="1">+ Berkorelasi akreditasi</button><button class="btn sm ghost" data-akr="0">+ Audit internal saja</button>
      <button class="btn sm ghost" data-semua="1">Pilih semua</button><button class="btn sm ghost" data-semua="0">Kosongkan</button></div>
    <div style="max-height:46vh;overflow:auto" class="tbl-wrap"><table class="tbl"><tbody>${inds.map(i => `<tr><td style="width:28px"><input type="checkbox" data-i="${i.id}"></td><td><b>${i.kode}</b> <span class="muted small">${i.jenis}</span><div class="small">${esc(i.teks)}</div><div style="margin-top:3px">${sumberTags(i)}</div></td></tr>`).join('')}</tbody></table></div></div>
    <div class="small" id="hit" style="margin:10px 0"></div><button class="btn pri" id="lS">${icon('check')} Simpan lingkup</button></div>`, d => {
    const cek = () => d.querySelectorAll('[data-i]'), md = () => d.querySelector('[name="md"]:checked').value;
    const segar = () => { cek().forEach(c => { c.checked = pilih.has(c.dataset.i); c.disabled = md() === 'semua'; }); d.querySelector('#pil').style.opacity = md() === 'semua' ? .5 : 1;
      d.querySelector('#hit').innerHTML = md() === 'semua' ? `Seluruh <b>${inds.length}</b> indikator diaudit.` : `<b>${pilih.size}</b> dari ${inds.length} indikator diaudit.`; };
    const tandai = (f) => { inds.filter(f).forEach(i => pilih.add(i.id)); segar(); };
    d.querySelectorAll('[name="md"]').forEach(r => r.onchange = segar);
    cek().forEach(c => c.onchange = () => { c.checked ? pilih.add(c.dataset.i) : pilih.delete(c.dataset.i); segar(); });
    d.querySelectorAll('[data-sb]').forEach(x => x.onclick = () => tandai(i => (i.sumber || []).includes(x.dataset.sb)));
    d.querySelectorAll('[data-jn]').forEach(x => x.onclick = () => tandai(i => i.jenis === x.dataset.jn));
    d.querySelectorAll('[data-akr]').forEach(x => x.onclick = () => tandai(i => isAkr(i) === (x.dataset.akr === '1')));
    d.querySelectorAll('[data-semua]').forEach(x => x.onclick = () => { x.dataset.semua === '1' ? inds.forEach(i => pilih.add(i.id)) : pilih.clear(); segar(); });
    d.querySelector('#lS').onclick = async () => {
      if (md() === 'sebagian' && !pilih.size) return toast('Pilih minimal satu indikator, atau pilih Semua');
      b.lingkup = md() === 'semua' ? { mode: 'semua', ids: [] } : { mode: 'sebagian', ids: Array.from(pilih) };
      if (await simpan(s)) { closeDrawer(); toast(`Lingkup ${unit} tersimpan`); ulang(); }
    };
    segar();
  });
}

function dialogHapus(s, gi, ulang) {
  const g = s.gelombang[gi], lain = s.gelombang.filter((x, n) => n !== gi);
  openDrawer(`<div class="card-h"><h3>Hapus ${esc(g.nama)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
    <div class="card"><div class="small" style="margin-bottom:10px">Gelombang ini memuat ${g.baris.length ? g.baris.length + ' auditee: <b>' + g.baris.map(b => b.auditee).join(', ') + '</b>' : 'tidak ada auditee'}. Hasil audit yang sudah diisi tidak ikut terhapus; hanya jadwal tahap dan lingkup yang dihapus dari siklus.</div>
    ${g.baris.length ? `<div class="field"><label>Auditee dipindahkan ke</label><select class="inp" id="hT">${lain.map(x => `<option value="${x.id}">${esc(x.nama)}</option>`).join('')}<option value="">Keluarkan dari siklus (semua indikator tetap ikut audit seperti sebelum siklus ditetapkan)</option></select></div>` : ''}
    <button class="btn pri" id="hS" style="margin-top:12px">${icon('check')} Hapus gelombang</button></div>`, d => {
    d.querySelector('#hS').onclick = async () => {
      const t = d.querySelector('#hT'), tujuan = t && t.value ? s.gelombang.find(x => x.id === t.value) : null;
      if (tujuan) g.baris.forEach(b => tujuan.baris.push(b));
      s.gelombang = s.gelombang.filter(x => x !== g);
      if (await simpan(s)) { closeDrawer(); toast(`${g.nama} dihapus` + (tujuan ? `; auditee dipindah ke ${tujuan.nama}` : '')); ulang(); }
    };
  });
}
