import { splitCents } from '../../utils/money';
import { invoiceDates, dayInMonth, shiftMonth } from '../../utils/dates';
import { invoices } from '../financial-health/engine';
export const stripMeta = (item) =>
  Object.fromEntries(
    Object.entries(item).filter(
      ([key]) => !['id', 'ownerUid', 'schemaVersion', 'revision', 'balanceCents'].includes(key),
    ),
  );
export function transactionOperations(values, data, existing, requestId) {
  const { count = 1, repeatCount = 1, ...record } = values;
  const groupId = existing?.groupId || requestId || crypto.randomUUID();
  if (record.type === 'transfer' && record.accountId === record.destinationId)
    throw new Error('Escolha duas contas diferentes.');
  if (['card_purchase', 'refund', 'card_payment'].includes(record.type) && !record.cardId)
    throw new Error('Escolha um cartão.');
  if (!['card_purchase', 'refund'].includes(record.type) && !record.accountId)
    throw new Error('Escolha uma conta.');
  if (
    !['card_purchase', 'refund'].includes(record.type) &&
    !data.accounts.some((a) => a.id === record.accountId)
  )
    throw new Error('A conta selecionada não existe. Atualize os dados.');
  if (!['card_purchase', 'refund', 'card_payment'].includes(record.type) && record.cardId)
    throw new Error(
      'Para movimentar o cartão, escolha Compra no cartão, Pagamento de fatura ou Estorno.',
    );
  if (record.type === 'transfer' && !record.destinationId)
    throw new Error('Escolha a conta de destino.');
  if (record.type !== 'adjustment' && record.amountCents <= 0)
    throw new Error('O valor deve ser maior que zero.');
  if (record.amountCents === 0) throw new Error('O valor não pode ser zero.');
  if (existing && existing.installments > 1)
    throw new Error('Para preservar as parcelas, exclua a compra pelo grupo e cadastre novamente.');
  const card = data.cards.find((c) => c.id === record.cardId);
  if (['card_purchase', 'refund', 'card_payment'].includes(record.type) && !card)
    throw new Error('O cartão selecionado não existe.');
  if (record.type === 'card_purchase' && card.active === false)
    throw new Error('Este cartão está inativo.');
  if (record.type === 'card_payment') {
    const invoice = invoices(data.transactions.filter((t) => t.id !== existing?.id)).find(
      (i) =>
        i.cardId === record.cardId &&
        i.competence === (record.competence || record.date.slice(0, 7)),
    );
    if (!invoice || record.amountCents > invoice.outstandingCents)
      throw new Error(
        'O pagamento supera o saldo registrado nessa fatura. Confira a competência e as compras.',
      );
  }
  const portions =
    record.type === 'card_purchase' ? splitCents(record.amountCents, count) : [record.amountCents];
  // Editar uma ocorrência não recria a série nem move o mesmo documento para meses futuros.
  const repetitions = existing ? 1 : record.recurrence ? repeatCount : 1;
  if (portions.length > 1 && repetitions > 1)
    throw new Error('Use parcelamento ou recorrência, um por vez.');
  const operations = [];
  for (let r = 0; r < repetitions; r++)
    for (let i = 0; i < portions.length; i++) {
      const date = r
        ? dayInMonth(shiftMonth(record.date.slice(0, 7), r), Number(record.date.slice(8)))
        : record.date;
      const invoice =
        card && record.type === 'card_purchase'
          ? invoiceDates(date, card.closingDay, card.dueDay, i)
          : { competence: record.competence || date.slice(0, 7), dueDate: record.dueDate || date };
      const item = {
        ...record,
        date,
        ...invoice,
        amountCents: portions[i],
        status: r > 0 ? 'planned' : record.status,
        groupId,
        installment: i + 1,
        installments: portions.length,
      };
      delete item.closingDate;
      if (record.type === 'transfer' && !data.accounts.some((a) => a.id === item.destinationId))
        throw new Error('Conta de destino não encontrada.');
      const month = ['card_purchase', 'refund', 'card_payment'].includes(record.type)
        ? item.competence
        : item.date.slice(0, 7);
      if (data.closures.some((c) => c.month === month && c.closed))
        throw new Error('Reabra o mês antes de alterar os lançamentos.');
      operations.push({
        module: 'transactions',
        id: existing?.id || `${groupId}_${r}_${i}`,
        data: item,
        ...(existing ? { expectedRevision: existing.revision } : { createOnly: true }),
      });
    }
  return operations;
}
