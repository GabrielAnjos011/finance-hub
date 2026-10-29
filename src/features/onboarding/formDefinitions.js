import { accountFields, amountField, goalFields, options } from '../settings/fields';
import { defaultSettings } from '../../constants/catalog';
import { today } from '../../utils/dates';
import { balance } from '../financial-health/engine';
import { money } from '../../utils/money';
import { stripMeta } from '../transactions/operations';
import { inputAmount } from '../../components/forms/fieldRules';
import {
  transactionFields,
  transactionPrerequisite,
  deriveTransaction,
  validateTransaction,
  normalizeTransaction,
} from '../transactions/transactionForm';

export function allocationIssues(data, values, existing, module) {
  const key = module === 'funds' ? 'allocatedCents' : 'savedCents',
    amount = inputAmount(values[key]);
  if (amount <= 0) return {};
  if (!values.accountId) return {};
  const account = data.accounts.find((a) => a.id === values.accountId);
  if (!account) return { accountId: 'Escolha uma conta disponível.' };
  const other = [
    ...data.funds
      .filter((f) => module !== 'funds' || f.id !== existing?.id)
      .map((f) => ({ ...f, amount: f.allocatedCents })),
    ...data.goals
      .filter((g) => module !== 'goals' || g.id !== existing?.id)
      .map((g) => ({ ...g, amount: g.savedCents })),
  ]
    .filter((item) => item.accountId === account.id)
    .reduce((n, item) => n + item.amount, 0);
  const available = Math.max(0, balance(account, data.transactions, today()) - other);
  return amount > available
    ? {
        [key]: `Há ${money(available)} nessa conta sem destino em outros planos. Registre um aporte real ou reduza o valor.`,
      }
    : {};
}
export function formDefinition(entry, data) {
  const { module, initial = {}, existing } = entry;
  const config = { ...defaultSettings, ...data.settings.find((s) => s.id === 'preferences') };
  if (!config.categories?.length) config.categories = defaultSettings.categories;
  const accountGate = {
    title: 'Escolha de onde sairá o pagamento',
    text: 'Cadastre uma conta ou carteira para pagar as faturas. Depois você continua o cadastro do cartão.',
    module: 'accounts',
    action: 'Cadastrar conta de pagamento',
    field: 'accountId',
  };
  let definition = { title: 'Novo registro', fields: [], normalize: (v) => v };
  if (module === 'accounts') {
    const used =
      existing &&
      data.transactions.some((t) => t.accountId === existing.id || t.destinationId === existing.id);
    definition = {
      title: existing ? 'Editar conta' : 'Nova conta',
      note: used
        ? 'O saldo inicial já tem movimentações. Para corrigir o saldo, registre um Ajuste de saldo em Lançamentos.'
        : 'Comece com o nome e o saldo de agora. Registre depois somente os movimentos que ainda não estão incluídos nesse saldo.',
      fields: accountFields.map((field) => ({
        ...field,
        advanced: !['name', 'initialCents'].includes(field.name),
        ...(field.name === 'initialCents'
          ? {
              label: used ? 'Saldo de referência (R$)' : 'Saldo atual (R$)',
              readOnly: Boolean(used),
              hint: used
                ? 'Saldo usado para começar o histórico. Novos movimentos já são calculados sobre ele.'
                : 'Informe o saldo antes do próximo lançamento. Use 0 apenas se a conta estiver realmente sem dinheiro.',
            }
          : {}),
        ...(field.name === 'referenceDate' ? { readOnly: Boolean(used) } : {}),
        ...(field.name === 'name'
          ? { placeholder: 'Ex.: conta do banco ou dinheiro em mãos' }
          : {}),
      })),
      normalize: (values) => {
        if (
          used &&
          (values.initialCents !== existing.initialCents ||
            values.referenceDate !== existing.referenceDate)
        )
          throw new Error('Para mudar o saldo, registre um ajuste.');
        return values;
      },
    };
  }
  if (module === 'transactions')
    definition = {
      title: existing ? 'Editar lançamento' : 'Novo lançamento',
      fields: transactionFields(data, config, existing),
      note: (values) =>
        values.type === 'transfer'
          ? 'Mover dinheiro entre suas contas não é uma nova receita ou despesa.'
          : values.type === 'card_purchase'
            ? 'Escolha o cartão e as parcelas. As faturas e os vencimentos são calculados para você.'
            : 'Registre o que aconteceu. Se ainda vai pagar ou receber, deixe como previsto.',
      prerequisite: (v) => transactionPrerequisite(data, v, existing),
      derive: (v, p) => deriveTransaction(data, v, p, existing),
      validate: (v) => validateTransaction(data, v, existing),
      normalize: (v) => normalizeTransaction(v, data, existing),
    };
  if (module === 'cards')
    definition = {
      title: existing ? 'Editar cartão' : 'Novo cartão',
      note: 'Confira fechamento e vencimento no aplicativo do banco. Esses dias organizam suas próximas faturas.',
      prerequisite: () => (!data.accounts.length ? accountGate : null),
      fields: [
        { name: 'name', label: 'Nome do cartão', placeholder: 'Ex.: cartão principal' },
        { name: 'institution', label: 'Instituição', optional: true, advanced: true },
        amountField('limitCents', 'Limite (R$)', { min: 1 }),
        {
          name: 'closingDay',
          label: 'Dia de fechamento',
          type: 'number',
          number: true,
          min: 1,
          max: 31,
          hint: 'Dia em que o banco encerra as compras da fatura.',
        },
        {
          name: 'dueDay',
          label: 'Dia de vencimento',
          type: 'number',
          number: true,
          min: 1,
          max: 31,
          hint: 'Dia limite para pagar a fatura.',
        },
        {
          name: 'accountId',
          label: 'Conta de pagamento',
          options: options(data.accounts),
          default: data.accounts.length === 1 ? data.accounts[0].id : '',
          related: { module: 'accounts', label: 'Cadastrar outra conta' },
        },
        { name: 'active', label: 'Cartão ativo', type: 'checkbox', default: true, advanced: true },
      ],
    };
  if (['goals', 'funds'].includes(module)) {
    const isFund = module === 'funds',
      valueKey = isFund ? 'allocatedCents' : 'savedCents';
    const fields = isFund
      ? [
          { name: 'name', label: 'Nome da reserva' },
          {
            name: 'purpose',
            label: 'Para que é esta reserva?',
            options: [
              { value: 'emergency', label: 'Imprevistos / emergência' },
              { value: 'other', label: 'Outro plano' },
            ],
            default: 'emergency',
          },
          amountField('targetCents', 'Quanto quer guardar (R$)', { min: 1 }),
          amountField('allocatedCents', 'Quanto já guardou (R$)', { default: '0' }),
          {
            name: 'accountId',
            label: 'Onde esse dinheiro está?',
            options: options(data.accounts),
            when: (v) => inputAmount(v.allocatedCents) > 0,
            related: { module: 'accounts', label: 'Cadastrar conta da reserva' },
          },
          amountField('monthlyCents', 'Quanto pretende guardar por mês (R$)', {
            default: '0',
            advanced: true,
          }),
        ]
      : goalFields(data.accounts).map((field) => ({
          ...field,
          advanced: ['monthlyCents', 'priority', 'description'].includes(field.name),
          ...(field.name === 'savedCents'
            ? {
                label: 'Quanto já guardou (R$)',
                hint: 'Pode começar com zero. Planejar uma meta não cria dinheiro.',
              }
            : {}),
          ...(field.name === 'accountId'
            ? {
                label: 'Onde esse dinheiro está?',
                when: (v) => inputAmount(v.savedCents) > 0,
                related: { module: 'accounts', label: 'Cadastrar conta do objetivo' },
              }
            : {}),
        }));
    definition = {
      title: isFund
        ? existing
          ? 'Editar reserva'
          : 'Nova reserva'
        : existing
          ? 'Editar objetivo'
          : 'Novo objetivo',
      fields,
      note: 'Você pode começar do zero. Quando já tiver dinheiro guardado, vincule a conta onde ele está para acompanhar o progresso sem somar o mesmo valor duas vezes.',
      prerequisite: (v) =>
        inputAmount(v[valueKey]) > 0 && !data.accounts.length
          ? {
              title: 'Vamos vincular o dinheiro que já existe',
              text: 'Cadastre a conta onde ele está guardado. A meta e os valores que você digitou ficam aqui.',
              module: 'accounts',
              action: 'Cadastrar a conta',
              field: 'accountId',
              fields: [valueKey],
            }
          : null,
      validate: (v) => allocationIssues(data, v, existing, module),
      normalize: (values) => ({
        ...values,
        accountId: values[valueKey] > 0 ? values.accountId : '',
      }),
    };
  }
  if (module === 'budgets')
    definition = {
      title: existing ? 'Editar orçamento' : 'Planejar categoria',
      note: 'Defina quanto pretende gastar na categoria. Depois os lançamentos mostram o realizado automaticamente.',
      fields: [
        { name: 'month', label: 'Mês', type: 'month', default: today().slice(0, 7) },
        { name: 'category', label: 'Categoria', options: config.categories },
        amountField('limitCents', 'Limite planejado (R$)', { min: 1 }),
      ],
      validate: (v) =>
        data.budgets.some(
          (b) => b.id !== existing?.id && b.month === v.month && b.category === v.category,
        )
          ? { category: 'Essa categoria já tem um limite neste mês. Edite o orçamento existente.' }
          : {},
    };
  if (module === 'settings')
    definition = {
      title: 'Seu planejamento',
      note: 'O dia do salário melhora a projeção. As despesas essenciais ajudam a calcular sua reserva. As outras preferências podem ficar para depois.',
      fields: [
        { name: 'name', label: 'Como podemos chamar você?', optional: true },
        {
          name: 'salaryDay',
          label: 'Dia principal do salário',
          type: 'number',
          number: true,
          min: 1,
          max: 31,
          hint: 'Se sua renda varia, informe o dia em que costuma receber.',
        },
        amountField('essentialCents', 'Despesas essenciais por mês (R$)', {
          default: '0',
          hint: 'Moradia, alimentação, transporte e outras contas que você precisa manter. Pode revisar depois.',
        }),
        {
          name: 'reserveMonths',
          label: 'Meses de proteção desejados',
          type: 'number',
          number: true,
          min: 1,
          max: 36,
          default: '6',
          advanced: true,
        },
        amountField('safetyCents', 'Margem de segurança (R$)', {
          default: '0',
          advanced: true,
          hint: 'Valor que você quer preservar antes de calcular quanto pode gastar.',
        }),
        amountField('monthlyContributionCents', 'Quanto pode guardar por mês (R$)', {
          default: '0',
          advanced: true,
        }),
        {
          name: 'donationPercent',
          label: 'Doação planejada (%)',
          type: 'number',
          number: true,
          min: 0,
          max: 100,
          default: '0',
          step: 'any',
          advanced: true,
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
          advanced: true,
        },
        {
          name: 'notifications',
          label: 'Mostrar alertas dentro do aplicativo',
          type: 'checkbox',
          default: true,
          advanced: true,
        },
        {
          name: 'categoryText',
          label: 'Categorias (uma por linha)',
          type: 'textarea',
          full: true,
          maxLength: 10000,
          default: config.categories.join('\n'),
          advanced: true,
        },
      ],
      validate: (v) =>
        v.categoryText !== undefined && !v.categoryText.trim()
          ? { categoryText: 'Mantenha ao menos uma categoria.' }
          : {},
      normalize: (values) => {
        const { categoryText, ...rest } = values;
        return {
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
        };
      },
    };
  if (module === 'closures') {
    const closure = data.closures.find((c) => c.id === initial.month);
    definition = {
      title: 'Reabrir mês',
      fields: [
        { name: 'agree', label: 'Conferi e quero permitir alterações neste mês', type: 'checkbox' },
      ],
      note: 'O histórico de fechamento será preservado. Ao terminar suas correções, você pode fechar o mês novamente em Orçamento.',
      validate: (v) => (v.agree ? {} : { agree: 'Confirme que deseja reabrir o mês.' }),
      normalize: () => ({
        ...stripMeta(closure),
        closed: false,
        events: [...closure.events, { date: today(), action: 'reopened' }],
      }),
      existing: closure,
      id: initial.month,
    };
  }
  return { ...definition, normalize: definition.normalize || ((v) => v) };
}
