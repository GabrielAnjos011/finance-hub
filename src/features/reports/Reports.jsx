import { useState, useMemo } from 'react';
import { Download, Copy, FileText, ShieldCheck, LockKeyhole, Upload, Printer } from 'lucide-react';
import { Panel, SectionIntro, Stat } from '../../components/ui/Primitives';
import { FlowChart, SpendingChart } from '../../components/charts/FinanceCharts';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { categoryTotals, recognizedDate, overview } from '../financial-health/engine';
import { money } from '../../utils/money';
import { download, csv } from '../../services/exporters/files';
import { createBackup, encryptBackup, readBackup } from '../../services/exporters/backup';
import { stripMeta } from '../transactions/operations';
export default function Reports({ summary, range, month }) {
  const { data, perform, confirm, notify } = useWorkspace(),
    commit = useFinance((s) => s.commit);
  const [includeValues, setIncludeValues] = useState(true),
    [includeCategories, setIncludeCategories] = useState(false),
    [consent, setConsent] = useState(false),
    [report, setReport] = useState(null),
    [password, setPassword] = useState(''),
    [encrypted, setEncrypted] = useState(true),
    [backupConsent, setBackupConsent] = useState(false),
    [restore, setRestore] = useState(null),
    [overwrite, setOverwrite] = useState(false),
    [account, setAccount] = useState(''),
    [category, setCategory] = useState(''),
    [type, setType] = useState('');
  const selected = data.transactions.filter(
    (t) =>
      (!account ||
        t.accountId === account ||
        t.destinationId === account ||
        t.cardId === account) &&
      (!category || t.category === category) &&
      (!type || t.type === type),
  );
  const filtered = { ...data, transactions: selected };
  const totals = categoryTotals(selected, range),
    filteredSummary = overview(
      filtered,
      range,
      new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
    );
  const transactionRows = selected
    .filter((t) => recognizedDate(t) >= range.start && recognizedDate(t) <= range.end)
    .map((t) => ({
      data: t.date,
      tipo: t.type,
      descricao: t.description,
      categoria: t.category,
      valor: (t.amountCents / 100).toFixed(2),
      situacao: t.status,
      competencia: t.competence,
    }));
  const generate = () => {
    const structured = {
      periodo: range,
      saude: summary.health.state,
      confianca: summary.health.confidence,
      motivos: summary.health.reasons,
      ...(includeValues
        ? {
            valores_centavos: {
              receitas: summary.income,
              despesas: summary.expenses,
              saldo: summary.monthly,
              patrimonio: summary.wealth,
              reserva: summary.reserve,
              compromissos: summary.obligations,
              projecao: summary.projectionReady ? summary.available : null,
            },
          }
        : {}),
      ...(includeCategories ? { categorias: totals } : {}),
      premissas:
        'Dados declarados. Não auditados. Projeções não garantidas. Sem renda variável futura.',
      solicitacao:
        'Identifique riscos e proponha ações para os próximos 30 dias. Considere liquidez, prazos e reserva. Não recomende ativos específicos sem conhecer meu perfil.',
    };
    const md = `# Análise de Saúde Financeira\n\nPeríodo: ${range.start} a ${range.end}\nSituação: ${structured.saude}\nConfiança: ${structured.confianca}\n\n${structured.motivos.map((r) => '- ' + r).join('\n')}\n\n${
      includeValues
        ? Object.entries(structured.valores_centavos)
            .map(([k, v]) => `${k}: ${v === null ? 'Não configurado' : money(v)}`)
            .join('\n')
        : ''
    }\n\n${includeCategories ? totals.map((c) => `${c.name}: ${money(c.value)}`).join('\n') : ''}\n\n${structured.premissas}\n\n${structured.solicitacao}`;
    setReport({ structured, md });
  };
  const restoreBackup = async () => {
    let writes = 0;
    const order = [
      'accounts',
      'cards',
      'settings',
      'funds',
      'goals',
      'budgets',
      'transactions',
      'alertStates',
      'closures',
    ];
    try {
      for (const module of order) {
        const operations = restore[module].flatMap((item) => {
          const existing = data[module].find((d) => d.id === item.id);
          if (existing && !overwrite) return [];
          return [
            {
              module,
              id: item.id,
              data: stripMeta(item),
              ...(existing ? { expectedRevision: existing.revision } : { createOnly: true }),
            },
          ];
        });
        for (let i = 0; i < operations.length; i += 100) {
          await commit(operations.slice(i, i + 100));
          writes += operations.slice(i, i + 100).length;
        }
      }
      setRestore(null);
      notify(
        `${writes} registros restaurados. IDs existentes foram ${overwrite ? 'atualizados com consentimento' : 'preservados'}.`,
      );
    } catch (e) {
      throw new Error(
        `${writes} registros já foram restaurados. A restauração parou: ${e.message}. Você pode repetir para completar, mantendo os mesmos IDs.`,
      );
    }
  };
  return (
    <>
      <SectionIntro
        eyebrow="INFORMAÇÃO PARA DECIDIR MELHOR"
        title="Sua história, com perspectiva."
        text="Analise seus registros, prepare um resumo e mantenha seus dados com você."
      />
      <div className="filters">
        <select
          aria-label="Filtrar relatório por conta ou cartão"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        >
          <option value="">Todas as contas e cartões</option>
          {[...data.accounts, ...data.cards].map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar relatório por categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {[...new Set(data.transactions.map((t) => t.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar relatório por tipo"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {[...new Set(data.transactions.map((t) => t.type))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="stats-grid three">
        <Stat
          label="Receitas filtradas"
          value={money(filteredSummary.income)}
          detail="Confirmadas no período"
        />
        <Stat
          label="Despesas filtradas"
          value={money(filteredSummary.expenses)}
          detail="Reconhecidas no período"
        />
        <Stat
          label="Saldo do filtro"
          value={money(filteredSummary.monthly)}
          detail="Receitas menos despesas"
        />
      </div>
      <div className="dashboard-charts">
        <Panel title="Evolução mensal">
          <FlowChart transactions={selected} month={month} />
        </Panel>
        <Panel title="Distribuição de despesas">
          {totals.length ? (
            <SpendingChart data={totals} />
          ) : (
            <p className="muted">Sem despesas para os filtros selecionados.</p>
          )}
        </Panel>
      </div>
      <Panel
        title="Exportar registros do período"
        subtitle="Os arquivos contêm os registros filtrados, incluindo descrições e valores. Revise antes de compartilhar."
      >
        <div className="button-row">
          <button
            className="secondary"
            onClick={() =>
              confirm(
                'Exportar CSV?',
                'O arquivo incluirá descrições, categorias, valores e datas dos registros exibidos.',
                () =>
                  download(
                    'finance-hub-registros.csv',
                    csv(transactionRows),
                    'text/csv;charset=utf-8',
                  ),
              )
            }
          >
            <Download size={16} />
            CSV
          </button>
          <button
            className="secondary"
            onClick={() =>
              confirm(
                'Exportar JSON?',
                'O arquivo incluirá os registros filtrados com seus valores e descrições.',
                () =>
                  download('finance-hub-registros.json', JSON.stringify(transactionRows, null, 2)),
              )
            }
          >
            <Download size={16} />
            JSON
          </button>
          <button
            className="secondary"
            onClick={() =>
              confirm(
                'Preparar impressão?',
                'A página de relatórios será aberta no diálogo de impressão. Escolha Salvar como PDF para gerar um arquivo local.',
                () => window.print(),
              )
            }
          >
            <Printer size={16} />
            Imprimir / PDF
          </button>
        </div>
      </Panel>
      <Panel
        title="Gerar análise para IA"
        subtitle="Resumo anônimo, produzido localmente. Nada é enviado a outra ferramenta."
        action={<FileText size={21} />}
      >
        <div className="consent-options">
          <label className="check">
            <input
              type="checkbox"
              checked={includeValues}
              onChange={(e) => {
                setIncludeValues(e.target.checked);
                setReport(null);
              }}
            />
            Incluir valores consolidados
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={includeCategories}
              onChange={(e) => {
                setIncludeCategories(e.target.checked);
                setReport(null);
              }}
            />
            Incluir categorias do filtro (nomes personalizados podem identificar você)
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (!e.target.checked) setReport(null);
              }}
            />
            Autorizo gerar e copiar/exportar estes indicadores, sem nomes de contas ou instituições.
          </label>
        </div>
        <button className="primary" disabled={!consent} onClick={generate}>
          Gerar prévia da análise
        </button>
        {report && (
          <>
            <pre className="report-preview">{report.md}</pre>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() =>
                  perform(async () => {
                    await navigator.clipboard.writeText(report.md);
                    notify('Relatório copiado.');
                  })
                }
              >
                <Copy size={16} />
                Copiar
              </button>
              <button
                className="secondary"
                onClick={() => download('finance-hub-analise.md', report.md, 'text/markdown')}
              >
                Markdown
              </button>
              <button
                className="secondary"
                onClick={() =>
                  download('finance-hub-analise.json', JSON.stringify(report.structured, null, 2))
                }
              >
                JSON
              </button>
            </div>
          </>
        )}
      </Panel>
      <Panel
        title="Backup e portabilidade"
        subtitle="Exportação completa dos módulos privados. O vínculo do casal e os dados compartilhados não fazem parte deste backup."
        action={<LockKeyhole size={21} />}
      >
        <div className="two-columns">
          <div>
            <label className="check">
              <input
                type="checkbox"
                checked={encrypted}
                onChange={(e) => setEncrypted(e.target.checked)}
              />
              Criptografar com senha (AES-GCM)
            </label>
            <label>
              Senha de backup
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Pelo menos 12 caracteres"
              />
            </label>
            <p className="micro">
              A senha nunca é enviada ao Firebase. Sem ela, o backup criptografado não poderá ser
              recuperado.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={backupConsent}
                onChange={(e) => setBackupConsent(e.target.checked)}
              />
              Autorizo exportar todos os meus dados financeiros para este dispositivo.
            </label>
            <button
              className="primary"
              disabled={!backupConsent}
              onClick={() =>
                perform(async () => {
                  const backup = await createBackup(data);
                  download(
                    'finance-hub-backup.json',
                    JSON.stringify(encrypted ? await encryptBackup(backup, password) : backup),
                  );
                })
              }
            >
              <Download size={16} />
              Exportar backup completo
            </button>
          </div>
          <div>
            <label>
              Restaurar backup JSON
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file)
                    perform(async () => {
                      if (file.size > 15000000) throw new Error('Limite de 15 MB por backup.');
                      setRestore(await readBackup(await file.text(), password));
                    });
                }}
              />
            </label>
            <p className="micro">
              Informe a senha acima se o arquivo for criptografado. O formato, os vínculos e a
              integridade serão validados antes da confirmação.
            </p>
            {restore && (
              <>
                <p>
                  {Object.values(restore).reduce((n, a) => n + a.length, 0)} registros válidos
                  encontrados.
                </p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                  />
                  Sobrescrever IDs existentes, mantendo o controle de revisão
                </label>
                <button
                  className="secondary"
                  onClick={() =>
                    confirm(
                      'Restaurar este backup?',
                      overwrite
                        ? 'Registros com os mesmos IDs serão sobrescritos. Meses fechados precisam ser reabertos antes.'
                        : 'Registros com os mesmos IDs serão preservados. Novos registros serão adicionados.',
                      restoreBackup,
                    )
                  }
                >
                  <Upload size={16} />
                  Confirmar restauração
                </button>
              </>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
