import { BarChart3, BookOpenCheck, Clock, FileText, Star } from 'lucide-react';
import BrandLogo from '../layout/BrandLogo.jsx';
import RoadScene from './RoadScene.jsx';

const stats = [
  { label: 'Simulacros rendidos', value: '18', icon: BookOpenCheck, color: 'text-success bg-emerald-50' },
  { label: 'Promedio', value: '76%', icon: Star, color: 'text-warning bg-orange-50' },
  { label: 'Preguntas correctas', value: '642', icon: FileText, color: 'text-brand bg-blue-50' },
  { label: 'Tiempo de estudio', value: '12h 45m', icon: Clock, color: 'text-violet-600 bg-violet-50' },
];

export default function LandingDashboardPreview() {
  return (
    <div className="relative z-10 mt-3 rounded-xl border border-line bg-white p-3 shadow-2xl shadow-blue-950/16 lg:scale-[0.94] lg:origin-center">
      <div className="grid overflow-hidden rounded-xl border border-line bg-white lg:grid-cols-[126px_1fr]">
        <aside className="bg-brand-deep p-3 text-white">
          <BrandLogo className="scale-[0.82] origin-left text-white" />
          <div className="mt-3 grid gap-2 text-[11px] font-semibold text-blue-100">
            {['Dashboard', 'Simulacros', 'Banco de preguntas', 'Clases', 'Resultados'].map((item, index) => (
              <div key={item} className={`rounded-md px-2.5 py-1.5 ${index === 0 ? 'bg-brand text-white' : 'bg-white/6'}`}>{item}</div>
            ))}
          </div>
        </aside>
        <div className="min-w-0">
          <div className="relative h-22 overflow-hidden bg-blue-50">
            <RoadScene compact />
            <div className="absolute left-5 top-5">
              <h3 className="text-xl font-black text-ink">¡Hola, Carlos! 👋</h3>
              <p className="text-xs font-medium text-slate-600">Prepárate para tu examen de manejo</p>
              <div className="mt-3 inline-flex rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white">Comenzar simulacro →</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 p-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-line bg-white p-2 shadow-sm">
                <div className={`mb-1.5 grid h-7 w-7 place-items-center rounded-full ${stat.color}`}><stat.icon className="h-4 w-4" /></div>
                <p className="text-[10px] font-bold text-slate-500">{stat.label}</p>
                <p className="text-lg font-black text-ink">{stat.value}</p>
                <p className="text-[9px] font-bold text-success">↗ esta semana</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_1.2fr] gap-2 px-2 pb-2">
            <div className="rounded-lg border border-line p-2.5">
              <p className="mb-2 text-xs font-black">Categorías disponibles</p>
              <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                {['A1', 'A2A', 'A2B', 'A3A', 'A3B'].map((item) => <span key={item} className="rounded-md border border-line py-2 text-brand">{item}</span>)}
              </div>
            </div>
            <div className="rounded-lg border border-line p-2.5">
              <p className="mb-2 flex items-center gap-2 text-xs font-black"><BarChart3 className="h-4 w-4 text-brand" /> Progreso semanal</p>
              <div className="flex h-12 items-end gap-2 border-b border-line">
                {[32, 38, 44, 48, 55, 60, 68, 76].map((value) => <div key={value} className="flex-1 rounded-t bg-blue-100" style={{ height: `${value}%` }} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
