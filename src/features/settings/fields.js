import { kinds } from '../../constants/catalog';
import { today } from '../../utils/dates';
export const amountField = (name, label, extra = {}) => ({
  name,
  label,
  money: true,
  placeholder: '0,00',
  min: 0,
  ...extra,
});
export const options = (items) => items.map((item) => ({ value: item.id, label: item.name }));
export const accountFields = [
  { name: 'name', label: 'Nome da conta' },
  { name: 'institution', label: 'Instituição', optional: true },
  {
    name: 'kind',
    label: 'Tipo',
    options: Object.entries(kinds).map(([value, label]) => ({ value, label })),
    default: 'checking',
  },
  amountField('initialCents', 'Saldo inicial (R$)', { min: -100000000000 }),
  { name: 'referenceDate', label: 'Data do saldo inicial', type: 'date', default: today() },
  { name: 'purpose', label: 'Finalidade / classe do ativo', optional: true },
  { name: 'spendable', label: 'Disponível para gastos', type: 'checkbox', default: true },
  { name: 'includeInWealth', label: 'Incluir no patrimônio', type: 'checkbox', default: true },
];
export const goalFields = (accounts) => [
  { name: 'name', label: 'Nome do objetivo' },
  amountField('targetCents', 'Meta (R$)', { min: 1 }),
  amountField('savedCents', 'Já destinado a este objetivo (R$)', { default: '0' }),
  amountField('monthlyCents', 'Aporte planejado mensal (R$)', { default: '0' }),
  { name: 'deadline', label: 'Prazo', type: 'date' },
  {
    name: 'priority',
    label: 'Prioridade',
    options: [
      { value: 'high', label: 'Alta' },
      { value: 'medium', label: 'Média' },
      { value: 'low', label: 'Baixa' },
    ],
    default: 'medium',
  },
  { name: 'accountId', label: 'Conta que guarda o valor', options: options(accounts) },
  {
    name: 'description',
    label: 'Descrição',
    optional: true,
    type: 'textarea',
    full: true,
    maxLength: 500,
  },
];
