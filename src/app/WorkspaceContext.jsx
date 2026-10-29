import { createContext, useContext, useState } from 'react';
import { useFinance } from '../store/useFinance';
import { RecordForm } from '../components/forms/RecordForm';
import { Modal } from '../components/ui/Primitives';
import { formDefinition } from '../features/onboarding/formDefinitions';
import { stripMeta, transactionOperations } from '../features/transactions/operations';
import { safeError } from '../services/errors';
const Context = createContext(null);
export const useWorkspace = () => useContext(Context);

function FormLayer({ entry, active, onClose, onCreateRelated, notify }) {
  const { data, commit } = useFinance();
  const existing =
    entry.existing ||
    (entry.module === 'settings' ? data.settings.find((s) => s.id === 'preferences') : undefined);
  const definition = formDefinition({ ...entry, existing }, data);
  const previous = definition.existing || existing;
  const raw = { ...(previous ? stripMeta(previous) : {}), ...entry.initial };
  if (entry.module === 'settings' && previous) raw.categoryText = previous.categories.join('\n');
  if (entry.module === 'transactions') {
    if (raw.cardId && raw.competence) raw.invoiceId = raw.cardId + '_' + raw.competence;
    raw.count = String(previous?.installments || 1);
    if (raw.type === 'adjustment' && typeof raw.amountCents === 'number') {
      raw.adjustmentDirection = raw.amountCents < 0 ? 'decrease' : 'increase';
      raw.amountCents = Math.abs(raw.amountCents);
    }
  }
  const initial = { ...raw };
  for (const field of definition.fields) {
    if (field.money && typeof initial[field.name] === 'number')
      initial[field.name] = (initial[field.name] / 100).toFixed(2).replace('.', ',');
    else if (field.number && initial[field.name] !== undefined)
      initial[field.name] = String(initial[field.name]);
  }
  async function save(values) {
    const normalized = definition.normalize(values);
    const id =
      previous?.id || definition.id || (entry.module === 'settings' ? 'preferences' : entry.id);
    if (entry.module === 'transactions')
      await commit(transactionOperations(normalized, data, previous, entry.id));
    else
      await commit([
        {
          module: entry.module,
          id,
          data: normalized,
          ...(previous ? { expectedRevision: previous.revision } : { createOnly: true }),
        },
      ]);
    entry.onSaved?.({ id, ...normalized });
    notify('Salvo com sucesso.');
  }
  return (
    <RecordForm
      {...definition}
      initial={initial}
      active={active}
      onSave={save}
      onClose={onClose}
      onCreateRelated={onCreateRelated}
    />
  );
}

export function WorkspaceProvider({ children }) {
  const { data, commit, busy } = useFinance();
  const [forms, setForms] = useState([]),
    [confirmation, setConfirmation] = useState(null),
    [toast, setToast] = useState(''),
    [error, setError] = useState('');
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 5000);
  };
  const perform = async (callback) => {
    try {
      setError('');
      await callback();
      notify('Operação confirmada.');
    } catch (error) {
      setError(safeError(error));
    }
  };
  const makeEntry = (module, existing, initial = {}, onSaved) => ({
    id: crypto.randomUUID(),
    module,
    existing,
    initial,
    onSaved,
  });
  const openForm = (module, existing, initial = {}, onSaved) =>
    setForms([makeEntry(module, existing, initial, onSaved)]);
  const createRelated = (module, initial = {}, onSaved) =>
    setForms((previous) => [
      ...previous,
      makeEntry(
        module,
        initial.editId ? data[module].find((d) => d.id === initial.editId) : undefined,
        initial,
        onSaved,
      ),
    ]);
  const confirm = (title, text, onConfirm) => setConfirmation({ title, text, onConfirm });
  const remove = (module, item) => {
    if (
      module === 'accounts' &&
      (data.transactions.some((t) => t.accountId === item.id || t.destinationId === item.id) ||
        data.funds.some((f) => f.accountId === item.id) ||
        data.goals.some((g) => g.accountId === item.id) ||
        data.cards.some((c) => c.accountId === item.id))
    ) {
      setError(
        'Esta conta tem movimentos ou dinheiro vinculado a planos. Mantenha-a para preservar seu histórico.',
      );
      return;
    }
    if (module === 'cards' && data.transactions.some((t) => t.cardId === item.id)) {
      setError(
        'Este cartão tem compras registradas. Desative-o na edição para preservar o histórico.',
      );
      return;
    }
    const items =
      module === 'transactions' && item.installments > 1
        ? data.transactions.filter((t) => t.groupId === item.groupId)
        : [item];
    confirm(
      'Excluir registro?',
      items.length > 1
        ? `As ${items.length} parcelas desta compra serão excluídas. O saldo será recalculado.`
        : 'O saldo e os indicadores serão recalculados após a exclusão.',
      () =>
        commit(
          items.map((t) => ({ module, id: t.id, remove: true, expectedRevision: t.revision })),
        ),
    );
  };
  return (
    <Context.Provider value={{ data, busy, openForm, remove, confirm, perform, notify }}>
      {children}
      {forms.map((entry, index) => (
        <FormLayer
          key={entry.id}
          entry={entry}
          active={index === forms.length - 1}
          onClose={() => setForms((previous) => previous.filter((form) => form.id !== entry.id))}
          onCreateRelated={createRelated}
          notify={notify}
        />
      ))}
      {confirmation && (
        <Modal title={confirmation.title} onClose={() => setConfirmation(null)}>
          <p>{confirmation.text}</p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirmation(null)}>
              Cancelar
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  await confirmation.onConfirm();
                  setConfirmation(null);
                })
              }
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button className="text-button" onClick={() => setError('')}>
            Fechar
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
