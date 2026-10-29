import { sum } from '../../utils/money';
import { nextSalary, daysBetween } from '../../utils/dates';
export function balance(account, transactions, at = '9999-12-31') {
  return (
    account.initialCents +
    sum(
      transactions
        .filter((t) => t.status === 'confirmed' && t.date <= at && t.date >= account.referenceDate)
        .map((t) => {
          if (t.type === 'transfer')
            return (
              (t.destinationId === account.id ? t.amountCents : 0) -
              (t.accountId === account.id ? t.amountCents : 0)
            );
          if (t.accountId !== account.id) return 0;
          if (['income', 'adjustment'].includes(t.type)) return t.amountCents;
          if (['expense', 'card_payment'].includes(t.type)) return -t.amountCents;
          return 0;
        }),
    )
  );
}
export const recognizedDate = (t) =>
  ['card_purchase', 'refund'].includes(t.type) ? t.competence + '-01' : t.date;
export const expenseValue = (t) =>
  t.type === 'expense' || t.type === 'card_purchase'
    ? t.amountCents
    : t.type === 'refund'
      ? -t.amountCents
      : 0;
export function invoices(transactions) {
  const groups = {};
  for (const t of transactions) {
    if (t.status !== 'confirmed' || !t.cardId) continue;
    if (!['card_purchase', 'refund', 'card_payment'].includes(t.type)) continue;
    const key = t.cardId + '_' + t.competence;
    groups[key] ??= {
      id: key,
      cardId: t.cardId,
      competence: t.competence,
      dueDate: t.dueDate,
      totalCents: 0,
      paidCents: 0,
    };
    const g = groups[key];
    if (t.type === 'card_payment') g.paidCents += t.amountCents;
    else g.totalCents += expenseValue(t);
  }
  return Object.values(groups)
    .map((g) => ({ ...g, outstandingCents: Math.max(0, g.totalCents - g.paidCents) }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
export function overview(data, range, at) {
  const { accounts = [], transactions = [], funds = [], settings = [] } = data;
  const config = settings.find((s) => s.id === 'preferences') || {};
  const items = transactions.filter(
    (t) =>
      t.status === 'confirmed' &&
      recognizedDate(t) >= range.start &&
      recognizedDate(t) <= range.end,
  );
  const income = sum(items.filter((t) => t.type === 'income').map((t) => t.amountCents));
  const expenses = sum(items.map(expenseValue));
  const accountBalances = accounts.map((a) => ({
    ...a,
    balanceCents: balance(a, transactions, at),
  }));
  const bank = sum(accountBalances.map((a) => a.balanceCents));
  const cardInvoices = invoices(transactions);
  const liability = sum(cardInvoices.map((i) => i.outstandingCents));
  const free = sum(
    accountBalances
      .filter((a) => a.spendable)
      .map(
        (a) =>
          a.balanceCents -
          Math.min(
            Math.max(a.balanceCents, 0),
            sum(funds.filter((f) => f.accountId === a.id).map((f) => f.allocatedCents)) +
              sum((data.goals || []).filter((g) => g.accountId === a.id).map((g) => g.savedCents)),
          ),
      ),
  );
  const salary = nextSalary(at, config.salaryDay || 25);
  const future = transactions.filter(
    (t) => t.status === 'planned' && t.date <= salary && ['expense', 'transfer'].includes(t.type),
  );
  const obligations =
    sum(
      future
        .filter(
          (t) =>
            accounts.some((a) => a.id === t.accountId && a.spendable) &&
            (t.type !== 'transfer' ||
              !accounts.some((a) => a.id === t.destinationId && a.spendable)),
        )
        .map((t) => t.amountCents),
    ) + sum(cardInvoices.filter((i) => i.dueDate <= salary).map((i) => i.outstandingCents));
  const available = free - obligations - (config.safetyCents || 0);
  const reserve = sum(
    accountBalances.map((a) =>
      Math.max(
        0,
        Math.min(
          a.balanceCents,
          sum(
            funds
              .filter((f) => f.accountId === a.id && f.purpose === 'emergency')
              .map((f) => f.allocatedCents),
          ),
        ),
      ),
    ),
  );
  const reasons = [];
  let state = 'Dados insuficientes';
  let confidence = 'baixa';
  const stale = !config.updatedDate || daysBetween(config.updatedDate, at) > 45;
  if (accounts.length && config.essentialCents > 0 && income > 0 && !stale) {
    confidence = 'moderada';
    state = 'Saudável';
    if (available < 0 || expenses > income) {
      state = 'Risco elevado';
      reasons.push(
        available < 0
          ? 'Os compromissos previstos superam o dinheiro livre.'
          : 'As despesas do período superam as receitas.',
      );
    }
    if (reserve < config.essentialCents * (config.reserveMonths || 6)) {
      if (state === 'Saudável') state = 'Atenção';
      reasons.push('A reserva está abaixo da meta que você definiu.');
    }
    if (expenses > income * 0.85) {
      if (state === 'Saudável') state = 'Atenção';
      reasons.push('Mais de 85% da renda do período está comprometida (critério educativo).');
    }
    if (!reasons.length)
      reasons.push('O período tem saldo positivo, projeção não negativa e reserva dentro da meta.');
  } else
    reasons.push(
      'Informe contas, renda confirmada e despesas essenciais; confirme os dados a cada 45 dias.',
    );
  return {
    income,
    expenses,
    monthly: income - expenses,
    bank,
    free,
    liability,
    wealth:
      sum(accountBalances.filter((a) => a.includeInWealth).map((a) => a.balanceCents)) - liability,
    obligations,
    available,
    reserve,
    salary,
    days: Math.max(1, daysBetween(at, salary)),
    accountBalances,
    invoices: cardInvoices,
    health: { state, confidence, reasons },
    config,
  };
}
export function alerts(data, summary, at) {
  const results = [];
  for (const i of summary.invoices.filter(
    (i) => i.outstandingCents > 0 && daysBetween(at, i.dueDate) <= 7,
  ))
    results.push({
      id: 'invoice_' + i.id,
      severity: 'critical',
      title: i.dueDate < at ? 'Fatura em atraso' : 'Fatura próxima do vencimento',
      detail: 'Confira a fatura e programe o pagamento.',
      amountCents: i.outstandingCents,
    });
  for (const t of data.transactions.filter(
    (t) => t.status === 'planned' && t.type === 'expense' && daysBetween(at, t.date) <= 7,
  ))
    results.push({
      id: 'due_' + t.id,
      severity: t.date < at ? 'critical' : 'warning',
      title: t.description,
      detail:
        t.date < at ? 'Pagamento previsto em atraso.' : 'Pagamento previsto para os próximos dias.',
      amountCents: t.amountCents,
    });
  if (summary.available < 0)
    results.push({
      id: 'projection',
      severity: 'critical',
      title: 'Sua projeção precisa de atenção',
      detail: 'Revise os compromissos anteriores ao próximo salário.',
    });
  if (
    summary.config.essentialCents &&
    summary.reserve < summary.config.essentialCents * summary.config.reserveMonths
  )
    results.push({
      id: 'reserve',
      severity: 'warning',
      title: 'Reforce sua reserva',
      detail: 'A proteção atual está abaixo da meta escolhida.',
    });
  for (const b of data.budgets) {
    const spent = sum(
      data.transactions
        .filter(
          (t) =>
            t.status === 'confirmed' &&
            recognizedDate(t).startsWith(b.month) &&
            t.category === b.category,
        )
        .map(expenseValue),
    );
    if (spent > b.limitCents)
      results.push({
        id: 'budget_' + b.id,
        severity: 'warning',
        title: b.category + ' acima do orçamento',
        detail: 'Reavalie o limite e as despesas dessa categoria.',
      });
  }
  return results;
}
export function categoryTotals(transactions, range) {
  const groups = {};
  for (const t of transactions.filter(
    (t) =>
      t.status === 'confirmed' &&
      recognizedDate(t) >= range.start &&
      recognizedDate(t) <= range.end,
  )) {
    const value = expenseValue(t);
    if (value) groups[t.category] = (groups[t.category] || 0) + value;
  }
  return Object.entries(groups)
    .map(([name, value]) => ({ name, value }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value);
}
