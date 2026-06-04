import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const chartColors = ['var(--color-success)', 'var(--color-danger)', '#cbd5e1'];

export default function DonutChart({ correctas, incorrectas, sinResponder }) {
  const data = [
    { name: 'Correctas', value: correctas },
    { name: 'Incorrectas', value: incorrectas },
    { name: 'Sin responder', value: sinResponder },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={3}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={chartColors[index]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
