import { collections, defaultSettings } from '../../constants/catalog';
import { today, shiftMonth, dayInMonth } from '../../utils/dates';
// Dados exclusivamente fictícios, criados somente após entrada explícita no modo demonstração.
export function demoData() {
  const now = today(),
    month = now.slice(0, 7);
  const base = (id) => ({ id, ownerUid: 'demo', schemaVersion: 1, revision: 1 });
  const accounts = [
    {
      ...base('checking'),
      name: 'Conta do dia a dia',
      institution: 'Banco demonstrativo',
      kind: 'checking',
      initialCents: 634000,
      referenceDate: month + '-01',
      purpose: 'Uso pessoal',
      spendable: true,
      includeInWealth: true,
    },
    {
      ...base('reserve'),
      name: 'Reserva de segurança',
      institution: 'Banco demonstrativo',
      kind: 'reserve',
      initialCents: 1800000,
      referenceDate: month + '-01',
      purpose: 'Emergências',
      spendable: false,
      includeInWealth: true,
    },
    {
      ...base('investment'),
      name: 'Carteira de longo prazo',
      institution: 'Corretora demonstrativa',
      kind: 'investment',
      initialCents: 1250000,
      referenceDate: month + '-01',
      purpose: 'Patrimônio',
      spendable: false,
      includeInWealth: true,
    },
  ];
  const tx = (id, description, amountCents, category, type, date, status = 'confirmed') => ({
    ...base(id),
    description,
    amountCents,
    category,
    type,
    date,
    competence: date.slice(0, 7),
    dueDate: date,
    status,
    accountId: 'checking',
    destinationId: '',
    cardId: '',
    groupId: '',
    installment: 1,
    installments: 1,
    tags: '',
    notes: '',
    recurrence: false,
  });
  const transactions = [
    tx('salary', 'Salário · exemplo', 720000, 'Outros', 'income', month + '-01'),
    tx('rent', 'Aluguel · exemplo', 185000, 'Moradia', 'expense', month + '-05'),
    tx('market', 'Supermercado · exemplo', 64780, 'Alimentação', 'expense', month + '-07'),
    tx('transport', 'Mobilidade · exemplo', 23600, 'Transporte', 'expense', month + '-09'),
    tx('leisure', 'Fim de semana · exemplo', 31200, 'Lazer', 'expense', month + '-10'),
    tx('health', 'Plano de saúde · exemplo', 42000, 'Saúde', 'expense', month + '-12'),
    tx(
      'future',
      'Internet · previsão fictícia',
      12990,
      'Moradia',
      'expense',
      dayInMonth(shiftMonth(month, 1), 2),
      'planned',
    ),
  ];
  accounts.push({
    ...base('travel'),
    name: 'Caixinha da viagem',
    institution: 'Banco demonstrativo',
    kind: 'reserve',
    initialCents: 620000,
    referenceDate: month + '-01',
    purpose: 'Viagem',
    spendable: false,
    includeInWealth: true,
  });
  const goals = [
    {
      ...base('trip'),
      name: 'Próxima viagem',
      targetCents: 1800000,
      savedCents: 620000,
      monthlyCents: 80000,
      deadline: dayInMonth(shiftMonth(month, 15), 1),
      priority: 'medium',
      description: 'Objetivo fictício',
      accountId: 'travel',
    },
  ];
  return {
    ...Object.fromEntries(collections.map((c) => [c, []])),
    accounts,
    transactions,
    goals,
    funds: [
      {
        ...base('emergency'),
        name: 'Reserva de emergência',
        purpose: 'emergency',
        accountId: 'reserve',
        allocatedCents: 1800000,
        targetCents: 2400000,
        monthlyCents: 100000,
      },
    ],
    settings: [
      {
        ...base('preferences'),
        ...defaultSettings,
        name: 'Visitante',
        essentialCents: 400000,
        updatedDate: now,
      },
    ],
    cards: [
      {
        ...base('card'),
        name: 'Cartão principal',
        institution: 'Banco demonstrativo',
        limitCents: 1000000,
        closingDay: 25,
        dueDay: 5,
        accountId: 'checking',
        active: true,
      },
    ],
    budgets: [
      { ...base('food'), month, category: 'Alimentação', limitCents: 90000 },
      { ...base('fun'), month, category: 'Lazer', limitCents: 40000 },
    ],
  };
}
