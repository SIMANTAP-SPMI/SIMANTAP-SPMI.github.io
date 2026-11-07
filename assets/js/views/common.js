/* Utilitas tampilan bersama */
import { S, esc } from '../app.js';
import { valueAt, ratioOf, kelasRasio, skorDariRasio, KELAS, fmt, evalProdi } from '../scoring.js';
import { SUMBERMAP, PRODI } from '../seed.js';

export function indStat(ind, m = S.settings.bulan) {
  const x = valueAt(ind, m);
  if (!x) return { v: null, r: null, k: 'na', skor: 0, m: null };
  const r = ratioOf(ind, x.v, ind.cum ? x.m : 11);
  return { v: x.v, r, k: kelasRasio(r), skor: skorDariRasio(r), m: x.m };
}
export function summary(inds, m = S.settings.bulan) {
  const c = { ok: 0, near: 0, bad: 0, na: 0, n: inds.length };
  inds.forEach(i => { c[indStat(i, m).k]++; });
  c.pct = c.n ? (c.ok / c.n) * 100 : 0;
  c.idx = c.n ? inds.reduce((a, i) => a + Math.min(1.2, indStat(i, m).r || 0), 0) / c.n * 100 : 0;
  return c;
}
export const active = () => S.indikator.filter(i => i.aktif);
/** Indikator yang berkorelasi dengan instrumen akreditasi (LAM/IABEE/IAPT). Selain itu hanya untuk audit internal. */
export const isAkr = (i) => !!(i.lam || (i.iabee && i.iabee.length) || i.iapt);
export const akrTag = (i) => isAkr(i) ? '' : '<span class="tag" style="--c:#64748b">Audit internal</span>';
export const stBadge = (k) => `<span class="st ${k}">${KELAS[k].nama}</span>`;
export const sumberTags = (ind) => (ind.sumber || []).map(s => `<span class="tag" style="--c:${(SUMBERMAP[s] || {}).warna}">${s === 'USULAN' ? 'Usulan PEM' : s}</span>`).join(' ');
export const fmtV = (ind, v) => v == null ? '–' : fmt(v, ind.dec || 0);
export const targetTxt = (ind) => `${ind.arah === '<=' ? '≤' : '≥'} ${fmt(ind.target, ind.dec || (ind.target % 1 ? 2 : 0))} ${esc(ind.satuan)}`;
export function evalAll() { return PRODI.map(p => evalProdi(S, p.id)); }
export function sparkPath(vals, w = 120, h = 34) {
  const v = vals.filter(x => x != null);
  if (v.length < 2) return '';
  const mn = Math.min(...v), mx = Math.max(...v), sp = mx - mn || 1;
  return vals.map((x, i) => x == null ? null : `${(i / (vals.length - 1)) * w},${h - 3 - ((x - mn) / sp) * (h - 6)}`).filter(Boolean).join(' ');
}
