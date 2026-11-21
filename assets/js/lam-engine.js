/* Mesin rumus untuk instrumen LAM Teknik 2025: membaca rumus Excel asli (lam-data.js) dan menghitungnya persis seperti berkas resmi.
   Fungsi yang didukung hanya yang dipakai instrumen: IF, AND, OR, ISNUMBER, ISBLANK, SUM, AVERAGE, CHAR, TEXT.
   Isian (skor asesor dan angka borang) menimpa sel Kertas Kerja; sel lain dihitung dari rumus. */
import { LAM_KK, LAM_LAP, LAM_DEF, LAM_ITEMS } from './lam-data.js';

const ERR = (e) => ({ err: e });
const isErr = (v) => v && typeof v === 'object' && v.err;

/* ---------- penghurai ---------- */
function token(src) {
  const t = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') { let j = i + 1, s = ''; while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; } t.push({ k: 's', v: s }); i = j + 1; continue; }
    if (/[0-9.]/.test(c)) { const m = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?|^[0-9]+\.?/.exec(src.slice(i)); t.push({ k: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    const q = /^(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!\$?([A-Z]{1,3})\$?([0-9]+)/.exec(src.slice(i));
    if (q) { t.push({ k: 'ref', sheet: q[1] || q[2], ref: q[3] + q[4] }); i += q[0].length; continue; }
    const r = /^\$?([A-Z]{1,3})\$?([0-9]+)(?![A-Za-z0-9_(])/.exec(src.slice(i));
    if (r) { t.push({ k: 'ref', sheet: null, ref: r[1] + r[2] }); i += r[0].length; continue; }
    const f = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i));
    if (f) { t.push({ k: 'id', v: f[0].toUpperCase() }); i += f[0].length; continue; }
    const o = /^(<=|>=|<>|[-+*/^&=<>(),:%])/.exec(src.slice(i));
    if (o) { t.push({ k: 'op', v: o[0] }); i += o[0].length; continue; }
    throw new Error('Token tidak dikenal: ' + src.slice(i, i + 10));
  }
  return t;
}
function parse(src) {
  const t = token(src); let p = 0;
  const peek = () => t[p], nxt = () => t[p++], isOp = (v) => t[p] && t[p].k === 'op' && t[p].v === v;
  const cmp = () => { let a = cat(); while (t[p] && t[p].k === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t[p].v)) { const o = nxt().v; a = { t: 'b', o, a, b: cat() }; } return a; };
  const cat = () => { let a = add(); while (isOp('&')) { nxt(); a = { t: 'b', o: '&', a, b: add() }; } return a; };
  const add = () => { let a = mul(); while (isOp('+') || isOp('-')) { const o = nxt().v; a = { t: 'b', o, a, b: mul() }; } return a; };
  const mul = () => { let a = pow(); while (isOp('*') || isOp('/')) { const o = nxt().v; a = { t: 'b', o, a, b: pow() }; } return a; };
  const pow = () => { let a = un(); while (isOp('^')) { nxt(); a = { t: 'b', o: '^', a, b: un() }; } return a; };
  const un = () => { if (isOp('-')) { nxt(); return { t: 'u', a: un() }; } if (isOp('+')) { nxt(); return un(); } return post(); };
  const post = () => { let a = prim(); while (isOp('%')) { nxt(); a = { t: 'b', o: '/', a, b: { t: 'n', v: 100 } }; } return a; };
  const prim = () => {
    const x = nxt(); if (!x) throw new Error('Rumus terpotong');
    if (x.k === 'n') return { t: 'n', v: x.v };
    if (x.k === 's') return { t: 's', v: x.v };
    if (x.k === 'ref') { if (isOp(':')) { nxt(); const y = nxt(); return { t: 'rng', sheet: x.sheet, a: x.ref, b: y.ref }; } return { t: 'ref', sheet: x.sheet, ref: x.ref }; }
    if (x.k === 'id') { if (isOp('(')) { nxt(); const args = []; if (!isOp(')')) { for (;;) { args.push(cmp()); if (isOp(',')) { nxt(); continue; } break; } } if (!isOp(')')) throw new Error('Kurung tidak ditutup'); nxt(); return { t: 'f', n: x.v, args }; } if (x.v === 'TRUE') return { t: 'n', v: true }; if (x.v === 'FALSE') return { t: 'n', v: false }; throw new Error('Nama tidak dikenal ' + x.v); }
    if (x.k === 'op' && x.v === '(') { const a = cmp(); if (!isOp(')')) throw new Error('Kurung tidak ditutup'); nxt(); return a; }
    throw new Error('Rumus tidak valid');
  };
  const ast = cmp(); if (p < t.length) throw new Error('Sisa rumus'); return ast;
}
const cache = new Map();
const ast = (f) => { let a = cache.get(f); if (!a) { a = parse(f); cache.set(f, a); } return a; };

/* ---------- koersi gaya Excel ---------- */
const num = (v) => { if (v === null || v === undefined) return 0; if (typeof v === 'boolean') return v ? 1 : 0; if (typeof v === 'number') return v; if (typeof v === 'string') { const n = Number(v.trim()); return v.trim() !== '' && !Number.isNaN(n) ? n : ERR('#VALUE!'); } return v; };
const bool = (v) => { if (v === null || v === undefined) return false; if (typeof v === 'boolean') return v; if (typeof v === 'number') return v !== 0; if (typeof v === 'string') return v.toUpperCase() === 'TRUE' ? true : v.toUpperCase() === 'FALSE' ? false : ERR('#VALUE!'); return v; };
const str = (v) => v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v);
const rank = (v) => typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2;
function bandingkan(a, b) {
  if (a === null || a === undefined) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null || b === undefined) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const ra = typeof a === 'boolean' ? 2 : rank(a), rb = typeof b === 'boolean' ? 2 : rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (typeof a === 'string') { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
  return a < b ? -1 : a > b ? 1 : 0;
}
const kolNo = (s) => s.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0);
const kolHuruf = (n) => { let s = ''; while (n > 0) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s; };

export class Engine {
  constructor(inputs = {}) { this.inp = inputs; this.memo = { KK: new Map(), LAP: new Map() }; }
  /** Nilai sel pada lembar 'KK' (Kertas Kerja) atau 'LAP' (Lap AK Individual). */
  cell(sheet, ref) {
    const memo = this.memo[sheet]; if (memo.has(ref)) return memo.get(ref);
    memo.set(ref, ERR('#REF!')); // cegah siklus
    let v;
    if (sheet === 'KK' && Object.prototype.hasOwnProperty.call(this.inp, ref)) v = this.inp[ref] === '' ? null : this.inp[ref];
    else if (sheet === 'KK' && Object.prototype.hasOwnProperty.call(LAM_DEF, ref) ) v = LAM_DEF[ref];
    else { const x = (sheet === 'KK' ? LAM_KK : LAM_LAP)[ref]; v = x === undefined ? null : typeof x === 'string' ? (this.ev(ast(x), sheet) ?? 0) : x; }
    memo.set(ref, v); return v;
  }
  sh(s, cur) { if (!s) return cur; return s === 'Kertas Kerja' ? 'KK' : s === 'Menu' ? 'MENU' : cur; }
  rng(n, cur) { const a = /([A-Z]+)([0-9]+)/.exec(n.a), b = /([A-Z]+)([0-9]+)/.exec(n.b), out = []; const sh = this.sh(n.sheet, cur);
    for (let c = kolNo(a[1]); c <= kolNo(b[1]); c++) for (let r = +a[2]; r <= +b[2]; r++) out.push(sh === 'MENU' ? null : this.cell(sh, kolHuruf(c) + r)); return out; }
  ev(n, cur) {
    switch (n.t) {
      case 'n': return n.v;
      case 's': return n.v;
      case 'ref': { const sh = this.sh(n.sheet, cur); return sh === 'MENU' ? null : this.cell(sh, n.ref); }
      case 'rng': return ERR('#VALUE!');
      case 'u': { const a = num(this.ev(n.a, cur)); return isErr(a) ? a : -a; }
      case 'b': {
        const a = this.ev(n.a, cur), b = this.ev(n.b, cur); if (isErr(a)) return a; if (isErr(b)) return b;
        if (n.o === '&') return str(a) + str(b);
        if (['=', '<>', '<', '>', '<=', '>='].includes(n.o)) { const c = bandingkan(a, b); return n.o === '=' ? c === 0 : n.o === '<>' ? c !== 0 : n.o === '<' ? c < 0 : n.o === '>' ? c > 0 : n.o === '<=' ? c <= 0 : c >= 0; }
        const x = num(a), y = num(b); if (isErr(x)) return x; if (isErr(y)) return y;
        if (n.o === '+') return x + y; if (n.o === '-') return x - y; if (n.o === '*') return x * y;
        if (n.o === '/') return y === 0 ? ERR('#DIV/0!') : x / y;
        return Math.pow(x, y);
      }
      case 'f': return this.fn(n, cur);
      default: return ERR('#VALUE!');
    }
  }
  flat(args, cur) { const out = []; args.forEach(a => { if (a.t === 'rng') this.rng(a, cur).forEach(v => out.push({ v, rng: true })); else out.push({ v: this.ev(a, cur), rng: false }); }); return out; }
  fn(n, cur) {
    const a = n.args;
    switch (n.n) {
      case 'IF': { const c = bool(this.ev(a[0], cur)); if (isErr(c)) return c; return c ? this.ev(a[1], cur) : (a[2] ? this.ev(a[2], cur) : false); }
      case 'AND': case 'OR': { const l = this.flat(a, cur); let r = n.n === 'AND'; for (const { v, rng } of l) { if (isErr(v)) return v; if (rng && (v === null || typeof v === 'string')) continue; const b = bool(v); if (isErr(b)) return b; r = n.n === 'AND' ? r && b : r || b; } return r; }
      case 'ISNUMBER': { const v = this.ev(a[0], cur); return typeof v === 'number'; }
      case 'ISBLANK': { const v = this.ev(a[0], cur); return v === null || v === undefined; }
      case 'SUM': { let s = 0; for (const { v, rng } of this.flat(a, cur)) { if (isErr(v)) return v; if (rng) { if (typeof v === 'number') s += v; } else { const x = num(v); if (isErr(x)) return x; s += x; } } return s; }
      case 'AVERAGE': { let s = 0, k = 0; for (const { v, rng } of this.flat(a, cur)) { if (isErr(v)) return v; if (rng) { if (typeof v === 'number') { s += v; k++; } } else { const x = num(v); if (isErr(x)) return x; s += x; k++; } } return k ? s / k : ERR('#DIV/0!'); }
      case 'CHAR': { const x = num(this.ev(a[0], cur)); return isErr(x) ? x : String.fromCharCode(x); }
      case 'TEXT': { const x = num(this.ev(a[0], cur)), f = str(this.ev(a[1], cur)); if (isErr(x)) return x; const d = (f.split('.')[1] || '').length; return x.toFixed(d).replace('.', ','); }
      default: return ERR('#NAME?');
    }
  }
  kk(ref) { return this.cell('KK', ref); }
  lap(ref) { return this.cell('LAP', ref); }
}

/* ---------- hasil per prodi ---------- */
const angka = (v) => typeof v === 'number' && Number.isFinite(v) ? v : 0;
export function hitungLam(inputs) {
  const e = new Engine(inputs);
  const butir = LAM_ITEMS.map(it => {
    const skor = angka(e.kk(it.out)), nilai = angka(e.lap('H' + it.lap)), sp = {};
    ['J', 'L', 'N'].forEach(k => { const v = e.lap(k + it.lap); if (v !== null) sp[k] = v; });
    return { no: it.no, skor, bobot: it.bobot, nilai, sp, ket: ['I', 'K', 'M'].map(k => e.lap(k + it.lap)).filter(Boolean)[0] || '' };
  });
  const sy = (k) => e.lap(k) === 'TERPENUHI';
  return { e, butir, NA: angka(e.lap('K5')), spTerakreditasi: sy('K8'), spUnggul3: sy('K9'), spUnggul5: sy('K10') };
}

/** Sel isian sebuah butir: [{ref, jenis:'judge'|'borang', ...}] */
export const isianButir = (it) => [...it.judge.map(j => ({ ...j, jenis: 'judge' })), ...it.borang.map(b => ({ ...b, jenis: 'borang' }))];
/** Apakah semua isian butir sudah ada pada inputs (judge wajib, borang wajib terisi angka). */
export const butirLengkap = (it, inputs) => isianButir(it).every(x => inputs[x.ref] !== undefined && inputs[x.ref] !== '' && inputs[x.ref] !== null);
