import { useState, useMemo } from 'react';
import { Calculator, ArrowUpRight } from 'lucide-react';
import { Panel, SectionIntro, Stat } from '../../components/ui/Primitives';
import { cents, money, splitCents } from '../../utils/money';
import { goalPlan, futureValue, amortization } from '../goals/calculations';
const modes = {
  goal: 'Objetivo / viagem',
  reserve: 'Reserva de emergência',
  investment: 'Acumulação de investimentos',
  installments: 'Compra parcelada',
  vehicle: 'Compra de veículo',
  debt: 'Amortização de dívida',
};
export default function Simulators() {
  const [mode, setMode] = useState('goal'),
    [values, setValues] = useState({
      initial: '2000',
      target: '12000',
      monthly: '500',
      months: '20',
      rate: '0',
      extra: '0',
      cost: '500',
      inflation: '0',
    });
  const set = (key, v) => setValues((s) => ({ ...s, [key]: v }));
  const result = useMemo(() => {
    try {
      const initial = cents(values.initial),
        target = cents(values.target),
        monthly = cents(values.monthly),
        extra = cents(values.extra),
        cost = cents(values.cost),
        months = Number(values.months),
        rate = Number(values.rate) / 100,
        inflation = Number(values.inflation) / 100;
      if (
        [initial, target, monthly, extra, cost].some((v) => v < 0) ||
        !Number.isInteger(months) ||
        months < 1 ||
        months > 600 ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        rate > 1 ||
        !Number.isFinite(inflation) ||
        inflation < 0 ||
        inflation > 1
      )
        throw new Error('Revise os valores. Use 1 a 600 meses e taxas entre 0 e 100%.');
      if (mode === 'installments') {
        const portions = splitCents(target, months);
        return {
          label: 'Primeira parcela estimada',
          value: portions[0],
          detail: `${months} parcelas · soma ${money(target)} · sem juros`,
          rows: portions.map((p, i) => `Fatura ${i + 1}: ${money(p)}`),
        };
      }
      if (mode === 'investment') {
        const nominal = futureValue(initial, monthly, months, rate);
        return {
          label: 'Acumulado hipotético',
          value: nominal,
          detail: `Em poder de compra atual: ${money(Math.round(nominal / (1 + inflation) ** months))}. Hipóteses de taxas mensais, sem impostos ou custos.`,
        };
      }
      if (mode === 'vehicle')
        return {
          label: 'Impacto inicial líquido',
          value: Math.max(0, target - initial),
          detail: `Custo mensal de manutenção informado: ${money(cost)}. Custo total em ${months} meses: ${money(Math.max(0, target - initial) + cost * months)}. Financiamento, seguro e depreciação só estão incluídos se informados no custo mensal.`,
        };
      if (mode === 'debt') {
        const normal = amortization(target, monthly, rate, 0),
          enhanced = amortization(target, monthly, rate, extra);
        return enhanced.possible
          ? {
              label: 'Prazo com amortização extra',
              value: null,
              text: enhanced.months + ' meses',
              detail: `Juros estimados: ${money(enhanced.interest)}. ${normal.possible ? `Sem extra: ${normal.months} meses, com juros de ${money(normal.interest)}.` : 'A parcela sem extra não cobre os juros iniciais.'} Sistema de saldo devedor com juros mensais, sem tarifas.`,
            }
          : { error: 'A parcela com extra não cobre os juros iniciais.' };
      }
      if (mode === 'reserve')
        return {
          label: 'Tempo estimado para a reserva',
          value: null,
          text:
            target <= initial
              ? 'Meta atingida'
              : monthly > 0
                ? Math.ceil((target - initial) / monthly) + ' meses'
                : 'Defina um aporte',
          detail: `Faltam ${money(Math.max(0, target - initial))}. Sem rendimento ou inflação; meta informada por você.`,
        };
      const plan = goalPlan(target, initial, months, rate);
      return {
        label: 'Aporte mensal necessário',
        value: plan.monthly,
        detail: `Sem rendimento: ${money(goalPlan(target, initial, months, 0).monthly)} por mês. Restante: ${money(plan.remaining)}.`,
      };
    } catch (e) {
      return { error: e.message };
    }
  }, [mode, values]);
  const labels = {
    initial: mode === 'vehicle' ? 'Valor da venda / entrada (R$)' : 'Valor inicial (R$)',
    target: mode === 'debt' ? 'Saldo devedor (R$)' : 'Valor da meta / compra (R$)',
    monthly: mode === 'debt' ? 'Parcela mensal (R$)' : 'Aporte mensal (R$)',
    months: 'Prazo / parcelas (meses)',
    rate: 'Taxa mensal hipotética (%)',
    extra: 'Amortização extra mensal (R$)',
    cost: 'Custo mensal total do veículo (R$)',
    inflation: 'Inflação mensal hipotética (%)',
  };
  const keys =
    mode === 'installments'
      ? ['target', 'months']
      : mode === 'vehicle'
        ? ['target', 'initial', 'cost', 'months']
        : mode === 'debt'
          ? ['target', 'monthly', 'rate', 'extra']
          : mode === 'reserve'
            ? ['target', 'initial', 'monthly']
            : mode === 'investment'
              ? ['initial', 'monthly', 'months', 'rate', 'inflation']
              : ['target', 'initial', 'months', 'rate'];
  return (
    <>
      <SectionIntro
        eyebrow="ANTES DA DECISÃO, UMA SIMULAÇÃO"
        title="Explore as possibilidades."
        text="Mude as premissas e entenda o impacto. Todos os cálculos acontecem no seu navegador."
      />
      <div className="two-columns">
        <Panel title="Qual é o seu plano?" action={<Calculator size={21} />}>
          <label>
            Simulador
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {Object.entries(modes).map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="form-grid simulator-fields">
            {keys.map((key) => (
              <label key={key}>
                {labels[key]}
                <input
                  inputMode="decimal"
                  value={values[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </Panel>
        <Panel
          title="Um cenário para pensar"
          subtitle="Estimativa educativa · não é uma previsão garantida"
        >
          {result.error ? (
            <div className="notice warning" role="status">
              {result.error}
            </div>
          ) : (
            <>
              <Stat
                label={result.label}
                value={result.text || money(result.value)}
                detail={result.detail}
                icon={ArrowUpRight}
                tone="green"
              />
              {result.rows && (
                <div className="simulation-rows">
                  {result.rows.map((row) => (
                    <p key={row}>{row}</p>
                  ))}
                </div>
              )}
              <p className="micro">
                Os resultados não alteram seus registros. Taxas, inflação e aportes são hipóteses
                definidas por você. Impostos, riscos e custos adicionais precisam ser avaliados à
                parte.
              </p>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
