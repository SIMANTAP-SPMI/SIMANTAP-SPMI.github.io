/* Beranda "Tugas saya" untuk auditee (Prodi, Unit, Kasubbag AK) dan Auditor: hanya pekerjaan yang sedang berjalan menurut timeline siklus AMI.
   Tanpa dashboard lengkap; layar lengkap tetap tersedia lewat pengaturan tampilan SPM atau Wakil Direktur I. */
import { S, ctx, icon, esc } from '../app.js';
import { UNIT, AUDITORS, ROLES } from '../seed.js';
import { BLN } from '../scoring.js';
import { active } from './common.js';
import { detail } from './indikator.js';
import { gelombangUnit, lingkupUnit, selesai } from './amisiklus.js';
import { tgl, today, temuanTahun, berjalan } from './siklus-core.js';
import { kartuSkor } from './kinerja.js';

const terbuka = (t) => t.status !== 'Close';

/** Tahap timeline yang sedang berjalan untuk sebuah gelombang; bila belum atau sudah lewat, tahap terdekat. */
export function tahapAktif(g) {
  if (!g) return null;
  const h = today(), t = g.tahap.find(x => h >= x.mulai && h <= selesai(x));
  if (t) return { t, ket: 'sedang berjalan' };
  const n = g.tahap.find(x => x.mulai > h);
  return n ? { t: n, ket: 'berikutnya' } : { t: g.tahap[g.tahap.length - 1], ket: 'sudah lewat' };
}
function strip(g, aktif) {
  if (!g) return `<div class="muted small">SPM belum menetapkan timeline siklus; semua indikator aktif ikut AMI.</div>`;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap">${g.tahap.map((t, n) => { const on = aktif && aktif.t === t;
    return `<div style="flex:1;min-width:120px;padding:8px 10px;border-radius:10px;border:1px solid ${on ? '#6366f1' : 'rgba(148,163,184,.3)'};background:${on ? 'rgba(99,102,241,.08)' : 'transparent'}">
      <div class="small" style="font-weight:700">${n + 1}. ${esc(t.nama)}</div><div class="muted small">${tgl(t.mulai)} – ${tgl(selesai(t))}</div></div>`; }).join('')}</div>`;
}
const kpi = (judul, n, warna, ket = '') => `<div class="card kpi" style="--c:${warna}"><div class="lbl"><span class="dot" style="--c:${warna}"></span>${judul}</div><div class="val">${n}</div>${ket ? `<div class="muted small">${ket}</div>` : ''}</div>`;
const kosong = (t) => `<tr><td class="empty" colspan="3">${t}</td></tr>`;

export default function tugasSaya(el) {
  const ulang = () => tugasSaya(el);
  el.innerHTML = ctx.role === 'auditor' ? htmlAuditor() : htmlAuditee();
  el.querySelectorAll('tr.click[data-id]').forEach(tr => tr.onclick = () => detail(tr.dataset.id, ulang));
  el.querySelectorAll('[data-go]').forEach(a => a.onclick = (e) => { e.preventDefault(); location.hash = '#/' + a.dataset.go; });
}

function htmlAuditee() {
  const u = ctx.unit, m = S.settings.bulan, g = gelombangUnit(u), a = tahapAktif(g), ling = lingkupUnit(u);
  const belumED = ling.filter(i => !i.ed), tanpaBukti = ling.filter(i => !((i.bukti || {})[m] || []).length);
  const tk = temuanTahun(berjalan()).filter(t => t.unit === u && terbuka(t));
  const deadline = [a && a.t ? selesai(a.t) : '', ...tk.map(t => t.tenggat)].filter(x => x && x >= today()).sort()[0];
  const k = a && a.t.k;
  const utama = k === 'tk' ? 'tk' : (k === 'dok' || k === 'lap') ? 'bukti' : 'ed';
  const barisInd = (arr, ket) => arr.slice(0, 8).map(i => `<tr class="click" data-id="${i.id}"><td><b>${i.kode}</b></td><td>${esc(i.teks)}</td><td class="muted small">${ket}</td></tr>`).join('') + (arr.length > 8 ? `<tr><td colspan="3" class="muted small">dan ${arr.length - 8} lainnya, lihat menu Monitoring Capaian.</td></tr>` : '');
  const blokED = `<h4 style="margin:14px 0 6px">Evaluasi diri belum diisi (${belumED.length})</h4><div class="tbl-wrap"><table class="tbl"><tbody>${barisInd(belumED, 'isi skala dan analisis') || kosong('Semua indikator dalam lingkup sudah memiliki evaluasi diri.')}</tbody></table></div>`;
  const blokBukti = `<h4 style="margin:14px 0 6px">Bukti ${BLN[m]} belum ada (${tanpaBukti.length})</h4><div class="tbl-wrap"><table class="tbl"><tbody>${barisInd(tanpaBukti, 'unggah bukti') || kosong('Semua indikator dalam lingkup sudah berbukti.')}</tbody></table></div>`;
  const blokTK = `<h4 style="margin:14px 0 6px">Tindakan koreksi terbuka (${tk.length})</h4><div class="tbl-wrap"><table class="tbl"><tbody>${tk.slice(0, 8).map(t => `<tr class="click" data-go="rtl" style="cursor:pointer"><td><b>${esc(t.id)}</b></td><td>${esc((t.uraian || '').slice(0, 130))}</td><td class="muted small">tenggat ${tgl(t.tenggat)}</td></tr>`).join('') || kosong('Tidak ada tindakan koreksi terbuka.')}</tbody></table></div>`;
  const urut = { ed: blokED + blokTK + blokBukti, bukti: blokBukti + blokTK + blokED, tk: blokTK + blokED + blokBukti }[utama];
  const prodi = ctx.role === 'prodi';
  return `<div class="card" style="margin-bottom:16px"><div class="card-h"><span class="ico-badge" style="--c:#f5a524">${icon('flag')}</span><div><h3>Tugas saya · ${esc(ROLES[ctx.role].nama)} ${esc(u)}</h3><div class="sub">${esc((UNIT[u] || {}).nama || '')} · siklus AMI ${berjalan()}${a ? ` · tahap ${esc(a.t.nama)} (${a.ket})` : ''}</div></div></div>${strip(g, a)}</div>
  <div class="grid g4" style="margin-bottom:16px">${kpi('Indikator dalam lingkup', ling.length, '#6366f1', 'dari ' + active().filter(i => i.unit === u).length + ' indikator aktif')}${kpi('Evaluasi diri belum diisi', belumED.length, belumED.length ? '#f0616d' : '#10b981')}${kpi('Tindakan koreksi terbuka', tk.length, tk.length ? '#f5a524' : '#10b981')}${kpi('Tenggat terdekat', deadline ? tgl(deadline) : '–', '#0ea5e9')}</div>
  <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('check')}</span><div><h3>Kerjakan sekarang</h3><div class="sub">Urutan mengikuti tahap yang sedang berjalan. Klik baris untuk mengisi.</div></div></div>${urut}
  ${prodi ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><a class="btn" href="#/jalur">${icon('flag')} Jalur IABEE</a><a class="btn" href="#/led">${icon('book')} LED IABEE</a><a class="btn" href="#/amilam">${icon('audit')} Borang LAM</a></div>` : ''}</div>
  ${kartuSkor('auditee', u)}`;
}

function htmlAuditor() {
  const id = ctx.auditor, nama = (AUDITORS.find(x => x.id === id) || {}).nama || 'Auditor';
  const tugas = S.ami.filter(a => (a.auditor || []).includes(id) && a.status !== 'Selesai');
  const units = tugas.map(a => a.auditee), a0 = tugas.length ? tahapAktif(gelombangUnit(tugas[0].auditee)) : null;
  const perUnit = units.map(u => { const ling = lingkupUnit(u); return { u, n: ling.length, aud: ling.filter(i => i.ami).length, belum: ling.filter(i => !i.ami) }; });
  const belum = perUnit.flatMap(p => p.belum);
  const ver = temuanTahun(berjalan()).filter(t => units.includes(t.unit) && t.status === 'Menunggu verifikasi');
  const tglAudit = tugas.map(a => a.tgl).sort()[0];
  const gA = tugas.length ? gelombangUnit(tugas[0].auditee) : null, tDok = gA && gA.tahap.find(x => x.k === 'dok'), belumMulai = !!(tDok && today() < tDok.mulai);
  return `<div class="card" style="margin-bottom:16px"><div class="card-h"><span class="ico-badge" style="--c:#8b5cf6">${icon('audit')}</span><div><h3>Tugas saya · Auditor ${esc(nama)}</h3><div class="sub">Siklus AMI ${berjalan()}${a0 ? ` · tahap ${esc(a0.t.nama)} (${a0.ket})` : ''}</div></div></div>${strip(tugas.length ? gelombangUnit(tugas[0].auditee) : null, a0)}</div>
  <div class="grid g4" style="margin-bottom:16px">${kpi('Auditee ditugaskan', units.length, '#6366f1', units.join(', ') || 'belum ada penugasan aktif')}${kpi('Indikator belum diaudit', belum.length, belum.length ? '#f0616d' : '#10b981')}${kpi('Temuan menunggu verifikasi', ver.length, ver.length ? '#f5a524' : '#10b981')}${kpi('Audit terdekat', tglAudit ? tgl(tglAudit) : '–', '#0ea5e9')}</div>
  <div class="card"><div class="card-h"><span class="ico-badge" style="--c:#f0616d">${icon('check')}</span><div><h3>Kerjakan sekarang</h3><div class="sub">Hanya indikator dalam lingkup AMI yang ditetapkan SPM. Klik baris untuk menilai.</div></div></div>
    ${perUnit.map(p => `<h4 style="margin:12px 0 6px">${p.u} · ${esc((UNIT[p.u] || {}).nama || '')} <span class="muted small">${p.aud} dari ${p.n} indikator sudah diaudit</span></h4>
      <div class="tbl-wrap"><table class="tbl"><tbody>${belumMulai ? kosong(`Penilaian dimulai pada tahap ${esc(tDok.nama)} (${tgl(tDok.mulai)}).`) : p.belum.slice(0, 8).map(i => `<tr class="click" data-id="${i.id}"><td><b>${i.kode}</b></td><td>${esc(i.teks)}</td><td class="muted small">${i.ed ? 'evaluasi diri skala ' + i.ed.skala : 'belum evaluasi diri'}</td></tr>`).join('') || kosong('Semua indikator dalam lingkup sudah diaudit.')}${!belumMulai && p.belum.length > 8 ? `<tr><td colspan="3" class="muted small">dan ${p.belum.length - 8} lainnya.</td></tr>` : ''}</tbody></table></div>`).join('') || '<div class="empty">Tidak ada penugasan AMI yang aktif untuk Bapak/Ibu saat ini.</div>'}
    <h4 style="margin:14px 0 6px">Tindakan koreksi menunggu verifikasi (${ver.length})</h4><div class="tbl-wrap"><table class="tbl"><tbody>${ver.slice(0, 8).map(t => `<tr class="click" data-go="rtl" style="cursor:pointer"><td><b>${esc(t.id)}</b></td><td>${esc(t.unit)} · ${esc((t.uraian || '').slice(0, 110))}</td><td class="muted small">${esc(t.status)}</td></tr>`).join('') || kosong('Tidak ada yang menunggu verifikasi.')}</tbody></table></div></div>
  ${kartuSkor('auditor', id)}`;
}
