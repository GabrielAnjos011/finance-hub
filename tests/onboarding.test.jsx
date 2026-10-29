import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { WorkspaceProvider, useWorkspace } from '../src/app/WorkspaceContext';
import { useFinance } from '../src/store/useFinance';
import { collections, defaultSettings } from '../src/constants/catalog';
import { demoData } from '../src/services/repositories/demoRepository';
import {
  transactionPrerequisite,
  transactionFields,
  normalizeTransaction,
  deriveTransaction,
} from '../src/features/transactions/transactionForm';
import { allocationIssues, formDefinition } from '../src/features/onboarding/formDefinitions';
import { formSchema, formValues } from '../src/components/forms/fieldRules';
import { overview } from '../src/features/financial-health/engine';
import { setupSteps } from '../src/features/onboarding/SetupGuide';
import DailyReview from '../src/features/onboarding/DailyReview';
import { today } from '../src/utils/dates';

const empty = () => Object.fromEntries(collections.map((key) => [key, []]));
const defaults = (fields) =>
  Object.fromEntries(
    fields.map((field) => [field.name, field.default ?? (field.type === 'checkbox' ? false : '')]),
  );
function Launcher({ module = 'transactions' }) {
  const { openForm } = useWorkspace();
  return <button onClick={() => openForm(module)}>Começar</button>;
}
beforeEach(() => useFinance.setState({ uid: 'demo', demo: true, busy: false, data: empty() }));
afterEach(() => {
  cleanup();
  useFinance.getState().clear();
});
describe('Primeiro uso e pré-requisitos', () => {
  it('permite trocar um cartão sem fatura sem perder o formulário', () => {
    const data = demoData();
    data.cards.push({ ...data.cards[0], id: 'empty_card', name: 'Cartão sem compras' });
    data.transactions.push({
      ...data.transactions[0],
      id: 'purchase',
      type: 'card_purchase',
      accountId: '',
      cardId: data.cards[0].id,
      amountCents: 10000,
    });
    useFinance.setState({ data });
    render(
      <WorkspaceProvider>
        <Launcher />
      </WorkspaceProvider>,
    );
    fireEvent.click(screen.getByText('Começar'));
    fireEvent.change(screen.getByLabelText('O que você quer registrar?'), {
      target: { value: 'card_payment' },
    });
    fireEvent.change(screen.getByLabelText('Qual cartão?'), { target: { value: 'empty_card' } });
    expect(screen.getByText('Ainda não há fatura em aberto')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Qual cartão?'), {
      target: { value: data.cards[0].id },
    });
    expect(screen.queryByText('Ainda não há fatura em aberto')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Qual fatura?')).toBeVisible();
  });
  it('orienta antes de pedir os dados de lançamento', () => {
    render(
      <WorkspaceProvider>
        <Launcher />
      </WorkspaceProvider>,
    );
    fireEvent.click(screen.getByText('Começar'));
    expect(screen.getByText('Primeiro, diga onde seu dinheiro fica')).toBeInTheDocument();
    expect(screen.queryByLabelText('Descrição')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });
  it('volta ao lançamento depois de criar a primeira conta', async () => {
    render(
      <WorkspaceProvider>
        <Launcher />
      </WorkspaceProvider>,
    );
    fireEvent.click(screen.getByText('Começar'));
    fireEvent.click(screen.getByRole('button', { name: 'Criar minha primeira conta' }));
    fireEvent.change(screen.getByLabelText('Nome da conta'), { target: { value: 'Carteira' } });
    fireEvent.change(screen.getByLabelText('Saldo atual (R$)'), { target: { value: '100,00' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar' }).at(-1));
    await waitFor(() => expect(useFinance.getState().data.accounts).toHaveLength(1));
    await waitFor(() => expect(screen.getByLabelText('Descrição')).toBeVisible());
    expect(screen.getByLabelText('Qual conta?').value).toBe(
      useFinance.getState().data.accounts[0].id,
    );
  });
  it('pede segunda conta para transferência e cartão para compra', () => {
    const sample = demoData();
    sample.accounts = sample.accounts.slice(0, 1);
    sample.cards = [];
    expect(transactionPrerequisite(sample, { type: 'transfer' }, null).field).toBe('destinationId');
    expect(transactionPrerequisite(sample, { type: 'card_purchase' }, null).module).toBe('cards');
  });
  it('pagamento sem fatura e mês fechado são explicados antes do preenchimento', () => {
    const sample = demoData();
    expect(
      transactionPrerequisite(sample, { type: 'card_payment', cardId: 'card' }, null).title,
    ).toBe('Ainda não há fatura em aberto');
    sample.closures = [{ month: today().slice(0, 7), closed: true }];
    expect(transactionPrerequisite(sample, { type: 'expense', date: today() }, null).module).toBe(
      'closures',
    );
  });
  it('primeiros passos acompanham o que já existe sem exigir todos os módulos', () => {
    const sample = empty();
    expect(setupSteps(sample).every((step) => !step.done)).toBe(true);
    expect(setupSteps(demoData()).every((step) => step.done)).toBe(true);
  });
  it('não apresenta projeção como configurada sem um dia de salário informado', () => {
    const sample = demoData();
    sample.settings = [];
    expect(
      overview(sample, { start: today().slice(0, 7) + '-01', end: today() }, today())
        .projectionReady,
    ).toBe(false);
  });
});
describe('Preenchimento contextual e planejamento', () => {
  it('ajuste para diminuir não exige digitar sinal negativo no teclado numérico', () => {
    const record = normalizeTransaction(
      {
        type: 'adjustment',
        amountCents: 1234,
        adjustmentDirection: 'decrease',
        accountId: 'checking',
        date: today(),
      },
      demoData(),
    );
    expect(record.amountCents).toBe(-1234);
    expect(record).not.toHaveProperty('adjustmentDirection');
  });
  it('fechamento usa a competência calculada do cartão, não só o mês da compra', () => {
    const data = demoData();
    data.closures = [{ month: '2026-10', closed: true }];
    expect(
      transactionPrerequisite(
        data,
        { type: 'card_purchase', cardId: 'card', date: '2026-10-29' },
        null,
      ),
    ).toBeNull();
  });
  it('campos de cartão ocultos não impedem despesa simples e não vazam vínculos', () => {
    const sample = demoData(),
      fields = transactionFields(sample, defaultSettings);
    const values = {
      ...defaults(fields),
      type: 'expense',
      amountCents: '12,34',
      description: 'Café',
      accountId: 'checking',
      date: today(),
      category: 'Alimentação',
      status: 'confirmed',
      cardId: 'card',
      destinationId: 'reserve',
      invoiceId: 'card_2026-10',
    };
    expect(formSchema(fields, values).safeParse(values).success).toBe(true);
    const normalized = normalizeTransaction(formValues(fields, values), sample);
    expect(normalized.cardId).toBe('');
    expect(normalized.destinationId).toBe('');
    expect(normalized.amountCents).toBe(1234);
  });
  it('datas futuras se tornam previstas sem confirmar pagamento', () =>
    expect(
      deriveTransaction(
        demoData(),
        { type: 'expense', date: '2099-01-01', status: 'confirmed' },
        {},
      ).status,
    ).toBe('planned'));
  it.each(['goals', 'funds'])(
    'permite planejar %s sem conta quando o valor guardado é zero',
    (module) => {
      const sample = empty(),
        definition = formDefinition({ module }, sample),
        fields = definition.fields,
        values = {
          ...defaults(fields),
          name: 'Plano',
          targetCents: '1000,00',
          savedCents: '0',
          allocatedCents: '0',
          deadline: '2099-01-01',
          priority: 'medium',
          description: '',
          monthlyCents: '0',
        };
      expect(definition.prerequisite(values)).toBeNull();
      expect(definition.validate(values)).toEqual({});
      expect(definition.normalize(formValues(fields, values)).accountId).toBe('');
    },
  );
  it('dinheiro já guardado exige conta e respeita destinações existentes', () => {
    const sample = empty(),
      definition = formDefinition({ module: 'goals' }, sample);
    expect(definition.prerequisite({ savedCents: '10,00' }).module).toBe('accounts');
    const filled = demoData();
    expect(
      allocationIssues(filled, { accountId: 'reserve', savedCents: '1,00' }, null, 'goals')
        .savedCents,
    ).toMatch(/sem destino/);
  });
  it('valida moeda e categorias existentes antes de gravar', () => {
    const fields = [
      { name: 'value', money: true, min: 1 },
      { name: 'category', options: ['Outros'] },
    ];
    expect(
      formSchema(fields, { value: '1,234', category: 'Outros' }).safeParse({
        value: '1,234',
        category: 'Outros',
      }).success,
    ).toBe(false);
    expect(
      formSchema(fields, { value: '10,00', category: 'Inexistente' }).safeParse({
        value: '10,00',
        category: 'Inexistente',
      }).success,
    ).toBe(false);
  });
  it('revisão diária não cria despesas nem confirma contas', async () => {
    render(
      <WorkspaceProvider>
        <DailyReview />
      </WorkspaceProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revisei meu dia' }));
    await waitFor(() => expect(useFinance.getState().data.alertStates).toHaveLength(1));
    expect(useFinance.getState().data.transactions).toHaveLength(0);
    expect(screen.getByText('Você revisou seu dia.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer revisão' }));
    await waitFor(() => expect(useFinance.getState().data.alertStates[0].read).toBe(false));
  });
});
