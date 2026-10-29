import { Plus, Pencil, Trash2, Target, ShieldCheck } from 'lucide-react';
import { differenceInCalendarMonths, parseISO } from 'date-fns';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Panel, SectionIntro, Empty, Progress, Stat } from '../../components/ui/Primitives';
import { money, sum } from '../../utils/money';
import { dateLabel, today } from '../../utils/dates';
import { goalPlan } from './calculations';
export default function Plans({ summary, reserve = false }) {
  const { data, openForm, remove } = useWorkspace(),
    module = reserve ? 'funds' : 'goals',
    items = data[module];
  const required = sum(
    data.goals.map(
      (g) =>
        goalPlan(
          g.targetCents,
          g.savedCents,
          Math.max(1, differenceInCalendarMonths(parseISO(g.deadline), parseISO(today()))),
        ).monthly,
    ),
  );
  return (
    <>
      <SectionIntro
        eyebrow={reserve ? 'TRANQUILIDADE TEM UM COMEÇO' : 'O FUTURO COMEÇA COM UM PLANO'}
        title={reserve ? 'Sua rede de segurança.' : 'Planos que merecem acontecer.'}
        text={
          reserve
            ? 'Proteja o dinheiro para os imprevistos e para o que já tem destino.'
            : 'Transforme desejos em próximos passos, respeitando o dinheiro que você tem.'
        }
        action={
          <button className="primary" onClick={() => openForm(module)}>
            <Plus size={18} />
            {reserve ? 'Criar reserva' : 'Criar objetivo'}
          </button>
        }
      />
      {reserve && (
        <div className="stats-grid three">
          <Stat
            label="Reserva de emergência"
            value={money(summary.reserve)}
            detail="Alocação limitada ao saldo disponível na conta"
            icon={ShieldCheck}
          />
          <Stat
            label="Meta de proteção"
            value={money(
              (summary.config.essentialCents || 0) * (summary.config.reserveMonths || 6),
            )}
            detail={`${summary.config.reserveMonths || 6} meses das despesas essenciais informadas`}
          />
          <Stat
            label="Meses de tranquilidade"
            value={
              summary.config.essentialCents
                ? (summary.reserve / summary.config.essentialCents).toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  })
                : '—'
            }
            detail="Configure suas despesas essenciais para calcular"
          />
        </div>
      )}
      {!reserve && summary.config.monthlyContributionCents < required && items.length > 0 && (
        <div className="notice warning">
          Os objetivos pedem {money(required)} por mês, acima da capacidade de aporte informada (
          {money(summary.config.monthlyContributionCents || 0)}). Revise os prazos ou priorize um
          objetivo.
        </div>
      )}
      {items.length ? (
        <div className="record-grid">
          {items.map((item) => {
            const saved = reserve ? item.allocatedCents : item.savedCents;
            const months = reserve
              ? item.monthlyCents
                ? Math.ceil(Math.max(0, item.targetCents - saved) / item.monthlyCents)
                : null
              : Math.max(1, differenceInCalendarMonths(parseISO(item.deadline), parseISO(today())));
            const plan = goalPlan(item.targetCents, saved, months || 1);
            return (
              <Panel
                key={item.id}
                title={item.name}
                subtitle={
                  reserve
                    ? item.purpose === 'emergency'
                      ? 'Reserva de emergência'
                      : 'Provisão com finalidade'
                    : `Até ${dateLabel(item.deadline)}`
                }
                action={reserve ? <ShieldCheck size={23} /> : <Target size={23} />}
              >
                <div className="record-value">{money(saved)}</div>
                <p className="muted">
                  de {money(item.targetCents)} ·{' '}
                  {Math.min(100, Math.round((saved / item.targetCents) * 100)) || 0}%
                </p>
                <Progress value={(saved / item.targetCents) * 100} />
                <div className="detail-row">
                  <span>Falta guardar</span>
                  <strong>{money(plan.remaining)}</strong>
                </div>
                <div className="detail-row">
                  <span>{reserve ? 'Aporte planejado' : 'Necessário por mês'}</span>
                  <strong>{money(reserve ? item.monthlyCents : plan.monthly)}</strong>
                </div>
                <div className="detail-row">
                  <span>{reserve ? 'Prazo sem rendimento' : 'Aporte planejado'}</span>
                  <strong>
                    {reserve
                      ? months === null
                        ? 'Defina um aporte'
                        : months + ' meses'
                      : money(item.monthlyCents)}
                  </strong>
                </div>
                <p className="micro">
                  Guardado em{' '}
                  {data.accounts.find((a) => a.id === item.accountId)?.name ||
                    'conta não encontrada'}
                  . Valores não são somados novamente ao patrimônio.
                </p>
                <div className="record-actions">
                  <button className="text-button" onClick={() => openForm(module, item)}>
                    <Pencil size={15} />
                    Atualizar plano
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={'Excluir ' + item.name}
                    onClick={() => remove(module, item)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel
          title={
            reserve ? 'Uma proteção para seus próximos passos' : 'Dê nome ao seu próximo sonho'
          }
        >
          <Empty
            icon={reserve ? ShieldCheck : Target}
            title={reserve ? 'Comece a construir sua reserva' : 'Crie seu primeiro objetivo'}
            text="Cadastre uma conta para vincular o dinheiro já existente e acompanhar o progresso."
          />
        </Panel>
      )}
      <div className="notice">
        {reserve
          ? 'O alvo é pessoal: configure meses de proteção e despesas essenciais. O cálculo não representa uma recomendação universal.'
          : 'O planejamento não cria aportes automaticamente. Registre a transferência real e atualize o valor destinado ao objetivo.'}
      </div>
    </>
  );
}
