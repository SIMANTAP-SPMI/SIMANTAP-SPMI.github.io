/* AMI kesiapan IABEE: penugasan auditor dari daftar dosen KUREKAM, progres audit, temuan C/W/D, dan matriks prediksi
   mengikuti RPEA 2026 (bagian 2.5.4 dan 2.6). Penugasan disimpan pada dokumen prodi di koleksi "iabee" (bidang "auditor"). */
import { S, ctx, icon, esc, save, toast, openDrawer, closeDrawer } from '../app.js';
import { DB } from '../db.js';
import { PRODI, UNITS, AUDITORS } from '../seed.js';
import { LED_AITEM } from '../led-data.js';
import { dokIabee, ringkas } from './jalur.js';
import { dokLed, dataAitem, pilihLed } from './led.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URUT = { A: 0, C: 1, W: 2, D: 3 };
const WARNA = { A: '#10b981', C: '#f5a524', W: '#fb923c', D: '#f0616d' };
const DISIPLIN = [15, 22];
let pilih = null, kurDosen = null;

const chip = (n) => n ? `<span class="tag" style="--c:${WARNA[n]}">${n}</span>` : '<span class="muted">–</span>';
const tglID = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–';

/** Nilai audit satu aitem (hanya yang sudah diaudit atau final), dengan skenario perbaikan: 0 kini, 1 semua D menjadi W, 2 semua W dan D menjadi C. */
const nilaiAitem = (d, it, sk) => {
  const a = dataAitem(d, it.no);
  if (!['audit', 'final'].includes(a.status) || !a.nilai) return '';
  const n = a.nilai;
  return sk >= 2 && (n === 'W' || n === 'D') ? 'C' : sk === 1 && n === 'D' ? 'W' : n;
};
const terburuk = (l) => l.reduce((m, n) => (n && (!m || URUT[n] > URUT[m])) ? n : m, '');

/** Prediksi status akreditasi per prodi menurut RPEA 2026: GA = 5 tahun (semua A/C), 2 tahun + interim (ada W), tidak terakreditasi (ada D, boleh masa tenggang 1 siklus). */
export function prediksi(pid, sk = 0) {
  const d = dokLed(pid), j = dokIabee(pid).jalur || '', pa = j === 'PA';
  const rel = LED_AITEM.filter(it => !(pa && it.k === 4)); // PA tidak menilai perbaikan berkelanjutan berbasis asesmen CPL
  const per = [1, 2, 3, 4].map(k => { const l = LED_AITEM.filter(i => i.k === k).map(i => nilaiAitem(d, i, sk)); return { k, n: l.filter(Boolean).length, tot: l.length, w: terburuk(l), nr: pa && k === 4 }; });
  const dis = terburuk(DISIPLIN.map(no => nilaiAitem(d, LED_AITEM.find(i => i.no === no), sk)));
  const dinilai = rel.filter(i => nilaiAitem(d, i, sk)).length;
  const w = terburuk(rel.map(i => nilaiAitem(d, i, sk)));
  let t, c;
  if (!dinilai) { t = 'Belum ada penilaian audit'; c = '#94a3b8'; }
  else if (pa) { if (w === 'D') { t = 'Berisiko Not Accredited (ada D)'; c = '#f0616d'; } else { t = 'Berpotensi Provisionally Accredited (3 tahun)'; c = '#10b981'; } }
  else if (w === 'D') { t = 'Not Accredited (boleh masa tenggang 1 siklus)'; c = '#f0616d'; }
  else if (w === 'W') { t = 'Accredited 2 tahun + evaluasi interim'; c = '#fb923c'; }
  else { t = 'Accredited 5 tahun'; c = '#10b981'; }
  return { per, dis, dinilai, total: rel.length, t, c, sementara: dinilai > 0 && dinilai < rel.length, pa, j };
}

async function muatDosen() { if (kurDosen === null) kurDosen = await DB.bacaLuar('kur_dosen'); return kurDosen; }

async function simpanAuditor(pid, daftar) {
  const x = JSON.parse(JSON.stringify(dokIabee(pid))); delete x._baru; x.auditor = daftar;
  await save('iabee', x, `Penugasan auditor IABEE ${pid}`);
}
/** Auditor yang ditugaskan otomatis terdaftar sebagai pengguna berperan Auditor agar dapat masuk ke SIMANTAP. */
async function daftarkanPengguna(a) {
  if (!a.email) return;
  const u = S.pengguna.find(x => x.id === a.email);
  if (u) { const peran = [...new Set([...(u.peran || []), 'auditor'])]; await save('pengguna', Object.assign({}, u, { peran, home: u.home || a.home }), 'Menambah peran Auditor ' + a.email); }
  else await save('pengguna', { id: a.email, email: a.email, nama: a.nama, peran: ['auditor'], unit: '', home: a.home }, 'Mendaftarkan auditor ' + a.email);
  if (!AUDITORS.some(x => x.id === a.email)) AUDITORS.push({ id: a.email, nama: a.nama, home: a.home });
}

export default function amiIabeeView(el) {
  const admin = ctx.role === 'admin';
  const lihat = ctx.role === 'auditee' ? PRODI.filter(p => p.id === ctx.unit) : PRODI;
  if (!lihat.length) { el.innerHTML = '<div class="empty">Akun Prodi/Unit ini belum terhubung ke prodi.</div>'; return; }
  if (!pilih || !lihat.some(p => p.id === pilih)) pilih = lihat[0].id;
  const p = PRODI.find(x => x.id === pilih), d = dokLed(pilih), di = dokIabee(pilih), aud = di.auditor || [];
  const J = ringkas(pilih), ami = J.ada ? J.L[4] : null;
  const baris = lihat.map(x => ({ x, P: prediksi(x.id), P1: prediksi(x.id, 1), P2: prediksi(x.id, 2) }));
  const R = { belum: 0, siap: 0, sudah: 0 };
  LED_AITEM.forEach(it => { const s = dataAitem(d, it.no).status; if (s === 'siap') R.siap++; else if (s === 'audit' || s === 'final') R.sudah++; else R.belum++; });
  const temuan = LED_AITEM.map(it => ({ it, a: dataAitem(d, it.no) })).filter(x => ['C', 'W', 'D'].includes(x.a.nilai));
  const ur = { C: 1, W: 2, D: 3 }; temuan.sort((a, b) => ur[b.a.nilai] - ur[a.a.nilai] || a.it.no - b.it.no);
  el.innerHTML = `
  <div class="ribbon">${icon('info')} <span><b>Aturan penilaian IABEE (RPEA 2026).</b> Tiap aitem dinilai A (Acceptable), C (Concern), W (Weakness), atau D (Deficiency). Semua A/C: akreditasi penuh 5 tahun. Ada W: 2 tahun dengan evaluasi interim. Ada D: tidak terakreditasi, boleh masa tenggang satu siklus. Jalur PA memakai Ya/Tidak dan tidak menilai Kriteria 4.</span></div>
  <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('audit')}</span><div><h3>Matriks prediksi akreditasi</h3><div class="sub">Dari penilaian audit internal terhadap 53 aitem. Prediksi sementara, bukan keputusan IABEE.</div></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Prodi</th><th>Jalur</th><th>K1</th><th>K2</th><th>K3</th><th>K4</th><th>Disiplin<br><span class="small muted">aitem 15, 22</span></th><th>Dinilai</th><th>Prediksi saat ini</th><th>Jika semua D diperbaiki</th><th>Jika semua W dan D diperbaiki</th></tr></thead><tbody>
    ${baris.map(({ x, P, P1, P2 }) => `<tr class="click" data-p="${x.id}" ${x.id === pilih ? 'style="background:rgba(139,92,246,.07)"' : ''}><td><b>${x.id}</b><div class="small muted">${esc(x.nama)}</div></td><td class="small">${P.j || 'belum ditetapkan'}</td>
      ${P.per.map(k => `<td>${k.nr ? '<span class="small muted">tidak dinilai</span>' : `${chip(k.w)}<div class="small muted">${k.n}/${k.tot}</div>`}</td>`).join('')}<td>${chip(P.dis)}</td><td class="small">${P.dinilai}/${P.total}</td>
      <td><span class="tag" style="--c:${P.c}">${P.t}</span>${P.sementara ? '<div class="small muted">sementara</div>' : ''}</td><td class="small" style="color:${P1.c}">${P1.dinilai ? P1.t : '–'}</td><td class="small" style="color:${P2.c}">${P2.dinilai ? P2.t : '–'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="small muted" style="margin-top:8px">Aitem 15 dan 22 memuat Kriteria Disiplin. Sub-disiplin TM dan LO menunggu penjelasan IABEE. Untuk PA, RPEA tidak memberi ambang angka; SIMANTAP memakai aturan: ada D berarti berisiko, selain itu berpotensi.</div></div>

  <div class="card" style="margin-top:16px"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('users')}</span><div><h3>AMI kesiapan · ${esc(p.id)} ${esc(p.nama)}</h3><div class="sub">${ami ? `Jadwal ${tglID(ami.mulai)} sampai ${tglID(ami.tenggat)} · langkah 5 di Jalur IABEE (${ami.p}%)` : 'Jadwal mengikuti Jalur IABEE; jalur prodi ini belum ditetapkan'}</div></div><div class="sp"></div>
    ${lihat.length > 1 ? `<select class="inp" id="m-p" style="max-width:260px">${lihat.map(x => `<option value="${x.id}" ${x.id === pilih ? 'selected' : ''}>${x.id} · ${esc(x.nama)}</option>`).join('')}</select>` : ''}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">
      <div style="padding:10px 12px;border-radius:12px;background:rgba(148,163,184,.14)"><b style="font-size:20px">${R.belum}</b><div class="small">belum siap diaudit</div></div>
      <div style="padding:10px 12px;border-radius:12px;background:rgba(14,165,233,.12)"><b style="font-size:20px;color:#0369a1">${R.siap}</b><div class="small">menunggu audit</div></div>
      <div style="padding:10px 12px;border-radius:12px;background:rgba(139,92,246,.12)"><b style="font-size:20px;color:#6d28d9">${R.sudah}</b><div class="small">sudah diaudit</div></div>
      <div style="padding:10px 12px;border-radius:12px;background:rgba(240,97,109,.1)"><b style="font-size:20px;color:#b42335">${temuan.filter(x => x.a.nilai !== 'C').length}</b><div class="small">temuan W atau D</div></div></div></div>

  <div class="card" style="margin-top:16px"><div class="card-h"><h3>Auditor yang ditugaskan</h3><div class="sp"></div>${admin ? `<button class="btn sm pri" id="m-add">${icon('plus')} Tugaskan auditor</button>` : ''}</div>
    ${aud.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Unit asal</th><th>Email masuk</th><th></th></tr></thead><tbody>${aud.map((a, i) => `<tr><td><b>${esc(a.nama)}</b></td><td>${esc(a.home)}</td><td class="small">${esc(a.email || '–')}</td><td>${admin ? `<button class="btn sm ghost" data-rm="${i}">${icon('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
      ${aud.length < 2 ? '<div class="small" style="color:#92400e;margin-top:6px">Disarankan minimal dua auditor per prodi, dan bukan dari unit asal prodi yang diaudit.</div>' : ''}`
    : `<div class="empty">Belum ada auditor ditugaskan untuk ${esc(p.id)}. ${admin ? 'Pilih dari daftar dosen KUREKAM.' : 'SPM yang menugaskan.'}${!DB.user ? ' Mode demo: auditor contoh boleh menilai prodi selain unit asalnya.' : ''}</div>`}</div>

  <div class="card" style="margin-top:16px"><div class="card-h"><h3>Temuan C, W, dan D</h3><div class="sub">W dan D otomatis menjadi RTL dengan sumber "AMI IABEE"</div></div>
    ${temuan.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Aitem</th><th>Nilai</th><th>Catatan auditor</th><th>RTL</th><th></th></tr></thead><tbody>${temuan.map(({ it, a }) => { const r = S.rtl.find(x => x.id === `RTL-IABEE-${p.id}-${it.no}`); return `<tr><td class="small" style="max-width:300px"><b>${it.no}</b> ${esc(it.id.slice(0, 110))}…</td><td>${chip(a.nilai)}</td><td class="small">${esc(a.catatan || '')}</td><td class="small">${r ? `<span class="tag" style="--c:#6366f1">${esc(r.status)}</span>` : (a.nilai === 'C' ? '<span class="muted">tidak wajib</span>' : '–')}</td><td><button class="btn sm" data-led="${it.no}">Buka aitem</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">Belum ada temuan. Auditor menilai tiap aitem di menu LED IABEE setelah prodi menandainya siap diaudit.</div>'}</div>`;

  const sp = el.querySelector('#m-p'); if (sp) sp.onchange = () => { pilih = sp.value; amiIabeeView(el); };
  el.querySelectorAll('tr[data-p]').forEach(tr => tr.onclick = () => { pilih = tr.dataset.p; amiIabeeView(el); });
  el.querySelectorAll('[data-led]').forEach(b => b.onclick = () => { pilihLed(p.id); location.hash = '#/led'; });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { await simpanAuditor(p.id, aud.filter((_, i) => i !== +b.dataset.rm)); toast('Penugasan dihapus'); amiIabeeView(el); });
  const add = el.querySelector('#m-add');
  if (add) add.onclick = async () => {
    const ds = (await muatDosen()).filter(x => x.homebase !== p.id && !aud.some(a => a.dosenId === x.id));
    const unitOpt = UNITS.map(u => `<option value="${u.id}" ${u.id === 'SPM' ? 'selected' : ''}>${u.id} · ${esc(u.nama)}</option>`).join('');
    openDrawer(`<div class="card-h"><h3>Tugaskan auditor ${esc(p.id)}</h3><div class="sp"></div><button class="btn ghost" data-close>${icon('close')}</button></div>
      <div class="card"><div class="small muted" style="margin-bottom:8px">${ds.length ? `Daftar dosen dari KUREKAM (${ds.length} dosen di luar homebase ${esc(p.id)}).` : 'Daftar dosen KUREKAM tidak terbaca (mode demo atau belum masuk). Isi nama dan unit asal secara manual.'}</div>
      ${ds.length ? `<div class="field"><label>Dosen</label><select class="inp" id="a-d"><option value="">Pilih dosen</option>${ds.map(x => `<option value="${esc(x.id)}">${esc(x.nama)} · ${esc(x.homebase || '')}${x.bidang ? ' · ' + esc(x.bidang) : ''}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>Nama auditor</label><input class="inp" id="a-n"></div>
      <div class="field"><label>Unit asal</label><select class="inp" id="a-h">${unitOpt}</select></div>
      <div class="field"><label>Email untuk masuk ke SIMANTAP</label><input class="inp" id="a-e" type="email" placeholder="nama@gmail.com"></div>
      <div class="small muted">Auditor otomatis terdaftar di Pengguna &amp; Peran dengan peran Auditor. SPM membuat akun masuknya di menu itu.</div>
      <div class="filters"><button class="btn pri" id="a-s">${icon('check')} Tugaskan</button></div></div>`, w => {
      const sel = w.querySelector('#a-d');
      if (sel) sel.onchange = () => { const x = ds.find(y => y.id === sel.value); if (x) { w.querySelector('#a-n').value = x.nama; if (UNITS.some(u => u.id === x.homebase)) w.querySelector('#a-h').value = x.homebase; } };
      w.querySelector('#a-s').onclick = async () => {
        const nama = w.querySelector('#a-n').value.trim(), home = w.querySelector('#a-h').value, email = w.querySelector('#a-e').value.trim().toLowerCase();
        if (!nama) return toast('Nama auditor wajib diisi');
        if (home === p.id) return toast('Auditor tidak boleh berasal dari prodi yang diaudit');
        if (!EMAIL.test(email)) return toast('Email tidak valid');
        if (aud.some(a => a.id === email)) return toast('Auditor ini sudah ditugaskan');
        const a = { id: email, nama, home, email, dosenId: sel ? sel.value : '' };
        await simpanAuditor(p.id, [...aud, a]); await daftarkanPengguna(a);
        closeDrawer(); toast('Auditor ditugaskan'); amiIabeeView(el);
      };
    });
  };
}
