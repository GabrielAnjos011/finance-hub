import { Settings2, ShieldCheck, BookOpen, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Panel, SectionIntro } from '../../components/ui/Primitives';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { useAuth } from '../auth/AuthProvider';
import { diagnostics } from '../../services/errors';
import { dateLabel } from '../../utils/dates';
export default function Settings({ summary }) {
  const { openForm, perform } = useWorkspace(),
    { user } = useAuth(),
    { refresh, demo } = useFinance();
  return (
    <>
      <SectionIntro
        eyebrow="UM ESPAÇO COM A SUA CARA"
        title="Suas escolhas, suas preferências."
        text="Comece pelo essencial. Complete o restante no seu ritmo."
        action={
          <button className="primary" onClick={() => openForm('settings')}>
            <Settings2 size={18} />
            Editar preferências
          </button>
        }
      />
      <div className="two-columns">
        <Panel title="Seu planejamento">
          <div className="detail-row">
            <span>Nome de exibição</span>
            <strong>{summary.config.name || 'Não informado'}</strong>
          </div>
          <div className="detail-row">
            <span>Dia principal do salário</span>
            <strong>{summary.config.salaryDay || 25}</strong>
          </div>
          <div className="detail-row">
            <span>Meses de proteção</span>
            <strong>{summary.config.reserveMonths || 6}</strong>
          </div>
          <div className="detail-row">
            <span>Última revisão</span>
            <strong>{dateLabel(summary.config.updatedDate)}</strong>
          </div>
          <p className="micro">
            Moeda: BRL · Idioma: Português do Brasil · Fuso: America/Sao_Paulo.
          </p>
        </Panel>
        <Panel title="Sua privacidade" action={<ShieldCheck size={21} />}>
          <p>
            Seus dados financeiros ficam na sua área privada do Firestore, protegidos por regras de
            acesso por usuário. O cache financeiro permanece somente em memória.
          </p>
          <p className="micro">Identificador para convite de casal:</p>
          <code className="uid">{user?.uid || 'Indisponível na demonstração'}</code>
          <p className="micro">
            Ao sair, os registros financeiros em memória são removidos. Arquivos exportados
            permanecem sob sua responsabilidade no dispositivo.
          </p>
        </Panel>
        <Panel
          title="Diagnóstico da sessão"
          subtitle="Contadores aproximados, sem valores financeiros"
        >
          <div className="detail-row">
            <span>Documentos lidos pelo repositório</span>
            <strong>{diagnostics.reads}</strong>
          </div>
          <div className="detail-row">
            <span>Documentos gravados</span>
            <strong>{diagnostics.writes}</strong>
          </div>
          <div className="detail-row">
            <span>Erros tratados</span>
            <strong>{diagnostics.errors}</strong>
          </div>
          <p className="micro">
            Não representa a cota global: leituras das regras, consultas vazias, outras sessões e
            operações do modo casal não estão incluídas. Acompanhe a utilização real no Console
            Firebase.
          </p>
          <button className="secondary" onClick={() => perform(refresh)} disabled={demo}>
            <RefreshCw size={15} />
            Atualizar dados do servidor
          </button>
        </Panel>
        <Panel title="Comece em poucos passos" action={<BookOpen size={20} />}>
          <ol className="steps">
            <li>Cadastre uma conta e o saldo de hoje.</li>
            <li>Informe o dia do salário e suas despesas essenciais.</li>
            <li>Registre receitas, despesas e compromissos futuros.</li>
            <li>Destine dinheiro à reserva e aos seus planos.</li>
          </ol>
          <p className="micro">
            A documentação do projeto contém os guias FIREBASE_SETUP.md e DEPLOYMENT.md para
            configurar e publicar o Finance Hub.
          </p>
        </Panel>
      </div>
    </>
  );
}
