import { z } from 'zod';
const text = (max = 200) => z.string().max(max),
  cash = z.number().int().min(0).max(100000000000),
  signedCash = z.number().int().min(-100000000000).max(100000000000),
  date = z.iso.date(),
  month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  id = text(128),
  base = { ownerUid: id, schemaVersion: z.literal(1), revision: z.number().int().positive() };
export const models = {
  accounts: z
    .object({
      ...base,
      name: text(100).min(1),
      institution: text(100),
      kind: z.enum(['checking', 'payment', 'cash', 'reserve', 'investment', 'linked']),
      initialCents: signedCash,
      referenceDate: date,
      purpose: text(),
      spendable: z.boolean(),
      includeInWealth: z.boolean(),
    })
    .strict(),
  transactions: z
    .object({
      ...base,
      description: text().min(1),
      amountCents: signedCash.refine((v) => v !== 0),
      category: text(100),
      type: z.enum([
        'income',
        'expense',
        'transfer',
        'card_purchase',
        'card_payment',
        'refund',
        'adjustment',
      ]),
      date,
      competence: month,
      dueDate: date,
      status: z.enum(['confirmed', 'planned']),
      accountId: id,
      destinationId: id,
      cardId: id,
      groupId: id,
      installment: z.number().int().min(1).max(120),
      installments: z.number().int().min(1).max(120),
      tags: text(),
      notes: text(1000),
      recurrence: z.boolean(),
    })
    .strict()
    .refine((v) => v.amountCents > 0 || v.type === 'adjustment')
    .refine((v) => v.installment <= v.installments),
  cards: z
    .object({
      ...base,
      name: text(100),
      institution: text(100),
      limitCents: cash,
      closingDay: z.number().int().min(1).max(31),
      dueDay: z.number().int().min(1).max(31),
      accountId: id,
      active: z.boolean(),
    })
    .strict(),
  budgets: z.object({ ...base, month, category: text(100), limitCents: cash }).strict(),
  funds: z
    .object({
      ...base,
      name: text(100),
      purpose: z.enum(['emergency', 'other']),
      accountId: id,
      allocatedCents: cash,
      targetCents: cash,
      monthlyCents: cash,
    })
    .strict(),
  goals: z
    .object({
      ...base,
      name: text(100),
      targetCents: cash.positive(),
      savedCents: cash,
      monthlyCents: cash,
      deadline: date,
      priority: z.enum(['high', 'medium', 'low']),
      description: text(500),
      accountId: id,
    })
    .strict(),
  settings: z
    .object({
      ...base,
      name: text(100),
      salaryDay: z.number().int().min(1).max(31),
      essentialCents: cash,
      reserveMonths: z.number().int().min(1).max(36),
      safetyCents: cash,
      monthlyContributionCents: cash,
      donationPercent: z.number().min(0).max(100),
      theme: z.enum(['light', 'dark', 'system']),
      categories: z.array(text(100)).max(100),
      notifications: z.boolean(),
      updatedDate: date,
    })
    .strict(),
  closures: z
    .object({
      ...base,
      month,
      closed: z.boolean(),
      incomeCents: cash,
      expenseCents: signedCash,
      events: z.array(z.object({ date, action: z.enum(['closed', 'reopened']) }).strict()).max(100),
    })
    .strict(),
  alertStates: z.object({ ...base, read: z.boolean(), snoozeUntil: date }).strict(),
};
export function validateRecord(module, data) {
  const result = models[module]?.safeParse(data);
  if (!result?.success)
    throw new Error(
      'Dados inválidos: ' +
        (result?.error?.issues
          ?.map((i) => i.path.join('.') + ': ' + i.message)
          .slice(0, 2)
          .join('; ') || 'módulo desconhecido'),
    );
  return result.data;
}
