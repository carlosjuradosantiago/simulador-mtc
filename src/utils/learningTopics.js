export const LEARNING_TOPICS = [
  {
    id: 'semaforos',
    label: 'Semáforos y luces',
    search: 'semáforo luz roja verde ámbar',
    keywords: ['semaforo', 'luz roja', 'luz verde', 'luz ambar', 'ambar', 'intermitente', 'flecha roja', 'flecha verde'],
  },
  {
    id: 'senales',
    label: 'Señales de tránsito',
    search: 'señal tránsito reglamentaria preventiva informativa',
    keywords: ['senal', 'reglamentaria', 'preventiva', 'informativa', 'r-', 'p-', 'pare', 'ceda el paso', 'curva', 'prohibido voltear'],
  },
  {
    id: 'prioridad',
    label: 'Prioridad de paso e intersecciones',
    search: 'preferencia paso intersección cruce',
    keywords: ['preferencia', 'interseccion', 'cruce', 'via ferrea', 'linea ferrea', 'peaton', 'derecha del otro', 'ceder el paso'],
  },
  {
    id: 'maniobras',
    label: 'Maniobras, giros y carriles',
    search: 'adelantamiento giro carril estacionamiento',
    keywords: ['adelant', 'giro', 'girar', 'voltear', 'vuelta en u', 'carril', 'estacion', 'parada', 'direccional', 'maniobra', 'retroceso'],
  },
  {
    id: 'velocidad',
    label: 'Velocidad y conducción preventiva',
    search: 'velocidad distancia conducción preventiva',
    keywords: ['velocidad', 'distancia', 'frenado', 'reducir la velocidad', 'conduccion preventiva', 'manejo defensivo'],
  },
  {
    id: 'documentos',
    label: 'Licencias, documentos y requisitos',
    search: 'licencia categoría SOAT documento',
    keywords: ['licencia', 'categoria', 'clase a', 'clase b', 'soat', 'tarjeta', 'documento', 'dni', 'constancia', 'certificado', 'inspeccion tecnica', 'revision tecnica'],
  },
  {
    id: 'infracciones',
    label: 'Infracciones y sanciones',
    search: 'infracción sanción multa puntos',
    keywords: ['infraccion', 'sancion', 'multa', 'puntos', 'suspension', 'retencion', 'internamiento', 'papeleta'],
  },
  {
    id: 'seguridad',
    label: 'Seguridad vial y emergencias',
    search: 'accidente emergencia primeros auxilios seguridad',
    keywords: ['accidente', 'auxilio', 'emergencia', 'herido', 'victima', 'ambulancia', 'alcohol', 'droga', 'cinturon', 'casco', 'escolar'],
  },
  {
    id: 'vehiculo',
    label: 'Vehículo, luces y mantenimiento',
    search: 'vehículo frenos neumáticos luces mantenimiento',
    keywords: ['freno', 'neumatic', 'llanta', 'espejo', 'placa', 'motor', 'escape', 'parachoques', 'retroreflect', 'odometro', 'velocimetro'],
  },
  {
    id: 'transporte',
    label: 'Transporte y servicio público',
    search: 'transporte pasajeros mercancías servicio',
    keywords: ['transporte', 'pasajeros', 'mercancias', 'servicio publico', 'taxi', 'afocat', 'municipalidad', 'vehiculos menores', 'l5'],
  },
];

export const DEFAULT_LEARNING_TOPIC = {
  id: 'reglas-generales',
  label: 'Reglas generales de tránsito',
  search: 'reglamento tránsito conductor',
  keywords: [],
};

export function normalizeLearningText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getLearningTopicById(topicId) {
  return LEARNING_TOPICS.find((topic) => topic.id === topicId) ?? (topicId === DEFAULT_LEARNING_TOPIC.id ? DEFAULT_LEARNING_TOPIC : null);
}

export function deriveLearningTopic(source = {}) {
  const haystack = normalizeLearningText([
    source.textoPregunta,
    source.preguntaTexto,
    source.texto,
    source.opcionCorrectaTexto,
    source.respuestaCorrecta,
    source.fundamento,
    source.clase,
  ].filter(Boolean).join(' '));

  return LEARNING_TOPICS.find((topic) => topic.keywords.some((keyword) => haystack.includes(normalizeLearningText(keyword)))) ?? DEFAULT_LEARNING_TOPIC;
}
