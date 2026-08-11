import { Calendar, Mail, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import Card from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { FULL_EXAM_IS_FREE } from '../data/examRules.js';
import { useAuth } from '../hooks/useAuth.js';
import { api, normalizeCategoryName } from '../services/api.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(user?.stats ?? null);
  const [membership, setMembership] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getStats().catch(() => null),
      api.getExamHistory({ page: 0, size: 100 }).catch(() => null),
    ]).then(([apiStats, history]) => {
      const resolvedQuestions = history?.content?.reduce((total, result) => total + Number(result.totalQuestions ?? result.totalPreguntas ?? 0), 0);
      if (apiStats) setStats({
        attempts: apiStats.totalIntentos ?? 0,
        average: apiStats.promedioGeneral ?? 0,
        questions: resolvedQuestions || (apiStats.totalIntentos ?? 0) * 40,
        studyTime: user?.stats?.studyTime ?? '0h 00m',
      });
    }).catch(() => null);

    if (!FULL_EXAM_IS_FREE) {
      api.getActiveMembership().then((activeMembership) => {
        setMembership(activeMembership);
      }).catch(() => null);
    }
  }, [user?.stats?.studyTime]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Perfil</h1>
        <p className="mt-2 text-slate-600">Datos de tu cuenta y estadísticas generales.</p>
      </div>
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-blue-100 text-3xl font-black text-brand">{user?.avatar ?? 'CM'}</span>
          <div className="flex-1">
            <h2 className="text-3xl font-black">{user?.name}</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /> {user?.email}</span>
              <span className="inline-flex items-center gap-2"><User className="h-4 w-4 text-brand" /> Categoría principal {normalizeCategoryName(user?.category)}</span>
              <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /> Registro {user?.registeredAt}</span>
              <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-brand" /> Plan {FULL_EXAM_IS_FREE ? 'Acceso gratuito' : membership?.planName ?? 'Sin membresía activa'}</span>
            </div>
          </div>
        </div>
      </Card>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={User} label="Simulacros rendidos" value={stats?.attempts ?? 0} tone="green" />
        <StatCard icon={User} label="Promedio" value={`${stats?.average ?? 0}%`} tone="orange" />
        <StatCard icon={User} label="Preguntas resueltas" value={stats?.questions ?? 0} tone="blue" />
        <StatCard icon={User} label="Tiempo de estudio" value={stats?.studyTime ?? '0h 00m'} tone="violet" />
      </section>
    </div>
  );
}
