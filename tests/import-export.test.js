import { it, expect, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import { parseCSV, parseOFX, normalizeRows, normalizeDate } from '../src/services/importers/parse';
import { createBackup, encryptBackup, readBackup } from '../src/services/exporters/backup';
import { csv } from '../src/services/exporters/files';
import { demoData } from '../src/services/repositories/demoRepository';
beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});
it('interpreta CSV brasileiro', () => {
  const parsed = parseCSV('Data;Descrição;Valor\n01/10/2026;Mercado;-123,45');
  expect(parsed.rows[0].Valor).toBe('-123,45');
});
it('interpreta OFX com FITID', () => {
  const p = parseOFX(
    '<STMTTRN><DTPOSTED>20261001120000<TRNAMT>-10.20<FITID>abc<MEMO>Teste</STMTTRN>',
  );
  expect(p.rows[0].id).toBe('abc');
});
it('rejeita datas inexistentes', () => expect(() => normalizeDate('31/02/2026')).toThrow());
it('torna importação idempotente por conta e ID bancário', async () => {
  const parsed = parseCSV('data;descricao;valor;id\n01/10/2026;Mercado;-10,00;abc');
  const mapping = { date: 'data', description: 'descricao', amount: 'valor', bankId: 'id' };
  const a = await normalizeRows(parsed, mapping, 'a', 'Banco', []);
  const b = await normalizeRows(parsed, mapping, 'a', 'Banco', [{ id: a[0].id, ...a[0].record }]);
  expect(b[0].duplicate).toBe(true);
  expect(b[0].selected).toBe(false);
  const other = await normalizeRows(parsed, mapping, 'b', 'Banco', []);
  expect(other[0].id).not.toBe(a[0].id);
});
it('não seleciona automaticamente movimentos semelhantes ou pagamentos de fatura', async () => {
  const parsed = parseCSV('data;descricao;valor\n01/10/2026;Pagamento de fatura;-10,00');
  const rows = await normalizeRows(
    parsed,
    { date: 'data', description: 'descricao', amount: 'valor' },
    'a',
    'Banco',
    [],
  );
  expect(rows[0].selected).toBe(false);
});
it('protege CSV contra fórmulas', () =>
  expect(csv([{ descricao: '=HYPERLINK("http://x")' }])).toContain("'="));
it('backup preserva dados e valida integridade', async () => {
  const data = demoData(),
    backup = await createBackup(data);
  expect(await readBackup(JSON.stringify(backup), '')).toEqual(data);
  backup.data.accounts[0].initialCents++;
  await expect(readBackup(JSON.stringify(backup), '')).rejects.toThrow('integridade');
});
it('backup criptografado exige a senha correta', async () => {
  const original = await createBackup(demoData());
  const encrypted = await encryptBackup(original, 'UmaSenhaDeTeste123');
  expect(JSON.stringify(encrypted)).not.toContain('initialCents');
  expect(await readBackup(JSON.stringify(encrypted), 'UmaSenhaDeTeste123')).toEqual(original.data);
  await expect(readBackup(JSON.stringify(encrypted), 'OutraSenhaInvalida')).rejects.toThrow(
    'Senha',
  );
});
