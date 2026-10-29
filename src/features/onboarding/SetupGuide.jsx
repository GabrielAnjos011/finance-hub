import { Check, ArrowRight, Wallet, ArrowLeftRight, CalendarDays } from 'lucide-react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

export function setupSteps(data) {
  const config = data.settings.find((item) => item.id === 'preferences');
  return [
    {
      id: 'account',
      module: 'accounts',
      title: 'Diga onde seu dinheiro fica',
      text: 'Cadastre uma conta ou carteira com o saldo de agora.',
      done: data.accounts.length > 0,
      icon: Wallet,
    },
    {
      id: 'transaction',
      module: 'transactions',
      title: 'Faça seu primeiro lançamento',
      text: 'Uma receita ou despesa já começa a mostrar como seu dinheiro se movimenta.',
      done: data.transactions.some((item) => item.status === 'confirmed'),
      icon: ArrowLeftRight,
    },
    {
      id: 'planning',
      module: 'settings',
      title: 'Personalize seu planejamento',
      text: 'Informe o dia do salário e as despesas essenciais para melhorar as projeções.',
      done: Boolean(config?.salaryDay && config?.essentialCents > 0),
      icon: CalendarDays,
    },
  ];
}
export default function SetupGuide({ always = false }) {
  const { data, openForm } = useWorkspace();
  const navigate = useNavigate();
  const steps = setupSteps(data),
    completed = steps.filter((step) => step.done).length;
  if (completed === steps.length && !always) return null;
  const next = steps.find((step) => !step.done);
  return (
    <section className="setup-guide" aria-label="Seus primeiros passos">
      <div className="setup-guide-heading">
        <div>
          <span className="eyebrow">NO SEU RITMO</span>
          <h2>{next ? 'Comece pelo que importa.' : 'Seus primeiros passos estão completos.'}</h2>
          <p>
            {next
              ? 'Você já pode registrar sem configurar tudo. Cada passo melhora uma parte da sua visão financeira.'
              : 'Continue registrando e explore reserva, objetivos e orçamento quando fizer sentido.'}
          </p>
        </div>
        <span className="setup-count">
          {completed} de {steps.length}
        </span>
      </div>
      <ol className="setup-steps">
        {steps.map((step, index) => (
          <li key={step.id} className={step.done ? 'complete' : ''}>
            <span className="setup-step-icon">
              {step.done ? <Check size={18} /> : <step.icon size={18} />}
            </span>
            <div>
              <strong>
                {index + 1}. {step.title}
              </strong>
              <p>{step.text}</p>
              <button
                className="text-button"
                onClick={() =>
                  step.done && step.module !== 'settings'
                    ? navigate(step.module === 'accounts' ? '/contas' : '/lancamentos')
                    : openForm(step.module)
                }
              >
                {step.done ? 'Revisar' : next?.id === step.id ? 'Começar' : 'Preencher agora'}
                <ArrowRight size={14} />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
