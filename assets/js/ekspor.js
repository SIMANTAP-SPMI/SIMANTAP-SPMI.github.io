/* Ekspor berkas Office tanpa pustaka luar: penulis ZIP tanpa kompresi, lalu .xlsx dan .docx minimal. */
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };

export function zip(files) {
  const enc = new TextEncoder(), parts = [], cd = []; let off = 0, n = 0;
  for (const [name, str] of Object.entries(files)) {
    const nb = enc.encode(name), db = enc.encode(str), c = crc(db);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, c, true); lh.setUint32(18, db.length, true); lh.setUint32(22, db.length, true); lh.setUint16(26, nb.length, true);
    parts.push(new Uint8Array(lh.buffer), nb, db);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, c, true); ch.setUint32(20, db.length, true); ch.setUint32(24, db.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
    cd.push(new Uint8Array(ch.buffer), nb);
    off += 30 + nb.length + db.length; n++;
  }
  const cdl = cd.reduce((a, x) => a + x.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, n, true); end.setUint16(10, n, true); end.setUint32(12, cdl, true); end.setUint32(16, off, true);
  return [...parts, ...cd, new Uint8Array(end.buffer)];
}

const bersih = (s) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const x = (s) => bersih(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function unduh(nama, bagian, mime) {
  const url = URL.createObjectURL(new Blob(bagian, { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const OPC = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFD = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const kol = (i) => String.fromCharCode(65 + i);

/** sheets: [{nama, lebar:[..], baris:[[sel,...]]}], sel = teks atau {v, s} dengan s: 0 biasa, 1 judul tabel, 2 tebal, 3 band kriteria. */
export function xlsx(sheets) {
  const f = {
    '[Content_Types].xml': XML + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': XML + `<Relationships xmlns="${OPC}"><Relationship Id="rId1" Type="${OFD}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': XML + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${OFD}"><sheets>${sheets.map((s, i) => `<sheet name="${x(s.nama)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': XML + `<Relationships xmlns="${OPC}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${OFD}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${OFD}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': XML + `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD966"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  };
  sheets.forEach((s, i) => {
    const rows = s.baris.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => { const o = typeof c === 'object' && c !== null ? c : { v: c, s: 0 }; return o.v === '' || o.v == null ? `<c r="${kol(ci)}${ri + 1}" s="${o.s || 0}"/>` : `<c r="${kol(ci)}${ri + 1}" s="${o.s || 0}" t="inlineStr"><is><t xml:space="preserve">${x(o.v)}</t></is></c>`; }).join('')}</row>`).join('');
    f[`xl/worksheets/sheet${i + 1}.xml`] = XML + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${(s.lebar || []).map((w, ci) => `<col min="${ci + 1}" max="${ci + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData></worksheet>`;
  });
  return zip(f);
}

/** blok: [{t:'h1'|'h2'|'h3'|'p'|'b'|'li'|'cat', v:'teks'}] */
export function docx(blok) {
  const par = (v, o = {}) => `<w:p>${o.stil ? `<w:pPr><w:pStyle w:val="${o.stil}"/></w:pPr>` : ''}<w:r>${o.b || o.i ? `<w:rPr>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}</w:rPr>` : ''}<w:t xml:space="preserve">${x(v)}</w:t></w:r></w:p>`;
  const isi = blok.map(b => {
    if (b.t === 'h1') return par(b.v, { stil: 'Heading1' });
    if (b.t === 'h2') return par(b.v, { stil: 'Heading2' });
    if (b.t === 'h3') return par(b.v, { stil: 'Heading3' });
    if (b.t === 'b') return par(b.v, { b: true });
    if (b.t === 'cat') return par(b.v, { i: true });
    if (b.t === 'li') return par('• ' + b.v);
    return bersih(b.v).split(/\n+/).map(l => par(l)).join('');
  }).join('');
  const st = (id, nm, sz) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${nm}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="${sz}"/></w:rPr></w:style>`;
  return zip({
    '[Content_Types].xml': XML + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    '_rels/.rels': XML + `<Relationships xmlns="${OPC}"><Relationship Id="rId1" Type="${OFD}/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': XML + `<Relationships xmlns="${OPC}"><Relationship Id="rId1" Type="${OFD}/styles" Target="styles.xml"/></Relationships>`,
    'word/styles.xml': XML + `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${st('Heading1', 'heading 1', 30)}${st('Heading2', 'heading 2', 25)}${st('Heading3', 'heading 3', 22)}</w:styles>`,
    'word/document.xml': XML + `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${isi}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  });
}
