import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const categoryQuestionBank = JSON.parse(
  readFileSync(new URL('./seo-category-question-bank.json', import.meta.url), 'utf8'),
);
const categoryQuestionsBySlug = new Map(
  categoryQuestionBank.categories.map((category) => [category.slug, category.questions]),
);
const topicQuestionBank = JSON.parse(
  readFileSync(new URL('./seo-topic-question-bank.json', import.meta.url), 'utf8'),
);
const questionPageBank = JSON.parse(
  readFileSync(new URL('./seo-question-page-bank.json', import.meta.url), 'utf8'),
);

const siteUrl = 'https://www.simuladormtc.com';
const brandName = 'Simulador MTC';
const disclaimer = 'Plataforma educativa independiente. No afiliada al Ministerio de Transportes y Comunicaciones.';
const officialMtcSource = 'https://www.gob.pe/institucion/mtc/informes-publicaciones/1928110-examen-de-conocimientos-para-postulantes-a-licencias-de-conducir';
const contentPublished = '2026-06-05';
// ponytail: update this only after a real editorial review; builds must not fake freshness.
const contentLastReviewed = '2026-08-14';
const contentLastReviewedLabel = '14 de agosto de 2026';
const organizationId = `${siteUrl}/#organization`;
const websiteId = `${siteUrl}/#website`;
const repositoryUrl = 'https://github.com/carlosjuradosantiago/simulador-mtc';
const legalName = 'CJ VERTEXLABS GROUP EIRL';
const taxId = '20614965836';
const businessAddress = 'Sector 3, Grupo 20, Manzana M, Lote 36, Villa El Salvador, Lima, Perú';
const businessPhone = '+51 987 617 635';
const businessEmail = 'admin@simuladormtc.com';

const publicSpaPages = [
  '/materiales',
  '/contacto',
  '/terminos-y-condiciones',
  '/politica-de-cambios-y-devoluciones',
  '/politica-de-privacidad',
  '/libro-reclamaciones',
];

const officialSources = [
  {
    id: 'balotarios',
    name: 'Examen de conocimientos para postulantes a licencias de conducir',
    publisher: 'Ministerio de Transportes y Comunicaciones',
    url: officialMtcSource,
    note: 'Publicación oficial con balotarios descargables por categoría.',
  },
  {
    id: 'exam-format',
    name: 'El MTC brinda un simulador gratuito para practicar el examen de reglas de tránsito',
    publisher: 'Ministerio de Transportes y Comunicaciones',
    url: 'https://www.gob.pe/institucion/mtc/noticias/1100676-el-mtc-brinda-un-simulador-gratuito-para-practicar-el-examen-de-reglas-de-transito-para-obtener-el-brevete',
    note: 'Confirma el formato de 40 preguntas y 40 minutos publicado por el MTC.',
  },
  {
    id: 'traffic-rules',
    name: 'Reglamento Nacional de Tránsito',
    publisher: 'Ministerio de Transportes y Comunicaciones',
    url: 'https://www.gob.pe/institucion/mtc/normas-legales/343919-033-2001-mtc',
    note: 'Norma base y relación de modificatorias publicadas por el MTC.',
  },
  {
    id: 'license-types',
    name: 'Tipos de licencia de conducir (brevete)',
    publisher: 'Ministerio de Transportes y Comunicaciones',
    url: 'https://www.gob.pe/262-tipos-de-licencia-de-conducir-brevete-tipos-de-licencia-de-conducir-brevete',
    note: 'Orientación oficial sobre las clases de licencia y los vehículos autorizados en cada categoría.',
  },
];

const categories = [
  {
    code: 'A-I', slug: 'a1', common: 'A1', categoryId: 25, pdf: 'balotario_A-I.pdf', exam: 'licencia A-I',
    vehicle: 'autos y camionetas de uso particular',
    scope: 'Autoriza vehículos M1 y M2 de uso particular, vehículos de mercancías N1 y un acoplado O1.',
    focus: 'Señales, semáforos, prioridad de paso, marcas en el pavimento, adelantamiento y conducción segura de vehículos particulares.',
    advice: 'Empieza por las materias generales y alterna preguntas de señales con simulacros completos; A1 tiene un balotario propio de referencia.',
  },
  {
    code: 'A-IIA', slug: 'a2a', common: 'A2A', categoryId: 16, pdf: 'balotario_A-IIA.pdf', exam: 'licencia A-IIA',
    vehicle: 'taxis, transporte turístico y vehículos de emergencia',
    scope: 'Autoriza vehículos M1 destinados al transporte especial de pasajeros e incluye los permisos de A-I.',
    focus: 'Materias generales y reglas específicas de transporte especial, servicio de taxi, seguridad del pasajero y documentación.',
    advice: 'Practica por separado el bloque general y el bloque profesional para detectar cuál de los dos está bajando tu puntaje.',
  },
  {
    code: 'A-IIB', slug: 'a2b', common: 'A2B', categoryId: 17, pdf: 'balotario_A-IIB.pdf', exam: 'licencia A-IIB',
    vehicle: 'microbuses, minibuses y camiones medianos',
    scope: 'Autoriza vehículos M2 y M3 de hasta 6 toneladas y vehículos de mercancías N2 con remolques O1 u O2; incluye A-I y A-IIA.',
    focus: 'Transporte de personas y mercancías, pesos y categorías vehiculares, seguridad de pasajeros, documentos y materias generales.',
    advice: 'Refuerza las diferencias entre M2, M3 y N2 y luego comprueba el aprendizaje en un simulacro cronometrado de la categoría.',
  },
  {
    code: 'A-IIIA', slug: 'a3a', common: 'A3A', categoryId: 18, pdf: 'balotario_A-IIIA.pdf', exam: 'licencia A-IIIA',
    vehicle: 'ómnibus urbanos, interurbanos y articulados',
    scope: 'Autoriza vehículos M3 de más de 6 toneladas para transporte de personas e incluye A-I, A-IIA y A-IIB.',
    focus: 'Transporte pesado de pasajeros, obligaciones del conductor profesional, seguridad, operación del vehículo y materias generales.',
    advice: 'Prioriza las preguntas sobre transporte de personas y contrástalas con las reglas generales que también forman parte del examen.',
  },
  {
    code: 'A-IIIB', slug: 'a3b', common: 'A3B', categoryId: 19, pdf: 'balotario_A-IIIB.pdf', exam: 'licencia A-IIIB',
    vehicle: 'camiones, remolcadores y volquetes',
    scope: 'Autoriza vehículos N3 para mercancías con uno o más vehículos acoplados de categoría O; incluye A-I, A-IIA y A-IIB.',
    focus: 'Carga pesada, acoplados, pesos y dimensiones, seguridad operativa, inspección del vehículo y materias generales.',
    advice: 'Separa los errores de normativa general de los errores sobre carga y vehículos N3 para que el repaso sea realmente útil.',
  },
  {
    code: 'A-IIIC', slug: 'a3c', common: 'A3C', categoryId: 20, pdf: 'balotario_A-IIIC.pdf', exam: 'licencia A-IIIC',
    vehicle: 'ómnibus y vehículos de carga pesada',
    scope: 'Combina las autorizaciones A-IIIA y A-IIIB para transporte pesado de personas y mercancías e incluye las categorías anteriores de clase A.',
    focus: 'Normas de ómnibus y carga pesada, seguridad de pasajeros y mercancías, categorías vehiculares y responsabilidades profesionales.',
    advice: 'Alterna bloques de transporte de personas y carga; el promedio general puede ocultar que uno de los dos bloques necesita refuerzo.',
  },
  {
    code: 'B-IIA', slug: 'b2a', common: 'B2A', categoryId: 22, pdf: 'balotario_B-IIA.pdf', exam: 'licencia B-IIA',
    vehicle: 'bicimotos de categorías L1 y L2',
    scope: 'Autoriza bicimotos L1 y L2 para transporte particular de pasajeros o transporte de mercancías.',
    focus: 'Reglas para vehículos menores, casco y elementos de seguridad, circulación, documentos y materias generales de tránsito.',
    advice: 'No estudies con el balotario de auto: selecciona B2A para recibir las preguntas que corresponden a bicimotos.',
  },
  {
    code: 'B-IIB', slug: 'b2b', common: 'B2B', categoryId: 23, pdf: 'balotario_B-IIB.pdf', exam: 'licencia B-IIB',
    vehicle: 'motocicletas y motocicletas con sidecar',
    scope: 'Autoriza vehículos L3 y L4 para uso particular e incluye los permisos de B-IIA.',
    focus: 'Seguridad en motocicleta, casco, posición en la vía, maniobras, mantenimiento básico y normas para vehículos menores.',
    advice: 'Practica específicamente B2B: las preguntas para motocicleta no son iguales a las de la licencia A-I de automóvil.',
  },
  {
    code: 'B-IIC', slug: 'b2c', common: 'B2C', categoryId: 24, pdf: 'balotario_B-IIC.pdf', exam: 'licencia B-IIC',
    vehicle: 'mototaxis y trimotos de pasajeros o mercancías',
    scope: 'Autoriza vehículos L5 para transporte público especial de pasajeros y mercancías e incluye B-IIA y B-IIB.',
    focus: 'Servicio público en vehículos menores, seguridad del pasajero, documentos, obligaciones del conductor y reglas para unidades L5.',
    advice: 'Distingue las reglas de uso particular de las obligaciones del servicio público especial antes de rendir otro simulacro.',
  },
];

const corePages = [
  {
    slug: 'simulador-mtc',
    title: 'Simulador MTC 2026: práctica gratis y simulacro de 40 preguntas',
    description: 'Elige A1, A2A, A2B, A3 o B2. Practica 5 preguntas gratis o rinde un simulacro MTC de 40 preguntas y revisa tus errores por tema.',
    h1: 'Simulador MTC 2026 por categoría de licencia',
    intro: 'Elige la categoría exacta de tu licencia. Puedes aprender con 5 preguntas sin cronómetro o medir tu preparación con 40 preguntas en 40 minutos y un mínimo de referencia de 35 respuestas correctas.',
    primaryCta: '/?auth=register',
    ctaText: 'Elegir categoría y practicar',
    keywords: ['simulador mtc', 'examen de conocimientos mtc', 'balotario mtc', 'licencia de conducir peru'],
    sections: [
      ['Práctica corta para aprender', 'Responde 5 preguntas sin cronómetro, recibe la explicación completa y vuelve a practicar las preguntas que más fallas.'],
      ['Simulacro cronometrado', 'Responde 40 preguntas en 40 minutos. Solo estos simulacros alimentan el promedio, la evolución y los temas débiles de Mi avance.'],
      ['Balotario por categoría', 'Cada licencia usa su propia selección de preguntas. La plataforma enlaza el PDF correspondiente y las fuentes oficiales del MTC.'],
    ],
    faqs: [
      ['Que es un simulador MTC?', 'Es una herramienta educativa para practicar preguntas similares al examen de conocimientos requerido para obtener o revalidar una licencia de conducir en Peru.'],
      ['Simulador MTC es una pagina oficial?', disclaimer],
      ['Puedo practicar desde el celular?', 'Si. La plataforma esta pensada para estudiar desde celular, tablet o computadora.'],
    ],
  },
  {
    slug: 'metodologia-simulador-mtc',
    title: 'Metodología y fuentes de Simulador MTC',
    description: 'Conoce cómo se organizan, revisan y explican las preguntas de Simulador MTC y qué fuentes oficiales se consultan.',
    h1: 'Cómo revisamos el contenido de Simulador MTC',
    intro: 'La plataforma transforma balotarios públicos en prácticas fáciles de usar. Conservamos el texto completo de las preguntas, separamos las categorías y enlazamos las fuentes para que cada dato importante pueda comprobarse.',
    primaryCta: '/fuentes-mtc',
    ctaText: 'Revisar fuentes oficiales',
    keywords: ['metodologia simulador mtc', 'fuentes simulador mtc', 'preguntas oficiales mtc', 'revision balotario mtc'],
    sections: [
      ['Preguntas sin recortes', 'Cada página de categoría muestra cuarenta preguntas completas y las páginas temáticas publican hasta cuarenta preguntas. Cuando una pregunta depende de una imagen, no se publica sin ese recurso.'],
      ['Separación por licencia', 'A1, A2A, A2B, A3 y las categorías B no comparten exactamente el mismo banco. Cada práctica se filtra por la licencia elegida por la persona.'],
      ['Revisión y correcciones', 'Contrastamos formato, categorías y balotarios con publicaciones del MTC. Si una fuente cambia, se revisa el contenido afectado antes de modificar su fecha editorial.'],
    ],
    faqs: [
      ['Simulador MTC pertenece al MTC?', disclaimer],
      ['Se modifican las preguntas para hacerlas más cortas?', 'No. La interfaz puede adaptar el tamaño visual, pero no debe recortar ni resumir el enunciado o las alternativas.'],
      ['Como puedo verificar una respuesta?', 'Cada guía enlaza sus fuentes y los balotarios descargables. Ante cualquier diferencia, prevalece la publicación oficial vigente.'],
    ],
  },
  {
    slug: 'fuentes-mtc',
    title: 'Fuentes oficiales y balotarios MTC por categoría',
    description: 'Fuentes oficiales MTC y balotarios usados como referencia para estudiar el examen de conocimientos de licencia de conducir en Peru.',
    h1: 'Fuentes oficiales MTC para estudiar el examen de conocimientos',
    intro: 'Para prepararte con criterio, combina practica online con la revision de publicaciones oficiales. Esta pagina centraliza la referencia publica del MTC y los balotarios descargables por categoria.',
    primaryCta: officialMtcSource,
    ctaText: 'Ver publicacion oficial',
    keywords: ['fuentes oficiales mtc', 'balotario oficial mtc', 'examen conocimientos mtc gob pe'],
    sections: [
      ['Publicacion oficial', 'El MTC publica material de examen de conocimientos para postulantes a licencias de conducir. Revisa la fuente oficial para confirmar vigencia.'],
      ['Uso educativo', 'Simulador MTC organiza practica, explicaciones y recursos para estudiar, pero no reemplaza a la normativa o comunicados oficiales.'],
      ['Actualizacion constante', 'Cuando el MTC publica cambios o nuevos balotarios, conviene revisar las preguntas y reforzar los temas afectados.'],
    ],
    faqs: [
      ['Cual es la fuente oficial?', `La publicacion oficial se encuentra en ${officialMtcSource}.`],
      ['Simulador MTC pertenece al MTC?', disclaimer],
      ['Por que enlazar fuentes oficiales?', 'Porque el usuario debe poder validar informacion normativa y fecha de publicacion antes de rendir su examen.'],
    ],
  },
  {
    slug: 'examen-mtc-preguntas',
    title: 'Preguntas del examen MTC: practica y temas que debes dominar',
    description: 'Guia para practicar preguntas del examen MTC por tema: senales, normas, seguridad vial, mecanica basica y primeros auxilios.',
    h1: 'Preguntas del examen MTC por tema',
    intro: 'El examen de conocimientos evalua si entiendes las normas de transito y puedes tomar decisiones seguras. Practicar por tema ayuda a detectar errores repetidos antes del examen real.',
    primaryCta: '/',
    ctaText: 'Empezar simulacro',
    keywords: ['preguntas examen mtc', 'examen de conocimientos mtc', 'preguntas licencia de conducir peru'],
    sections: [
      ['Senales de transito', 'Reconoce senales reglamentarias, preventivas e informativas; identifica prioridades, restricciones y advertencias antes de elegir una respuesta.'],
      ['Normas de circulacion', 'Repasa preferencia de paso, adelantamiento, velocidad, uso de carriles y conducta en intersecciones.'],
      ['Seguridad y manejo defensivo', 'Entrena respuestas para evitar riesgos, mantener distancia, reaccionar ante peatones y conducir con mayor anticipacion.'],
    ],
    faqs: [
      ['Cuantas preguntas debo practicar?', 'Conviene practicar todas las categorias que correspondan a tu licencia y repetir los temas donde tengas menor porcentaje.'],
      ['Que pasa si fallo una pregunta?', 'La plataforma muestra la respuesta correcta y una explicacion breve para que entiendas la razon y no solo memorices.'],
      ['De donde salen los temas?', 'Se organizan a partir de materias usuales del examen de conocimientos y balotarios publicados por entidades oficiales.'],
    ],
  },
  {
    slug: 'senales-de-transito',
    title: 'Señales de tránsito MTC: tipos y preguntas del examen',
    description: 'Aprende a reconocer senales de transito para el examen MTC y practica preguntas con explicacion inmediata.',
    h1: 'Senales de transito para el examen MTC',
    intro: 'Las senales suelen decidir muchas preguntas del examen. La clave es reconocer el tipo de senal y la conducta que exige al conductor.',
    primaryCta: '/',
    ctaText: 'Practicar en el simulador',
    keywords: ['senales de transito mtc', 'senales reglamentarias', 'examen de manejo senales'],
    sections: [
      ['Reglamentarias', 'Indican obligaciones, prohibiciones o restricciones. Si una pregunta muestra borde rojo o simbolos de prohibicion, debes identificar la conducta exigida.'],
      ['Preventivas', 'Advierten riesgos en la via. Suelen pedir reducir velocidad, aumentar atencion o anticipar una maniobra segura.'],
      ['Informativas', 'Orientan sobre servicios, destinos o condiciones de la ruta; no siempre implican detenerse o cambiar de carril.'],
    ],
    faqs: [
      ['Como estudiar senales de transito?', 'Agrupa las senales por funcion y practica preguntas hasta reconocer que accion pide cada una.'],
      ['Las senales tienen imagenes en el simulador?', 'Algunas preguntas incluyen imagenes asociadas para practicar interpretacion visual.'],
      ['Que senales son mas importantes?', 'Las de prohibicion, prioridad, velocidad, cruce, zona escolar y advertencias de peligro suelen ser muy frecuentes.'],
    ],
  },
  {
    slug: 'reglas-de-transito-peru',
    title: 'Reglas de transito en Peru para aprobar el examen MTC',
    description: 'Repasa reglas de transito en Peru: prioridades, adelantamiento, semaforos, velocidad, licencias y seguridad vial.',
    h1: 'Reglas de transito en Peru para el examen MTC',
    intro: 'Las reglas de transito no se aprenden solo memorizando respuestas. Hay que entender la prioridad de seguridad: prevenir riesgo, respetar senales y actuar con prudencia.',
    primaryCta: '/clases',
    ctaText: 'Ver clases',
    keywords: ['reglas de transito peru', 'normas de transito mtc', 'examen de reglas de transito'],
    sections: [
      ['Prioridad y preferencia', 'Identifica quien debe ceder el paso, cuando detenerse y como actuar en intersecciones con o sin senalizacion.'],
      ['Adelantamiento y carriles', 'Distingue lineas continuas, discontinuas, doble linea y condiciones donde adelantar esta prohibido o permitido.'],
      ['Semaforos y velocidad', 'Repasa luz roja, ambar, verde, intermitentes y limites de velocidad segun tipo de via o zona.'],
    ],
    faqs: [
      ['Cual es la mejor forma de repasar reglas?', 'Responde preguntas por tema, lee la explicacion y vuelve a practicar solo las que fallaste.'],
      ['Las reglas cambian?', 'Pueden actualizarse, por eso conviene revisar fuentes oficiales y balotarios vigentes.'],
      ['El simulador reemplaza estudiar el reglamento?', 'No. Es una herramienta de practica que complementa la lectura de normas y material oficial.'],
    ],
  },
];

const articlePages = [
  {
    type: 'Article',
    slug: 'como-aprobar-examen-mtc',
    title: 'Como aprobar el examen MTC: plan de estudio practico',
    description: 'Plan de estudio para aprobar el examen MTC de conocimientos con practica por temas, simulacros y repaso de errores frecuentes.',
    h1: 'Como aprobar el examen MTC de conocimientos',
    intro: 'Aprobar el examen MTC depende menos de memorizar opciones y mas de practicar con orden: primero entender senales y reglas, luego medir errores y reforzar los temas con menor porcentaje.',
    primaryCta: '/simulador-mtc',
    ctaText: 'Practicar con simulador',
    keywords: ['como aprobar examen mtc', 'examen mtc', 'simulador mtc', 'licencia de conducir peru'],
    sections: [
      ['1. Empieza por los temas base', 'Repasa senales reglamentarias, preventivas e informativas; despues avanza a prioridad de paso, semaforos, adelantamiento, velocidad y seguridad vial.'],
      ['2. Practica como si fuera el examen', 'Responde un simulacro completo sin mirar respuestas. Al terminar, revisa correctas, incorrectas y pendientes para saber que tema esta bajando tu puntaje.'],
      ['3. No memorices sin entender', 'Lee la explicacion de cada error. Si entiendes por que una opcion es insegura o contraria a la norma, es mas facil responder bien cuando la pregunta cambia de forma.'],
    ],
    faqs: [
      ['Cuanto tiempo estudiar para el examen MTC?', 'Depende de tu base, pero conviene estudiar en bloques cortos diarios y repetir los temas donde fallas mas.'],
      ['Que tema debo estudiar primero?', 'Senales de transito y reglas de circulacion suelen ser buenos puntos de partida porque aparecen en muchas preguntas.'],
      ['Es suficiente hacer un solo simulacro?', 'No. Lo ideal es hacer varios intentos y revisar los errores antes de volver a practicar.'],
    ],
  },
  {
    type: 'Article',
    slug: 'cuantas-preguntas-tiene-examen-mtc',
    title: 'Cuantas preguntas tiene el examen MTC y como prepararte',
    description: 'Conoce como prepararte para el examen MTC de conocimientos, como medir tu avance y que temas reforzar antes de rendir.',
    h1: 'Cuantas preguntas tiene el examen MTC',
    intro: 'La cantidad exacta y reglas del examen pueden variar segun disposiciones vigentes, por eso debes confirmar siempre la informacion oficial antes de rendir. Para estudiar, lo importante es practicar por bloques y medir tu porcentaje por tema.',
    primaryCta: '/examen-mtc-preguntas',
    ctaText: 'Ver preguntas por tema',
    keywords: ['cuantas preguntas tiene el examen mtc', 'examen de conocimientos mtc', 'preguntas mtc'],
    sections: [
      ['Confirma la regla vigente', 'Antes de tu cita revisa canales oficiales o el centro autorizado donde rendiras el examen, porque los requisitos operativos pueden cambiar.'],
      ['Entrena con bloques completos', 'Practicar con 40 preguntas te ayuda a simular presion, tiempo y cansancio, aunque tambien debes hacer practicas cortas por tema.'],
      ['Mide por tema, no solo por nota', 'Un promedio general puede esconder debilidades. Si fallas semaforos, lineas o prioridad de paso, refuerza ese bloque antes de intentar de nuevo.'],
    ],
    faqs: [
      ['Debo practicar preguntas al azar o por tema?', 'Haz ambas cosas: por tema para aprender y al azar para simular el examen.'],
      ['Que hago si bajo mi puntaje?', 'Revisa los temas fallados, lee explicaciones y repite solo ese bloque antes de otro simulacro completo.'],
      ['Donde verifico informacion oficial?', `En publicaciones y canales oficiales como ${officialMtcSource}.`],
    ],
  },
  {
    type: 'Article',
    slug: 'balotario-mtc-pdf',
    title: 'Balotario MTC PDF: descarga por categoria y estudia mejor',
    description: 'Descarga balotarios MTC en PDF por categoria y aprende como combinarlos con simulacros y explicaciones para estudiar mejor.',
    h1: 'Balotario MTC PDF por categoria',
    intro: 'El PDF del balotario sirve para estudiar sin conexion, pero el aprendizaje mejora cuando alternas lectura, practica y revision de errores.',
    primaryCta: '/fuentes-mtc',
    ctaText: 'Ver fuentes y PDF',
    keywords: ['balotario mtc pdf', 'balotario mtc a1 pdf', 'pdf examen mtc', 'balotario oficial mtc'],
    sections: [
      ['Descarga el PDF correcto', 'Elige el balotario de tu categoria de licencia: A1, A2A, A2B, A3A, A3B, A3C o categorias B segun corresponda.'],
      ['Marca preguntas dudosas', 'Mientras lees el PDF, separa las preguntas donde no puedes justificar la respuesta. Esas deben ir primero a practica.'],
      ['Complementa con simulador', 'El simulador te da retroalimentacion inmediata y resultados por tema, algo que el PDF por si solo no muestra.'],
    ],
    faqs: [
      ['El balotario PDF es suficiente?', 'Ayuda bastante, pero practicar con explicaciones mejora la retencion.'],
      ['Puedo descargar todos los PDF?', 'Si. La pagina de fuentes y el panel principal incluyen accesos a los balotarios por categoria.'],
      ['Simulador MTC es oficial?', disclaimer],
    ],
  },
  {
    type: 'Article',
    slug: 'preguntas-frecuentes-examen-mtc',
    title: 'Preguntas frecuentes del examen MTC antes de rendir',
    description: 'Respuestas a dudas frecuentes sobre el examen MTC de conocimientos, practica, balotarios y preparacion por categoria.',
    h1: 'Preguntas frecuentes del examen MTC',
    intro: 'Antes de rendir, muchos postulantes tienen las mismas dudas: que estudiar, como practicar, como saber si estan listos y donde revisar fuentes oficiales.',
    primaryCta: '/examen-mtc-preguntas',
    ctaText: 'Practicar preguntas',
    keywords: ['preguntas frecuentes examen mtc', 'dudas examen mtc', 'examen de conocimientos mtc'],
    sections: [
      ['Que debo llevar al examen', 'Los requisitos operativos dependen del tramite y del centro autorizado. Verifica la informacion vigente antes de asistir.'],
      ['Como saber si estoy listo', 'Si puedes explicar por que la respuesta correcta es correcta y mantienes buen porcentaje por tema, estas mejor preparado.'],
      ['Que hacer el ultimo dia', 'Evita aprender todo de cero. Repasa errores frecuentes, senales y reglas de prioridad con practicas cortas.'],
    ],
    faqs: [
      ['Puedo practicar desde mi celular?', 'Si. La plataforma esta pensada para estudiar desde celular o computadora.'],
      ['Debo estudiar todas las categorias?', 'No. Prioriza la categoria de licencia que vas a obtener o revalidar.'],
      ['La pagina reemplaza la informacion oficial?', 'No. Es una plataforma educativa independiente.'],
    ],
  },
  {
    type: 'Article',
    slug: 'senales-reglamentarias-mtc',
    title: 'Senales reglamentarias MTC: como reconocerlas en el examen',
    description: 'Aprende a reconocer senales reglamentarias para el examen MTC y evita errores comunes de prohibicion, obligacion y prioridad.',
    h1: 'Senales reglamentarias para el examen MTC',
    intro: 'Las senales reglamentarias indican obligaciones, restricciones o prohibiciones. En el examen, suelen exigir una accion clara del conductor.',
    primaryCta: '/senales-de-transito',
    ctaText: 'Estudiar senales',
    keywords: ['senales reglamentarias mtc', 'senales de transito examen mtc', 'senales de prohibicion'],
    sections: [
      ['Como identificarlas', 'Muchas senales reglamentarias usan borde rojo, simbolos de prohibicion o mensajes de obligacion. La forma y color orientan la respuesta.'],
      ['Que pregunta el examen', 'Puede pedir el significado de una senal, la conducta correcta o la consecuencia de no respetarla.'],
      ['Error frecuente', 'Elegir una respuesta solo por memoria visual sin leer si la senal prohible, obliga o restringe una maniobra.'],
    ],
    faqs: [
      ['Todas las senales rojas son de prohibicion?', 'No siempre. Revisa el simbolo y el mensaje exacto antes de responder.'],
      ['Como practicar senales?', 'Agrupa por funcion y responde preguntas con imagen hasta reconocer la conducta exigida.'],
      ['Se deben memorizar los nombres?', 'Ayuda, pero lo mas importante es saber que accion debe tomar el conductor.'],
    ],
  },
  {
    type: 'Article',
    slug: 'senales-preventivas-mtc',
    title: 'Senales preventivas MTC: claves para responder bien',
    description: 'Guia de senales preventivas para el examen MTC: advertencias, riesgos en la via y respuesta segura del conductor.',
    h1: 'Senales preventivas para el examen MTC',
    intro: 'Las senales preventivas anticipan un riesgo. La respuesta correcta normalmente apunta a reducir velocidad, aumentar atencion y conducir con prudencia.',
    primaryCta: '/senales-de-transito',
    ctaText: 'Practicar senales',
    keywords: ['senales preventivas mtc', 'senales de advertencia', 'examen mtc senales preventivas'],
    sections: [
      ['Que comunican', 'Advierten curvas, cruces, peatones, zonas escolares, pendientes, animales, obras u otros peligros potenciales.'],
      ['Como responder', 'Piensa en una conducta preventiva: disminuir velocidad, conservar distancia y prepararte para maniobrar con seguridad.'],
      ['Distractores comunes', 'Opciones que ordenan detenerse siempre o acelerar suelen ser incorrectas si la senal solo advierte riesgo.'],
    ],
    faqs: [
      ['Una senal preventiva obliga a detenerse?', 'No necesariamente. Advierte un peligro para que adaptes tu conduccion.'],
      ['Que color suelen tener?', 'Depende del diseno oficial, pero el sentido principal es advertir y prevenir.'],
      ['Como diferencio preventiva de reglamentaria?', 'La preventiva advierte riesgo; la reglamentaria impone una obligacion o prohibicion.'],
    ],
  },
  {
    type: 'Article',
    slug: 'preguntas-mtc-semaforo',
    title: 'Preguntas MTC sobre semaforo: rojo, ambar, verde e intermitente',
    description: 'Repasa preguntas MTC sobre semaforos, luz ambar, luz roja, luz verde y conducta segura en intersecciones.',
    h1: 'Preguntas MTC sobre semaforo',
    intro: 'Las preguntas de semaforo suelen parecer faciles, pero fallan cuando la opcion incluye condiciones como interseccion, velocidad, ubicacion o seguridad.',
    primaryCta: '/examen-mtc-preguntas',
    ctaText: 'Practicar semaforos',
    keywords: ['preguntas mtc semaforo', 'luz ambar examen mtc', 'semaforo examen de manejo'],
    sections: [
      ['Luz roja', 'Exige detenerse antes de la linea o zona de cruce, salvo reglas especificas vigentes que debes verificar oficialmente.'],
      ['Luz ambar', 'Advierte cambio de fase. La conducta segura depende de si puedes detenerte sin riesgo antes de ingresar a la interseccion.'],
      ['Luz verde', 'Permite avanzar, pero no elimina la obligacion de observar peatones, vehiculos y condiciones de seguridad.'],
    ],
    faqs: [
      ['La luz ambar significa acelerar?', 'No. Normalmente advierte precaucion y cambio de fase; acelerar puede ser inseguro.'],
      ['Puedo avanzar con verde siempre?', 'Solo si la via esta libre y no bloqueas la interseccion.'],
      ['Por que se fallan estas preguntas?', 'Porque muchos responden por impulso y no leen la condicion completa.'],
    ],
  },
  {
    type: 'Article',
    slug: 'prioridad-de-paso-examen-mtc',
    title: 'Prioridad de paso en el examen MTC: reglas para no confundirte',
    description: 'Aprende como responder preguntas MTC sobre prioridad de paso, intersecciones, peatones y preferencia vehicular.',
    h1: 'Prioridad de paso en el examen MTC',
    intro: 'La prioridad de paso evalua si sabes evitar conflictos en intersecciones y zonas de cruce. La respuesta correcta suele proteger al usuario mas vulnerable y respetar la senalizacion.',
    primaryCta: '/reglas-de-transito-peru',
    ctaText: 'Repasar reglas',
    keywords: ['prioridad de paso examen mtc', 'preferencia de paso mtc', 'intersecciones mtc'],
    sections: [
      ['Mira la senalizacion primero', 'Semaforos, senales de pare, ceda el paso y marcas viales definen la conducta antes que la costumbre del conductor.'],
      ['Identifica usuarios vulnerables', 'Peatones, escolares y ciclistas requieren mayor precaucion, especialmente en zonas de cruce o baja visibilidad.'],
      ['Evita respuestas absolutas', 'Palabras como siempre o nunca pueden ser distractores si la pregunta tiene condiciones especificas.'],
    ],
    faqs: [
      ['Que hacer en una interseccion sin senales?', 'Actua con prudencia, reduce velocidad y aplica reglas de preferencia vigentes.'],
      ['El peaton siempre tiene prioridad?', 'En zonas y condiciones reguladas debes extremar precaucion y respetar la preferencia que corresponda.'],
      ['Como practicar este tema?', 'Responde casos de intersecciones y explica en voz alta quien debe ceder y por que.'],
    ],
  },
  {
    type: 'Article',
    slug: 'adelantamiento-linea-continua-mtc',
    title: 'Adelantamiento y linea continua en preguntas MTC',
    description: 'Guia para responder preguntas MTC sobre adelantamiento, linea continua, linea discontinua y doble linea amarilla.',
    h1: 'Adelantamiento y linea continua en el examen MTC',
    intro: 'Las preguntas de adelantamiento mezclan marcas viales, visibilidad y seguridad. Aprende a leer la linea de tu lado y la condicion de la via.',
    primaryCta: '/reglas-de-transito-peru',
    ctaText: 'Practicar reglas',
    keywords: ['adelantamiento linea continua mtc', 'doble linea amarilla mtc', 'preguntas mtc adelantamiento'],
    sections: [
      ['Linea continua', 'Generalmente indica que no debes cruzarla ni adelantar desde ese lado, porque la maniobra puede ser peligrosa o prohibida.'],
      ['Linea discontinua', 'Puede permitir adelantamiento si la visibilidad, distancia y condiciones de seguridad lo permiten.'],
      ['Doble linea combinada', 'Debes atender la linea que esta de tu lado: si es continua, no adelantar; si es discontinua, la maniobra puede permitirse con seguridad.'],
    ],
    faqs: [
      ['Puedo adelantar si veo espacio?', 'No basta ver espacio; tambien debes revisar marcas, senales, visibilidad y seguridad.'],
      ['Que significa doble linea amarilla?', 'Separa sentidos de circulacion y puede incluir restricciones segun el trazo de cada lado.'],
      ['Por que este tema confunde?', 'Porque la opcion correcta depende de la linea que corresponde a tu sentido de circulacion.'],
    ],
  },
  {
    type: 'Article',
    slug: 'manejo-defensivo-examen-mtc',
    title: 'Manejo defensivo para el examen MTC: tecnicas clave',
    description: 'Repasa manejo defensivo para el examen MTC: distancia, anticipacion, velocidad segura y respuesta ante riesgos.',
    h1: 'Manejo defensivo para el examen MTC',
    intro: 'El manejo defensivo no es solo teoria. En el examen aparece como decisiones concretas para anticipar riesgos y evitar accidentes.',
    primaryCta: '/clases',
    ctaText: 'Ver clases',
    keywords: ['manejo defensivo examen mtc', 'seguridad vial mtc', 'conduccion preventiva'],
    sections: [
      ['Anticipa riesgos', 'Observa mas alla del vehiculo de adelante, identifica peatones, cruces, cambios de carril y zonas de poca visibilidad.'],
      ['Mantén distancia', 'La distancia de seguridad te da tiempo para frenar y evitar choques por alcance.'],
      ['Adapta velocidad', 'La velocidad segura no siempre es la maxima permitida; depende del clima, via, trafico y visibilidad.'],
    ],
    faqs: [
      ['Que es manejar defensivamente?', 'Conducir anticipando errores propios y ajenos para reducir riesgos.'],
      ['El examen pregunta teoria o casos?', 'Puede preguntar definiciones y tambien situaciones practicas.'],
      ['Como estudio este tema?', 'Relaciona cada respuesta con la conducta mas segura y preventiva.'],
    ],
  },
  {
    type: 'Article',
    slug: 'mecanica-basica-examen-mtc',
    title: 'Mecanica basica para el examen MTC: que estudiar',
    description: 'Temas de mecanica basica para el examen MTC: luces, frenos, neumaticos, mantenimiento preventivo y seguridad.',
    h1: 'Mecanica basica para el examen MTC',
    intro: 'La mecanica basica evalua si reconoces condiciones minimas de seguridad del vehiculo antes y durante la conduccion.',
    primaryCta: '/clases',
    ctaText: 'Estudiar mecanica basica',
    keywords: ['mecanica basica examen mtc', 'preguntas mecanica mtc', 'mantenimiento vehicular examen'],
    sections: [
      ['Luces y visibilidad', 'Debes saber para que sirven luces altas, bajas, direccionales, emergencia y freno, ademas de usarlas sin encandilar.'],
      ['Frenos y neumaticos', 'Frenos en mal estado o llantas desgastadas aumentan distancia de frenado y riesgo de accidente.'],
      ['Mantenimiento preventivo', 'Revisar niveles, luces, presion de neumaticos y documentos evita fallas y sanciones.'],
    ],
    faqs: [
      ['Necesito saber reparar un motor?', 'No a nivel mecanico profundo; el examen suele enfocarse en seguridad y mantenimiento basico.'],
      ['Que revisar antes de conducir?', 'Luces, frenos, llantas, espejos, combustible, documentos y condiciones generales.'],
      ['Por que entra mecanica en el examen?', 'Porque el estado del vehiculo influye directamente en la seguridad vial.'],
    ],
  },
  {
    type: 'Article',
    slug: 'primeros-auxilios-examen-mtc',
    title: 'Primeros auxilios para el examen MTC: respuestas seguras',
    description: 'Aprende primeros auxilios para el examen MTC: seguridad de escena, comunicacion de emergencia y ayuda inicial responsable.',
    h1: 'Primeros auxilios para el examen MTC',
    intro: 'Las preguntas de primeros auxilios buscan comprobar que actuaras sin aumentar el riesgo para la victima, otros usuarios o para ti.',
    primaryCta: '/clases',
    ctaText: 'Estudiar primeros auxilios',
    keywords: ['primeros auxilios examen mtc', 'emergencias examen mtc', 'seguridad de escena'],
    sections: [
      ['Asegura la escena', 'Antes de ayudar, verifica que no haya riesgo de atropello, incendio, derrame u otra amenaza inmediata.'],
      ['Pide ayuda', 'Comunica la emergencia a los servicios correspondientes y brinda ubicacion clara.'],
      ['Evita maniobras peligrosas', 'No muevas a una persona lesionada salvo peligro inminente, porque puedes agravar lesiones.'],
    ],
    faqs: [
      ['Que hago primero en un accidente?', 'Proteger la escena, avisar y ayudar segun tus capacidades sin exponerte.'],
      ['Debo mover al herido?', 'Solo si existe peligro inmediato que obliga a retirarlo de la zona.'],
      ['Por que estudiar primeros auxilios?', 'Porque una respuesta inicial correcta puede reducir danos mientras llega ayuda especializada.'],
    ],
  },
  {
    type: 'Article',
    slug: 'revalidacion-licencia-mtc-examen',
    title: 'Revalidacion de licencia MTC: como prepararte para el examen',
    description: 'Consejos para prepararte si debes rendir examen de conocimientos en una revalidacion de licencia MTC.',
    h1: 'Revalidacion de licencia MTC y examen de conocimientos',
    intro: 'Si vas a revalidar, no confies solo en la experiencia manejando. El examen mide conocimiento de reglas, senales y seguridad segun criterios vigentes.',
    primaryCta: '/simulador-mtc',
    ctaText: 'Practicar ahora',
    keywords: ['revalidacion licencia mtc examen', 'examen revalidacion licencia conducir', 'simulador mtc revalidacion'],
    sections: [
      ['Actualiza tus reglas', 'Algunas normas o criterios pueden cambiar. Revisa material vigente antes de rendir.'],
      ['Detecta habitos incorrectos', 'La experiencia ayuda, pero tambien puede consolidar costumbres contrarias a la norma. Practicar revela esos errores.'],
      ['Refuerza por tema', 'Si fallas en senales o prioridad, practica ese bloque antes de hacer otro simulacro completo.'],
    ],
    faqs: [
      ['Revalidar significa estudiar menos?', 'No necesariamente. Debes estar actualizado y responder segun la norma, no solo por costumbre.'],
      ['Que temas repasar para revalidacion?', 'Senales, reglas de circulacion, seguridad vial, infracciones y mantenimiento basico.'],
      ['Donde verifico requisitos?', 'Consulta fuentes oficiales y el centro autorizado correspondiente.'],
    ],
  },
  {
    type: 'Article',
    slug: 'temas-mas-dificiles-examen-mtc',
    title: 'Temas mas dificiles del examen MTC y como reforzarlos',
    description: 'Identifica temas dificiles del examen MTC: senales, prioridad, adelantamiento, semaforos, mecanica y primeros auxilios.',
    h1: 'Temas mas dificiles del examen MTC',
    intro: 'Muchos postulantes fallan no por falta de estudio, sino por no saber que tema exacto les esta costando. Separar los errores por bloque acelera el repaso.',
    primaryCta: '/resultados',
    ctaText: 'Revisar resultados',
    keywords: ['temas dificiles examen mtc', 'errores examen mtc', 'como estudiar mtc'],
    sections: [
      ['Senales parecidas', 'Confundir senales reglamentarias, preventivas e informativas puede cambiar completamente la respuesta.'],
      ['Prioridad y adelantamiento', 'Son temas con condiciones: senales, lineas, visibilidad, sentido de circulacion y seguridad.'],
      ['Preguntas de emergencia', 'Primeros auxilios y manejo defensivo requieren elegir la accion mas segura, no la mas rapida.'],
    ],
    faqs: [
      ['Como se que tema debo reforzar?', 'Revisa el porcentaje por tema despues de cada simulacro.'],
      ['Debo repetir todo el balotario?', 'No siempre. Primero repite los bloques donde fallaste.'],
      ['Que hago si fallo muchas senales?', 'Estudia por tipo de senal y practica con imagenes hasta reconocer la accion correcta.'],
    ],
  },
];

const manualQuestionPages = [
  {
    type: 'Quiz',
    slug: 'luz-ambar-semaforo-pregunta-mtc',
    categorySlug: 'a1',
    title: 'Luz ámbar del semáforo: respuesta del balotario MTC',
    description: 'Conoce qué significa la luz ámbar del semáforo según la pregunta 6 del balotario MTC A-I y practica sus cuatro alternativas.',
    h1: '¿Qué significa la luz ámbar del semáforo?',
    intro: 'Debes detenerte antes de ingresar a la intersección si tu velocidad y ubicación lo permiten. Si ya no es posible detenerte con seguridad, cruza y despeja la intersección.',
    primaryCta: '/?auth=register&category=25&next=%2Fsimulacro%2F25%3Fmode%3Dquick%26strategy%3Drandom',
    ctaText: 'Practicar preguntas A1',
    keywords: ['luz ámbar semáforo mtc', 'pregunta semáforo amarillo mtc', 'balotario mtc a1 pregunta 6'],
    question: {
      number: 6,
      text: 'El color ámbar o amarillo del semáforo significa que:',
      options: [
        'Los vehículos deben avanzar.',
        'Los vehículos deben detenerse.',
        'Los vehículos deben acelerar la marcha.',
        'Los vehículos deben detenerse antes de ingresar a la intersección si su velocidad y ubicación lo permiten; de lo contrario, deberán cruzar y despejar la intersección.',
      ],
      correctAnswer: 'Los vehículos deben detenerse antes de ingresar a la intersección si su velocidad y ubicación lo permiten; de lo contrario, deberán cruzar y despejar la intersección.',
      explanation: 'La luz ámbar es una advertencia de cambio. No ordena acelerar y tampoco exige una frenada peligrosa cuando el vehículo ya está demasiado cerca para detenerse con seguridad.',
    },
    sections: [
      ['Regla para recordar', 'Ámbar significa prevención: detente si puedes hacerlo con seguridad antes de la intersección; si no puedes, termina de cruzar y deja libre el cruce.'],
      ['Error frecuente', 'Elegir solo “deben detenerse” deja fuera la excepción que contempla la ubicación y velocidad del vehículo. La alternativa completa es la correcta.'],
      ['Fuente de la pregunta', 'Corresponde a la pregunta 6 del balotario A-I publicado por el MTC. Puedes abrir el PDF enlazado en esta página para comprobar el texto.'],
    ],
    faqs: [
      ['La luz ámbar significa acelerar?', 'No. Advierte que la señal cambiará y exige decidir con seguridad antes de entrar a la intersección.'],
      ['Debo frenar aunque ya esté dentro de la intersección?', 'No debes quedar detenido bloqueando el cruce. Si ya ingresaste, debes despejar la intersección.'],
      ['Esta pregunta corresponde a A1?', 'Sí. Está identificada como la pregunta 6 del balotario A-I usado como fuente.'],
    ],
  },
  {
    type: 'Quiz',
    slug: 'flecha-verde-semaforo-pregunta-mtc',
    categorySlug: 'a1',
    title: 'Flecha verde del semáforo: respuesta del balotario MTC',
    description: 'Aprende qué indica una flecha verde del semáforo según la pregunta 8 del balotario MTC A-I y evita una respuesta incompleta.',
    h1: '¿Qué indica una flecha verde en un semáforo?',
    intro: 'Puedes continuar con precaución únicamente en la dirección de la flecha y desde el carril que esa flecha controla.',
    primaryCta: '/?auth=register&category=25&next=%2Fsimulacro%2F25%3Fmode%3Dquick%26strategy%3Drandom',
    ctaText: 'Practicar preguntas A1',
    keywords: ['flecha verde semáforo mtc', 'qué indica flecha verde semáforo', 'balotario mtc a1 pregunta 8'],
    question: {
      number: 8,
      text: '¿Qué indica una flecha verde en un semáforo vehicular?',
      options: [
        'Se puede continuar con precaución únicamente en la dirección de la flecha y desde el carril que esta flecha controla.',
        'No está permitida la circulación en el sentido que indica la flecha.',
        'Se debe respetar únicamente la luz circular.',
        'Ninguna de las alternativas es correcta.',
      ],
      correctAnswer: 'Se puede continuar con precaución únicamente en la dirección de la flecha y desde el carril que esta flecha controla.',
      explanation: 'La autorización no vale para cualquier carril ni para otra dirección. Debes seguir el sentido de la flecha y mantener precaución antes de avanzar.',
    },
    sections: [
      ['Qué autoriza', 'La flecha verde permite avanzar solo hacia donde apunta. No convierte en libre cualquier otro movimiento de la intersección.'],
      ['Qué carril debe usarla', 'La indicación corresponde al carril controlado por esa flecha. Antes de avanzar, comprueba peatones y condiciones del cruce.'],
      ['Fuente de la pregunta', 'Corresponde a la pregunta 8 del balotario A-I publicado por el MTC y enlazado como PDF en esta página.'],
    ],
    faqs: [
      ['Puedo avanzar en otra dirección si veo una flecha verde?', 'No por efecto de esa flecha. La autorización se limita a la dirección que indica.'],
      ['La flecha verde elimina la precaución?', 'No. La respuesta oficial incluye expresamente que se debe continuar con precaución.'],
      ['Esta pregunta es del balotario A-I?', 'Sí. Figura como la pregunta 8 en el material A-I usado como fuente.'],
    ],
  },
  {
    type: 'Quiz',
    slug: 'linea-amarilla-discontinua-pregunta-mtc',
    categorySlug: 'a1',
    title: 'Línea amarilla discontinua: respuesta del balotario MTC',
    description: 'Conoce cuándo se puede cruzar una línea central amarilla discontinua según la pregunta 5 del balotario MTC A-I.',
    h1: '¿Qué significa una línea amarilla central discontinua?',
    intro: 'Está permitido cruzar al otro carril para adelantar únicamente cuando sea seguro hacerlo.',
    primaryCta: '/?auth=register&category=25&next=%2Fsimulacro%2F25%3Fmode%3Dquick%26strategy%3Drandom',
    ctaText: 'Practicar preguntas A1',
    keywords: ['línea amarilla discontinua mtc', 'adelantamiento línea discontinua', 'balotario mtc a1 pregunta 5'],
    question: {
      number: 5,
      text: 'En las vías, las marcas en el pavimento que son del tipo central discontinua y de color amarillo significan que:',
      options: [
        'Está permitido cruzar al otro carril para el adelantamiento vehicular, si es que es seguro hacerlo.',
        'No está permitido cruzar al otro carril para el adelantamiento vehicular.',
        'Se está reduciendo el ancho de la calzada de la vía por donde se circula.',
        'Se está frente a un lugar de cruce peatonal.',
      ],
      correctAnswer: 'Está permitido cruzar al otro carril para el adelantamiento vehicular, si es que es seguro hacerlo.',
      explanation: 'La discontinuidad permite cruzar la marca, pero no garantiza que la maniobra sea segura. Antes de adelantar debes comprobar visibilidad, distancia y ausencia de prohibiciones adicionales.',
    },
    sections: [
      ['Condición indispensable', 'La respuesta no termina en “está permitido”. Solo puedes cruzar cuando la maniobra sea segura y no exista otra señal que la prohíba.'],
      ['No la confundas', 'Una línea central continua tiene una restricción distinta. Observa primero si la marca es continua o discontinua antes de responder.'],
      ['Fuente de la pregunta', 'Corresponde a la pregunta 5 del balotario A-I publicado por el MTC y disponible desde esta página.'],
    ],
    faqs: [
      ['Siempre puedo adelantar con línea amarilla discontinua?', 'No. La posibilidad depende de que la maniobra sea segura y de que no exista otra prohibición.'],
      ['La línea discontinua indica un cruce peatonal?', 'No. Esa alternativa no corresponde al significado de una línea central amarilla discontinua.'],
      ['Dónde compruebo la pregunta?', 'En el balotario A-I enlazado en la sección de descarga de esta página.'],
    ],
  },
  {
    type: 'Quiz',
    slug: 'senal-r6-prohibido-voltear-izquierda-mtc',
    categorySlug: 'a1',
    title: 'Señal R-6: prohibido voltear a la izquierda | MTC',
    description: 'Aprende qué prohíbe la señal R-6 según la pregunta 3 del balotario MTC A-I y si también impide realizar un giro en U.',
    h1: '¿Qué significa la señal R-6?',
    intro: 'La señal R-6 prohíbe voltear a la izquierda y, por lo tanto, también prohíbe realizar un giro en U.',
    primaryCta: '/?auth=register&category=25&next=%2Fsimulacro%2F25%3Fmode%3Dquick%26strategy%3Drandom',
    ctaText: 'Practicar preguntas A1',
    keywords: ['señal R-6 MTC', 'prohibido voltear izquierda giro en U', 'balotario mtc a1 pregunta 3'],
    question: {
      number: 3,
      text: 'La señal vertical reglamentaria R-6 “prohibido voltear a la izquierda”, significa que:',
      options: [
        'Está prohibido voltear a la izquierda y, por lo tanto también está prohibido el giro en U.',
        'Está prohibido voltear a la izquierda, sin embargo, está permitido el giro en U.',
        'El único sentido de desplazamiento es continuar de frente.',
        'Ninguna de las alternativas es correcta.',
      ],
      correctAnswer: 'Está prohibido voltear a la izquierda y, por lo tanto también está prohibido el giro en U.',
      explanation: 'Un giro en U incluye una maniobra hacia la izquierda, por eso la prohibición de la señal R-6 también alcanza ese giro.',
    },
    sections: [
      ['Qué prohíbe', 'No puedes realizar el giro ordinario a la izquierda ni usar ese movimiento para completar un giro en U.'],
      ['Error frecuente', 'La señal no equivale a una obligación de continuar de frente: puede haber otros movimientos permitidos según la vía y la señalización presente.'],
      ['Fuente de la pregunta', 'Corresponde a la pregunta 3 del balotario A-I publicado por el MTC y enlazado en esta página.'],
    ],
    faqs: [
      ['La señal R-6 permite girar en U?', 'No. La respuesta del balotario indica que también está prohibido el giro en U.'],
      ['R-6 significa que solo puedo seguir de frente?', 'No necesariamente. Su mensaje específico es prohibir el giro a la izquierda.'],
      ['Esta es una señal reglamentaria?', 'Sí. Expresa una prohibición que el conductor debe obedecer.'],
    ],
  },
];

const generatedQuestionPages = questionPageBank.pages.map((entry) => {
  const primaryCategory = categories.find((category) => entry.categorySlugs.includes(category.slug)) || categories[0];
  const simulatorDestination = `/simulacro/${primaryCategory.categoryId}?mode=quick&strategy=random`;
  const heroImage = entry.variants
    .flatMap((variant) => [
      ...variant.questionMedia,
      ...variant.options.flatMap((option) => option.media),
    ])[0] || null;
  const categoryLabel = entry.categories.join(', ');
  const sourceReferences = entry.variants.flatMap((variant) => variant.sources);
  const sourceSummary = [...new Map(sourceReferences.map((source) => [
    `${source.code}-${source.number}-${source.page}`,
    `${source.code}, pregunta ${source.number}, página ${source.page}`,
  ])).values()].join('; ');

  return {
    type: 'Quiz',
    slug: entry.slug,
    categorySlug: primaryCategory.slug,
    title: entry.title,
    description: entry.description,
    h1: entry.h1,
    intro: entry.intro,
    primaryCta: `/?auth=register&category=${primaryCategory.categoryId}&next=${encodeURIComponent(simulatorDestination)}`,
    ctaText: `Practicar ${primaryCategory.common}`,
    secondaryCta: `/mtc-official/${primaryCategory.pdf}`,
    secondaryCtaText: `Abrir balotario ${primaryCategory.code}`,
    keywords: [entry.h1, `pregunta examen MTC ${primaryCategory.common}`, `balotario ${categoryLabel}`, entry.topic],
    topicName: entry.topic,
    topicSlug: entry.topicSlug,
    questionVariants: entry.variants,
    questionCategories: entry.categories,
    heroImage,
    sections: [
      ['Respuesta indicada en el balotario', entry.intro],
      ['Categorías donde aparece', `Esta pregunta se encuentra en los balotarios ${categoryLabel}. Revisa la versión de tu licencia antes de memorizar una alternativa.`],
      ['Ubicación verificable', `Referencias conservadas desde los PDF publicados: ${sourceSummary}.`],
    ],
    faqs: [
      ['Cuál es la respuesta correcta?', entry.intro],
      ['En qué categorías aparece esta pregunta?', `Aparece en ${categoryLabel}.`],
      ['Dónde puedo comprobar el texto completo?', 'En los PDF del MTC enlazados junto a cada versión de la pregunta.'],
    ],
  };
});

const questionPages = [...manualQuestionPages, ...generatedQuestionPages];
const questionDirectoryPage = {
  slug: 'preguntas-mtc',
  title: 'Preguntas MTC con respuestas por tema y categoría',
  description: 'Consulta preguntas del balotario MTC con alternativas, respuesta, imágenes y referencia al PDF de cada categoría de licencia.',
  h1: 'Preguntas MTC con respuestas verificables',
  intro: `Explora ${generatedQuestionPages.length} preguntas prioritarias con su texto completo, respuesta y ubicación en los balotarios publicados por el MTC.`,
  primaryCta: '/simulador-mtc',
  ctaText: 'Practicar en el simulador',
  secondaryCta: '/fuentes-mtc',
  secondaryCtaText: 'Revisar fuentes',
  keywords: ['preguntas examen MTC', 'balotario MTC con respuestas', 'preguntas MTC por categoría', 'respuestas examen de manejo'],
  questionDirectory: true,
  sections: [
    ['Texto completo', 'Cada enlace abre una sola pregunta con sus alternativas y sin recortar el enunciado.'],
    ['Respuesta verificable', 'La respuesta se conserva desde el balotario y muestra su número, página y categoría de origen.'],
    ['Imágenes reales', 'Cuando la pregunta depende de una señal o gráfico, la página incluye el recurso extraído y verificado contra el PDF.'],
  ],
  faqs: [
    ['Las preguntas están separadas por categoría?', 'Sí. Cada respuesta indica en qué balotarios aparece y permite abrir la práctica correspondiente.'],
    ['Las preguntas con imágenes muestran el gráfico?', 'Sí. Las páginas visuales conservan las imágenes extraídas de los PDF y su proporción original.'],
    ['Dónde verifico una respuesta?', 'Cada pregunta enlaza el PDF y la página donde se encuentra la versión correspondiente.'],
  ],
};

function pageUrl(slug) {
  return `${siteUrl}/${slug}`;
}

const spanishCorrections = [
  [/\bPeru\b/g, 'Perú'],
  [/\bpreparacion\b/gi, (word) => word[0] === 'P' ? 'Preparación' : 'preparación'],
  [/\bcategorias\b/gi, (word) => word[0] === 'C' ? 'Categorías' : 'categorías'],
  [/\bcategoria\b/gi, (word) => word[0] === 'C' ? 'Categoría' : 'categoría'],
  [/\bpracticas\b/gi, (word) => word[0] === 'P' ? 'Prácticas' : 'prácticas'],
  [/\b(Comenzar|combina|con|de|Incluye|la|organiza|tu|una) practica\b/g, '$1 práctica'],
  [/\bpractica(?=\s*(?:,|adaptada|guiada|online|por tema|por temas|que complementa|y revision))/g, 'práctica'],
  [/\bPractica (online|por tema)\b/g, 'Práctica $1'],
  [/\bpractico\b/g, 'práctico'],
  [/\bexplicaciones\b/gi, (word) => word[0] === 'E' ? 'Explicaciones' : 'explicaciones'],
  [/\bexplicacion\b/gi, (word) => word[0] === 'E' ? 'Explicación' : 'explicación'],
  [/\bsenales\b/gi, (word) => word[0] === 'S' ? 'Señales' : 'señales'],
  [/\bsenal\b/gi, (word) => word[0] === 'S' ? 'Señal' : 'señal'],
  [/\btransito\b/gi, (word) => word[0] === 'T' ? 'Tránsito' : 'tránsito'],
  [/\bvehiculos\b/gi, (word) => word[0] === 'V' ? 'Vehículos' : 'vehículos'],
  [/\bvehiculo\b/gi, (word) => word[0] === 'V' ? 'Vehículo' : 'vehículo'],
  [/\bconduccion\b/gi, (word) => word[0] === 'C' ? 'Conducción' : 'conducción'],
  [/\bpublicacion\b/gi, (word) => word[0] === 'P' ? 'Publicación' : 'publicación'],
  [/\binformacion\b/gi, (word) => word[0] === 'I' ? 'Información' : 'información'],
  [/\bevaluacion\b/gi, (word) => word[0] === 'E' ? 'Evaluación' : 'evaluación'],
  [/\brevision\b/gi, (word) => word[0] === 'R' ? 'Revisión' : 'revisión'],
  [/\bretencion\b/gi, (word) => word[0] === 'R' ? 'Retención' : 'retención'],
  [/\bcirculacion\b/gi, (word) => word[0] === 'C' ? 'Circulación' : 'circulación'],
  [/\bprohibicion\b/gi, (word) => word[0] === 'P' ? 'Prohibición' : 'prohibición'],
  [/\bobligacion\b/gi, (word) => word[0] === 'O' ? 'Obligación' : 'obligación'],
  [/\bsemaforos\b/gi, (word) => word[0] === 'S' ? 'Semáforos' : 'semáforos'],
  [/\bsemaforo\b/gi, (word) => word[0] === 'S' ? 'Semáforo' : 'semáforo'],
  [/\bambar\b/gi, (word) => word[0] === 'A' ? 'Ámbar' : 'ámbar'],
  [/\bintersecciones\b/gi, (word) => word[0] === 'I' ? 'Intersecciones' : 'intersecciones'],
  [/\binterseccion\b/gi, (word) => word[0] === 'I' ? 'Intersección' : 'intersección'],
  [/\blineas\b/gi, (word) => word[0] === 'L' ? 'Líneas' : 'líneas'],
  [/\blinea\b/gi, (word) => word[0] === 'L' ? 'Línea' : 'línea'],
  [/\bmecanica\b/gi, (word) => word[0] === 'M' ? 'Mecánica' : 'mecánica'],
  [/\bbasica\b/gi, (word) => word[0] === 'B' ? 'Básica' : 'básica'],
  [/\bbasico\b/gi, (word) => word[0] === 'B' ? 'Básico' : 'básico'],
  [/\bneumaticos\b/gi, (word) => word[0] === 'N' ? 'Neumáticos' : 'neumáticos'],
  [/\bultimo\b/gi, (word) => word[0] === 'U' ? 'Último' : 'último'],
  [/\bdespues\b/gi, (word) => word[0] === 'D' ? 'Después' : 'después'],
  [/\bpreparate\b/gi, (word) => word[0] === 'P' ? 'Prepárate' : 'prepárate'],
  [/\brazon\b/gi, (word) => word[0] === 'R' ? 'Razón' : 'razón'],
  [/\bretroalimentacion\b/gi, (word) => word[0] === 'R' ? 'Retroalimentación' : 'retroalimentación'],
  [/\bpagina\b/gi, (word) => word[0] === 'P' ? 'Página' : 'página'],
  [/\bguias\b/gi, (word) => word[0] === 'G' ? 'Guías' : 'guías'],
  [/\bguia\b/gi, (word) => word[0] === 'G' ? 'Guía' : 'guía'],
  [/\bdificiles\b/gi, (word) => word[0] === 'D' ? 'Difíciles' : 'difíciles'],
  [/\bdificil\b/gi, (word) => word[0] === 'D' ? 'Difícil' : 'difícil'],
  [/\bvia\b/gi, (word) => word[0] === 'V' ? 'Vía' : 'vía'],
  [/\bcomunicacion\b/gi, (word) => word[0] === 'C' ? 'Comunicación' : 'comunicación'],
  [/\banticipacion\b/gi, (word) => word[0] === 'A' ? 'Anticipación' : 'anticipación'],
  [/\brevalidacion\b/gi, (word) => word[0] === 'R' ? 'Revalidación' : 'revalidación'],
  [/\bimagenes\b/gi, (word) => word[0] === 'I' ? 'Imágenes' : 'imágenes'],
  [/\baccion\b/gi, (word) => word[0] === 'A' ? 'Acción' : 'acción'],
  [/\btambien\b/gi, (word) => word[0] === 'T' ? 'También' : 'también'],
  [/\bademas\b/gi, (word) => word[0] === 'A' ? 'Además' : 'además'],
  [/\bsegun\b/gi, (word) => word[0] === 'S' ? 'Según' : 'según'],
  [/\bmas\b/gi, (word) => word[0] === 'M' ? 'Más' : 'más'],
];

function normalizeSpanish(value) {
  let text = String(value);
  for (const [pattern, replacement] of spanishCorrections) text = text.replace(pattern, replacement);
  return text
    .replace(/\bpor que\b/gi, 'por qué')
    .replace(/\bcomo (aprobar|actuar|combinar|descartar|estudiar|medir|practicar|prepararte|reforzar|reforzarlos|responder|saber|se calcula|usar)\b/gi, 'cómo $1')
    .replace(/\bCómo se que\b/g, 'Cómo sé qué')
    .replace(/^Como\b/, 'Cómo')
    .replace(/^Cuantas\b/, 'Cuántas')
    .replace(/^Cuanto\b/, 'Cuánto')
    .replace(/^Que\b/, 'Qué')
    .replace(/^¿Que\b/, '¿Qué')
    .replace(/^Donde\b/, 'Dónde')
    .replace(/^Cual\b/, 'Cuál')
    .replace(/\bSi\.$/, 'Sí.');
}

function formatQuestion(value) {
  const question = normalizeSpanish(value);
  return question.startsWith('¿') ? question : `¿${question}`;
}

function escapeHtml(value) {
  return normalizeSpanish(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRawHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonLdScript(data, rawValues = []) {
  const preservedValues = new Set(rawValues);
  const json = JSON.stringify(data, (_key, value) => {
    if (typeof value !== 'string' || /^(https?:\/\/|\/|#)/.test(value)) return value;
    if (preservedValues.has(value)) return value;
    return normalizeSpanish(value);
  });
  return `<script type="application/ld+json">${json.replaceAll('</', '<\\/')}</script>`;
}

function renderSections(sections) {
  return sections.map(([title, text]) => `
          <article class="info-card">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(text)}</p>
          </article>`).join('');
}

function renderQuestionMedia(mediaItems, alt, className = '') {
  if (!mediaItems?.length) return '';
  return `<div class="question-media-grid ${className}">
            ${mediaItems.map((media) => `<figure>
              <img src="${media.url}" width="${media.width || ''}" height="${media.height || ''}" alt="${escapeRawHtml(alt)}" loading="lazy" decoding="async">
              <figcaption>${escapeRawHtml(alt)}</figcaption>
            </figure>`).join('')}
          </div>`;
}

function renderQuestionVariants(page) {
  if (!page.questionVariants?.length) return '';

  return `<section class="quiz-section" aria-labelledby="pregunta-oficial">
        <div class="wrap">
          <h2 id="pregunta-oficial">Alternativas, respuesta y fuente</h2>
          <p class="section-intro">Selecciona la versión de tu categoría. El texto, las imágenes y la alternativa correcta se conservan desde el balotario correspondiente.</p>
          <div class="variant-list">
            ${page.questionVariants.map((variant, variantIndex) => {
              const sourceLinks = variant.sources.map((source) => `<a href="/mtc-official/${source.pdf}#page=${source.page}">${escapeHtml(source.code)} · pregunta ${source.number} · página ${source.page}</a>`).join('');
              return `<article class="quiz-panel question-variant" aria-labelledby="version-${variantIndex + 1}">
                <p class="quiz-source">Versión del balotario</p>
                <h3 id="version-${variantIndex + 1}">${escapeHtml(variant.categories.join(', '))}</h3>
                <p class="question-text">${escapeRawHtml(variant.text)}</p>
                ${renderQuestionMedia(variant.questionMedia, `Imagen oficial para: ${variant.text}`)}
                <h4>Opciones de respuesta</h4>
                <ol class="quiz-options">
                  ${variant.options.map((option) => `<li>
                    <span>${escapeHtml(option.label)}</span>
                    <div class="option-content">
                      <p>${escapeRawHtml(option.text)}</p>
                      ${renderQuestionMedia(option.media, `Alternativa ${option.label} de la pregunta: ${variant.text}`, 'option-media')}
                    </div>
                  </li>`).join('')}
                </ol>
                <div class="quiz-answer">
                  <strong>Respuesta correcta</strong>
                  <p>${escapeRawHtml(variant.correctAnswer)}</p>
                  ${variant.fundamento ? `<p><strong>Fundamento indicado en el balotario:</strong> ${escapeRawHtml(variant.fundamento)}</p>` : ''}
                </div>
                <div class="source-pills" aria-label="Ubicación en los PDF">${sourceLinks}</div>
              </article>`;
            }).join('')}
          </div>
        </div>
      </section>`;
}

function renderQuestion(page) {
  if (page.questionVariants?.length) return renderQuestionVariants(page);
  if (!page.question) return '';

  const letters = ['A', 'B', 'C', 'D'];
  return `<section class="quiz-section" aria-labelledby="pregunta-oficial">
        <div class="wrap quiz-panel">
          <p class="quiz-source">Balotario A-I · pregunta ${page.question.number}</p>
          <h2 id="pregunta-oficial">${escapeRawHtml(page.question.text)}</h2>
          <h3>Opciones de respuesta</h3>
          <ol class="quiz-options">
            ${page.question.options.map((option, index) => `<li><span>${letters[index]}</span>${escapeRawHtml(option)}</li>`).join('')}
          </ol>
          <div class="quiz-answer">
            <strong>Respuesta correcta</strong>
            <p>${escapeRawHtml(page.question.correctAnswer)}</p>
            <p>${escapeHtml(page.question.explanation)}</p>
          </div>
        </div>
      </section>`;
}

function renderCategorySamples(page) {
  if (!page.sampleQuestions?.length) return '';

  const letters = ['A', 'B', 'C', 'D'];
  return `<section class="sample-section" aria-labelledby="preguntas-${page.categorySlug}">
        <div class="wrap">
          <h2 id="preguntas-${page.categorySlug}">${page.sampleQuestions.length} preguntas completas del balotario ${escapeHtml(page.sampleSourceCode)}</h2>
          <p class="section-intro">Selección de la licencia elegida, sin recortes ni preguntas que dependan de imágenes. Cada respuesta conserva su referencia al PDF correspondiente.</p>
          <div class="sample-list">
            ${page.sampleQuestions.map((question, index) => `<article class="sample-question" id="pregunta-${page.categorySlug}-${index + 1}">
              <p class="quiz-source">Balotario ${escapeHtml(page.sampleSourceCode)} · pregunta ${question.number} · página ${question.sourcePage}</p>
              <p class="topic-meta">Tema: ${escapeHtml(question.topicName)}</p>
              <h3>${escapeRawHtml(question.text)}</h3>
              <ol class="quiz-options">
                ${question.options.map((option, index) => `<li><span>${letters[index]}</span>${escapeRawHtml(option)}</li>`).join('')}
              </ol>
              <div class="sample-answer">
                <strong>Respuesta correcta:</strong> ${escapeRawHtml(question.correctAnswer)}
                ${question.fundamento ? `<p><strong>Fundamento:</strong> ${escapeRawHtml(question.fundamento)}</p>` : ''}
              </div>
            </article>`).join('')}
          </div>
        </div>
      </section>`;
}

function renderTopicQuestions(page) {
  if (!page.topicQuestions?.length) return '';

  const letters = ['A', 'B', 'C', 'D'];
  return `<section class="topic-section" aria-labelledby="banco-${page.topicSlug}">
        <div class="wrap">
          <h2 id="banco-${page.topicSlug}">${page.topicQuestions.length} preguntas completas de ${escapeHtml(page.topicName)}</h2>
          <p class="section-intro">Los enunciados, las cuatro alternativas y la respuesta se muestran completos. Esta selección excluye preguntas que dependen de una imagen.</p>
          <div class="topic-list">
            ${page.topicQuestions.map((question, index) => `<article class="topic-question" id="pregunta-${index + 1}">
              <p class="quiz-source">Balotario ${escapeHtml(question.sourceCode)} · pregunta ${question.number}</p>
              <p class="topic-meta">También aparece en: ${question.balotarios.map(escapeHtml).join(', ')}</p>
              <h3>${escapeRawHtml(question.text)}</h3>
              <ol class="quiz-options">
                ${question.options.map((option, optionIndex) => `<li><span>${letters[optionIndex]}</span>${escapeRawHtml(option)}</li>`).join('')}
              </ol>
              <div class="sample-answer">
                <strong>Respuesta correcta:</strong> ${escapeRawHtml(question.correctAnswer)}
                ${question.fundamento ? `<p><strong>Fundamento indicado en el balotario:</strong> ${escapeRawHtml(question.fundamento)}</p>` : ''}
              </div>
            </article>`).join('')}
          </div>
        </div>
      </section>`;
}

function renderFaqs(faqs) {
  return faqs.map(([question, answer]) => `
          <details>
            <summary>${escapeHtml(formatQuestion(question))}</summary>
            <p>${escapeHtml(answer)}</p>
          </details>`).join('');
}

function sourcesForPage(page) {
  const sourceIds = new Set(['balotarios', 'exam-format']);
  if (/transito|senal|semaforo|prioridad|adelantamiento|manejo|mecanica|auxilios/.test(page.slug)) {
    sourceIds.add('traffic-rules');
  }
  if (page.categorySlug) sourceIds.add('license-types');
  if (['fuentes-mtc', 'metodologia-simulador-mtc'].includes(page.slug)) {
    officialSources.forEach((source) => sourceIds.add(source.id));
  }
  return officialSources.filter((source) => sourceIds.has(source.id));
}

function renderSources(page) {
  return sourcesForPage(page).map((source) => `
            <li>
              <a href="${source.url}" rel="noopener noreferrer">${escapeHtml(source.name)}</a>
              <span>${escapeHtml(source.publisher)}. ${escapeHtml(source.note)}</span>
            </li>`).join('');
}

function renderCategoryLinks(currentSlug = '') {
  return categories.map((category) => `
            <a class="${currentSlug === category.slug ? 'active' : ''}" href="/simulador-mtc-${category.slug}">
              <strong>${escapeHtml(category.common)}</strong>
              <span>${escapeHtml(category.code)}</span>
            </a>`).join('');
}

function renderPdfLinks(page) {
  const visibleCategories = page.categorySlug
    ? categories.filter((category) => category.slug === page.categorySlug)
    : ['fuentes-mtc', 'balotario-mtc-pdf'].includes(page.slug)
      ? categories
      : [];

  return visibleCategories.map((category) => `
            <a href="/mtc-official/${category.pdf}">
              <strong>Balotario ${escapeHtml(category.code)}</strong>
              <span>PDF oficial descargable</span>
            </a>`).join('');
}

function relatedGuidesFor(page) {
  const currentIndex = articlePages.findIndex((guide) => guide.slug === page.slug);
  const candidates = currentIndex >= 0
    ? [
        articlePages[(currentIndex + articlePages.length - 1) % articlePages.length],
        articlePages[(currentIndex + 1) % articlePages.length],
        corePages.find((guide) => guide.slug === 'examen-mtc-preguntas'),
        corePages.find((guide) => guide.slug === 'fuentes-mtc'),
      ]
    : [
        articlePages.find((guide) => guide.slug === 'como-aprobar-examen-mtc'),
        articlePages.find((guide) => guide.slug === 'preguntas-frecuentes-examen-mtc'),
        corePages.find((guide) => guide.slug === 'examen-mtc-preguntas'),
        corePages.find((guide) => guide.slug === 'fuentes-mtc'),
      ];

  return [...new Map(candidates.filter(Boolean).map((guide) => [guide.slug, guide])).values()]
    .filter((guide) => guide.slug !== page.slug)
    .slice(0, 4);
}

function renderGuideLinks(page) {
  return relatedGuidesFor(page).map((guide) => `
            <a href="/${guide.slug}">
              <strong>${escapeHtml(guide.h1)}</strong>
              <span>${escapeHtml(guide.description)}</span>
            </a>`).join('');
}

function renderTopicLinks(page) {
  if (!(page.topicSlug || ['simulador-mtc', 'examen-mtc-preguntas'].includes(page.slug))) return '';
  return topicPages.map((topic) => `
            <a class="${page.slug === topic.slug ? 'active' : ''}" href="/${topic.slug}">
              <strong>${escapeHtml(topic.topicName)}</strong>
              <span>${topic.topicQuestions.length} preguntas completas</span>
            </a>`).join('');
}

function relatedQuestionsFor(page) {
  if (page.questionDirectory) return [];
  if (page.type === 'Quiz') {
    const pageCategories = new Set(page.questionCategories || (page.categorySlug ? [categories.find((category) => category.slug === page.categorySlug)?.code] : []));
    return questionPages
      .filter((question) => question.slug !== page.slug)
      .map((question) => {
        const questionCategories = question.questionCategories || (question.categorySlug ? [categories.find((category) => category.slug === question.categorySlug)?.code] : []);
        const sharedCategories = questionCategories.filter((category) => pageCategories.has(category)).length;
        const sharedTopic = page.topicName && question.topicName && page.topicName === question.topicName ? 3 : 0;
        return { question, score: sharedTopic + sharedCategories };
      })
      .sort((left, right) => right.score - left.score || left.question.slug.localeCompare(right.question.slug))
      .slice(0, 4)
      .map(({ question }) => question);
  }
  if (page.topicSlug) {
    const topicQuestions = generatedQuestionPages.filter((question) => question.topicSlug === page.topicSlug);
    if (topicQuestions.length) return topicQuestions.slice(0, 20);
  }
  if (page.categorySlug) {
    const categoryCode = categories.find((category) => category.slug === page.categorySlug)?.code;
    const categoryQuestions = generatedQuestionPages.filter((question) => question.questionCategories.includes(categoryCode));
    if (categoryQuestions.length) return categoryQuestions.slice(0, 16);
  }
  if (/pregunta|senal|semaforo|adelantamiento/.test(page.slug)) {
    return questionPages.slice(0, 12);
  }
  return [];
}

function renderQuestionLinks(page) {
  return relatedQuestionsFor(page).map((question) => `
            <a href="/${question.slug}">
              <strong>${escapeHtml(question.h1)}</strong>
              <span>${escapeHtml(question.intro)}</span>
            </a>`).join('');
}

function renderQuestionDirectory(page) {
  if (!page.questionDirectory) return '';
  const groups = topicPages.map((topic) => ({
    topic,
    questions: generatedQuestionPages.filter((question) => question.topicSlug === topic.slug),
  })).filter((group) => group.questions.length);

  return `<section aria-labelledby="directorio-preguntas">
        <div class="wrap">
          <h2 id="directorio-preguntas">Buscar una pregunta por tema</h2>
          <p class="section-intro">Abre el enunciado que deseas consultar. La respuesta y la referencia aparecen en la misma página.</p>
          <div class="question-directory">
            ${groups.map(({ topic, questions }) => `<details open>
              <summary>${escapeHtml(topic.topicName)} <span>${questions.length}</span></summary>
              <ul>
                ${questions.map((question) => `<li><a href="/${question.slug}">${escapeRawHtml(question.h1)}</a></li>`).join('')}
              </ul>
            </details>`).join('')}
          </div>
        </div>
      </section>`;
}

function shouldShowCategories(page) {
  return Boolean(page.categorySlug) || ['simulador-mtc', 'fuentes-mtc', 'balotario-mtc-pdf'].includes(page.slug);
}

function renderHtml(page) {
  const canonical = pageUrl(page.slug);
  const pageSources = sourcesForPage(page);
  const schemaQuestions = page.question ? [page.question] : page.questionVariants || page.sampleQuestions || page.topicQuestions || [];
  const primaryImageUrl = page.heroImage?.url ? `${siteUrl}${page.heroImage.url}` : `${siteUrl}/og-simulador-mtc.png`;
  const primaryImageId = `${canonical}#primaryimage`;
  const faqSchema = {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: page.faqs.map(([name, text]) => ({
      '@type': 'Question',
      name: formatQuestion(name),
      acceptedAnswer: { '@type': 'Answer', text },
    })),
  };
  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: brandName,
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: page.h1,
        item: canonical,
      },
    ],
  };
  const learningResourceSchema = {
    '@type': page.type === 'Article' ? ['Article', 'LearningResource'] : 'LearningResource',
    '@id': `${canonical}#learning-resource`,
    name: page.h1,
    headline: page.type === 'Article' ? page.h1 : undefined,
    description: page.description,
    url: canonical,
    image: page.heroImage ? { '@id': primaryImageId } : primaryImageUrl,
    inLanguage: 'es-PE',
    datePublished: contentPublished,
    dateModified: contentLastReviewed,
    learningResourceType: page.type === 'Article' ? 'Guía de estudio' : page.topicQuestions ? 'Banco temático de preguntas' : page.type === 'Quiz' ? 'Pregunta explicada' : 'Práctica educativa',
    educationalUse: ['autoestudio', 'práctica'],
    teaches: page.keywords,
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'Postulante a licencia de conducir en Perú',
    },
    author: { '@id': organizationId },
    publisher: { '@id': organizationId },
    provider: { '@id': organizationId },
    mainEntityOfPage: { '@id': `${canonical}#webpage` },
    citation: pageSources.map((source) => source.url),
    isBasedOn: pageSources.map((source) => ({
      '@type': 'CreativeWork',
      name: source.name,
      publisher: { '@type': 'Organization', name: source.publisher },
      url: source.url,
    })),
    hasPart: schemaQuestions.length ? { '@id': `${canonical}#quiz` } : undefined,
  };
  const quizSchema = schemaQuestions.length ? {
    '@type': 'Quiz',
    '@id': `${canonical}#quiz`,
    name: page.h1,
    about: page.keywords.map((name) => ({ '@type': 'Thing', name })),
    educationalLevel: 'Postulante a licencia de conducir',
    hasPart: schemaQuestions.map((question) => {
      const options = (question.options || []).map((option) => typeof option === 'string' ? option : option.text);
      return {
        '@type': 'Question',
        eduQuestionType: 'Flashcard',
        name: question.text,
        text: question.text,
        acceptedAnswer: {
          '@type': 'Answer',
          text: question.correctAnswer,
        },
        suggestedAnswer: options
          .filter((option) => option !== question.correctAnswer)
          .map((text) => ({ '@type': 'Answer', text })),
      };
    }),
  } : null;
  const webPageSchema = {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    name: page.title,
    description: page.description,
    url: canonical,
    inLanguage: 'es-PE',
    datePublished: contentPublished,
    dateModified: contentLastReviewed,
    lastReviewed: contentLastReviewed,
    isPartOf: { '@id': websiteId },
    publisher: { '@id': organizationId },
    reviewedBy: { '@id': organizationId },
    breadcrumb: { '@id': `${canonical}#breadcrumb` },
    mainEntity: { '@id': `${canonical}#learning-resource` },
    primaryImageOfPage: page.heroImage ? { '@id': primaryImageId } : undefined,
    about: page.keywords.map((name) => ({ '@type': 'Thing', name })),
  };
  const imageSchema = page.heroImage ? {
    '@type': 'ImageObject',
    '@id': primaryImageId,
    contentUrl: primaryImageUrl,
    url: primaryImageUrl,
    width: page.heroImage.width || undefined,
    height: page.heroImage.height || undefined,
    caption: `Imagen de la pregunta: ${page.h1}`,
    representativeOfPage: true,
  } : null;
  const directorySchema = page.questionDirectory ? {
    '@type': 'ItemList',
    '@id': `${canonical}#questions`,
    name: 'Preguntas MTC con respuestas',
    numberOfItems: generatedQuestionPages.length,
    itemListElement: generatedQuestionPages.map((question, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: question.h1,
      url: pageUrl(question.slug),
    })),
  } : null;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: brandName,
        url: siteUrl,
        logo: `${siteUrl}/brand-mark.svg`,
        description: disclaimer,
        publishingPrinciples: `${siteUrl}/metodologia-simulador-mtc`,
        sameAs: [repositoryUrl],
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: brandName,
        url: siteUrl,
        inLanguage: 'es-PE',
        publisher: { '@id': organizationId },
      },
      webPageSchema,
      breadcrumbSchema,
      learningResourceSchema,
      ...(quizSchema ? [quizSchema] : []),
      ...(imageSchema ? [imageSchema] : []),
      ...(directorySchema ? [directorySchema] : []),
      faqSchema,
    ],
  };
  const pdfLinks = renderPdfLinks(page);
  const questionLinks = renderQuestionLinks(page);
  const topicLinks = renderTopicLinks(page);
  const secondaryCta = page.secondaryCta || (page.categorySlug ? `/mtc-official/${categories.find((category) => category.slug === page.categorySlug)?.pdf}` : '/examen-mtc-preguntas');
  const secondaryCtaText = page.secondaryCtaText || (page.categorySlug ? 'Abrir balotario PDF' : 'Ver preguntas y temas');

  return `<!doctype html>
<html lang="es-PE">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="/brand-mark.svg?v=2">
    <link rel="shortcut icon" href="/brand-mark.svg?v=2">
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <meta name="author" content="Equipo editorial de Simulador MTC">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="es-PE" href="${canonical}">
    <link rel="alternate" type="text/plain" href="${siteUrl}/llms.txt" title="Índice para asistentes de IA">
    <link rel="author" href="${siteUrl}/metodologia-simulador-mtc">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="es_PE">
    <meta property="og:site_name" content="${brandName}">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${primaryImageUrl}">
    <meta property="og:image:alt" content="${escapeHtml(page.heroImage ? `Imagen de la pregunta: ${page.h1}` : 'Simulador MTC para practicar el examen de conocimientos')}">
    ${page.heroImage?.width ? `<meta property="og:image:width" content="${page.heroImage.width}">` : ''}
    ${page.heroImage?.height ? `<meta property="og:image:height" content="${page.heroImage.height}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="theme-color" content="#0f55e8">
    ${jsonLdScript(structuredData, schemaQuestions.flatMap((question) => [question.text, question.correctAnswer]))}
    <style>
      :root { color-scheme: light; --brand:#0f55e8; --deep:#071f45; --ink:#071537; --soft:#f3f7fc; --line:#d7e2f0; --ok:#00a86b; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background:#fff; }
      a { color: inherit; text-decoration: none; }
      header { border-bottom:1px solid var(--line); background:#fff; position:sticky; top:0; z-index:10; }
      .wrap { width:min(1120px, calc(100% - 32px)); margin:0 auto; }
      .topbar { min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
      .logo { display:flex; align-items:center; gap:12px; font-weight:900; font-size:22px; }
      .mark { width:40px; height:40px; flex:0 0 40px; }
      nav { display:flex; gap:16px; flex-wrap:wrap; font-size:14px; font-weight:700; color:#4d617d; }
      .hero { background:#eef6ff; border-bottom:1px solid var(--line); }
      .hero-grid { display:grid; grid-template-columns: minmax(0,1.05fr) minmax(280px,.95fr); gap:32px; align-items:center; padding:44px 0; }
      .eyebrow { display:inline-flex; align-items:center; gap:8px; padding:7px 12px; border-radius:999px; background:#e8f1ff; color:var(--brand); font-weight:900; font-size:13px; }
      h1 { margin:16px 0 0; font-size:52px; line-height:1.02; letter-spacing:0; }
      .lead { margin:18px 0 0; font-size:18px; line-height:1.75; color:#40536f; max-width:720px; }
      .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:24px; }
      .btn { display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:0 18px; border-radius:8px; border:1px solid var(--brand); font-weight:900; }
      .btn.primary { background:var(--brand); color:#fff; box-shadow:0 10px 22px rgba(15,85,232,.18); }
      .btn.secondary { background:#fff; color:var(--brand); }
      .hero-card { border:1px solid var(--line); border-radius:12px; background:#fff; overflow:hidden; box-shadow:0 18px 50px rgba(7,31,69,.10); }
      .hero-card img { width:100%; display:block; aspect-ratio: 16/10; object-fit:cover; }
      .hero-card img.question-hero { object-fit:contain; padding:18px; background:#f8fbff; }
      .hero-card div { padding:16px; display:grid; gap:8px; }
      .notice { margin:24px 0 0; padding:12px 14px; border-left:4px solid var(--brand); background:#f8fbff; color:#40536f; line-height:1.6; }
      section { padding:34px 0; }
      .answer-section { padding:24px 0 0; }
      .answer-panel { border-left:5px solid var(--ok); background:#f1fbf7; padding:22px 24px; }
      .answer-label { margin:0 0 8px; color:#08794e; font-size:13px; font-weight:900; text-transform:uppercase; }
      .answer-panel h2 { margin:0; font-size:24px; }
      .answer-panel p { margin:10px 0 0; color:#31445f; font-size:17px; line-height:1.7; }
      .reviewed { font-size:13px !important; font-weight:700; color:#5f718c !important; }
      .quiz-section { padding:28px 0 0; }
      .quiz-panel { border:2px solid var(--line); padding:24px; background:#fff; }
      .quiz-source { margin:0 0 8px; color:var(--brand); font-size:13px; font-weight:900; text-transform:uppercase; }
      .quiz-panel h2 { margin:0; font-size:30px; line-height:1.25; }
      .quiz-panel h3 { margin:20px 0 0; font-size:16px; }
      .quiz-panel h4 { margin:20px 0 0; font-size:16px; }
      .variant-list { display:grid; gap:18px; margin-top:18px; }
      .question-variant { width:100%; }
      .question-variant h3 { margin:0; font-size:24px; }
      .question-text { margin:14px 0 0; max-width:920px; font-size:21px; font-weight:800; line-height:1.5; }
      .quiz-options { margin:10px 0 0; padding:0; list-style:none; display:grid; gap:10px; }
      .quiz-options li { display:flex; align-items:flex-start; gap:12px; border:1px solid var(--line); padding:14px; line-height:1.55; }
      .quiz-options li span { width:30px; height:30px; flex:0 0 30px; display:grid; place-items:center; border-radius:50%; background:var(--soft); font-weight:900; }
      .option-content { min-width:0; flex:1; }
      .option-content > p { margin:3px 0 0; }
      .question-media-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-top:18px; }
      .question-media-grid figure { margin:0; border:1px solid var(--line); background:#f8fbff; padding:12px; }
      .question-media-grid img { display:block; width:auto; max-width:100%; height:auto; max-height:360px; margin:0 auto; object-fit:contain; }
      .question-media-grid figcaption { margin-top:9px; color:#5f718c; font-size:12px; line-height:1.45; }
      .question-media-grid.option-media { margin-top:12px; }
      .source-pills { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
      .source-pills a { border:1px solid var(--line); border-radius:999px; padding:7px 10px; color:var(--brand); font-size:12px; font-weight:800; }
      .source-pills a:hover { border-color:var(--brand); background:#f2f7ff; }
      .question-directory { display:grid; gap:12px; margin-top:18px; }
      .question-directory details { padding:0; overflow:hidden; }
      .question-directory summary { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 18px; background:#f8fbff; }
      .question-directory summary span { color:var(--brand); }
      .question-directory ul { margin:0; padding:8px 18px 16px 42px; columns:2; column-gap:36px; }
      .question-directory li { break-inside:avoid; margin:10px 0; line-height:1.45; }
      .question-directory a { color:var(--brand); text-decoration:underline; text-underline-offset:3px; }
      .quiz-answer { margin-top:18px; border-left:5px solid var(--ok); background:#f1fbf7; padding:18px; }
      .quiz-answer strong { color:#08794e; }
      .quiz-answer p { margin:8px 0 0; line-height:1.65; color:#31445f; }
      .section-intro { max-width:760px; color:#40536f; line-height:1.7; }
      .sample-list { margin-top:12px; border-top:1px solid var(--line); }
      .sample-question { padding:24px 0; border-bottom:1px solid var(--line); }
      .sample-question h3 { margin:0; font-size:22px; line-height:1.35; }
      .sample-answer { margin-top:14px; padding:14px 16px; border-left:5px solid var(--ok); background:#f1fbf7; line-height:1.6; }
      .sample-answer strong { color:#08794e; }
      .sample-answer p { margin:8px 0 0; color:#31445f; line-height:1.6; }
      .topic-list { margin-top:12px; border-top:1px solid var(--line); }
      .topic-question { padding:30px 0; border-bottom:1px solid var(--line); scroll-margin-top:90px; }
      .topic-question h3 { margin:8px 0 0; max-width:900px; font-size:24px; line-height:1.4; }
      .topic-meta { margin:0; color:#5f718c; font-size:13px; line-height:1.5; }
      .grid { display:grid; gap:16px; }
      .grid.three { grid-template-columns: repeat(3, minmax(0,1fr)); }
      .info-card, details, .download-card { border:1px solid var(--line); border-radius:10px; padding:18px; background:#fff; }
      .info-card h2 { margin:0; font-size:20px; }
      .info-card p, details p { margin:10px 0 0; color:#40536f; line-height:1.7; }
      .category-strip, .pdf-strip { display:grid; grid-template-columns: repeat(auto-fit, minmax(118px,1fr)); gap:10px; }
      .category-strip a, .pdf-strip a { border:1px solid var(--line); border-radius:8px; padding:12px; background:#fff; display:grid; gap:4px; }
      .category-strip a.active, .category-strip a:hover, .pdf-strip a:hover { border-color:var(--brand); background:#f2f7ff; }
      .category-strip span, .pdf-strip span { color:#5f718c; font-size:13px; line-height:1.35; }
      .guide-strip, .topic-strip { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap:10px; }
      .guide-strip a, .topic-strip a { border:1px solid var(--line); border-radius:8px; padding:14px; background:#fff; display:grid; gap:8px; }
      .guide-strip a.active, .guide-strip a:hover, .topic-strip a.active, .topic-strip a:hover { border-color:var(--brand); background:#f2f7ff; }
      .guide-strip span, .topic-strip span { color:#5f718c; font-size:13px; line-height:1.45; }
      .source-list { margin:16px 0 0; padding:0; list-style:none; display:grid; gap:12px; }
      .source-list li { border-top:1px solid var(--line); padding-top:12px; display:grid; gap:4px; }
      .source-list a { width:fit-content; color:var(--brand); font-weight:900; text-decoration:underline; text-underline-offset:3px; }
      .source-list span { color:#5f718c; font-size:14px; line-height:1.55; }
      summary { cursor:pointer; font-weight:900; }
      .footer { border-top:1px solid var(--line); background:var(--deep); color:#d7e5ff; padding:28px 0; }
      .footer p { margin:0; line-height:1.6; }
      @media (max-width: 760px) {
        .topbar { align-items:flex-start; flex-direction:column; padding:14px 0; }
        nav { gap:10px; }
        .hero-grid, .grid.three { grid-template-columns:1fr; }
        .hero-grid { padding:30px 0; }
        h1 { font-size:36px; }
        .quiz-panel h2 { font-size:24px; }
        .question-text { font-size:18px; }
        .question-media-grid { grid-template-columns:1fr; }
        .question-directory ul { columns:1; }
        .answer-panel { padding:18px; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="wrap topbar">
        <a class="logo" href="/">
          <img class="mark" src="/brand-mark.svg" alt="">
          <span>Simulador MTC</span>
        </a>
        <nav aria-label="Recursos principales">
          <a href="/simulador-mtc">Simulador</a>
          <a href="/preguntas-mtc">Preguntas</a>
          <a href="/senales-de-transito">Señales</a>
          <a href="/reglas-de-transito-peru">Reglas</a>
          <a href="/metodologia-simulador-mtc">Metodología</a>
        </nav>
      </div>
    </header>
    <main>
      <section class="hero">
        <div class="wrap hero-grid">
          <div>
            <span class="eyebrow">Preparación para licencia de conducir en Perú</span>
            <h1>${escapeHtml(page.h1)}</h1>
            <p class="lead">${escapeHtml(page.description)}</p>
            <div class="actions">
              <a class="btn primary" href="${escapeHtml(page.primaryCta)}">${escapeHtml(page.ctaText)}</a>
              <a class="btn secondary" href="${escapeHtml(secondaryCta)}">${escapeHtml(secondaryCtaText)}</a>
            </div>
            <p class="notice">${escapeHtml(disclaimer)}</p>
          </div>
          <aside class="hero-card" aria-label="Vista previa de Simulador MTC">
            <img class="${page.heroImage ? 'question-hero' : ''}" src="${page.heroImage?.url || '/og-simulador-mtc.png'}" alt="${escapeHtml(page.heroImage ? `Imagen de la pregunta: ${page.h1}` : 'Vista previa de Simulador MTC con auto y ciudad')}">
            <div>
              <strong>${page.heroImage ? 'Imagen conservada desde el balotario.' : 'Practica por categoría y revisa tus errores.'}</strong>
              <span>${page.heroImage ? 'Revisa el gráfico completo antes de elegir una alternativa.' : 'Simulacros, explicaciones y resultados por tema en una sola plataforma.'}</span>
            </div>
          </aside>
        </div>
      </section>
      <section class="answer-section" aria-labelledby="respuesta-breve">
        <div class="wrap answer-panel">
          <p class="answer-label">Respuesta breve</p>
          <h2 id="respuesta-breve">Lo esencial</h2>
          <p>${escapeHtml(page.intro)}</p>
          <p class="reviewed">Revisión editorial: ${contentLastReviewedLabel}. Contrastado con publicaciones oficiales enlazadas en esta página.</p>
        </div>
      </section>
      ${renderQuestion(page)}
      <section>
        <div class="wrap">
          <div class="grid three">
            ${renderSections(page.sections)}
          </div>
        </div>
      </section>
      ${renderCategorySamples(page)}
      ${renderTopicQuestions(page)}
      ${renderQuestionDirectory(page)}
      ${shouldShowCategories(page) ? `<section>
        <div class="wrap">
          <h2>Categorías de licencia para practicar</h2>
          <div class="category-strip">
            ${renderCategoryLinks(page.categorySlug)}
          </div>
        </div>
      </section>` : ''}
      ${topicLinks ? `<section>
        <div class="wrap">
          <h2>Preguntas del examen MTC por tema</h2>
          <div class="topic-strip">
            ${topicLinks}
          </div>
        </div>
      </section>` : ''}
      ${pdfLinks ? `<section>
        <div class="wrap download-card">
          <h2>Balotarios oficiales descargables</h2>
          <p>Descarga el PDF por categoría y complementa tu práctica en línea con el documento completo.</p>
          <div class="pdf-strip">
            ${pdfLinks}
          </div>
          <p class="notice">Fuente de referencia: <a href="${officialMtcSource}" rel="noopener noreferrer">publicación oficial del MTC en gob.pe</a>.</p>
        </div>
      </section>` : ''}
      <section>
        <div class="wrap">
          <h2>Fuentes consultadas</h2>
          <p>Estas referencias primarias permiten comprobar los datos y revisar posibles cambios normativos.</p>
          <ul class="source-list">
            ${renderSources(page)}
          </ul>
        </div>
      </section>
      <section>
        <div class="wrap">
          <h2>Guías relacionadas</h2>
          <div class="guide-strip">
            ${renderGuideLinks(page)}
          </div>
        </div>
      </section>
      ${questionLinks ? `<section>
        <div class="wrap">
          <h2>Preguntas oficiales explicadas</h2>
          <div class="guide-strip">
            ${questionLinks}
          </div>
        </div>
      </section>` : ''}
      <section>
        <div class="wrap">
          <h2>Preguntas frecuentes</h2>
          <div class="grid">
            ${renderFaqs(page.faqs)}
          </div>
        </div>
      </section>
    </main>
    <footer class="footer">
      <div class="wrap">
        <p><strong>${brandName}</strong></p>
        <p>${disclaimer}</p>
        <p>Fuente oficial de referencia: <a href="${officialMtcSource}" rel="noopener noreferrer" style="color:#fff;">MTC en gob.pe</a>.</p>
        <p><a href="/metodologia-simulador-mtc" style="color:#fff;">Metodología editorial y criterios de revisión</a></p>
        <p><a href="${repositoryUrl}" rel="noopener noreferrer" style="color:#fff;">Código y documentación del proyecto en GitHub</a></p>
        <p>Revisión editorial: ${contentLastReviewedLabel}. Verifica siempre la información vigente antes de rendir tu examen.</p>
      </div>
    </footer>
  </body>
</html>`.replace(/[ \t]+$/gm, '');
}

function simulatorPageFor(category) {
  const simulatorDestination = `/simulacro/${category.categoryId}?mode=quick&strategy=random`;
  const examDestination = `/simulacro/${category.categoryId}?mode=exam`;
  return {
    slug: `simulador-mtc-${category.slug}`,
    categorySlug: category.slug,
    title: `Simulador MTC ${category.common} 2026: 40 preguntas y balotario ${category.code}`,
    description: `Practica 5 preguntas ${category.common} gratis o rinde 40 preguntas en 40 minutos. Revisa respuestas y abre el balotario MTC ${category.code}.`,
    h1: `Simulador MTC ${category.common} para ${category.exam}`,
    intro: `Esta página corresponde únicamente a ${category.code}. Practica preguntas para ${category.vehicle}, revisa la explicación completa y usa el simulacro cronometrado para medir tu avance.`,
    primaryCta: `/?auth=register&category=${category.categoryId}&next=${encodeURIComponent(simulatorDestination)}`,
    ctaText: `Practicar 5 preguntas ${category.common}`,
    secondaryCta: `/?auth=register&category=${category.categoryId}&next=${encodeURIComponent(examDestination)}`,
    secondaryCtaText: 'Rendir simulacro de 40',
    sampleSourceCode: category.code,
    sampleQuestions: categoryQuestionsBySlug.get(category.slug),
    keywords: [`simulador mtc ${category.common}`, `simulador mtc ${category.code}`, `examen mtc ${category.common}`, `licencia ${category.common}`],
    sections: [
      [`Qué vehículos cubre ${category.code}`, category.scope],
      [`Qué conviene reforzar en ${category.common}`, category.focus],
      [`Cómo estudiar para ${category.code}`, `${category.advice} La práctica corta tiene 5 preguntas sin tiempo; el simulacro de medición tiene 40 preguntas y 40 minutos.`],
    ],
    faqs: [
      [`Que incluye el simulador MTC ${category.common}?`, `Incluye práctica exclusiva de ${category.code}, preguntas completas, explicaciones, simulacro de 40 preguntas y acceso al balotario correspondiente.`],
      [`Donde descargo el balotario ${category.code}?`, `Usa el botón “Abrir balotario ${category.code}” de esta página y contrasta cualquier cambio con la publicación oficial del MTC.`],
      [`Qué vehículos corresponden a ${category.code}?`, category.scope],
      ['La plataforma es oficial?', disclaimer],
    ],
  };
}

function balotarioPageFor(category) {
  return {
    slug: `balotario-mtc-${category.slug}`,
    categorySlug: category.slug,
    title: `Balotario MTC ${category.common} (${category.code}) en PDF y practica online`,
    description: `Descarga el balotario MTC ${category.common} (${category.code}) y practica preguntas del examen de conocimientos con explicaciones.`,
    h1: `Balotario MTC ${category.common} (${category.code})`,
    intro: `Este es el acceso al balotario de ${category.code}, la categoría que corresponde a ${category.vehicle}. Descarga el PDF completo y úsalo junto con la práctica filtrada para esa misma licencia.`,
    primaryCta: `/mtc-official/${category.pdf}`,
    ctaText: `Descargar PDF ${category.code}`,
    secondaryCta: `/?auth=register&category=${category.categoryId}&next=${encodeURIComponent(`/simulacro/${category.categoryId}?mode=quick&strategy=random`)}`,
    secondaryCtaText: `Practicar ${category.common}`,
    keywords: [`balotario mtc ${category.common}`, `balotario ${category.code}`, `preguntas mtc ${category.common}`, `pdf mtc ${category.common}`],
    sections: [
      [`Qué licencia estás preparando`, `${category.scope} Elige otra página si esa descripción no coincide con el vehículo para el que rendirás.`],
      ['Cómo usar el PDF', `Lee el balotario ${category.code} por bloques y marca las preguntas que no puedas justificar. Después practícalas en línea para revisar la respuesta completa.`],
      [`Repaso recomendado para ${category.common}`, `${category.focus} ${category.advice}`],
    ],
    faqs: [
      [`El balotario ${category.code} sirve para ${category.common}?`, `Si. Esta pagina organiza el material para la categoria ${category.code}, asociada a ${category.exam}.`],
      ['Puedo estudiar solo con el PDF?', 'El PDF ayuda, pero practicar con preguntas y revisar errores suele mejorar la retencion.'],
      ['La descarga reemplaza a la fuente oficial?', 'No. Conserva y verifica siempre la publicacion oficial vigente del MTC.'],
    ],
  };
}

function topicPageFor(topic) {
  const count = topic.questions.length;
  return {
    slug: topic.slug,
    topicSlug: topic.slug,
    topicName: topic.name,
    topicQuestions: topic.questions,
    type: 'TopicQuiz',
    title: `${count} preguntas MTC con respuestas: ${topic.name}`,
    description: topic.description,
    h1: `${count} preguntas de ${topic.name} para el examen MTC`,
    intro: topic.intro,
    primaryCta: '/?auth=register',
    ctaText: 'Practicar en el simulador',
    secondaryCta: officialMtcSource,
    secondaryCtaText: 'Ver fuente oficial',
    keywords: topic.keywords,
    sections: [
      ['Selección verificable', `Esta página publica ${count} de ${topic.sourceQuestionCount} preguntas clasificadas en este tema. La selección se genera desde el banco deduplicado y conserva el texto de la fuente.`],
      ['Cuatro alternativas completas', 'Cada pregunta incluye sus cuatro opciones y la respuesta marcada en el balotario. No se resumen los enunciados ni se completan textos por inferencia.'],
      ['Cómo aprovechar este bloque', 'Responde primero sin mirar la solución, comprueba la alternativa correcta y anota el fundamento normativo cuando esté disponible. Después mide tu nivel con un simulacro de 40 preguntas.'],
    ],
    faqs: [
      [`Las ${count} preguntas están completas?`, 'Sí. El generador exige enunciado, cuatro alternativas, una clave válida y ausencia de recursos visuales faltantes.'],
      ['Se modificaron las preguntas para SEO?', 'No. El contenido de cada enunciado, alternativa y respuesta se conserva desde el banco deduplicado extraído de los balotarios.'],
      ['Dónde puedo comprobar la fuente?', 'En la publicación oficial del MTC enlazada en esta página y en los PDF de cada categoría.'],
    ],
  };
}

const topicPages = topicQuestionBank.topics.map(topicPageFor);

const pages = [
  questionDirectoryPage,
  ...corePages,
  ...articlePages,
  ...questionPages,
  ...categories.map(simulatorPageFor),
  ...categories.map(balotarioPageFor),
  ...topicPages,
];

async function main() {
  const publicDir = path.resolve('public');
  const seoDir = path.join(publicDir, 'seo');
  await mkdir(seoDir, { recursive: true });

  await Promise.all(pages.map(async (page) => {
    const outputPath = path.join(seoDir, `${page.slug}.html`);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, renderHtml(page), 'utf8');
  }));

  const coreSitemapUrls = [
    { loc: siteUrl, priority: '1.0', changefreq: 'daily' },
    ...publicSpaPages.map((pathname) => ({ loc: `${siteUrl}${pathname}`, priority: pathname === '/suscripcion' ? '0.9' : '0.6', changefreq: 'monthly' })),
    ...[questionDirectoryPage, ...corePages, ...articlePages].map((page) => ({ loc: pageUrl(page.slug), priority: page.slug === 'simulador-mtc' ? '0.95' : '0.8', changefreq: 'weekly' })),
  ];
  const categorySitemapUrls = [
    ...categories.map(simulatorPageFor),
    ...categories.map(balotarioPageFor),
  ].map((page) => ({ loc: pageUrl(page.slug), priority: '0.85', changefreq: 'weekly' }));
  const topicSitemapUrls = topicPages.map((page) => ({ loc: pageUrl(page.slug), priority: '0.8', changefreq: 'weekly' }));
  const questionSitemapUrls = questionPages.map((page) => ({ loc: pageUrl(page.slug), priority: page.heroImage ? '0.85' : '0.8', changefreq: 'monthly' }));

  const urlSet = (items, includeImages = false) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${includeImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ''}>
${items.map((item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${contentLastReviewed}</lastmod>${item.changefreq ? `
    <changefreq>${item.changefreq}</changefreq>` : ''}${item.priority ? `
    <priority>${item.priority}</priority>` : ''}${item.images?.map((image) => `
    <image:image>
      <image:loc>${image.loc}</image:loc>
      <image:caption>${escapeRawHtml(image.caption)}</image:caption>
    </image:image>`).join('') || ''}
  </url>`).join('\n')}
</urlset>
`;
  const sitemapFiles = [
    ['sitemap-core.xml', urlSet(coreSitemapUrls)],
    ['sitemap-categories.xml', urlSet(categorySitemapUrls)],
    ['sitemap-topics.xml', urlSet(topicSitemapUrls)],
    ['sitemap-questions.xml', urlSet(questionSitemapUrls)],
    ['sitemap-images.xml', urlSet(questionPages
      .filter((page) => page.heroImage)
      .map((page) => ({
        loc: pageUrl(page.slug),
        images: [{ loc: `${siteUrl}${page.heroImage.url}`, caption: `Imagen de la pregunta: ${page.h1}` }],
      })), true)],
  ];
  await Promise.all(sitemapFiles.map(([filename, contents]) => writeFile(path.join(publicDir, filename), contents, 'utf8')));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map(([filename]) => `  <sitemap>
    <loc>${siteUrl}/${filename}</loc>
    <lastmod>${contentLastReviewed}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>
`;
  await writeFile(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');

  const robots = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: Applebot
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  await writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');

  const llms = `# ${brandName}

> Plataforma educativa independiente para practicar el examen de conocimientos MTC en Perú.

${disclaimer}

## Datos verificables

- El proveedor del servicio es ${legalName}, RUC ${taxId}, con dirección en ${businessAddress}.
- Contacto comercial: ${businessPhone} y ${businessEmail}.
- El MTC informa que el examen de reglas tiene 40 preguntas y una duración máxima de 40 minutos.
- La publicación del MTC indica que se requieren al menos 35 respuestas correctas para aprobar.
- Las preguntas y balotarios se organizan según la categoría de licencia elegida.
- Las condiciones de acceso se muestran dentro de la plataforma antes de iniciar una práctica o contratación.
- Cada página de categoría publica cuarenta preguntas completas, con cuatro alternativas, respuesta y referencia al balotario correspondiente.
- Fuente del formato oficial: ${officialSources.find((source) => source.id === 'exam-format').url}
- Balotarios oficiales: ${officialMtcSource}

## Páginas principales

- ${siteUrl}/simulador-mtc: simulador MTC general para examen de conocimientos.
- ${siteUrl}/examen-mtc-preguntas: guía de preguntas y temas del examen.
- ${siteUrl}/preguntas-mtc: índice de preguntas con respuesta, imágenes y referencia al PDF.
- ${siteUrl}/senales-de-transito: señales de tránsito para practicar.
- ${siteUrl}/reglas-de-transito-peru: reglas de tránsito en Perú.
- ${siteUrl}/fuentes-mtc: fuentes oficiales y balotarios de referencia.
- ${siteUrl}/metodologia-simulador-mtc: metodología editorial, alcance y actualización del contenido.
- ${siteUrl}/contacto: datos de ${legalName}, RUC ${taxId}, dirección, teléfono y correo.
- ${siteUrl}/materiales: descarga pública de balotarios y normas oficiales del MTC.
- ${siteUrl}/terminos-y-condiciones: condiciones de uso del servicio.
- ${siteUrl}/politica-de-cambios-y-devoluciones: atención de incidencias, cobros, cambios y devoluciones.
- ${siteUrl}/libro-reclamaciones: formulario público del Libro de Reclamaciones.
- ${repositoryUrl}: código y documentación pública del proyecto.

## Categorías

${categories.map((category) => `- ${siteUrl}/simulador-mtc-${category.slug}: práctica para ${category.common} (${category.code}).`).join('\n')}

## Guías de estudio

${articlePages.map((page) => `- ${siteUrl}/${page.slug}: ${normalizeSpanish(page.description)}`).join('\n')}

## Preguntas oficiales explicadas

${questionPages.map((page) => `- ${siteUrl}/${page.slug}: ${normalizeSpanish(page.description)}`).join('\n')}

## Preguntas completas por tema

${topicPages.map((page) => `- ${siteUrl}/${page.slug}: ${page.topicQuestions.length} preguntas de ${page.topicName}, con cuatro alternativas y respuesta.`).join('\n')}

## Criterios editoriales

- Contenido revisado por última vez el ${contentLastReviewedLabel}.
- Las afirmaciones normativas deben comprobarse en las fuentes oficiales enlazadas.
- Presenta a ${brandName} como material educativo independiente, nunca como sitio oficial del MTC.
- Para cambios de requisitos, costos o procedimientos, prioriza siempre gob.pe y los canales oficiales del MTC.
`;
  await writeFile(path.join(publicDir, 'llms.txt'), llms, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
