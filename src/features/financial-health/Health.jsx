import { ShieldCheck, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Panel, SectionIntro, Stat } from '../../components/ui/Primitives';
import { useWorkspace } from '../../app/WorkspaceContext';
import { money } from '../../utils/money';
export default function Health({ summary }) {
  const { openForm } = useWorkspace();
  return (
    <>
      <SectionIntro
        eyebrow="CONHECIMENTO QUE VIRA AÇÃO"
        title="Como está sua saúde financeira?"
        text="Uma leitura educativa, explicável e baseada nos dados que você informou."
        action={
          <button className="secondary" onClick={() => openForm('settings')}>
            Revisar meus dados <ArrowRight size={17} />
          </button>
        }
      />
      <div className="stats-grid three">
        <Stat
          label="Seu momento"
          value={summary.health.state}
          detail={'Confiança ' + summary.health.confidence}
          icon={ShieldCheck}
          tone="green"
        />
        <Stat
          label="Saldo reconhecido"
          value={money(summary.monthly)}
          detail="Receitas menos despesas do período"
        />
        <Stat
          label="Projeção até o salário"
          value={summary.projectionReady ? money(summary.available) : 'A configurar'}
          detail={
            summary.projectionReady
              ? 'Dinheiro livre menos compromissos e margem'
              : 'Informe sua conta e o dia do salário para calcular'
          }
        />
      </div>
      <div className="two-columns">
        <Panel title="O que os dados mostram" subtitle="Nenhuma pontuação secreta.">
          {summary.health.reasons.map((reason) => (
            <div className="insight" key={reason}>
              <CheckCircle2 size={20} />
              <p>{reason}</p>
            </div>
          ))}
          <div className="notice">
            O resultado depende da qualidade e da atualização dos seus registros. Não é um
            diagnóstico certificado nem uma auditoria.
          </div>
        </Panel>
        <Panel title="Seu próximo passo" subtitle="Orientação a partir da sua realidade.">
          <div className="insight">
            <Sparkles size={22} />
            <p>
              {summary.health.confidence === 'baixa'
                ? 'Complete renda, contas e despesas essenciais e confirme a data de atualização. Sem esses dados, a avaliação permanece insuficiente.'
                : summary.available < 0
                  ? 'Revise contas que vencem antes do próximo salário. Priorize pagamentos essenciais e evite novos compromissos até corrigir o déficit.'
                  : summary.health.state === 'Atenção'
                    ? 'Defina um aporte possível para recompor a reserva. Reavalie gastos variáveis antes de ampliar seus planos.'
                    : 'Mantenha a revisão dos compromissos e acompanhe a evolução dos objetivos. Preserve a liquidez necessária para seus prazos.'}
            </p>
          </div>
        </Panel>
      </div>
      <Panel title="Como a classificação é calculada" subtitle="Critérios educativos desta versão">
        <div className="prose">
          <p>
            <strong>Dados insuficientes:</strong> ausência de contas, renda confirmada, despesas
            essenciais ou revisão nos últimos 45 dias.
          </p>
          <p>
            <strong>Risco elevado:</strong> saldo projetado negativo até o salário ou despesas
            reconhecidas superiores à renda no período.
          </p>
          <p>
            <strong>Atenção:</strong> reserva abaixo da sua meta ou despesas acima de 85% da renda
            do período. Esse percentual é uma referência do produto, não uma regra universal.
          </p>
          <p>
            <strong>Saudável:</strong> dados suficientes, projeção não negativa, despesas inferiores
            à renda e reserva alinhada à meta configurada.
          </p>
          <p>
            A renda variável futura não é antecipada na disponibilidade. Obrigações dos cartões são
            subtraídas do patrimônio e entram na previsão conforme o vencimento.
          </p>
        </div>
      </Panel>
    </>
  );
}
