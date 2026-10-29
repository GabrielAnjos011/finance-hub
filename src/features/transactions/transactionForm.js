import { transactionTypes } from '../../constants/catalog';
import { amountField, options } from '../settings/fields';
import { invoices } from '../financial-health/engine';
import { today, invoiceDates } from '../../utils/dates';
import { money } from '../../utils/money';
import { inputAmount } from '../../components/forms/fieldRules';

const cardTypes = ['card_purchase', 'card_payment', 'refund'];
const statusLabels = {
  income: ['Já recebi', 'Vou receber'],
  expense: ['Já paguei', 'Vou pagar'],
  transfer: ['Já transferi', 'Vou transferir'],
  card_purchase: ['Já fiz a compra', 'Compra planejada'],
  card_payment: ['Já paguei', 'Vou pagar'],
  refund: ['Estorno confirmado', 'Aguardando estorno'],
  adjustment: ['Confirmado', 'Previsto'],
};
export function transactionFields(data, config, existing) {
  const billing = invoices(data.transactions.filter((t) => t.id !== existing?.id));
  const accountRelated = { module: 'accounts', label: 'Cadastrar outra conta' };
  return [
    {
      name: 'type',
      label: 'O que você quer registrar?',
      options: Object.entries(transactionTypes).map(([value, label]) => ({ value, label })),
      default: 'expense',
      beforeGate: true,
    },
    amountField(
      'amountCents',
      (v) => (v.type === 'card_purchase' ? 'Valor total da compra (R$)' : 'Valor (R$)'),
      {
        min: 1,
        hint: (v) =>
          v.type === 'adjustment'
            ? 'Informe só a diferença e escolha abaixo se quer aumentar ou diminuir o saldo.'
            : undefined,
      },
    ),
    {
      name: 'adjustmentDirection',
      label: 'Como o saldo vai mudar?',
      options: [
        { value: 'increase', label: 'Aumentar o saldo' },
        { value: 'decrease', label: 'Diminuir o saldo' },
      ],
      default: 'increase',
      when: (v) => v.type === 'adjustment',
    },
    {
      name: 'description',
      label: 'Descrição',
      placeholder: 'Ex.: mercado, salário ou aluguel',
      maxLength: 200,
    },
    {
      name: 'category',
      label: 'Categoria',
      options: [
        ...new Set([...config.categories, ...(existing?.category ? [existing.category] : [])]),
      ],
      default: config.categories.includes('Outros') ? 'Outros' : config.categories[0],
      when: (v) => ['income', 'expense', 'card_purchase', 'refund'].includes(v.type),
    },
    {
      name: 'accountId',
      label: (v) =>
        v.type === 'transfer'
          ? 'De qual conta?'
          : v.type === 'income'
            ? 'Onde recebeu ou vai receber?'
            : 'Qual conta?',
      options: options(data.accounts),
      default: data.accounts.length === 1 ? data.accounts[0].id : '',
      when: (v) => !['card_purchase', 'refund'].includes(v.type),
      related: accountRelated,
    },
    {
      name: 'destinationId',
      label: 'Para qual conta?',
      options: (v) => options(data.accounts.filter((a) => a.id !== v.accountId)),
      when: (v) => v.type === 'transfer',
      related: accountRelated,
    },
    {
      name: 'cardId',
      label: 'Qual cartão?',
      options: (v) => options(data.cards.filter((c) => v.type !== 'card_purchase' || c.active)),
      default:
        data.cards.filter((c) => c.active).length === 1 ? data.cards.find((c) => c.active).id : '',
      when: (v) => cardTypes.includes(v.type),
      related: { module: 'cards', label: 'Cadastrar outro cartão' },
    },
    {
      name: 'invoiceId',
      label: 'Qual fatura?',
      options: (v) =>
        billing
          .filter(
            (i) =>
              i.cardId === v.cardId &&
              (v.type === 'refund' ? i.totalCents > 0 : i.outstandingCents > 0),
          )
          .map((i) => ({
            value: i.id,
            label: `${i.competence.split('-').reverse().join('/')} · ${money(i.outstandingCents)} em aberto`,
          })),
      when: (v) => ['card_payment', 'refund'].includes(v.type),
      hint: (v) =>
        v.type === 'card_payment'
          ? 'Pode pagar o valor completo ou uma parte. O pagamento não conta como outra despesa.'
          : 'O estorno reduz a compra registrada nessa fatura.',
    },
    {
      name: 'date',
      label: (v) => (v.type === 'card_purchase' ? 'Data da compra' : 'Data'),
      type: 'date',
      default: today(),
    },
    {
      name: 'status',
      label: 'Situação',
      options: (v) =>
        (statusLabels[v.type] || statusLabels.expense).map((label, i) => ({
          value: i ? 'planned' : 'confirmed',
          label,
        })),
      default: 'confirmed',
      hint: (v) =>
        v.date > today()
          ? 'Data futura: o valor fica previsto e só altera seu saldo após sua confirmação.'
          : undefined,
    },
    {
      name: 'count',
      label: 'Em quantas parcelas?',
      type: 'number',
      number: true,
      min: 1,
      max: 120,
      default: '1',
      when: (v) => v.type === 'card_purchase',
      hint: 'Use 1 para compra à vista. O total será dividido sem perder centavos.',
    },
    {
      name: 'recurrence',
      label: 'Repetir como previsão mensal',
      type: 'checkbox',
      advanced: true,
      when: (v) => !existing && ['income', 'expense', 'card_purchase'].includes(v.type),
    },
    {
      name: 'repeatCount',
      label: 'Quantos meses prever?',
      type: 'number',
      number: true,
      min: 1,
      max: 24,
      default: '6',
      advanced: true,
      when: (v) => !existing && v.recurrence,
      hint: 'Os próximos meses não serão marcados como pagos ou recebidos automaticamente.',
    },
    { name: 'tags', label: 'Tags', optional: true, advanced: true, maxLength: 200 },
    {
      name: 'notes',
      label: 'Observações',
      type: 'textarea',
      optional: true,
      advanced: true,
      full: true,
      maxLength: 1000,
    },
  ];
}
export function transactionPrerequisite(data, values, existing) {
  if (existing?.installments > 1)
    return {
      title: 'Esta compra tem várias parcelas',
      text: 'Para corrigir o valor ou as datas, exclua a compra pela lista de lançamentos e registre novamente. Para uma devolução, registre um estorno. Assim as parcelas mantêm a soma correta.',
    };
  if (!data.accounts.length)
    return {
      title: 'Primeiro, diga onde seu dinheiro fica',
      text: 'Cadastre uma conta ou carteira. Depois você continua este lançamento com tudo o que já preencheu.',
      module: 'accounts',
      action: 'Criar minha primeira conta',
      field: 'accountId',
    };
  if (values.type === 'transfer' && data.accounts.length < 2)
    return {
      title: 'Uma transferência precisa de duas contas',
      text: 'A conta de origem já está cadastrada. Agora adicione a conta de destino; o valor não será contado como renda ou despesa.',
      module: 'accounts',
      action: 'Cadastrar conta de destino',
      field: 'destinationId',
    };
  if (
    cardTypes.includes(values.type) &&
    !data.cards.some((c) => values.type !== 'card_purchase' || c.active)
  )
    return {
      title: 'Vamos cadastrar seu cartão',
      text: 'Informe limite, fechamento e vencimento. Não pedimos número, senha ou código de segurança.',
      module: 'cards',
      action: 'Cadastrar meu cartão',
      field: 'cardId',
    };
  const billing = invoices(data.transactions.filter((t) => t.id !== existing?.id));
  if (
    ['card_payment', 'refund'].includes(values.type) &&
    !billing.some(
      (i) =>
        (!values.cardId || i.cardId === values.cardId) &&
        (values.type === 'refund' ? i.totalCents > 0 : i.outstandingCents > 0),
    )
  )
    return {
      title:
        values.type === 'refund'
          ? 'Registre a compra antes do estorno'
          : 'Ainda não há fatura em aberto',
      text: 'Registre as compras do cartão para calcular a fatura. Se você já pagou tudo, não precisa registrar outro pagamento.',
      module: 'transactions',
      initial: { type: 'card_purchase', cardId: values.cardId || '' },
      action: 'Registrar compra',
      field: 'cardId',
      resultKey: 'cardId',
      fields: ['cardId'],
    };
  const selected = billing.find((i) => i.id === values.invoiceId);
  const card = data.cards.find((item) => item.id === values.cardId);
  const period =
    selected?.competence ||
    (values.type === 'card_purchase' && card && values.date
      ? invoiceDates(values.date, card.closingDay, card.dueDay).competence
      : values.date?.slice(0, 7));
  const originalPeriod =
    existing &&
    (cardTypes.includes(existing.type) ? existing.competence : existing.date.slice(0, 7));
  const closed = data.closures.find(
    (c) => c.closed && (c.month === originalPeriod || c.month === period),
  );
  if (closed)
    return {
      title: 'Este mês já foi conferido e fechado',
      text: `Reabra ${closed.month.split('-').reverse().join('/')} antes de mudar os lançamentos. Seu preenchimento será mantido.`,
      module: 'closures',
      initial: { month: closed.month },
      action: 'Reabrir este mês',
      fields: ['date', 'cardId', 'invoiceId'],
    };
  return null;
}
export function deriveTransaction(data, values, previous, existing) {
  const updates = {};
  if (values.date > today() && values.status !== 'planned') updates.status = 'planned';
  if (values.type === 'transfer' && values.accountId && values.accountId === values.destinationId)
    updates.destinationId = '';
  if (!values.accountId && data.accounts.length === 1) updates.accountId = data.accounts[0].id;
  if (values.cardId && ['card_payment', 'refund'].includes(values.type)) {
    const billing = invoices(data.transactions.filter((t) => t.id !== existing?.id)).filter(
      (i) =>
        i.cardId === values.cardId &&
        (values.type === 'refund' ? i.totalCents > 0 : i.outstandingCents > 0),
    );
    if (values.invoiceId && !billing.some((i) => i.id === values.invoiceId)) updates.invoiceId = '';
    if (!values.invoiceId && billing.length === 1) updates.invoiceId = billing[0].id;
    const selected = billing.find((i) => i.id === values.invoiceId);
    if (
      selected &&
      values.invoiceId !== previous.invoiceId &&
      !values.amountCents &&
      values.type === 'card_payment'
    )
      updates.amountCents = (selected.outstandingCents / 100).toFixed(2).replace('.', ',');
  }
  return updates;
}
export function validateTransaction(data, values, existing) {
  const issues = {};
  const amount = inputAmount(values.amountCents);
  if (values.amountCents && amount <= 0 && values.type !== 'adjustment')
    issues.amountCents = 'Informe um valor maior que zero.';
  if (values.amountCents && amount === 0) issues.amountCents = 'O valor não pode ser zero.';
  if (values.type === 'card_purchase' && values.recurrence && Number(values.count) > 1)
    issues.count = 'Escolha parcelamento ou repetição mensal para esta compra.';
  if (values.type === 'card_payment' && values.invoiceId) {
    const invoice = invoices(data.transactions.filter((t) => t.id !== existing?.id)).find(
      (i) => i.id === values.invoiceId,
    );
    if (invoice && amount > invoice.outstandingCents)
      issues.amountCents = `Esta fatura tem ${money(invoice.outstandingCents)} em aberto. Você pode pagar esse valor ou uma parte.`;
  }
  return issues;
}
export function normalizeTransaction(values, data, existing) {
  const { invoiceId, adjustmentDirection, ...record } = values;
  const invoice = invoices(data.transactions.filter((t) => t.id !== existing?.id)).find(
    (i) => i.id === invoiceId,
  );
  const onCard = cardTypes.includes(record.type);
  return {
    ...record,
    ...(record.type === 'adjustment'
      ? {
          amountCents: Math.abs(record.amountCents) * (adjustmentDirection === 'decrease' ? -1 : 1),
        }
      : {}),
    accountId: ['card_purchase', 'refund'].includes(record.type) ? '' : record.accountId,
    destinationId: record.type === 'transfer' ? record.destinationId : '',
    cardId: onCard ? record.cardId : '',
    category: record.category || 'Outros',
    competence: invoice?.competence || existing?.competence || record.date.slice(0, 7),
    dueDate: invoice?.dueDate || record.date,
    recurrence: Boolean(existing?.recurrence || record.recurrence),
  };
}
