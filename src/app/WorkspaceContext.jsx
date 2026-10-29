import { createContext, useContext, useState } from 'react';
import { useFinance } from '../store/useFinance';
import { RecordForm } from '../components/forms/RecordForm';
import { Modal } from '../components/ui/Primitives';
import { accountFields, amountField, goalFields, options } from '../features/settings/fields';
import { transactionTypes, defaultSettings } from '../constants/catalog';
import { today } from '../utils/dates';
import { balance } from '../features/financial-health/engine';
import { stripMeta, transactionOperations } from '../features/transactions/operations';
import { safeError } from '../services/errors';
const Context = createContext(null);
export const useWorkspace = () => useContext(Context);
export function WorkspaceProvider({ children }) {
  const { data, commit, busy } = useFinance();
  const [form, setForm] = useState(null),
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
    } catch (e) {
      setError(safeError(e));
    }
  };
  const save = async (module, values, existing, id) => {
    await commit([
      {
        module,
        id: existing?.id || id || crypto.randomUUID(),
        data: values,
        ...(existing ? { expectedRevision: existing.revision } : { createOnly: true }),
      },
    ]);
    notify('Salvo com sucesso.');
  };
  const validateAllocation = (values, existing, module) => {
    const account = data.accounts.find((a) => a.id === values.accountId);
    if (!account) throw new Error('Escolha uma conta válida para guardar o dinheiro.');
    const total =
      [
        ...data.funds
          .filter((f) => module !== 'funds' || f.id !== existing?.id)
          .map((f) => ({ ...f, amount: f.allocatedCents })),
        ...data.goals
          .filter((g) => module !== 'goals' || g.id !== existing?.id)
          .map((g) => ({ ...g, amount: g.savedCents })),
      ]
        .filter((f) => f.accountId === values.accountId)
        .reduce((n, f) => n + f.amount, 0) + (values.allocatedCents ?? values.savedCents);
    if (total > Math.max(0, balance(account, data.transactions, today())))
      throw new Error(
        'O valor destinado aos planos supera o saldo dessa conta. Registre primeiro a transferência ou o aporte real.',
      );
  };
  const openForm = (module, existing, overrides = {}) => {
    let fields, title, note, onSave;
    const requestId = crypto.randomUUID();
    const config = data.settings.find((s) => s.id === 'preferences') || defaultSettings;
    if (module === 'accounts') {
      fields = accountFields;
      title = existing ? 'Editar conta' : 'Nova conta';
      note =
        'O saldo inicial é o saldo na data de referência. Registre somente movimentações posteriores a essa data. Investimentos são ativos dentro de contas e não serão somados duas vezes.';
      onSave = (values) => {
        if (
          existing &&
          data.transactions.some(
            (t) => t.accountId === existing.id || t.destinationId === existing.id,
          ) &&
          (values.initialCents !== existing.initialCents ||
            values.referenceDate !== existing.referenceDate)
        )
          throw new Error(
            'Use um ajuste de saldo para corrigir uma conta que já tem movimentações.',
          );
        return save(module, values, existing, requestId);
      };
    }
    if (module === 'transactions') {
      title = existing ? 'Editar lançamento' : 'Novo lançamento';
      fields = [
        {
          name: 'type',
          label: 'Movimentação',
          options: Object.entries(transactionTypes).map(([value, label]) => ({ value, label })),
          default: 'expense',
        },
        { name: 'description', label: 'Descrição' },
        amountField('amountCents', 'Valor total (R$)', { min: -100000000000 }),
        { name: 'date', label: 'Data / vencimento', type: 'date', default: today() },
        {
          name: 'category',
          label: 'Categoria',
          options: config.categories || defaultSettings.categories,
          default: 'Outros',
        },
        {
          name: 'status',
          label: 'Situação',
          options: [
            { value: 'confirmed', label: 'Confirmado' },
            { value: 'planned', label: 'Previsto, ainda não confirmado' },
          ],
          default: 'confirmed',
        },
        {
          name: 'accountId',
          label: 'Conta de origem / pagamento',
          options: options(data.accounts),
          optional: true,
          default: data.accounts[0]?.id || '',
        },
        {
          name: 'destinationId',
          label: 'Conta de destino (transferências)',
          options: options(data.accounts),
          optional: true,
        },
        {
          name: 'cardId',
          label: 'Cartão (compras, faturas, estornos)',
          options: options(data.cards),
          optional: true,
        },
        {
          name: 'competence',
          label: 'Competência da fatura',
          type: 'month',
          optional: true,
          hint: 'Nas compras, calculada pelo fechamento. Em pagamentos e estornos, selecione a fatura.',
        },
        { name: 'dueDate', label: 'Vencimento da fatura', type: 'date', optional: true },
        {
          name: 'count',
          label: 'Número de parcelas (cartão)',
          type: 'number',
          number: true,
          min: 1,
          max: 120,
          default: '1',
        },
        { name: 'recurrence', label: 'Prever repetição mensal', type: 'checkbox' },
        {
          name: 'repeatCount',
          label: 'Ocorrências a prever',
          type: 'number',
          number: true,
          min: 1,
          max: 24,
          default: '6',
        },
        { name: 'tags', label: 'Tags', optional: true },
        { name: 'notes', label: 'Observações', type: 'textarea', optional: true, full: true },
      ];
      note =
        'Transferências e pagamentos de fatura não são despesas. Recorrências futuras são apenas previsões. Compras no dia do fechamento vão para a fatura seguinte.';
      onSave = async (values) => {
        await commit(transactionOperations(values, data, existing, requestId));
        notify('Lançamento confirmado.');
      };
    }
    if (module === 'cards') {
      title = existing ? 'Editar cartão' : 'Novo cartão';
      fields = [
        { name: 'name', label: 'Nome do cartão' },
        { name: 'institution', label: 'Instituição', optional: true },
        amountField('limitCents', 'Limite (R$)'),
        {
          name: 'closingDay',
          label: 'Dia de fechamento',
          type: 'number',
          number: true,
          min: 1,
          max: 31,
          default: '25',
        },
        {
          name: 'dueDay',
          label: 'Dia de vencimento',
          type: 'number',
          number: true,
          min: 1,
          max: 31,
          default: '5',
        },
        { name: 'accountId', label: 'Conta de pagamento', options: options(data.accounts) },
        { name: 'active', label: 'Cartão ativo', type: 'checkbox', default: true },
      ];
    }
    if (module === 'goals') {
      title = existing ? 'Editar objetivo' : 'Novo objetivo';
      fields = goalFields(data.accounts);
      note =
        'O valor destinado deve existir na conta vinculada. Ele protege esse dinheiro para o objetivo sem aumentar seu patrimônio.';
      onSave = (values) => {
        validateAllocation(values, existing, module);
        return save(module, values, existing, requestId);
      };
    }
    if (module === 'funds') {
      title = existing ? 'Editar reserva' : 'Nova reserva';
      fields = [
        { name: 'name', label: 'Nome' },
        {
          name: 'purpose',
          label: 'Finalidade',
          options: [
            { value: 'emergency', label: 'Emergência' },
            { value: 'other', label: 'Outra provisão' },
          ],
          default: 'emergency',
        },
        { name: 'accountId', label: 'Onde o dinheiro está', options: options(data.accounts) },
        amountField('allocatedCents', 'Valor destinado (R$)', { default: '0' }),
        amountField('targetCents', 'Meta (R$)'),
        amountField('monthlyCents', 'Aporte planejado mensal (R$)', { default: '0' }),
      ];
      note =
        'Reservar não cria dinheiro. Faça a transferência entre contas pelo módulo Lançamentos e depois atualize o valor destinado. Para resgatar, reduza a alocação e registre a transferência real.';
      onSave = (values) => {
        validateAllocation(values, existing, module);
        return save(module, values, existing, requestId);
      };
    }
    if (module === 'budgets') {
      title = existing ? 'Editar orçamento' : 'Planejar categoria';
      fields = [
        { name: 'month', label: 'Mês', type: 'month', default: today().slice(0, 7) },
        { name: 'category', label: 'Categoria', options: config.categories },
        amountField('limitCents', 'Limite planejado (R$)'),
      ];
      onSave = (values) => {
        if (
          data.budgets.some(
            (b) =>
              b.id !== existing?.id && b.month === values.month && b.category === values.category,
          )
        )
          throw new Error(
            'Já existe um orçamento para essa categoria no mês. Edite o limite existente.',
          );
        return save(module, values, existing, requestId);
      };
    }
    if (module === 'settings') {
      title = 'Suas preferências';
      fields = [
        { name: 'name', label: 'Como podemos chamar você?', optional: true },
        {
          name: 'salaryDay',
          label: 'Dia principal do salário',
          type: 'number',
          number: true,
          min: 1,
          max: 31,
          default: '25',
        },
        amountField('essentialCents', 'Despesas essenciais mensais (R$)', { default: '0' }),
        {
          name: 'reserveMonths',
          label: 'Meses de proteção desejados',
          type: 'number',
          number: true,
          min: 1,
          max: 36,
          default: '6',
        },
        amountField('safetyCents', 'Margem de segurança (R$)', { default: '0' }),
        amountField('monthlyContributionCents', 'Capacidade mensal de aporte (R$)', {
          default: '0',
        }),
        {
          name: 'donationPercent',
          label: 'Doação planejada (%)',
          type: 'number',
          number: true,
          min: 0,
          max: 100,
          default: '0',
        },
        {
          name: 'theme',
          label: 'Tema',
          options: [
            { value: 'system', label: 'Automático' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Escuro' },
          ],
          default: 'system',
        },
        {
          name: 'notifications',
          label: 'Ativar alertas internos',
          type: 'checkbox',
          default: true,
        },
        {
          name: 'categoryText',
          label: 'Categorias (uma por linha)',
          type: 'textarea',
          full: true,
          default: (config.categories || defaultSettings.categories).join('\n'),
        },
      ];
      note =
        'Dados confirmados hoje. Revise-os ao menos a cada 45 dias para melhorar a confiabilidade das projeções.';
      existing = data.settings.find((s) => s.id === 'preferences');
      onSave = (values) => {
        const { categoryText, ...rest } = values;
        return save(
          module,
          {
            ...rest,
            categories: [
              ...new Set(
                categoryText
                  .split('\n')
                  .map((c) => c.trim())
                  .filter(Boolean),
              ),
            ],
            updatedDate: today(),
          },
          existing,
          'preferences',
        );
      };
    }
    const initial = { ...(existing ? stripMeta(existing) : {}), ...overrides };
    for (const f of fields) {
      if (f.money && typeof initial[f.name] === 'number')
        initial[f.name] = (initial[f.name] / 100).toFixed(2).replace('.', ',');
      else if (f.number && initial[f.name] !== undefined) initial[f.name] = String(initial[f.name]);
    }
    setForm({
      title,
      fields,
      initial,
      note,
      onSave: onSave || ((values) => save(module, values, existing, requestId)),
    });
  };
  const confirm = (title, text, onConfirm) => setConfirmation({ title, text, onConfirm });
  const remove = (module, item) => {
    if (
      module === 'accounts' &&
      (data.transactions.some((t) => t.accountId === item.id || t.destinationId === item.id) ||
        data.funds.some((f) => f.accountId === item.id) ||
        data.goals.some((g) => g.accountId === item.id) ||
        data.cards.some((c) => c.accountId === item.id))
    ) {
      setError('Esta conta possui vínculos. Remova ou transfira os vínculos antes de excluir.');
      return;
    }
    if (module === 'cards' && data.transactions.some((t) => t.cardId === item.id)) {
      setError('O cartão possui lançamentos. Desative-o na edição para preservar o histórico.');
      return;
    }
    const items =
      module === 'transactions' && item.installments > 1
        ? data.transactions.filter((t) => t.groupId === item.groupId)
        : [item];
    confirm(
      'Excluir registro?',
      items.length > 1
        ? `Todas as ${items.length} parcelas desta compra serão excluídas. O saldo será recalculado.`
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
      {form && <RecordForm key={form.title} {...form} onClose={() => setForm(null)} />}{' '}
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
