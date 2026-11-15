/**
 * Pure helpers សម្រាប់អាន និងផ្គូផ្គងជួរឈរនៃតារាងបញ្ជីរាយនាមសិស្ស (Excel / CSV / Google Sheets)
 * គាំទ្រក្បាលតារាង ២ ជួរ (នាម និងគោត្តនាម → អក្សរខ្មែរ | អក្សរឡាតាំង)
 */

export interface MappedStudent {
  student_id: string;
  full_name: string;
  khmer_name: string;
  name_latin: string;
  gender: string | null;
  class_name: string;
  import_source: 'EXCEL' | 'GOOGLE_SHEET';
}

export interface ImportPreview {
  students: MappedStudent[];
  mapping: { field: string; column: string }[];
  warnings: string[];
  skipped: number;
}

type Kind = 'rowNo' | 'id' | 'khmer' | 'latin' | 'name' | 'last' | 'first' | 'gender';

const ZW = /[\u200B-\u200D\uFEFF]/g;
export const clean = (v: unknown) => String(v ?? '').replace(ZW, '').replace(/\s+/g, ' ').trim();
const norm = (v: unknown) => clean(v).toLowerCase().replace(/[\s._\-:()/\\]/g, '');
const hasKhmer = (s: string) => /[\u1780-\u17FF]/.test(s);
const isLatinName = (s: string) => /^[A-Za-z][A-Za-z .'\-]+$/.test(s);

function kindOf(label: string): Kind | null {
  const k = norm(label);
  if (!k || k.length > 40) return null;
  // ជួរឈរដែលមិនមែនជាឈ្មោះសិស្ស
  if (/សញ្ជាតិ|nationality|ឪពុក|ម្តាយ|ម្ដាយ|father|mother|parent|guardian|ថ្ងៃ|កំណើត|birth|phone|ទូរស័ព្ទ|អាសយដ្ឋាន|address/.test(k)) return null;
  if (/ភេទ|gender|^sex$/.test(k)) return 'gender';
  if (/ឡាតាំង|latin|english|^eng$/.test(k)) return 'latin';
  if (/ខ្មែរ|khmer/.test(k)) return 'khmer';
  if (/អត្តលេខ|លេខសម្គាល់|អត្តសញ្ញាណ|studentid|studentcode|studentno|idnumber|idcard|^id$|^code$/.test(k)) return 'id';
  if (/^(លរ|no|nr|n|#|number|លេខរៀង)$/.test(k)) return 'rowNo';
  if (/នាមនិងគោត្តនាម|គោត្តនាមនិងនាម|ឈ្មោះ|fullname|^name$|studentname/.test(k)) return 'name';
  if (/គោត្តនាម|lastname|surname|familyname/.test(k)) return 'last';
  if (/^នាម$|^នាមខ្លួន$|firstname|givenname/.test(k)) return 'first';
  return null;
}

export function normalizeGender(raw: string): string | null {
  const g = clean(raw).toLowerCase();
  if (!g) return null;
  if (['ប្រុស', 'ប', 'm', 'male', 'boy'].includes(g)) return 'ប';
  if (['ស្រី', 'ស', 'f', 'female', 'girl'].includes(g)) return 'ស';
  return clean(raw);
}

export function mapStudentRows(
  matrix: unknown[][],
  targetClass: string,
  source: 'EXCEL' | 'GOOGLE_SHEET',
): ImportPreview {
  // ជួរដែលគ្មានតម្លៃ និងឈ្មោះ column ស្វ័យប្រវត្តិ (__EMPTY) ត្រូវចាត់ទុកជាទទេ
  const rows = matrix.map((r) => r.map((c) => clean(c).replace(/^__EMPTY(_\d+)?$/, '')));
  const width = Math.max(0, ...rows.map((r) => r.length));
  const warnings: string[] = [];

  // ១) រកជួរក្បាលតារាង
  let hIdx = -1;
  let best = 1;
  rows.slice(0, 15).forEach((r, i) => {
    const s = r.filter((c) => kindOf(c)).length;
    if (s > best) {
      best = s;
      hIdx = i;
    }
  });

  // ២) បញ្ចូលក្បាលតារាង ២ ជួរ (parent + sub)
  let start = hIdx + 1;
  const labels: string[] = Array(width).fill('');
  if (hIdx >= 0) {
    const top = rows[hIdx];
    const next = rows[hIdx + 1];
    const isSub =
      !!next &&
      next.some((c) => ['khmer', 'latin', 'name'].includes(kindOf(c) ?? '')) &&
      !next.some((c) => /^\d+$/.test(c));
    let span = '';
    for (let i = 0; i < width; i++) {
      const t = top[i] || '';
      const sub = isSub ? next[i] || '' : '';
      const parent = !t && sub && span ? span : t;
      if (t && sub) span = t;
      else if (t && !sub) span = '';
      labels[i] = [parent, sub].filter(Boolean).join(' ');
    }
    if (isSub) start = hIdx + 2;
  } else {
    warnings.push('រកមិនឃើញជួរក្បាលតារាង — ប្រើការស្គាល់តាមខ្លឹមសារក្នុងជួរឈរ');
  }

  const col: Partial<Record<Kind, number>> = {};
  labels.forEach((l, i) => {
    const k = kindOf(l);
    if (k && col[k] === undefined) col[k] = i;
  });

  const data = rows.slice(start).filter((r) => r.some(Boolean));
  const sample = data.slice(0, 40);
  const byContent = new Set<number>();
  const used = () => new Set(Object.values(col) as number[]);
  const share = (i: number, test: (v: string) => boolean) => {
    const v = sample.map((r) => r[i]).filter(Boolean);
    return v.length ? v.filter(test).length / v.length : 0;
  };
  const pick = (test: (v: string) => boolean, kind: Kind, unique = false) => {
    const ex = used();
    let bi = -1;
    let bs = 0.5;
    for (let i = 0; i < width; i++) {
      if (ex.has(i)) continue;
      let s = share(i, test);
      if (unique) {
        const v = sample.map((r) => r[i]).filter(Boolean);
        if (new Set(v).size / Math.max(v.length, 1) < 0.9) s = 0;
      }
      if (s > bs) {
        bs = s;
        bi = i;
      }
    }
    if (bi >= 0) {
      col[kind] = bi;
      byContent.add(bi);
    }
  };

  // ៣) ស្គាល់តាមខ្លឹមសារ ប្រសិនបើក្បាលតារាងមិនច្បាស់
  if (col.id === undefined) {
    const isDate = (v: string) => /^\d{1,2}[-_/.]\d{1,2}[-_/.]\d{2,4}$/.test(v);
    pick((v) => !isDate(v) && (/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9\-_]{4,}$/.test(v) || /^[1-9]\d{3,9}$/.test(v)), 'id', true);
  }
  if (col.khmer === undefined && col.name === undefined && col.last === undefined) pick(hasKhmer, 'khmer');
  if (col.latin === undefined) pick(isLatinName, 'latin');
  if (col.gender === undefined) pick((v) => /^(ប្រុស|ស្រី|ប|ស|m|f|male|female)$/i.test(v), 'gender');

  // ៤) បង្កើតទិន្នន័យសិស្ស
  const cls = targetClass.trim();
  const clsKey = cls.replace(/\s+/g, '');
  const students: MappedStudent[] = [];
  let skipped = 0;
  let n = 0;

  for (const r of data) {
    const cell = (i?: number) => (i === undefined ? '' : r[i] || '');
    let kh = '';
    let la = '';
    const feed = (raw: string) => {
      if (!raw) return;
      const khmerPart = hasKhmer(raw) ? raw.replace(/[A-Za-z0-9.'\-]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
      const latinPart = raw.replace(/[\u1780-\u17FF\u200B-\u200D]/g, ' ').replace(/\s+/g, ' ').trim();
      if (khmerPart && !kh) kh = khmerPart;
      if (/[A-Za-z]/.test(latinPart) && !la) la = latinPart;
    };
    feed(cell(col.latin));
    feed(cell(col.khmer));
    if (col.last !== undefined) feed(`${cell(col.last)} ${cell(col.first)}`.trim());
    feed(cell(col.name));

    if (!kh && !la) {
      skipped++;
      continue;
    }
    n++;

    let id = cell(col.id).replace(/\.0+$/, '');
    if (!id) {
      const no = Number(cell(col.rowNo).replace(/\D/g, ''));
      id = `${clsKey || 'STU'}-${String(no || n).padStart(3, '0')}`;
    }

    students.push({
      student_id: id,
      full_name: la || kh,
      khmer_name: kh,
      name_latin: la,
      gender: normalizeGender(cell(col.gender)),
      class_name: cls,
      import_source: source,
    });
  }

  if (students.length === 0) {
    throw new Error(`រកមិនឃើញជួរឈ្មោះសិស្សទេ។ ក្បាលតារាងដែលរកឃើញ៖ ${labels.filter(Boolean).join(' | ') || '(គ្មាន)'}`);
  }

  if (col.id === undefined) warnings.push('រកមិនឃើញជួរអត្តលេខ — បានបង្កើតអត្តលេខស្វ័យប្រវត្តិ (ឧ. PGB-001)');
  if (!students.some((s) => s.name_latin)) warnings.push('រកមិនឃើញឈ្មោះអក្សរឡាតាំងក្នុងឯកសារ');
  const dup = students.length - new Set(students.map((s) => s.student_id)).size;
  if (dup > 0) warnings.push(`មានអត្តលេខស្ទួន ${dup} ជួរ — សូមពិនិត្យឯកសារមុននាំចូល`);

  const label = (kind: Kind) => {
    const i = col[kind];
    if (i === undefined) return '— (រកមិនឃើញ)';
    return byContent.has(i) ? `ជួរទី ${i + 1} (ស្គាល់តាមខ្លឹមសារ)` : labels[i] || `ជួរទី ${i + 1}`;
  };
  const mapping = [
    { field: 'អត្តលេខ', column: label('id') },
    { field: 'ឈ្មោះខ្មែរ', column: col.khmer !== undefined ? label('khmer') : col.name !== undefined ? label('name') : label('last') },
    { field: 'ឈ្មោះឡាតាំង', column: col.latin === undefined && students.some((s) => s.name_latin) ? '(ទាញពីជួរឈ្មោះ)' : label('latin') },
    { field: 'ភេទ', column: label('gender') },
  ];

  return { students, mapping, warnings, skipped };
}

/** CSV parser តូចមួយ (គាំទ្រ quote, ក្បៀសក្នុង cell, BOM, CRLF) */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      out.push(row);
      row = [];
      cur = '';
    } else cur += c;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    out.push(row);
  }
  return out;
}

/** អាន CSV ជា matrix; ឯកសារ Excel ត្រូវអានដោយ backend ដែលមាន XLSX parser។ */
export async function readCsvFileMatrix(file: File): Promise<string[][]> {
  return parseCsv(await file.text());
}

/** ទាញ Google Sheet (public / "Anyone with the link") ជា CSV ដោយផ្ទាល់ពី browser */
export async function fetchGoogleSheetMatrix(url: string): Promise<string[][]> {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) throw new Error('តំណ Google Sheets មិនត្រឹមត្រូវ (ត្រូវមាន /spreadsheets/d/...)');
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1];
  const q = gid ? `&gid=${gid}` : '';
  const base = `https://docs.google.com/spreadsheets/d/${m[1]}`;
  for (const u of [`${base}/export?format=csv${q}`, `${base}/gviz/tq?tqx=out:csv${q}`]) {
    try {
      const res = await fetch(u);
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trimStart().startsWith('<')) continue; // ទំព័រ login (sheet មិន public)
      return parseCsv(text);
    } catch {
      /* សាកល្បង URL បន្ទាប់ */
    }
  }
  throw new Error('GSHEET_FETCH_FAILED');
}

/** បម្លែងចម្លើយ {headers, rawData} ពី backend ទៅជា matrix */
export function matrixFromBackend(data: { headers?: string[]; rawData?: Record<string, unknown>[] }): string[][] {
  const raw = data.rawData || [];
  const headers = [...(data.headers || [])];
  raw.slice(0, 30).forEach((row) => Object.keys(row).forEach((k) => !headers.includes(k) && headers.push(k)));
  return [headers, ...raw.map((row) => headers.map((h) => String(row[h] ?? '')))];
}