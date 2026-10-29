import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Copy, Check, ArrowDownUp } from 'lucide-react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { Panel, SectionIntro, Empty } from '../../components/ui/Primitives';
import { money } from '../../utils/money';
import { dateLabel } from '../../utils/dates';
import { transactionTypes } from '../../constants/catalog';
import { recognizedDate } from '../financial-health/engine';
import { stripMeta } from './operations';
export default function Transactions({ range }) {
  const { data, openForm, remove, perform, confirm } = useWorkspace();
  const commit = useFinance((s) => s.commit);
  const [search, setSearch] = useState(''),
    [type, setType] = useState(''),
    [status, setStatus] = useState(''),
    [account, setAccount] = useState(''),
    [category, setCategory] = useState(''),
    [sort, setSort] = useState('desc'),
    [page, setPage] = useState(1);
  const rows = data.transactions
    .filter(
      (t) =>
        recognizedDate(t) >= range.start &&
        recognizedDate(t) <= range.end &&
        (!type || t.type === type) &&
        (!status || t.status === status) &&
        (!account ||
          t.accountId === account ||
          t.destinationId === account ||
          t.cardId === account) &&
        (!category || t.category === category) &&
        `${t.description} ${t.category} ${t.tags}`
          .toLocaleLowerCase('pt-BR')
          .includes(search.toLocaleLowerCase('pt-BR')),
    )
    .sort((a, b) =>
      sort === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
  const visible = rows.slice(0, page * 30);
  return (
    <>
      <SectionIntro
        eyebrow="UM REGISTRO. MAIS CLAREZA."
        title="Seu dinheiro em movimento."
        text="Receitas, despesas e compromissos, com cada centavo no lugar certo."
        action={
          <button className="primary" onClick={() => openForm('transactions')}>
            <Plus size={18} />
            Novo lançamento
          </button>
        }
      />
      <Panel title="Lançamentos" subtitle={`${rows.length} registros no período selecionado`}>
        <div className="filters">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Buscar lançamentos"
              placeholder="Busque uma descrição, categoria ou tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Tipo de movimentação"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(transactionTypes).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas as situações</option>
            <option value="confirmed">Confirmado</option>
            <option value="planned">Previsto</option>
          </select>
          <select
            aria-label="Conta ou cartão"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="">Contas e cartões</option>
            {[...data.accounts, ...data.cards].map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {[...new Set(data.transactions.map((t) => t.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className="secondary" onClick={() => setSort(sort === 'desc' ? 'asc' : 'desc')}>
            <ArrowDownUp size={15} />
            {sort === 'desc' ? 'Recentes' : 'Antigos'}
          </button>
        </div>
        {visible.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Data / competência</th>
                    <th>Categoria</th>
                    <th>Situação</th>
                    <th className="numeric">Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.description}</strong>
                        <small>
                          {transactionTypes[t.type]}
                          {t.installments > 1 ? ` · ${t.installment}/${t.installments}` : ''}
                        </small>
                      </td>
                      <td>
                        {dateLabel(t.date)}
                        <small>{t.cardId ? 'Fatura ' + t.competence : ''}</small>
                      </td>
                      <td>{t.category}</td>
                      <td>
                        <span className={'tag ' + (t.status === 'planned' ? 'warning' : '')}>
                          {t.status === 'planned' ? 'Previsto' : 'Confirmado'}
                        </span>
                      </td>
                      <td className={'numeric ' + (t.type === 'income' ? 'positive' : '')}>
                        {money(t.amountCents)}
                      </td>
                      <td>
                        <div className="inline-actions">
                          {t.status === 'planned' && (
                            <button
                              className="icon-button"
                              aria-label={'Confirmar ' + t.description}
                              onClick={() =>
                                confirm(
                                  'Confirmar movimentação?',
                                  'Confirme somente após verificar o recebimento ou pagamento real.',
                                  () =>
                                    commit([
                                      {
                                        module: 'transactions',
                                        id: t.id,
                                        data: { ...stripMeta(t), status: 'confirmed' },
                                        expectedRevision: t.revision,
                                      },
                                    ]),
                                )
                              }
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            className="icon-button"
                            aria-label={'Editar ' + t.description}
                            onClick={() => openForm('transactions', t)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={'Duplicar ' + t.description}
                            onClick={() =>
                              openForm('transactions', null, { ...stripMeta(t), recurrence: false })
                            }
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label={'Excluir ' + t.description}
                            onClick={() => remove('transactions', t)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length < rows.length && (
              <button className="secondary load-more" onClick={() => setPage(page + 1)}>
                Carregar mais 30
              </button>
            )}
          </>
        ) : (
          <Empty
            title="Nenhum lançamento por aqui"
            text="Adicione um movimento ou ajuste os filtros para encontrar seus registros."
          />
        )}
      </Panel>
    </>
  );
}
