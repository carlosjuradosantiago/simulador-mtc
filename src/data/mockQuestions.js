import { licenseCategories } from './mockCategories.js';

const temas = [
  'Señales de tránsito',
  'Normas de prioridad',
  'Seguridad vial',
  'Primeros auxilios',
  'Mecánica básica',
];

const prompts = [
  {
    texto: 'En una intersección sin semáforo, ¿qué debe hacer el conductor antes de avanzar?',
    opciones: [
      'Acelerar para cruzar antes que los demás vehículos.',
      'Reducir la velocidad, observar y ceder el paso cuando corresponda.',
      'Tocar la bocina y continuar sin detenerse.',
      'Detenerse sólo si hay un policía cerca.',
    ],
    correcta: 'B',
    tema: 'Normas de prioridad',
  },
  {
    texto: '¿Qué indica una señal triangular con borde rojo y fondo blanco?',
    opciones: [
      'Una obligación inmediata para el conductor.',
      'Una zona exclusiva para transporte público.',
      'Una advertencia preventiva sobre un peligro o condición en la vía.',
      'Una autorización para aumentar la velocidad.',
    ],
    correcta: 'C',
    tema: 'Señales de tránsito',
  },
  {
    texto: 'Si el pavimento está mojado, ¿cuál es la conducta más segura?',
    opciones: [
      'Mantener mayor distancia de seguridad y evitar frenadas bruscas.',
      'Aumentar la velocidad para salir rápido de la zona.',
      'Usar luces altas permanentemente.',
      'Circular por la berma para evitar tráfico.',
    ],
    correcta: 'A',
    tema: 'Seguridad vial',
  },
  {
    texto: 'Ante un accidente de tránsito, ¿qué acción inicial es recomendable?',
    opciones: [
      'Mover a todos los heridos sin revisar su estado.',
      'Retirarse para evitar responsabilidades.',
      'Asegurar la zona, pedir ayuda y evitar mover heridos graves.',
      'Dar agua o alimentos a los heridos inmediatamente.',
    ],
    correcta: 'C',
    tema: 'Primeros auxilios',
  },
  {
    texto: '¿Por qué es importante revisar la presión de los neumáticos?',
    opciones: [
      'Sólo mejora la apariencia del vehículo.',
      'Reduce estabilidad si está en el nivel correcto.',
      'Ayuda al control del vehículo, frenado y consumo eficiente.',
      'Permite ignorar otros mantenimientos.',
    ],
    correcta: 'C',
    tema: 'Mecánica básica',
  },
  {
    texto: 'Cuando una ambulancia se aproxima con sirena y luces, ¿qué debe hacer?',
    opciones: [
      'Competir con la ambulancia para despejar la vía.',
      'Ceder el paso de forma segura y permitir su avance.',
      'Detenerse en medio de la intersección.',
      'Seguir igual si el semáforo está en verde.',
    ],
    correcta: 'B',
    tema: 'Normas de prioridad',
  },
  {
    texto: '¿Qué conducta ayuda a prevenir accidentes por fatiga?',
    opciones: [
      'Conducir muchas horas sin detenerse.',
      'Descansar antes de conducir y hacer pausas en trayectos largos.',
      'Abrir la ventana y acelerar.',
      'Consumir alcohol en pequeñas cantidades.',
    ],
    correcta: 'B',
    tema: 'Seguridad vial',
  },
  {
    texto: 'En la situación mostrada, ¿qué debe hacer el conductor de la motocicleta?',
    opciones: [
      'Avanzar sin detenerse, tiene la prioridad.',
      'Detenerse y ceder el paso al vehículo que circula por la vía prioritaria.',
      'Avanzar lentamente y cruzar con precaución.',
      'Tocar la bocina y continuar, el otro conductor debe ceder el paso.',
    ],
    correcta: 'B',
    tema: 'Señales de tránsito',
  },
];

function createOptions(options) {
  return options.map((texto, optionIndex) => ({
    id: ['A', 'B', 'C', 'D'][optionIndex],
    texto,
  }));
}

function createQuestion(category, index) {
  const base = prompts[index % prompts.length];
  const tema = temas[index % temas.length] === base.tema ? base.tema : base.tema;

  return {
    id: `${category}-${index + 1}`,
    category,
    tema,
    texto: base.texto,
    opciones: createOptions(base.opciones),
    respuestaCorrecta: base.correcta,
    explicacion: `La respuesta correcta es ${base.correcta}. Esta regla forma parte de ${base.tema.toLowerCase()} y se evalúa con frecuencia en simulacros ${category}.`,
    dificultad: index % 5 === 0 ? 'difícil' : index % 2 === 0 ? 'medio' : 'fácil',
  };
}

export function getMockQuestions(category = 'A1') {
  return Array.from({ length: 40 }, (_, index) => createQuestion(category, index));
}

export const mockQuestions = licenseCategories.flatMap((category) => getMockQuestions(category.id).slice(0, 10));
export const topics = temas;
