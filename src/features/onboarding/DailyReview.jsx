import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { useFinance } from '../../store/useFinance';
import { today, dateLabel } from '../../utils/dates';

export default function DailyReview({ date = today() }) {
  const { data, perform, openForm, busy } = useWorkspace(),
    commit = useFinance((state) => state.commit);
  const id = 'daily_review_' + date,
    existing = data.alertStates.find((item) => item.id === id),
    reviewed = existing?.read === true;
  async function toggle() {
    await commit([
      {
        module: 'alertStates',
        id,
        data: { read: !reviewed, snoozeUntil: date },
        ...(existing ? { expectedRevision: existing.revision } : { createOnly: true }),
      },
    ]);
  }
  return (
    <section className={'daily-review ' + (reviewed ? 'reviewed' : '')} aria-label="Revisão do dia">
      <span className="record-icon">
        {reviewed ? <CheckCircle2 size={22} /> : <ClipboardCheck size={22} />}
      </span>
      <div>
        <span className="micro">Hoje · {dateLabel(date)}</span>
        <h2>{reviewed ? 'Você revisou seu dia.' : 'Um minuto para cuidar do seu dia.'}</h2>
        <p>
          {reviewed
            ? 'Esse registro é só uma revisão. Nenhuma conta foi marcada como paga.'
            : 'Confira se falta alguma receita ou despesa. Se hoje não teve movimento, você também pode concluir a revisão.'}
        </p>
      </div>
      <div className="button-row">
        {!reviewed && (
          <button className="secondary" onClick={() => openForm('transactions')}>
            Adicionar lançamento
          </button>
        )}
        <button
          className={reviewed ? 'text-button' : 'primary'}
          onClick={() => perform(toggle)}
          disabled={busy}
        >
          {reviewed ? 'Desfazer revisão' : 'Revisei meu dia'}
        </button>
      </div>
    </section>
  );
}
