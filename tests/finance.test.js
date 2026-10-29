import { describe, it, expect } from 'vitest';
import { cents, splitCents } from '../src/utils/money';
import { invoiceDates, nextSalary, periodRange } from '../src/utils/dates';
import {
  balance,
  invoices,
  overview,
  expenseValue,
  alerts,
} from '../src/features/financial-health/engine';
import { goalPlan, futureValue, amortization } from '../src/features/goals/calculations';
import { transactionOperations } from '../src/features/transactions/operations';
import { defaultSettings } from '../src/constants/catalog';
const account = {
  id: 'a',
  initialCents: 100000,
  referenceDate: '2026-01-01',
  spendable: true,
  includeInWealth: true,
};
const tx = (type, amountCents, extra = {}) => ({
  id: crypto.randomUUID(),
  type,
  amountCents,
  accountId: 'a',
  destinationId: '',
  cardId: '',
  date: '2026-01-05',
  competence: '2026-01',
  dueDate: '2026-02-05',
  status: 'confirmed',
  ...extra,
});
const data = (extra = {}) => ({
  accounts: [account],
  transactions: [],
  cards: [],
  funds: [],
  goals: [],
  settings: [{ id: 'preferences', ...defaultSettings, updatedDate: '2026-01-10' }],
  budgets: [],
  closures: [],
  alertStates: [],
  ...extra,
});
const range = { start: '2026-01-01', end: '2026-01-31' };
describe('Precisão e centavos', () => {
  it('interpreta BRL e decimais sem perder centavos', () => {
    expect(cents('R$ 1.234,56')).toBe(123456);
    expect(cents('0.29')).toBe(29);
    expect(cents('-10,01')).toBe(-1001);
  });
  it('rejeita entradas ambíguas e casas excedentes', () => {
    expect(() => cents('1.234')).toThrow();
    expect(() => cents('x')).toThrow();
  });
  it('distribui o resíduo de parcelamento conservando o total', () => {
    expect(splitCents(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(() => splitCents(10, 20)).toThrow();
  });
});
describe('Datas e ciclos', () => {
  it('limita dias ao fim de fevereiro', () => {
    expect(nextSalary('2024-02-01', 31)).toBe('2024-02-29');
  });
  it('salário de hoje já pertence ao ciclo atual', () =>
    expect(nextSalary('2026-01-25', 25)).toBe('2026-02-25'));
  it('calcula o ciclo com dia 31 em mês curto', () =>
    expect(periodRange('2026-02', 'cycle', 31)).toEqual({
      start: '2026-02-28',
      end: '2026-03-30',
    }));
  it('leva compra no fechamento para a fatura seguinte', () =>
    expect(invoiceDates('2026-01-25', 25, 5)).toMatchObject({
      competence: '2026-02',
      dueDate: '2026-03-05',
    }));
  it('compra antes do fechamento tem vencimento no mês seguinte', () =>
    expect(invoiceDates('2026-01-24', 25, 5)).toMatchObject({
      competence: '2026-01',
      dueDate: '2026-02-05',
    }));
  it('parcelas atravessam anos sem virar recorrência', () =>
    expect(invoiceDates('2026-12-01', 25, 5, 2)).toMatchObject({
      competence: '2027-02',
      dueDate: '2027-03-05',
    }));
});
describe('Razão financeiro', () => {
  it('calcula saldo com data de referência e status', () => {
    expect(
      balance(account, [
        tx('income', 100),
        tx('expense', 50),
        tx('expense', 999, { status: 'planned' }),
        tx('income', 999, { date: '2025-12-31' }),
      ]),
    ).toBe(100050);
  });
  it('transferência conserva patrimônio e não produz receita ou despesa', () => {
    const transfer = tx('transfer', 25000, { destinationId: 'b' }),
      other = { ...account, id: 'b', initialCents: 0 };
    expect(balance(account, [transfer]) + balance(other, [transfer])).toBe(100000);
    expect(expenseValue(transfer)).toBe(0);
  });
  it('pagamento reduz caixa e obrigação sem duplicar despesa', () => {
    const purchase = tx('card_purchase', 30000, { cardId: 'c' }),
      payment = tx('card_payment', 10000, { cardId: 'c' });
    expect(balance(account, [purchase, payment])).toBe(90000);
    expect(invoices([purchase, payment])[0].outstandingCents).toBe(20000);
    const result = overview(data({ transactions: [purchase, payment] }), range, '2026-01-10');
    expect(result.expenses).toBe(30000);
    expect(result.wealth).toBe(70000);
  });
  it('estorno reduz despesa e obrigação, não credita caixa', () => {
    const a = tx('card_purchase', 5000, { cardId: 'c' }),
      r = tx('refund', 1000, { cardId: 'c' });
    expect(invoices([a, r])[0].outstandingCents).toBe(4000);
    expect(balance(account, [a, r])).toBe(100000);
    expect(expenseValue(r)).toBe(-1000);
  });
  it('preserva competências diferentes nas faturas', () =>
    expect(
      invoices([
        tx('card_purchase', 3000, { cardId: 'c' }),
        tx('card_purchase', 3000, { cardId: 'c', competence: '2026-02' }),
      ]),
    ).toHaveLength(2));
  it('reserva e objetivos protegem o saldo sem aumentar ativos', () => {
    const result = overview(
      data({
        funds: [{ accountId: 'a', allocatedCents: 20000, purpose: 'emergency' }],
        goals: [{ accountId: 'a', savedCents: 10000 }],
      }),
      range,
      '2026-01-10',
    );
    expect(result.free).toBe(70000);
    expect(result.wealth).toBe(100000);
  });
  it('não soma reservas além do saldo real da conta', () => {
    const result = overview(
      data({
        funds: [
          { accountId: 'a', allocatedCents: 80000, purpose: 'emergency' },
          { accountId: 'a', allocatedCents: 80000, purpose: 'emergency' },
        ],
      }),
      range,
      '2026-01-10',
    );
    expect(result.reserve).toBe(100000);
    expect(result.free).toBe(0);
  });
  it('conta vinculada não é dinheiro de consumo', () =>
    expect(
      overview(data({ accounts: [{ ...account, spendable: false }] }), range, '2026-01-10').free,
    ).toBe(0));
  it('não antecipa renda prevista na projeção', () => {
    expect(
      overview(
        data({
          transactions: [
            tx('income', 500000, { status: 'planned', date: '2026-01-20' }),
            tx('expense', 20000, { status: 'planned', date: '2026-01-20' }),
          ],
        }),
        range,
        '2026-01-10',
      ).available,
    ).toBe(80000);
  });
  it('transferência prevista entre duas contas livres não reduz o disponível', () =>
    expect(
      overview(
        data({
          accounts: [account, { ...account, id: 'b', initialCents: 0 }],
          transactions: [tx('transfer', 5000, { status: 'planned', destinationId: 'b' })],
        }),
        range,
        '2026-01-10',
      ).obligations,
    ).toBe(0));
  it('saúde permanece insuficiente com dados desatualizados', () =>
    expect(
      overview(
        data({
          transactions: [tx('income', 50000)],
          settings: [
            {
              id: 'preferences',
              ...defaultSettings,
              essentialCents: 20000,
              updatedDate: '2025-10-01',
            },
          ],
        }),
        range,
        '2026-01-10',
      ).health.state,
    ).toBe('Dados insuficientes'));
  it('explica risco com projeção negativa', () => {
    const result = overview(
      data({
        transactions: [tx('income', 10000), tx('expense', 200000, { status: 'planned' })],
        settings: [
          {
            id: 'preferences',
            ...defaultSettings,
            essentialCents: 20000,
            updatedDate: '2026-01-10',
          },
        ],
      }),
      range,
      '2026-01-10',
    );
    expect(result.health.state).toBe('Risco elevado');
    expect(result.health.reasons.length).toBeGreaterThan(0);
    expect(alerts(data(), result, '2026-01-10').some((a) => a.id === 'projection')).toBe(true);
  });
});
describe('Planejamento e operações', () => {
  it('editar uma ocorrência recorrente atualiza somente aquele documento', () => {
    const existing = {
      ...tx('expense', 1000),
      description: 'Internet',
      category: 'Moradia',
      recurrence: true,
      installment: 1,
      installments: 1,
      groupId: 'series',
      revision: 1,
    };
    const ops = transactionOperations({ ...existing, repeatCount: 6 }, data(), existing);
    expect(ops).toHaveLength(1);
    expect(ops[0].id).toBe(existing.id);
    expect(ops[0].data.date).toBe(existing.date);
  });
  it('repetir o mesmo envio mantém os IDs das parcelas', () => {
    const values = {
      ...tx('card_purchase', 10000, { cardId: 'c' }),
      description: 'Compra',
      category: 'Outros',
      count: 3,
    };
    const sample = data({ cards: [{ id: 'c', closingDay: 25, dueDay: 5 }] });
    expect(transactionOperations(values, sample, null, 'request-123').map((o) => o.id)).toEqual(
      transactionOperations(values, sample, null, 'request-123').map((o) => o.id),
    );
  });
  it('não paga valor superior ao saldo da fatura', () => {
    const sample = data({
      cards: [{ id: 'c', closingDay: 25, dueDay: 5 }],
      transactions: [tx('card_purchase', 1000, { cardId: 'c' })],
    });
    expect(() => transactionOperations(tx('card_payment', 1001, { cardId: 'c' }), sample)).toThrow(
      'supera',
    );
  });
  it('calcula aporte sem rendimento', () =>
    expect(goalPlan(1200000, 200000, 20).monthly).toBe(50000));
  it('mantém simulação de acumulação em centavos', () =>
    expect(futureValue(10000, 1000, 12, 0)).toBe(22000));
  it('recusa amortização que não cobre juros', () =>
    expect(amortization(100000, 1000, 0.02).possible).toBe(false));
  it('extra reduz prazo e juros', () => {
    const a = amortization(100000, 10000, 0.01),
      b = amortization(100000, 10000, 0.01, 5000);
    expect(b.months).toBeLessThan(a.months);
    expect(b.interest).toBeLessThan(a.interest);
  });
  it('gera somente o número contratado de parcelas', () => {
    const operations = transactionOperations(
      {
        ...tx('card_purchase', 10000, { cardId: 'c' }),
        description: 'Teste',
        category: 'Outros',
        count: 3,
        tags: '',
        notes: '',
        recurrence: false,
      },
      data({ cards: [{ id: 'c', closingDay: 25, dueDay: 5 }] }),
    );
    expect(operations).toHaveLength(3);
    expect(operations.reduce((n, o) => n + o.data.amountCents, 0)).toBe(10000);
  });
  it('recorrências futuras são previsões', () => {
    const ops = transactionOperations(
      {
        ...tx('expense', 1000),
        description: 'Internet',
        category: 'Moradia',
        recurrence: true,
        repeatCount: 3,
      },
      data(),
    );
    expect(ops.map((o) => o.data.status)).toEqual(['confirmed', 'planned', 'planned']);
    expect(new Set(ops.map((o) => o.id)).size).toBe(3);
  });
  it('bloqueia alterações em meses fechados', () =>
    expect(() =>
      transactionOperations(
        { ...tx('expense', 1000) },
        data({ closures: [{ month: '2026-01', closed: true }] }),
      ),
    ).toThrow('Reabra'));
});
