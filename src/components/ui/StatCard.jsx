import { TrendingUp } from 'lucide-react';
import Card from './Card.jsx';

export default function StatCard({ icon: Icon, label, value, delta, tone = 'blue' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-brand',
    green: 'bg-emerald-50 text-success',
    orange: 'bg-orange-50 text-warning',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <Card className="min-h-[104px] p-4">
      <div className="flex items-center gap-4">
        <div className={`grid h-16 w-16 place-items-center rounded-full ${toneClasses[tone]}`}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-black text-ink">{value}</p>
          {delta ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-success">
              <TrendingUp className="h-3.5 w-3.5" /> {delta}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
