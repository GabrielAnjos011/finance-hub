import { Plus, CreditCard, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Panel, Empty, Progress, SectionIntro } from '../../components/ui/Primitives';
import { money, sum } from '../../utils/money';
import { dateLabel } from '../../utils/dates';
export default function Cards({ summary }) {
  const { data, openForm, remove } = useWorkspace();
  return (
    <>
      <SectionIntro
        eyebrow="CRÉDITO COM CONSCIÊNCIA"
        title="Mais controle a cada fatura."
        text="Compras e parcelas no seu horizonte. Pagamentos sem duplicar despesas."
        action={
          <button className="primary" onClick={() => openForm('cards')}>
            <Plus size={18} />
            Adicionar cartão
          </button>
        }
      />
      {data.cards.length ? (
        <div className="record-grid">
          {data.cards.map((card) => {
            const outstanding = sum(
              summary.invoices.filter((i) => i.cardId === card.id).map((i) => i.outstandingCents),
            );
            return (
              <Panel
                key={card.id}
                title={card.name}
                subtitle={card.institution}
                action={<CreditCard size={23} />}
              >
                <div className="credit-card-art">
                  <span>financehub</span>
                  <CreditCard size={27} />
                  <strong>{card.name}</strong>
                  <small>
                    Fechamento {card.closingDay} · Vencimento {card.dueDay}
                  </small>
                </div>
                <div className="detail-row">
                  <span>Obrigações em aberto</span>
                  <strong>{money(outstanding)}</strong>
                </div>
                <Progress
                  value={card.limitCents ? (outstanding / card.limitCents) * 100 : 0}
                  label="Limite utilizado"
                />
                <div className="detail-row">
                  <span>Limite disponível estimado</span>
                  <strong>{money(Math.max(0, card.limitCents - outstanding))}</strong>
                </div>
                <p className="micro">
                  {card.active ? 'Ativo' : 'Inativo'} · Limite informado: {money(card.limitCents)}
                </p>
                <div className="record-actions">
                  <button
                    className="text-button"
                    onClick={() =>
                      openForm('transactions', null, {
                        type: 'card_purchase',
                        cardId: card.id,
                        accountId: '',
                        description: '',
                      })
                    }
                  >
                    Registrar compra <ArrowUpRight size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={'Editar ' + card.name}
                    onClick={() => openForm('cards', card)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={'Excluir ' + card.name}
                    onClick={() => remove('cards', card)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel title="Seus cartões">
          <Empty
            icon={CreditCard}
            title="Adicione seu primeiro cartão"
            text="Informe apenas nome, limite, fechamento e vencimento. Nunca informe número, senha ou código de segurança."
          />
        </Panel>
      )}
      <Panel
        title="Faturas atuais e futuras"
        subtitle="As parcelas são reconhecidas pela competência da fatura."
      >
        {summary.invoices.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cartão / fatura</th>
                  <th>Vencimento</th>
                  <th>Compras líquidas</th>
                  <th>Pago</th>
                  <th>Em aberto</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {summary.invoices.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {data.cards.find((c) => c.id === i.cardId)?.name}
                      <small>{i.competence}</small>
                    </td>
                    <td>{dateLabel(i.dueDate)}</td>
                    <td>{money(i.totalCents)}</td>
                    <td>{money(i.paidCents)}</td>
                    <td>{money(i.outstandingCents)}</td>
                    <td>
                      {i.outstandingCents > 0 && (
                        <button
                          className="secondary"
                          onClick={() =>
                            openForm('transactions', null, {
                              type: 'card_payment',
                              cardId: i.cardId,
                              accountId: data.cards.find((c) => c.id === i.cardId)?.accountId,
                              competence: i.competence,
                              dueDate: i.dueDate,
                              description: 'Pagamento de fatura',
                              amountCents: (i.outstandingCents / 100).toFixed(2),
                            })
                          }
                        >
                          Registrar pagamento
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nenhuma fatura registrada"
            text="Registre uma compra para acompanhar as parcelas e o limite."
          />
        )}
      </Panel>
      <div className="notice">
        O limite é estimado com base nos registros manuais. Pagamentos parciais reduzem a obrigação.
        Juros e multas precisam ser registrados como compras ou ajustes na fatura; o aplicativo não
        presume taxas.
      </div>
    </>
  );
}
