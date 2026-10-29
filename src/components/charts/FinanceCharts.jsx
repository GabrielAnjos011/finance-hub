import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { money, sum } from '../../utils/money';
import { expenseValue, recognizedDate } from '../../features/financial-health/engine';
import { shiftMonth } from '../../utils/dates';
const colors = ['#236c55', '#a6bd79', '#d7a461', '#7c9da9', '#a895b7', '#cccebc'];
export function FlowChart({ transactions, month }) {
  const data = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(month, i - 5);
    const tx = transactions.filter(
      (t) => t.status === 'confirmed' && recognizedDate(t).startsWith(m),
    );
    return {
      name: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(new Date(m + '-15T12:00:00'))
        .replace('.', ''),
      receitas: sum(tx.filter((t) => t.type === 'income').map((t) => t.amountCents)),
      despesas: sum(tx.map(expenseValue)),
    };
  });
  return (
    <div
      className="chart"
      role="img"
      aria-label="Receitas e despesas confirmadas dos últimos seis meses"
    >
      <ResponsiveContainer width="100%" height={235}>
        <AreaChart data={data} margin={{ top: 15, left: 0, right: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#286c56" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#286c56" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            width={58}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickFormatter={(v) => (v / 100000).toLocaleString('pt-BR') + ' mil'}
          />
          <Tooltip
            formatter={(value) => money(value)}
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
            }}
          />
          <Area
            isAnimationActive={false}
            name="Receitas"
            type="monotone"
            dataKey="receitas"
            stroke="#286c56"
            strokeWidth={2.5}
            fill="url(#incomeFill)"
          />
          <Area
            name="Despesas"
            isAnimationActive={false}
            type="monotone"
            dataKey="despesas"
            stroke="#c5a275"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function SpendingChart({ data }) {
  const total = sum(data.map((d) => d.value));
  return (
    <div className="spending-chart">
      <div className="donut" role="img" aria-label="Distribuição das despesas por categoria">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              isAnimationActive={false}
              data={data}
              innerRadius={66}
              outerRadius={87}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => money(v)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <small>Total de gastos</small>
          <strong>{money(total)}</strong>
        </div>
      </div>
      <div className="legend-list">
        {data.slice(0, 5).map((d, i) => (
          <div key={d.name}>
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {d.name}
            </span>
            <strong>{Math.round((d.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
