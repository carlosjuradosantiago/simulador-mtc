import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { weeklyProgress } from '../../data/mockResults.js';

const chartColors = {
  brand: 'var(--color-brand)',
  grid: 'var(--color-line)',
  text: 'var(--color-slate-500)',
};

export default function ProgressChart() {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={weeklyProgress} margin={{ top: 16, right: 20, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.brand} stopOpacity={0.22} />
            <stop offset="95%" stopColor={chartColors.brand} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={chartColors.grid} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="week" tick={{ fill: chartColors.text, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: chartColors.text, fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
        <Tooltip formatter={(value) => [`${value}%`, 'Promedio']} />
        <Area type="monotone" dataKey="score" stroke={chartColors.brand} strokeWidth={3} fill="url(#progressFill)" dot={{ r: 4, fill: chartColors.brand }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
