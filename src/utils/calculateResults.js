import { formatDuration } from './formatTime.js';

export function calculateResults({ questions, answers, timeUsedSeconds, category }) {
  let correctas = 0;
  let incorrectas = 0;
  let sinResponder = 0;
  const temaStats = new Map();
  const reviewQuestions = [];

  questions.forEach((question, questionIndex) => {
    const selected = answers[question.id];
    const current = temaStats.get(question.tema) ?? { tema: question.tema, total: 0, correctas: 0 };
    current.total += 1;

    if (!selected) {
      sinResponder += 1;
      reviewQuestions.push({ ...question, numero: questionIndex + 1, estado: 'Sin responder' });
    } else if (selected === question.respuestaCorrecta) {
      correctas += 1;
      current.correctas += 1;
    } else {
      incorrectas += 1;
      reviewQuestions.push({ ...question, numero: questionIndex + 1, estado: 'Incorrecta', seleccionada: selected });
    }

    temaStats.set(question.tema, current);
  });

  const porcentaje = Math.round((correctas / questions.length) * 100);
  const temas = Array.from(temaStats.values()).map((tema) => ({
    ...tema,
    porcentaje: Math.round((tema.correctas / tema.total) * 100),
  }));
  const sortedTemas = [...temas].sort((left, right) => right.porcentaje - left.porcentaje);

  return {
    id: `res-${Date.now()}`,
    date: new Date().toISOString(),
    category,
    total: questions.length,
    correctas,
    incorrectas,
    sinResponder,
    porcentaje,
    aprobado: porcentaje >= 80,
    tiempoUsadoSegundos: timeUsedSeconds,
    tiempoUsado: formatDuration(timeUsedSeconds),
    precision: `${porcentaje}%`,
    mejorTema: sortedTemas[0]?.tema ?? 'Señales de tránsito',
    temas,
    reviewQuestions: reviewQuestions.slice(0, 12),
  };
}
