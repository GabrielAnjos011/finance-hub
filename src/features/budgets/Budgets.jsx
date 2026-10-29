import { Plus, Pencil, Trash2, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { Panel, SectionIntro, Empty, Progress } from '../../components/ui/Primitives';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { expenseValue, recognizedDate } from '../financial-health/engine';
import { money, sum } from '../../utils/money';
import { today } from '../../utils/dates';
import { stripMeta } from '../transactions/operations';
export default function Budgets({ month, summary }) {
  const { data, openForm, remove, confirm } = useWorkspace();
  const commit = useFinance((s) => s.commit);
  const items = data.budgets.filter((b) => b.month === month),
    closure = data.closures.find((c) => c.id === month);
  const monthTx = data.transactions.filter(
    (t) => t.status === 'confirmed' && recognizedDate(t).startsWith(month),
  );
  const close = () => {
    const incomeCents = sum(monthTx.filter((t) => t.type === 'income').map((t) => t.amountCents)),
      expenseCents = sum(monthTx.map(expenseValue));
    return commit([
      {
        module: 'closures',
        id: month,
        data: {
          month,
          closed: !closure?.closed,
          incomeCents,
          expenseCents,
          events: [
            ...(closure?.events || []),
            { date: today(), action: closure?.closed ? 'reopened' : 'closed' },
          ],
        },
        ...(closure ? { expectedRevision: closure.revision } : { createOnly: true }),
      },
    ]);
  };
  return (
    <>
      <SectionIntro
        eyebrow="PLANEJAR É ESCOLHER"
        title="Um destino para cada real."
        text="Compare o planejado com o realizado e ajuste o caminho com consciência."
        action={
          <button className="primary" onClick={() => openForm('budgets', null, { month })}>
            <Plus size={18} />
            Planejar categoria
          </button>
        }
      />
      <Panel
        title={'Orçamento · ' + month}
        subtitle="As despesas do cartão entram por competência, sem repetir o pagamento."
        action={
          <button
            className="secondary"
            onClick={() =>
              confirm(
                closure?.closed ? 'Reabrir mês?' : 'Conferiu todas as movimentações?',
                closure?.closed
                  ? 'A reabertura permite alterar lançamentos e ficará no histórico.'
                  : 'O fechamento bloqueia mudanças nos lançamentos deste mês. Confira previsões e conciliações antes de confirmar.',
                close,
              )
            }
          >
            {closure?.closed ? <LockKeyholeOpen size={16} /> : <LockKeyhole size={16} />}{' '}
            {closure?.closed ? 'Reabrir mês' : 'Fechar mês'}
          </button>
        }
      >
        {items.length ? (
          <div className="budget-list">
            {items.map((b) => {
              const spent = sum(monthTx.filter((t) => t.category === b.category).map(expenseValue));
              return (
                <div className="budget-row" key={b.id}>
                  <div>
                    <strong>{b.category}</strong>
                    <span className={spent > b.limitCents ? 'negative' : ''}>
                      {money(spent)} <small>de {money(b.limitCents)}</small>
                    </span>
                  </div>
                  <Progress value={b.limitCents ? (spent / b.limitCents) * 100 : spent ? 100 : 0} />
                  <div className="record-actions">
                    <small>
                      {spent > b.limitCents
                        ? 'Limite ultrapassado em ' + money(spent - b.limitCents)
                        : 'Restam ' + money(b.limitCents - spent)}
                    </small>
                    <button
                      className="icon-button"
                      aria-label={'Editar ' + b.category}
                      onClick={() => openForm('budgets', b)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={'Excluir ' + b.category}
                      onClick={() => remove('budgets', b)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="Escolha suas prioridades"
            text="Defina um limite para uma categoria e acompanhe sem complicação."
          />
        )}
      </Panel>
      {closure && (
        <Panel
          title={closure.closed ? 'Mês fechado' : 'Mês reaberto'}
          subtitle="Histórico de fechamento preservado"
        >
          <p>
            Receitas conferidas: {money(closure.incomeCents)} · Despesas conferidas:{' '}
            {money(closure.expenseCents)}
          </p>
          {closure.events.map((e, i) => (
            <p className="micro" key={i}>
              {e.date} · {e.action === 'closed' ? 'Fechamento' : 'Reabertura'}
            </p>
          ))}
        </Panel>
      )}
    </>
  );
}
