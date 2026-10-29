import {
  ArrowUpRight,
  Wallet,
  TrendingUp,
  ArrowDownRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Target,
  Plus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceContext';
import {
  Panel,
  Stat,
  Empty,
  Progress,
  ActionLink,
  SectionIntro,
} from '../../components/ui/Primitives';
import { FlowChart, SpendingChart } from '../../components/charts/FinanceCharts';
import { categoryTotals, recognizedDate } from '../financial-health/engine';
import { money } from '../../utils/money';
import { dateLabel } from '../../utils/dates';
export default function Dashboard({ summary, range, month }) {
  const { data, openForm } = useWorkspace(),
    navigate = useNavigate();
  const categories = categoryTotals(data.transactions, range);
  const recent = data.transactions
    .filter((t) => recognizedDate(t) >= range.start && recognizedDate(t) <= range.end)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const name = summary.config.name?.split(' ')[0];
  return (
    <>
      <SectionIntro
        eyebrow="SEU DINHEIRO, COM MAIS CLAREZA"
        title={
          name ? `Vamos cuidar dos seus planos, ${name}.` : 'Sua vida financeira, em equilíbrio.'
        }
        text="Uma visão do presente. Mais segurança para o que vem pela frente."
        action={
          <button className="primary" onClick={() => openForm('transactions')}>
            <Plus size={17} />
            Novo lançamento
          </button>
        }
      />
      <div className="stats-grid">
        <Stat
          label="Patrimônio financeiro"
          value={money(summary.wealth)}
          detail="Ativos incluídos menos faturas em aberto"
          icon={Wallet}
        />
        <Stat
          label="Receitas do período"
          value={money(summary.income)}
          detail="Recebimentos confirmados"
          icon={ArrowUpRight}
        />
        <Stat
          label="Despesas do período"
          value={money(summary.expenses)}
          detail="Inclui parcelas pela competência"
          icon={ArrowDownRight}
        />
        <Stat
          label="Saldo do período"
          value={money(summary.monthly)}
          detail="Receitas menos despesas reconhecidas"
          icon={TrendingUp}
          tone="green"
        />
      </div>
      <div className="dashboard-upper">
        <section className="spend-card">
          <div>
            <span className="eyebrow light">ATÉ O PRÓXIMO SALÁRIO</span>
            <h2>
              Espaço para viver.
              <br />
              Tranquilidade para planejar.
            </h2>
            <div className="spend-amount">
              {data.accounts.length ? money(summary.available) : '—'}
              <ArrowUpRight size={28} />
            </div>
            <p>Disponível estimado até {dateLabel(summary.salary)}.</p>
            <div className="spend-breakdown">
              <span>
                Dinheiro livre <strong>{money(summary.free)}</strong>
              </span>
              <span>
                Compromissos <strong>− {money(summary.obligations)}</strong>
              </span>
              <span>
                Margem protegida <strong>− {money(summary.config.safetyCents || 0)}</strong>
              </span>
            </div>
            <div className="spend-foot">
              <span className="small-dot" />
              Estimativa · confiança {summary.health.confidence}
              <button aria-label="Abrir simuladores" onClick={() => navigate('/simuladores')}>
                <ArrowRight size={19} />
              </button>
            </div>
          </div>
        </section>
        <Panel
          title="Seu pulso financeiro"
          subtitle="Entenda os sinais. Escolha o próximo passo."
          className="health-panel"
          action={<ShieldCheck size={20} />}
        >
          <div
            className={
              'health-badge ' + (summary.health.state === 'Saudável' ? 'good' : 'attention')
            }
          >
            <span className="small-dot" />
            {summary.health.state}
          </div>
          <p className="health-description">{summary.health.reasons[0]}</p>
          <div className="health-row">
            <span>Reserva de emergência</span>
            <strong>
              {summary.config.essentialCents
                ? (summary.reserve / summary.config.essentialCents).toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  }) + ' meses'
                : 'Não informada'}
            </strong>
          </div>
          <Progress
            value={
              summary.config.essentialCents
                ? (summary.reserve /
                    (summary.config.essentialCents * (summary.config.reserveMonths || 6))) *
                  100
                : 0
            }
            label="Progresso da reserva"
          />
          <div className="health-tip">
            <Sparkles size={19} />
            <p>
              {summary.health.confidence === 'baixa'
                ? 'Complete suas preferências para receber orientações baseadas na sua realidade.'
                : summary.health.state === 'Saudável'
                  ? 'Continue acompanhando seus compromissos e a evolução dos seus planos.'
                  : 'Revise os compromissos e fortaleça a reserva antes de assumir novos gastos.'}
            </p>
          </div>
          <ActionLink onClick={() => navigate('/saude')}>
            Entender minha saúde financeira
          </ActionLink>
        </Panel>
      </div>
      <div className="dashboard-charts">
        <Panel
          title="Seu dinheiro em movimento"
          subtitle="Receitas e despesas · últimos 6 meses"
          action={
            <div className="chart-key">
              <span className="key-green" />
              Receitas <span className="key-gold" />
              Despesas
            </div>
          }
        >
          {data.transactions.length ? (
            <FlowChart transactions={data.transactions} month={month} />
          ) : (
            <Empty
              title="Sua história começa aqui"
              text="Registre receitas e despesas para acompanhar sua evolução."
              action={
                <button className="text-button" onClick={() => openForm('transactions')}>
                  Adicionar lançamento <ArrowRight size={16} />
                </button>
              }
            />
          )}
        </Panel>
        <Panel title="Para onde o dinheiro vai" subtitle="Despesas reconhecidas no período">
          {categories.length ? (
            <SpendingChart data={categories} />
          ) : (
            <Empty
              title="Nenhuma despesa no período"
              text="Suas categorias aparecerão aqui após os primeiros registros."
            />
          )}
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Últimos movimentos"
          subtitle="Cada registro conta uma parte da sua história."
          action={<ActionLink onClick={() => navigate('/lancamentos')}>Ver todos</ActionLink>}
        >
          {recent.length ? (
            <div className="transaction-list">
              {recent.map((t) => (
                <div className="transaction-row" key={t.id}>
                  <span className={'transaction-icon ' + (t.type === 'income' ? 'income' : '')}>
                    {t.type === 'income' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                  </span>
                  <div>
                    <strong>{t.description}</strong>
                    <small>
                      {t.category} · {dateLabel(t.date)}
                    </small>
                  </div>
                  <div className="transaction-amount">
                    <strong className={t.type === 'income' ? 'positive' : ''}>
                      {t.type === 'income' ? '+' : '−'}
                      {money(t.amountCents)}
                    </strong>
                    <small>{t.status === 'planned' ? 'Previsto' : 'Confirmado'}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Tudo pronto para começar"
              action={
                <button className="secondary" onClick={() => openForm('accounts')}>
                  Adicionar sua primeira conta
                </button>
              }
            />
          )}
        </Panel>
        <Panel
          title="Planos que movem você"
          subtitle="Um pouco hoje. Mais possibilidades amanhã."
          action={<ActionLink onClick={() => navigate('/objetivos')}>Ver planos</ActionLink>}
        >
          {data.goals.length ? (
            <div className="goal-list">
              {data.goals.slice(0, 2).map((g) => (
                <div className="mini-goal" key={g.id}>
                  <div>
                    <span className="goal-icon">
                      <Target size={18} />
                    </span>
                    <strong>{g.name}</strong>
                    <span>{Math.min(100, Math.round((g.savedCents / g.targetCents) * 100))}%</span>
                  </div>
                  <Progress value={(g.savedCents / g.targetCents) * 100} />
                  <p>
                    {money(g.savedCents)} <span>de {money(g.targetCents)}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Target}
              title="Dê um destino aos seus sonhos"
              action={
                <button className="secondary" onClick={() => openForm('goals')}>
                  Criar objetivo
                </button>
              }
            />
          )}
        </Panel>
      </div>
    </>
  );
}
