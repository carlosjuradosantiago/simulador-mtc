import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  GraduationCap,
  Lightbulb,
  ListChecks,
  PlayCircle,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { classCurriculum, fallbackClasses } from '../data/classCurriculum.js';
import { api } from '../services/api.js';
import { cn } from '../utils/cn.js';

const accentStyles = {
  blue: {
    icon: 'bg-blue-50 text-brand',
    soft: 'bg-blue-50 text-brand border-blue-100',
    progress: 'blue',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    progress: 'emerald',
  },
  orange: {
    icon: 'bg-orange-50 text-warning',
    soft: 'bg-orange-50 text-orange-700 border-orange-100',
    progress: 'orange',
  },
  red: {
    icon: 'bg-red-50 text-danger',
    soft: 'bg-red-50 text-red-700 border-red-100',
    progress: 'red',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-700',
    soft: 'bg-violet-50 text-violet-700 border-violet-100',
    progress: 'violet',
  },
};

function enrichCourse(course) {
  const curriculum = classCurriculum[course.slug] ?? {};
  const curriculumLessons = curriculum.lessons ?? [];
  const lessons = curriculumLessons.length
    ? curriculumLessons.map((lesson, index) => ({
      id: course.lecciones?.[index]?.id ?? `${course.slug}-${index + 1}`,
      orden: index + 1,
      titulo: lesson.title,
      descripcion: lesson.objective,
      duracionMinutos: lesson.duration,
      ...lesson,
    }))
    : (course.lecciones ?? []);

  const totalMinutes = lessons.reduce((total, lesson) => total + Number(lesson.duracionMinutos ?? lesson.duration ?? 0), 0);

  return {
    ...course,
    ...curriculum,
    lecciones: lessons,
    totalLecciones: lessons.length || course.totalLecciones || 0,
    duracionMinutos: totalMinutes || course.duracionMinutos || 0,
    progresoPorcentaje: course.progresoPorcentaje ?? 0,
    leccionesCompletadas: Math.min(course.leccionesCompletadas ?? 0, lessons.length || course.totalLecciones || 0),
  };
}

function CourseCard({ course, onOpen }) {
  const accent = accentStyles[course.accent] ?? accentStyles.blue;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <span className={cn('grid h-14 w-14 place-items-center rounded-full', accent.icon)}><BookOpenCheck className="h-7 w-7" /></span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"><Clock className="h-3.5 w-3.5" /> {course.duracionMinutos} min</span>
      </div>
      <h2 className="mt-5 text-xl font-black">{course.titulo}</h2>
      <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{course.descripcion}</p>
      <div className="mt-5 flex items-center justify-between text-sm font-semibold"><span>{course.totalLecciones} lecciones</span><span>{course.progresoPorcentaje}%</span></div>
      <ProgressBar value={course.progresoPorcentaje} color={accent.progress} className="mt-2" />
      <Button className="mt-6 w-full" onClick={() => onOpen(course)}>
        <PlayCircle className="h-4 w-4" /> Estudiar clase
      </Button>
    </Card>
  );
}

function LessonStep({ lesson, index, active, completed, onClick }) {
  return (
    <button
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition',
        active && 'border-brand bg-blue-50',
        !active && completed && 'border-emerald-100 bg-emerald-50',
        !active && !completed && 'border-line bg-white hover:border-blue-200 hover:bg-blue-50',
      )}
      onClick={onClick}
    >
      <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', completed ? 'bg-success text-white' : active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500')}>
        {completed ? <CheckCircle2 className="h-4 w-4" /> : active ? <PlayCircle className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-slate-500">Lección {index + 1}</span>
        <span className="block text-sm font-black text-ink">{lesson.titulo}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock className="h-3 w-3" /> {lesson.duracionMinutos} min</span>
      </span>
    </button>
  );
}

function MiniPractice({ lesson, selected, onSelect }) {
  if (!lesson.practice) return null;

  const answered = selected !== undefined;
  const correct = selected === lesson.practice.answer;

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-black text-ink">
        <GraduationCap className="h-5 w-5 text-brand" />
        Mini práctica
      </div>
      <p className="mt-3 text-base font-bold leading-6">{lesson.practice.question}</p>
      <div className="mt-4 grid gap-2">
        {lesson.practice.options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = lesson.practice.answer === index;
          return (
            <button
              key={option}
              className={cn(
                'flex min-h-12 items-start gap-3 rounded-lg border border-line bg-white px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50',
                answered && isCorrect && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                answered && isSelected && !isCorrect && 'border-red-200 bg-red-50 text-red-700',
              )}
              onClick={() => onSelect(index)}
            >
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black', answered && isCorrect && 'bg-success text-white', answered && isSelected && !isCorrect && 'bg-danger text-white')}>
                {String.fromCharCode(65 + index)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className={cn('mt-4 flex gap-3 rounded-lg border p-3 text-sm leading-6', correct ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-red-100 bg-red-50 text-red-700')}>
          {correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
          <span>{lesson.practice.explanation}</span>
        </div>
      ) : null}
    </div>
  );
}

function LessonContent({ course, lesson, lessonIndex, selectedAnswer, onAnswer, onComplete, saving }) {
  const accent = accentStyles[course.accent] ?? accentStyles.blue;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black', accent.soft)}>
              Lección {lessonIndex + 1} de {course.totalLecciones}
            </span>
            <h2 className="mt-4 text-2xl font-black leading-tight">{lesson.titulo}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{lesson.objective}</p>
          </div>
          <div className="grid gap-2 sm:justify-items-end">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"><Clock className="h-3.5 w-3.5" /> {lesson.duracionMinutos} min</span>
            <Button size="sm" onClick={onComplete} disabled={saving}>
              <CheckCircle2 className="h-4 w-4" /> {saving ? 'Guardando...' : 'Completar'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1fr_330px]">
        <div className="grid gap-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black"><Target className="h-5 w-5 text-brand" /> Puntos clave</h3>
            <div className="mt-3 grid gap-3">
              {lesson.points.map((point, index) => (
                <div key={point} className="flex gap-3 rounded-lg border border-line bg-white p-3 text-sm leading-6 text-slate-700">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-black text-brand">{index + 1}</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-lg font-black"><Lightbulb className="h-5 w-5 text-warning" /> Trampas típicas del examen</h3>
            <div className="mt-3 grid gap-3">
              {lesson.traps.map((trap) => (
                <div key={trap} className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-800">{trap}</div>
              ))}
            </div>
          </div>

          <MiniPractice lesson={lesson} selected={selectedAnswer} onSelect={onAnswer} />
        </div>

        <div className="grid content-start gap-4 xl:sticky xl:top-28">
          <div className="rounded-lg border border-line bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-black"><ListChecks className="h-5 w-5 text-brand" /> Checklist para recordar</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {lesson.checklist.map((item) => (
                <span key={item} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-slate-600">{item}</span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-black"><FileText className="h-5 w-5 text-brand" /> Cómo repasarlo</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Lee los puntos clave, responde la mini práctica y explica la respuesta correcta con tus propias palabras antes de avanzar.</p>
          </div>

          <Button className="w-full" onClick={onComplete} disabled={saving}>
            <CheckCircle2 className="h-4 w-4" /> {saving ? 'Guardando...' : 'Marcar lección completada'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    api.getClasses()
      .then((data) => setClasses(data.length ? data : fallbackClasses))
      .catch(() => setClasses(fallbackClasses))
      .finally(() => setLoading(false));
  }, []);

  const enrichedClasses = useMemo(() => (classes.length ? classes : fallbackClasses).map(enrichCourse), [classes]);
  const selectedCourse = enrichedClasses.find((course) => course.id === selectedClassId) ?? null;
  const activeLesson = selectedCourse?.lecciones?.[activeLessonIndex] ?? null;
  const answerKey = selectedCourse && activeLesson ? `${selectedCourse.slug}:${activeLessonIndex}` : '';

  const openCourse = (course) => {
    const nextIndex = Math.min(course.leccionesCompletadas ?? 0, Math.max((course.lecciones?.length ?? 1) - 1, 0));
    setSelectedClassId(course.id);
    setActiveLessonIndex(nextIndex);
    setNotice('');
  };

  const updateCourseProgress = async (course, lessonIndex, moveNext = false) => {
    const totalLessons = Math.max(course.totalLecciones ?? course.lecciones.length, 1);
    const nextLessons = Math.max(course.leccionesCompletadas ?? 0, lessonIndex + 1);
    const nextProgress = Math.round((nextLessons / totalLessons) * 100);
    const lastLessonId = course.lecciones?.[nextLessons - 1]?.id;

    setSaving(true);
    setNotice('');
    setClasses((currentClasses) => currentClasses.map((item) => (
      item.id === course.id
        ? { ...item, progresoPorcentaje: nextProgress, leccionesCompletadas: nextLessons }
        : item
    )));

    try {
      await api.updateClassProgress(course.id, {
        progresoPorcentaje: nextProgress,
        leccionesCompletadas: nextLessons,
        ultimaLeccionId: Number.isInteger(Number(lastLessonId)) ? Number(lastLessonId) : null,
      });
      setNotice('Avance guardado. Sigue con la siguiente lección cuando estés listo.');
    } catch {
      setNotice('El avance quedó marcado en pantalla, pero no se pudo guardar en Supabase.');
    } finally {
      setSaving(false);
    }

    if (moveNext && lessonIndex < totalLessons - 1) {
      setActiveLessonIndex(lessonIndex + 1);
    }
  };

  if (selectedCourse && activeLesson) {
    const accent = accentStyles[selectedCourse.accent] ?? accentStyles.blue;
    const completedLessons = selectedCourse.leccionesCompletadas ?? 0;

    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button variant="ghost" className="-ml-3 mb-2" onClick={() => setSelectedClassId(null)}><ArrowLeft className="h-4 w-4" /> Volver a clases</Button>
            <h1 className="text-3xl font-black">{selectedCourse.titulo}</h1>
            <p className="mt-2 max-w-3xl text-slate-600">{selectedCourse.focus}</p>
          </div>
          <div className="min-w-52 rounded-lg border border-line bg-white p-4">
            <div className="flex items-center justify-between text-sm font-black"><span>Progreso</span><span>{selectedCourse.progresoPorcentaje}%</span></div>
            <ProgressBar value={selectedCourse.progresoPorcentaje} color={accent.progress} className="mt-3" />
            <p className="mt-2 text-xs font-semibold text-slate-500">{completedLessons} de {selectedCourse.totalLecciones} lecciones completadas</p>
          </div>
        </div>

        {notice ? <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-brand">{notice}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-lg font-black"><BookOpenCheck className="h-5 w-5 text-brand" /> Ruta de estudio</h2>
            <div className="mt-4 grid gap-3">
              {selectedCourse.lecciones.map((lesson, index) => (
                <LessonStep
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  active={index === activeLessonIndex}
                  completed={index < completedLessons}
                  onClick={() => setActiveLessonIndex(index)}
                />
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-line bg-slate-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-black"><Trophy className="h-5 w-5 text-warning" /> Para aprobar</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
                {selectedCourse.examTips.map((tip) => <li key={tip} className="flex gap-2"><ChevronRight className="mt-1 h-4 w-4 shrink-0 text-brand" /> {tip}</li>)}
              </ul>
            </div>
          </Card>

          <LessonContent
            course={selectedCourse}
            lesson={activeLesson}
            lessonIndex={activeLessonIndex}
            selectedAnswer={quizAnswers[answerKey]}
            onAnswer={(answer) => setQuizAnswers((current) => ({ ...current, [answerKey]: answer }))}
            saving={saving}
            onComplete={() => updateCourseProgress(selectedCourse, activeLessonIndex, true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-black">Clases</h1>
        <p className="mt-2 text-slate-600">Lecciones cortas para reforzar temas antes de rendir simulacros.</p>
      </div>

      <div className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-brand"><Target className="h-5 w-5" /></span>
          <div><h2 className="font-black">Estudia por tema</h2><p className="mt-1 text-sm leading-6 text-slate-600">Cada clase ataca un bloque que aparece en el examen.</p></div>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><ListChecks className="h-5 w-5" /></span>
          <div><h2 className="font-black">Repasa con método</h2><p className="mt-1 text-sm leading-6 text-slate-600">Objetivo, puntos clave, trampas y checklist por lección.</p></div>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-50 text-warning"><GraduationCap className="h-5 w-5" /></span>
          <div><h2 className="font-black">Practica al cierre</h2><p className="mt-1 text-sm leading-6 text-slate-600">Mini preguntas para fijar la regla antes del simulacro.</p></div>
        </div>
      </div>

      {loading ? <Card className="p-5 text-center font-bold text-slate-500">Cargando clases desde Supabase...</Card> : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {enrichedClasses.map((course) => <CourseCard key={course.id} course={course} onOpen={openCourse} />)}
      </div>
    </div>
  );
}
