import { useState } from 'react';
import { Upload, ShieldCheck, FileCheck2 } from 'lucide-react';
import { Panel, SectionIntro } from '../../components/ui/Primitives';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { parseFile, suggestMapping, normalizeRows } from '../../services/importers/parse';
import { money } from '../../utils/money';
import { dateLabel } from '../../utils/dates';
export default function Imports() {
  const { data, perform, confirm, notify, openForm } = useWorkspace(),
    commit = useFinance((s) => s.commit);
  const [parsed, setParsed] = useState(null),
    [mapping, setMapping] = useState({}),
    [accountId, setAccountId] = useState(''),
    [rows, setRows] = useState([]),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [previewPage, setPreviewPage] = useState(1);
  const config = data.settings.find((s) => s.id === 'preferences');
  async function choose(file) {
    if (!file) return;
    setRows([]);
    setPreviewPage(1);
    setParsed(null);
    setStatus('Processando localmente…');
    setBusy(true);
    try {
      const result = await parseFile(file);
      setParsed(result);
      setMapping(suggestMapping(result.headers));
      setStatus(`${result.rows.length} linhas encontradas. Revise o mapeamento.`);
    } catch (error) {
      setStatus('Não foi possível processar o arquivo. Confira a mensagem e tente outro formato.');
      throw error;
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    setPreviewPage(1);
    setRows(
      await normalizeRows(
        parsed,
        mapping,
        accountId,
        data.accounts.find((a) => a.id === accountId)?.institution || '',
        data.transactions,
      ),
    );
  }
  const update = (index, key, value) =>
    setRows(
      rows.map((r, i) =>
        i === index
          ? key === 'category'
            ? { ...r, record: { ...r.record, category: value } }
            : { ...r, [key]: value }
          : r,
      ),
    );
  async function save() {
    const selected = rows.filter((r) => r.selected && !r.duplicate && !r.error);
    let saved = 0;
    try {
      for (let i = 0; i < selected.length; i += 100) {
        const slice = selected.slice(i, i + 100);
        await commit(
          slice.map((r) => ({
            module: 'transactions',
            id: r.id,
            data: r.record,
            createOnly: true,
          })),
        );
        saved += slice.length;
      }
      setRows([]);
      setStatus(
        `${saved} lançamentos importados. ${rows.filter((r) => r.duplicate).length} duplicados foram ignorados.`,
      );
      notify('Importação confirmada.');
    } catch (error) {
      throw new Error(
        `${saved} registros confirmados. A importação parou: ${error.message}. Gere uma nova prévia antes de repetir.`,
      );
    }
  }
  return (
    <>
      <SectionIntro
        eyebrow="SEUS REGISTROS, SEM RETRABALHO"
        title="Importar com mais confiança."
        text="Seu arquivo é processado no navegador. Só as linhas revisadas são gravadas no Firestore."
      />
      <Panel title="1. Escolha a conta e o arquivo" action={<Upload size={21} />}>
        {!data.accounts.length && (
          <div className="prerequisite">
            <h3>Primeiro, cadastre a conta deste extrato</h3>
            <p>
              Assim os movimentos ficam no lugar certo. Seu arquivo só será processado depois que
              você escolher a conta.
            </p>
            <button
              className="primary"
              onClick={() => openForm('accounts', null, {}, (record) => setAccountId(record.id))}
            >
              Cadastrar conta do extrato
            </button>
          </div>
        )}
        <div className="form-grid">
          <label>
            Conta do extrato
            <select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setRows([]);
              }}
            >
              <option value="">Selecione uma conta</option>
              {data.accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Arquivo (até 10 MB)
            <input
              type="file"
              accept=".csv,.ofx,.xlsx,.pdf,.txt"
              disabled={busy || !accountId}
              onChange={(e) => perform(() => choose(e.target.files[0]))}
            />
          </label>
        </div>
        {data.accounts.length > 0 && !accountId && (
          <p className="field-hint">Escolha a conta acima para liberar a seleção do arquivo.</p>
        )}
        <p className="micro">
          CSV, OFX e primeira aba de XLSX. PDF: linhas com data completa, descrição e valor;
          formatos não reconhecidos precisam ser convertidos. Nenhum arquivo bruto é armazenado.
        </p>
        {status && (
          <div className="notice" role="status">
            {status}
          </div>
        )}
      </Panel>
      {parsed && (
        <Panel
          title="2. Revise o mapeamento"
          subtitle="Débitos precisam estar negativos e créditos positivos na coluna de valor."
        >
          <div className="form-grid">
            {[
              ['date', 'Data'],
              ['description', 'Descrição'],
              ['amount', 'Valor'],
              ['bankId', 'Identificador (opcional)'],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  value={mapping[key] || ''}
                  onChange={(e) => {
                    setMapping({ ...mapping, [key]: e.target.value });
                    setRows([]);
                  }}
                >
                  <option value="">Selecionar coluna</option>
                  {parsed.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button className="secondary" onClick={() => perform(preview)}>
            Gerar prévia para revisão
          </button>
        </Panel>
      )}
      {rows.length > 0 && (
        <Panel
          title="3. Confira antes de importar"
          subtitle={`${rows.filter((r) => r.selected).length} selecionados · ${rows.filter((r) => r.duplicate).length} duplicados · ${rows.filter((r) => r.error).length} inválidos`}
        >
          <div className="notice">
            Transferências próprias, pagamentos de fatura e aportes não devem virar receitas ou
            despesas. Essas linhas ficam desmarcadas quando reconhecidas. Exclua-as desta importação
            e registre a movimentação correta em Lançamentos. A detecção é auxiliar e depende da
            descrição.
          </div>
          <div className="table-wrap import-table">
            <table>
              <thead>
                <tr>
                  <th>Incluir</th>
                  <th>Data</th>
                  <th>Descrição / revisão</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((previewPage - 1) * 100, previewPage * 100).map((r, localIndex) => {
                  const index = (previewPage - 1) * 100 + localIndex;
                  return (
                    <tr key={r.id + '_' + index}>
                      <td>
                        <input
                          aria-label={'Incluir linha ' + (index + 1)}
                          type="checkbox"
                          checked={r.selected}
                          disabled={r.duplicate || Boolean(r.error)}
                          onChange={(e) => update(index, 'selected', e.target.checked)}
                        />
                      </td>
                      <td>{r.record ? dateLabel(r.record.date) : '—'}</td>
                      <td>
                        {r.record?.description || 'Linha inválida'}
                        <small className={r.duplicate || r.error ? 'negative' : 'muted'}>
                          {r.error || (r.duplicate ? 'Duplicado: não será gravado.' : r.warning)}
                        </small>
                      </td>
                      <td>
                        {r.record && (
                          <select
                            aria-label={'Categoria linha ' + (index + 1)}
                            value={r.record.category}
                            onChange={(e) => update(index, 'category', e.target.value)}
                          >
                            {(config?.categories || ['Outros']).map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>{r.record ? money(r.record.amountCents) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && (
            <div className="preview-pagination">
              <button
                className="secondary"
                disabled={previewPage === 1}
                onClick={() => setPreviewPage((page) => page - 1)}
              >
                Página anterior
              </button>
              <span>
                Linhas {(previewPage - 1) * 100 + 1} a {Math.min(previewPage * 100, rows.length)} de{' '}
                {rows.length}
              </span>
              <button
                className="secondary"
                disabled={previewPage * 100 >= rows.length}
                onClick={() => setPreviewPage((page) => page + 1)}
              >
                Próxima página
              </button>
            </div>
          )}
          <button
            className="primary"
            disabled={!rows.some((r) => r.selected)}
            onClick={() =>
              confirm(
                'Confirmar a importação?',
                `${rows.filter((r) => r.selected).length} lançamentos serão gravados. Revise categorias, sinais, duplicados e possíveis transferências antes de confirmar.`,
                save,
              )
            }
          >
            <FileCheck2 size={17} />
            Importar linhas selecionadas
          </button>
        </Panel>
      )}
    </>
  );
}
