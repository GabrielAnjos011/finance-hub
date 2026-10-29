import { Plus, Building2, Pencil, Trash2, LockKeyhole, TrendingUp, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { SectionIntro, Panel, Empty, Stat } from '../../components/ui/Primitives';
import { money, sum } from '../../utils/money';
import { dateLabel } from '../../utils/dates';
import { kinds } from '../../constants/catalog';
export default function Accounts({ summary, investments = false }) {
  const { data, openForm, remove } = useWorkspace();
  const accounts = summary.accountBalances.filter((a) =>
    investments ? a.kind === 'investment' : true,
  );
  return (
    <>
      <SectionIntro
        eyebrow={investments ? 'CONSTRUA SEU AMANHÃ' : 'CADA CONTA, UM PROPÓSITO'}
        title={investments ? 'Investimentos e patrimônio' : 'Suas contas, bem organizadas.'}
        text={
          investments
            ? 'Valores manuais, sem cotações inventadas. Cada posição compõe o saldo da sua conta.'
            : 'O dinheiro tem lugar e finalidade. Aqui você enxerga os dois.'
        }
        action={
          <button
            className="primary"
            onClick={() =>
              openForm(
                'accounts',
                null,
                investments ? { kind: 'investment', spendable: false } : {},
              )
            }
          >
            <Plus size={18} />
            {investments ? 'Adicionar investimento' : 'Adicionar conta'}
          </button>
        }
      />
      <div className="stats-grid three">
        <Stat
          label={investments ? 'Total nas contas de investimento' : 'Saldo bancário e ativos'}
          value={money(sum(accounts.map((a) => a.balanceCents)))}
          detail="Saldos calculados com lançamentos confirmados"
          icon={Building2}
        />
        <Stat
          label="Dinheiro livre"
          value={money(summary.free)}
          detail="Somente contas disponíveis, após destinações"
          icon={LockKeyhole}
        />
        <Stat
          label="Patrimônio financeiro"
          value={money(summary.wealth)}
          detail="Ativos selecionados menos obrigações dos cartões"
          icon={TrendingUp}
        />
      </div>
      {accounts.length ? (
        <div className="record-grid">
          {accounts.map((a) => (
            <Panel
              key={a.id}
              title={a.name}
              subtitle={a.institution || kinds[a.kind]}
              action={
                <span className="record-icon">
                  <Building2 size={20} />
                </span>
              }
            >
              <span className="tag">{kinds[a.kind]}</span>
              <div className="record-value">{money(a.balanceCents)}</div>
              <p className="muted">{a.purpose || 'Sem finalidade informada'}</p>
              <div className="detail-row">
                <span>Disponível para gastos</span>
                <strong>{a.spendable ? 'Sim' : 'Protegida'}</strong>
              </div>
              <div className="detail-row">
                <span>Incluída no patrimônio</span>
                <strong>{a.includeInWealth ? 'Sim' : 'Não'}</strong>
              </div>
              <p className="micro">
                Saldo inicial de {money(a.initialCents)} em {dateLabel(a.referenceDate)}.
              </p>
              <div className="record-actions">
                <button
                  className="text-button"
                  onClick={() =>
                    openForm(
                      'accounts',
                      data.accounts.find((d) => d.id === a.id),
                    )
                  }
                >
                  <Pencil size={15} />
                  Editar
                </button>
                {a.kind === 'investment' && (
                  <button
                    className="text-button"
                    onClick={() =>
                      openForm('transactions', null, {
                        accountId: a.id,
                        type: 'adjustment',
                        description: 'Atualização manual do investimento',
                      })
                    }
                  >
                    Atualizar valor <ArrowRight size={15} />
                  </button>
                )}
                <button
                  className="icon-button danger"
                  aria-label={'Excluir ' + a.name}
                  onClick={() => remove('accounts', a)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel
          title={investments ? 'Seu patrimônio em construção' : 'Vamos organizar seu dinheiro'}
        >
          <Empty
            icon={investments ? TrendingUp : Building2}
            title={
              investments ? 'Adicione seu primeiro investimento' : 'Cadastre sua primeira conta'
            }
            text="Comece com o saldo atual. Você pode completar as informações aos poucos."
          />
        </Panel>
      )}
      {investments && (
        <div className="notice">
          Para aportar ou resgatar, registre uma transferência entre a conta bancária e a conta de
          investimento. Para atualizar a avaliação, registre um ajuste com a diferença entre o saldo
          calculado e o valor atual. Esse ajuste não é rendimento realizado nem receita mensal.
          Rentabilidade percentual, preço médio e tributação ainda não são calculados.
        </div>
      )}
    </>
  );
}
