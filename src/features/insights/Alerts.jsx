import { Bell, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Panel, SectionIntro, Empty } from '../../components/ui/Primitives';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { alerts } from '../financial-health/engine';
import { today } from '../../utils/dates';
import { money } from '../../utils/money';
export default function Alerts({ summary }) {
  const { data, perform } = useWorkspace(),
    commit = useFinance((s) => s.commit),
    [all, setAll] = useState(false);
  const now = today();
  const items =
    summary.config.notifications === false
      ? []
      : alerts(data, summary, now)
          .filter((a) => {
            const state = data.alertStates.find((s) => s.id === a.id);
            return all || (!state?.read && (!state?.snoozeUntil || state.snoozeUntil < now));
          })
          .sort((a, b) => (a.severity === 'critical' ? -1 : 1));
  const mark = (id, read, snoozeUntil) => {
    const existing = data.alertStates.find((a) => a.id === id);
    return perform(() =>
      commit([
        {
          module: 'alertStates',
          id,
          data: { read, snoozeUntil },
          ...(existing ? { expectedRevision: existing.revision } : { createOnly: true }),
        },
      ]),
    );
  };
  return (
    <>
      <SectionIntro
        eyebrow="SINAIS PARA CUIDAR DO QUE IMPORTA"
        title="Seu radar financeiro."
        text="Alertas calculados pelos seus registros. Sem mensagens genéricas ou envio externo."
      />
      <Panel
        title="Pontos que merecem atenção"
        action={
          <label className="check">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
            Mostrar lidos e adiados
          </label>
        }
      >
        {items.length ? (
          items.map((item) => (
            <div className={'alert-row ' + item.severity} key={item.id}>
              <span className="record-icon">
                <Bell size={20} />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                {item.amountCents && <strong>{money(item.amountCents)}</strong>}
              </div>
              <div className="inline-actions">
                <button className="secondary" onClick={() => mark(item.id, true, now)}>
                  <Check size={15} />
                  Lido
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    const date = new Date(now + 'T12:00:00');
                    date.setDate(date.getDate() + 7);
                    mark(item.id, false, date.toISOString().slice(0, 10));
                  }}
                >
                  Adiar 7 dias
                </button>
              </div>
            </div>
          ))
        ) : (
          <Empty
            icon={Sparkles}
            title={
              summary.config.notifications === false
                ? 'Alertas desativados'
                : 'Nenhum alerta pendente'
            }
            text="Continue revisando seus registros. Os alertas dependem da qualidade dos dados informados."
          />
        )}
      </Panel>
    </>
  );
}
