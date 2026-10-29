import Papa from 'papaparse';
import { cents } from '../../utils/money';
import { hash } from '../exporters/files';
import { isValid, parse, format } from 'date-fns';
export function normalizeDate(input) {
  if (input instanceof Date && isValid(input)) return format(input, 'yyyy-MM-dd');
  const text = String(input || '').trim();
  const patterns = ['yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy', 'yyyyMMdd'];
  for (const p of patterns) {
    const value = p === 'yyyyMMdd' ? text.slice(0, 8) : text;
    const d = parse(value, p, new Date(2000, 0, 1));
    if (isValid(d) && format(d, p) === value) return format(d, 'yyyy-MM-dd');
  }
  throw new Error('Data não reconhecida: ' + text);
}
export function parseCSV(text) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });
  if (parsed.errors.length)
    throw new Error('O CSV possui linhas inválidas. Confira delimitadores e aspas.');
  if (!parsed.meta.fields?.length || parsed.meta.fields.length < 2)
    throw new Error('Não foi possível identificar as colunas do CSV.');
  return { headers: parsed.meta.fields, rows: parsed.data };
}
function ofxField(record, name) {
  return new RegExp('<' + name + '>([^<\\r\\n]+)', 'i').exec(record)?.[1]?.trim() || '';
}
export function parseOFX(text) {
  const matches = [...text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)];
  if (!matches.length) throw new Error('OFX sem transações reconhecíveis.');
  return {
    headers: ['data', 'descricao', 'valor', 'id'],
    rows: matches.map(([, r]) => ({
      data: ofxField(r, 'DTPOSTED').slice(0, 8),
      descricao: ofxField(r, 'MEMO') || ofxField(r, 'NAME'),
      valor: ofxField(r, 'TRNAMT'),
      id: ofxField(r, 'FITID'),
    })),
  };
}
export async function parseFile(file) {
  if (file.size > 10000000) throw new Error('O limite é de 10 MB por arquivo.');
  const extension = file.name.split('.').at(-1).toLowerCase();
  if (extension === 'ofx') return parseOFX(await file.text());
  if (extension === 'csv' || extension === 'txt') return parseCSV(await file.text());
  if (extension === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    const sheet = await readSheet(file);
    if (!sheet.length || sheet.length > 20000 || sheet[0].length > 100)
      throw new Error('Planilha vazia ou acima de 20 mil linhas / 100 colunas.');
    const headers = sheet[0].map((v) => String(v ?? '').trim());
    if (headers.some((h) => !h) || new Set(headers).size !== headers.length)
      throw new Error('Use cabeçalhos preenchidos e sem repetição na primeira linha.');
    const rows = sheet
      .slice(1)
      .map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
    return { headers, rows };
  }
  if (extension === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const loadingTask = pdfjs.getDocument({
      data: await file.arrayBuffer(),
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    if (pdf.numPages > 30) throw new Error('Importe PDFs com até 30 páginas.');
    const rows = [];
    let extracted = '';
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const lines = new Map();
      for (const item of content.items) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5]);
        lines.set(y, (lines.get(y) || '') + ' ' + item.str);
      }
      for (const line of lines.values()) {
        extracted += line + '\n';
        const m = line.trim().match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d.]+,\d{2})\s*([DC])?$/);
        if (m)
          rows.push({
            data: m[1],
            descricao: m[2],
            valor: (m[4] === 'D' && !m[3].startsWith('-') ? '-' : '') + m[3],
          });
      }
    }
    await loadingTask.destroy();
    if (!rows.length)
      throw new Error(
        extracted.trim()
          ? 'PDF com texto, mas o formato não foi reconhecido. Exporte CSV/OFX/XLSX ou copie os dados para uma tabela com data, descrição e valor.'
          : 'PDF sem texto extraível. OCR não é suportado; solicite CSV/OFX ao banco.',
      );
    return { headers: ['data', 'descricao', 'valor'], rows };
  }
  throw new Error(
    'Use CSV, OFX, XLSX ou PDF com texto. Arquivos XLS antigos precisam ser convertidos para XLSX.',
  );
}
export function suggestMapping(headers) {
  const find = (regex) =>
    headers.find((h) => regex.test(h.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) || '';
  return {
    date: find(/^(data|date|dtposted)/i),
    description: find(/descr|histor|memo|name/i),
    amount: find(/valor|amount|trnamt/i),
    bankId: find(/^(id|fitid|identificador)$/i),
  };
}
export async function normalizeRows(
  parsed,
  mapping,
  accountId,
  institution,
  existing,
  category = 'Outros',
) {
  if (!accountId || !mapping.date || !mapping.description || !mapping.amount)
    throw new Error('Escolha a conta e mapeie data, descrição e valor.');
  if (parsed.rows.length > 5000) throw new Error('Divida o arquivo em até 5.000 linhas.');
  const seen = new Set(),
    fingerprints = new Set(existing.map((t) => t.id));
  return Promise.all(
    parsed.rows.map(async (row, index) => {
      try {
        const date = normalizeDate(row[mapping.date]),
          description = String(row[mapping.description] || '')
            .trim()
            .slice(0, 200),
          amount = cents(row[mapping.amount]);
        if (!description || !amount) throw new Error('Descrição ou valor vazio.');
        const bankId = String(row[mapping.bankId] || '').trim();
        const canonical = JSON.stringify([
          institution,
          accountId,
          date,
          amount,
          bankId || description.toLocaleLowerCase('pt-BR').replace(/\s+/g, ' '),
        ]);
        const fingerprint = 'import_' + (await hash(canonical));
        const duplicate = fingerprints.has(fingerprint) || seen.has(fingerprint);
        seen.add(fingerprint);
        const possible = existing.some(
          (t) =>
            t.accountId === accountId &&
            t.date === date &&
            t.amountCents === Math.abs(amount) &&
            t.type === (amount > 0 ? 'income' : 'expense'),
        );
        const suspicious =
          /transfer|pix.*mesma|pagamento.*fatura|pag.*cart[aã]o|resgate|aplica[cç][aã]o/i.test(
            description,
          );
        return {
          id: fingerprint,
          index,
          selected: !duplicate && !possible && !suspicious,
          duplicate,
          warning: suspicious
            ? 'Possível transferência, aplicação ou fatura: excluir e conciliar manualmente.'
            : possible
              ? 'Movimento semelhante já existe: revisar antes de confirmar.'
              : bankId
                ? 'Identificador bancário disponível.'
                : 'Sem ID bancário: movimentos idênticos exigem revisão.',
          record: {
            description,
            amountCents: Math.abs(amount),
            category,
            type: amount > 0 ? 'income' : 'expense',
            date,
            competence: date.slice(0, 7),
            dueDate: date,
            status: 'confirmed',
            accountId,
            destinationId: '',
            cardId: '',
            groupId: fingerprint,
            installment: 1,
            installments: 1,
            tags: 'importado',
            notes: '',
            recurrence: false,
          },
        };
      } catch (error) {
        return { id: 'invalid_' + index, index, selected: false, error: error.message };
      }
    }),
  );
}
