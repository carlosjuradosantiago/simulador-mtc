import { ArrowRight, BookOpenCheck, CheckCircle2, Clock, FileText, Star, Target, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressChart from '../components/charts/ProgressChart.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import CategoryCard from '../components/ui/CategoryCard.jsx';
import OfficialPdfDownloads from '../components/ui/OfficialPdfDownloads.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import RoadScene from '../components/ui/RoadScene.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { BRAND_DISCLAIMER, BRAND_NAME } from '../data/brand.js';
import { licenseCategories } from '../data/mockCategories.js';
import { lastResults, weakTopics } from '../data/mockResults.js';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';

const topicColors = ['red', 'orange', 'blue', 'emerald'];
const statusVariant = {
  Aprobado: 'green',
  APROBADO: 'green',
  DESAPROBADO: 'red',
  'En progreso': 'orange',
  Reforzar: 'red',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState(licenseCategories);
  const [stats, setStats] = useState(null);
  const [recentResults, setRecentResults] = useState(lastResults);
  const [resolvedQuestions, setResolvedQuestions] = useState(0);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const firstName = user?.name?.split(' ')[0] ?? 'Carlos';
  const dashboardCategories = showAllCategories ? categories : categories.slice(0, 5);
  const hasHiddenCategories = categories.length > 5;

  useEffect(() => {
    Promise.all([
      api.getCategories(),
      api.getStats().catch(() => null),
      api.getExamHistory({ page: 0, size: 100 }).catch(() => null),
    ]).then(([apiCategories, apiStats, history]) => {
      if (apiCategories?.length) setCategories(apiCategories);
      if (apiStats) setStats(apiStats);
      if (history?.content?.length) {
        setResolvedQuestions(history.content.reduce((total, result) => total + Number(result.totalQuestions ?? result.totalPreguntas ?? 0), 0));
        setRecentResults(history.content.map((result) => ({
          id: result.attemptId,
          date: result.startTime ? new Date(result.startTime).toLocaleDateString('es-PE') : '-',
          category: result.examType?.name ?? 'MTC',
          score: Math.round(Number(result.accuracyPercentage ?? result.score ?? 0)),
          status: result.status,
        })));
      }
    }).catch(() => null);
  }, []);

  return (
    <div className="grid gap-4 pt-0">
      <section className="min-h-[224px] overflow-hidden rounded-xl border border-line bg-white card-shadow lg:h-[180px] lg:min-h-0">
        <div className="grid h-full lg:grid-cols-[0.39fr_0.61fr]">
          <div className="road-hero p-6 md:p-8 lg:p-7">
            <h1 className="text-3xl font-black text-ink sm:text-4xl">Hola, {firstName} 👋</h1>
            <p className="mt-2 max-w-xl text-slate-600">Prepárate para tu examen de manejo con simuladores por categoría.</p>
            <Button as={Link} to={`/simulacro/${user?.category ?? categories[0]?.id ?? 25}`} className="mt-5 min-w-48 lg:mt-4">
              Comenzar ahora
              <TrendingUp className="h-4 w-4" />
            </Button>
          </div>
          <RoadScene />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpenCheck} label="Simulacros rendidos" value={stats?.totalIntentos ?? 0} delta="Historial actualizado" tone="green" />
        <StatCard icon={Star} label="Promedio" value={`${stats?.promedioGeneral ?? 0}%`} delta={`${stats?.intentosAprobados ?? 0} aprobados`} tone="orange" />
        <StatCard icon={FileText} label="Preguntas resueltas" value={resolvedQuestions || (stats?.totalIntentos ?? 0) * 40} delta="Banco oficial activo" tone="blue" />
        <StatCard icon={Clock} label="Tiempo de estudio" value={user?.stats?.studyTime ?? '0h 00m'} delta="Sesión sincronizada" tone="violet" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.03fr_0.97fr]">
        <Card className="p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Categorías disponibles</h2>
            {hasHiddenCategories ? (
              <button
                type="button"
                className="text-sm font-bold text-brand hover:text-blue-700"
                onClick={() => setShowAllCategories((current) => !current)}
              >
                {showAllCategories ? 'Ver menos' : 'Ver todas'}
              </button>
            ) : null}
          </div>
          <div id="categorias" className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {dashboardCategories.map((category) => <CategoryCard key={category.id} category={category} />)}
          </div>
        </Card>

        <Card className="p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-black">Progreso semanal</h2>
            <Badge variant="blue">Últimas 8 semanas</Badge>
          </div>
          <ProgressChart />
          <p className="text-center text-sm font-semibold text-success">Mejora de 24 puntos porcentuales en 8 semanas</p>
        </Card>
      </section>

      <OfficialPdfDownloads />

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Últimos resultados</h2>
            <Link to="/resultados" className="text-sm font-bold text-brand">Ver todos</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr><th className="py-2">Fecha</th><th>Categoría</th><th>Puntaje</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {recentResults.map((result) => (
                  <tr key={result.id} className="border-t border-line">
                    <td className="py-3 text-slate-600">{result.date}</td>
                    <td><Badge variant="blue">{result.category}</Badge></td>
                    <td className="font-bold">{result.score}%</td>
                    <td><Badge variant={statusVariant[result.status] ?? 'orange'}>{result.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-lg font-black">Temas por reforzar</h2>
          <div className="grid gap-3">
            {weakTopics.map((topic, index) => (
              <div key={topic.topic}>
                <div className="mb-2 flex justify-between text-sm font-semibold"><span>{topic.topic}</span><span>{topic.score}%</span></div>
                <ProgressBar value={topic.score} color={topicColors[index]} />
              </div>
            ))}
          </div>
          <Link to="/banco-preguntas" className="mt-4 block text-center text-sm font-bold text-brand">Ver todos los temas</Link>
        </Card>

        <Card className="bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <h2 className="flex items-center gap-2 text-lg font-black"><Target className="h-5 w-5 text-success" /> Plan de estudio</h2>
          <div className="mt-3 grid gap-3">
            <div className="rounded-lg border border-emerald-100 bg-white/80 p-3">
              <p className="text-xs font-black uppercase text-emerald-700">Tema prioritario</p>
              <p className="mt-1 text-base font-black text-ink">{weakTopics[0]?.topic ?? 'Normas de circulacion'}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">Practica unas preguntas de este bloque antes de rendir otro simulacro. Es la forma mas rapida de subir tu promedio.</p>
            </div>
            <div className="grid gap-2 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Revisa primero tus preguntas incorrectas.</span>
              <span className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Luego responde un bloque corto por tema.</span>
              <span className="inline-flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Termina con un simulacro cronometrado.</span>
            </div>
            <Button as={Link} to="/banco-preguntas" variant="success" className="w-full">
              Practicar temas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <p>{BRAND_DISCLAIMER}</p>
        <p>© 2025 {BRAND_NAME}. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
