import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { HeartHandshake, Link, ShieldCheck, Plus, Unlink, Copy } from 'lucide-react';
import { Panel, SectionIntro, Empty, Progress } from '../../components/ui/Primitives';
import { RecordForm } from '../../components/forms/RecordForm';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../services/firebase/client';
import * as repo from '../../services/repositories/coupleRepository';
import { money, cents } from '../../utils/money';
import { dateLabel } from '../../utils/dates';
import { amountField } from '../settings/fields';
export default function Couple({ summary }) {
  const { demo } = useFinance(),
    { user } = useAuth(),
    { perform, confirm, notify } = useWorkspace(),
    location = useLocation();
  const [pair, setPair] = useState(null),
    [recipient, setRecipient] = useState(''),
    [inviteId, setInviteId] = useState(new URLSearchParams(location.search).get('convite') || ''),
    [invitation, setInvitation] = useState(null),
    [link, setLink] = useState(''),
    [sharing, setSharing] = useState(false),
    [form, setForm] = useState(null),
    [loading, setLoading] = useState(!demo);
  const refresh = async () => {
    if (!demo && user) setPair(await repo.coupleData(user.uid));
  };
  useEffect(() => {
    if (demo || !user) return;
    let active = true;
    const unsubscribe = onSnapshot(
      doc(db, 'memberships', user.uid),
      async (snapshot) => {
        if (!snapshot.exists()) {
          setPair(null);
          setLoading(false);
          return;
        }
        try {
          const next = await repo.coupleData(user.uid);
          if (active) setPair(next);
        } catch {
          if (active) setPair(null);
        } finally {
          if (active) setLoading(false);
        }
      },
      () => {
        setPair(null);
        setLoading(false);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [demo, user]);
  const inviteLink = (id) =>
    `${window.location.origin}${window.location.pathname}#/casal?convite=${encodeURIComponent(id)}`;
  return (
    <>
      <SectionIntro
        eyebrow="JUNTOS, COM ESPAÇO PARA CADA UM"
        title="Planos em comum. Privacidade também."
        text="Compartilhe apenas o que escolher. Suas transações, contas e investimentos continuam privados."
      />
      {demo ? (
        <Panel title="Conheça o espaço do casal">
          <Empty
            icon={HeartHandshake}
            title="Dois planos, um futuro em comum"
            text="O vínculo exige duas contas Firebase autorizadas. Convites e compartilhamento estão indisponíveis na demonstração para preservar a segurança."
          />
        </Panel>
      ) : loading ? (
        <p role="status">Verificando vínculo…</p>
      ) : pair ? (
        <>
          <div className="two-columns">
            <Panel
              title="Seu compartilhamento"
              subtitle="Consentimento individual e revogável"
              action={<ShieldCheck size={21} />}
            >
              <p>
                Ao autorizar, serão publicados somente estes rótulos: saúde financeira, adequação da
                reserva, organização e comprometimento. Sem valores, percentuais, bancos, transações
                ou patrimônio.
              </p>
              <p className="micro">
                A leitura do parceiro depende do consentimento atual. O resultado é calculado com
                base em dados declarados por você; não é auditado.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={sharing}
                  onChange={(e) => setSharing(e.target.checked)}
                />
                Autorizo compartilhar os indicadores qualitativos descritos acima.
              </label>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={!sharing}
                  onClick={() =>
                    perform(async () => {
                      await repo.shareIndicator(user.uid, pair.id, summary, true);
                      notify('Indicadores compartilhados com consentimento.');
                    })
                  }
                >
                  Publicar indicadores
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    perform(async () => {
                      await repo.shareIndicator(user.uid, pair.id, summary, false);
                      setSharing(false);
                      notify('Novas leituras dos seus indicadores foram revogadas.');
                    })
                  }
                >
                  Revogar indicadores
                </button>
              </div>
            </Panel>
            <Panel
              title="Saúde financeira do parceiro"
              subtitle="Indicadores declarados · não auditados"
            >
              {pair.indicator ? (
                <>
                  <span className="health-badge">{pair.indicator.health}</span>
                  <div className="detail-row">
                    <span>Reserva</span>
                    <strong>{pair.indicator.reserve}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Organização</span>
                    <strong>{pair.indicator.organization}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Comprometimento</span>
                    <strong>{pair.indicator.commitment}</strong>
                  </div>
                  <p className="micro">
                    Publicado em {dateLabel(pair.indicator.updatedDate)}. Somente a última
                    publicação foi compartilhada.
                  </p>
                </>
              ) : (
                <Empty
                  title="O parceiro ainda não compartilhou"
                  text="Cada pessoa escolhe quando publicar ou revogar os próprios indicadores."
                />
              )}
              <button className="text-button" onClick={() => perform(refresh)}>
                Atualizar indicadores
              </button>
            </Panel>
          </div>
          <Panel
            title="Objetivos compartilhados"
            subtitle="Nome, meta, prazo, valor e autoria de cada contribuição serão visíveis ao casal."
            action={
              <button
                className="secondary"
                onClick={() =>
                  setForm({
                    title: 'Novo objetivo compartilhado',
                    fields: [
                      { name: 'name', label: 'Nome' },
                      amountField('targetCents', 'Meta (R$)', { min: 1 }),
                      { name: 'deadline', label: 'Prazo', type: 'date' },
                    ],
                    onSave: async (values) => {
                      await repo.addSharedGoal(user.uid, pair.id, values);
                      await refresh();
                    },
                  })
                }
              >
                <Plus size={16} />
                Criar objetivo
              </button>
            }
          >
            {pair.goals.length ? (
              <div className="record-grid">
                {pair.goals.map((g) => (
                  <div className="shared-goal" key={g.id}>
                    <h3>{g.name}</h3>
                    <p>
                      {money(g.savedCents)} de {money(g.targetCents)}
                    </p>
                    <Progress value={(g.savedCents / g.targetCents) * 100} />
                    <p className="micro">
                      Até {dateLabel(g.deadline)} · Faltam{' '}
                      {money(Math.max(0, g.targetCents - g.savedCents))}
                    </p>
                    <button
                      className="text-button"
                      onClick={() =>
                        setForm({
                          title: 'Registrar contribuição compartilhada',
                          note: 'Apenas o valor, a data e sua identificação serão compartilhados. Isto é um registro declarado: não transfere dinheiro nem altera suas contas privadas.',
                          fields: [amountField('amountCents', 'Contribuição (R$)', { min: 1 })],
                          onSave: async (values) => {
                            await repo.contribute(user.uid, pair.id, g.id, values.amountCents);
                            await refresh();
                          },
                        })
                      }
                    >
                      Registrar contribuição
                    </button>
                    <details>
                      <summary>Histórico de contribuições</summary>
                      {g.contributions.map((c) => (
                        <p className="micro" key={c.id}>
                          {dateLabel(c.date)} · {c.uid === user.uid ? 'Você' : 'Parceiro'} ·{' '}
                          {money(c.amountCents)}
                        </p>
                      ))}
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                icon={HeartHandshake}
                title="Escolham o próximo plano"
                text="As contribuições são registros compartilhados, sem acesso à origem privada do dinheiro."
              />
            )}
          </Panel>
          <Panel title="Controle do vínculo">
            <p>
              Desvincular revoga novas leituras dos indicadores e objetivos compartilhados para
              ambos. Os registros privados continuam isolados. Informações já copiadas ou exportadas
              não podem ser recolhidas.
            </p>
            <button
              className="secondary danger"
              onClick={() =>
                confirm(
                  'Desvincular o casal?',
                  'Os dois perderão acesso aos documentos deste vínculo. Será necessário um novo convite para recomeçar.',
                  async () => {
                    await repo.revokePair(pair);
                    setPair(null);
                  },
                )
              }
            >
              <Unlink size={16} />
              Desvincular
            </button>
          </Panel>
        </>
      ) : (
        <div className="two-columns">
          <Panel
            title="Convidar seu parceiro"
            subtitle="Convite pessoal, válido por 7 dias."
            action={<HeartHandshake size={21} />}
          >
            <p>
              Peça ao parceiro o UID exibido em Configurações. O destinatário precisa ter uma conta
              já autorizada.
            </p>
            <label>
              UID do parceiro
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                maxLength={128}
              />
            </label>
            <button
              className="primary"
              disabled={!recipient || recipient.includes('/')}
              onClick={() =>
                confirm(
                  'Criar convite pessoal?',
                  'O parceiro receberá seu UID no convite. Nenhum valor financeiro será compartilhado ao criar ou aceitar o vínculo.',
                  async () => {
                    const id = await repo.invite(user.uid, recipient);
                    setLink(inviteLink(id));
                  },
                )
              }
            >
              Gerar link de convite
            </button>
            {link && (
              <>
                <p className="micro">Envie manualmente este link ao destinatário:</p>
                <input aria-label="Link do convite" value={link} readOnly />
                <button
                  className="text-button"
                  onClick={() =>
                    perform(async () => {
                      await navigator.clipboard.writeText(link);
                      notify('Link copiado.');
                    })
                  }
                >
                  <Copy size={15} />
                  Copiar link
                </button>
              </>
            )}
          </Panel>
          <Panel
            title="Recebeu um convite?"
            subtitle="Somente o destinatário autenticado pode aceitar."
          >
            <label>
              ID do convite
              <input
                value={inviteId}
                onChange={(e) => {
                  setInviteId(e.target.value.trim());
                  setInvitation(null);
                }}
                maxLength={128}
              />
            </label>
            <button
              className="secondary"
              disabled={!inviteId || inviteId.includes('/')}
              onClick={() => perform(async () => setInvitation(await repo.getInvite(inviteId)))}
            >
              Verificar convite
            </button>
            {invitation && (
              <>
                <p className="micro">
                  De: {invitation.senderUid}
                  <br />
                  Estado: {invitation.state}
                  <br />
                  Expira: {invitation.expiresAt.toDate().toLocaleString('pt-BR')}
                </p>
                <p>
                  O vínculo permitirá criar objetivos em comum. Indicadores só serão publicados com
                  consentimento individual posterior.
                </p>
                <div className="button-row">
                  <button
                    className="primary"
                    disabled={invitation.state !== 'pending'}
                    onClick={() =>
                      confirm(
                        'Aceitar vínculo financeiro?',
                        'Vocês poderão acessar os objetivos criados neste espaço. Suas contas, transações, investimentos e indicadores individuais continuarão privados até o consentimento para compartilhar rótulos.',
                        async () => {
                          await repo.respondInvite(user.uid, invitation.id, true);
                          setInvitation(null);
                          await refresh();
                        },
                      )
                    }
                  >
                    Aceitar
                  </button>
                  <button
                    className="secondary"
                    disabled={invitation.state !== 'pending'}
                    onClick={() =>
                      perform(async () => {
                        await repo.respondInvite(user.uid, invitation.id, false);
                        setInvitation(null);
                        notify('Convite recusado.');
                      })
                    }
                  >
                    Recusar
                  </button>
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
      {form && <RecordForm {...form} onClose={() => setForm(null)} />}
    </>
  );
}
