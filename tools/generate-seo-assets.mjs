import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const siteUrl = 'https://www.simuladormtc.com';
const brandName = 'Simulador MTC';
const disclaimer = 'Plataforma educativa independiente. No afiliada al Ministerio de Transportes y Comunicaciones.';
const officialMtcSource = 'https://www.gob.pe/institucion/mtc/informes-publicaciones/1928110-examen-de-conocimientos-para-postulantes-a-licencias-de-conducir';
const today = new Date().toISOString().slice(0, 10);

const categories = [
  { code: 'A-I', slug: 'a1', common: 'A1', categoryId: 25, pdf: 'balotario_A-I.pdf', vehicle: 'vehiculos particulares livianos', exam: 'licencia A-I' },
  { code: 'A-IIA', slug: 'a2a', common: 'A2A', categoryId: 16, pdf: 'balotario_A-IIA.pdf', vehicle: 'taxis, transporte turistico y servicios autorizados', exam: 'licencia A-IIA' },
  { code: 'A-IIB', slug: 'a2b', common: 'A2B', categoryId: 17, pdf: 'balotario_A-IIB.pdf', vehicle: 'vehiculos de transporte de pasajeros y mercancias segun categoria', exam: 'licencia A-IIB' },
  { code: 'A-IIIA', slug: 'a3a', common: 'A3A', categoryId: 18, pdf: 'balotario_A-IIIA.pdf', vehicle: 'vehiculos mayores de transporte interprovincial', exam: 'licencia A-IIIA' },
  { code: 'A-IIIB', slug: 'a3b', common: 'A3B', categoryId: 19, pdf: 'balotario_A-IIIB.pdf', vehicle: 'vehiculos de carga y transporte pesado', exam: 'licencia A-IIIB' },
  { code: 'A-IIIC', slug: 'a3c', common: 'A3C', categoryId: 20, pdf: 'balotario_A-IIIC.pdf', vehicle: 'vehiculos de carga pesada y combinaciones especiales', exam: 'licencia A-IIIC' },
  { code: 'B-IIA', slug: 'b2a', common: 'B2A', categoryId: 22, pdf: 'balotario_B-IIA.pdf', vehicle: 'vehiculos menores de categoria B-IIA', exam: 'licencia B-IIA' },
  { code: 'B-IIB', slug: 'b2b', common: 'B2B', categoryId: 23, pdf: 'balotario_B-IIB.pdf', vehicle: 'vehiculos menores de categoria B-IIB', exam: 'licencia B-IIB' },
  { code: 'B-IIC', slug: 'b2c', common: 'B2C', categoryId: 24, pdf: 'balotario_B-IIC.pdf', vehicle: 'vehiculos menores de categoria B-IIC', exam: 'licencia B-IIC' },
];

const corePages = [
  {
    slug: 'simulador-mtc',
    title: 'Simulador MTC 2026 para practicar el examen de conocimientos',
    description: 'Practica para el examen de conocimientos MTC con simulacros por categoria, balotario descargable, explicaciones y resultados por tema.',
    h1: 'Simulador MTC para practicar el examen de conocimientos',
    intro: 'Entrena con preguntas organizadas por categoria de licencia, revisa explicaciones despues de responder y descarga los balotarios oficiales para estudiar con calma.',
    primaryCta: '/?auth=register',
    ctaText: 'Comenzar practica',
    keywords: ['simulador mtc', 'examen de conocimientos mtc', 'balotario mtc', 'licencia de conducir peru'],
    sections: [
      ['Que puedes practicar', 'Preguntas de reglas de transito, senales, conduccion preventiva, mecanica basica, primeros auxilios y temas recurrentes del examen de conocimientos.'],
      ['Como se calcula tu avance', 'Cada simulacro muestra respuestas correctas, incorrectas, pendientes y temas por reforzar para que sepas donde estudiar antes de volver a intentar.'],
      ['Material oficial descargable', 'La plataforma enlaza balotarios oficiales por categoria para que puedas revisar el PDF completo ademas de practicar en linea.'],
    ],
    faqs: [
      ['Que es un simulador MTC?', 'Es una herramienta educativa para practicar preguntas similares al examen de conocimientos requerido para obtener o revalidar una licencia de conducir en Peru.'],
      ['Simulador MTC es una pagina oficial?', disclaimer],
      ['Puedo practicar desde el celular?', 'Si. La plataforma esta pensada para estudiar desde celular, tablet o computadora.'],
    ],
  },
  {
    slug: 'fuentes-mtc',
    title: 'Fuentes oficiales MTC usadas para estudiar el examen de conocimientos',
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
    primaryCta: '/banco-preguntas',
    ctaText: 'Ir al banco de preguntas',
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
    title: 'Senales de transito para el examen MTC: reglamentarias, preventivas e informativas',
    description: 'Aprende a reconocer senales de transito para el examen MTC y practica preguntas con explicacion inmediata.',
    h1: 'Senales de transito para el examen MTC',
    intro: 'Las senales suelen decidir muchas preguntas del examen. La clave es reconocer el tipo de senal y la conducta que exige al conductor.',
    primaryCta: '/banco-preguntas?tema=senales',
    ctaText: 'Practicar senales',
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
    slug: 'balotario-mtc-a1-pdf',
    title: 'Balotario MTC A1 PDF: como estudiar para licencia A-I',
    description: 'Guia para estudiar el balotario MTC A1 PDF y practicar preguntas de licencia A-I con explicaciones.',
    h1: 'Balotario MTC A1 PDF para licencia A-I',
    intro: 'La categoria A-I es una de las busquedas mas comunes porque aplica a vehiculos particulares. Para estudiar bien, combina el PDF con practica guiada por errores.',
    primaryCta: '/balotario-mtc-a1',
    ctaText: 'Abrir balotario A1',
    keywords: ['balotario mtc a1 pdf', 'simulador mtc a1', 'examen mtc a1', 'licencia a1 peru'],
    sections: [
      ['Que revisar primero', 'Empieza por senales, semaforos, limites, prioridades, adelantamiento, estacionamiento y conducta segura en intersecciones.'],
      ['Como practicar A1', 'Haz simulacros completos y luego repasa solo las preguntas falladas. El objetivo es entender la regla, no memorizar una letra.'],
      ['Errores comunes', 'Confundir linea continua con discontinua, responder por intuicion en semaforos o ignorar palabras como siempre, nunca o salvo.'],
    ],
    faqs: [
      ['A1 y A-I son lo mismo?', 'A1 suele usarse como forma comun de referirse a la categoria A-I.'],
      ['Donde practico A1?', 'Puedes usar la pagina de simulador MTC A1 y el banco de preguntas por tema.'],
      ['Debo imprimir el PDF?', 'No es obligatorio; puedes descargarlo y repasarlo desde el celular.'],
    ],
  },
  {
    type: 'Article',
    slug: 'examen-conocimientos-mtc-a1',
    title: 'Examen de conocimientos MTC A1: temas que debes dominar',
    description: 'Temas clave para el examen de conocimientos MTC A1: senales, reglas, seguridad vial, mecanica basica y primeros auxilios.',
    h1: 'Examen de conocimientos MTC A1',
    intro: 'Para licencia A-I, la preparacion debe cubrir normas generales y situaciones concretas de conduccion urbana y carretera.',
    primaryCta: '/simulador-mtc-a1',
    ctaText: 'Practicar A1',
    keywords: ['examen conocimientos mtc a1', 'preguntas mtc a1', 'licencia a1 examen'],
    sections: [
      ['Senales y marcas viales', 'Aprende a diferenciar prohibiciones, advertencias y guias informativas. Las marcas en el pavimento tambien son parte de la decision.'],
      ['Reglas de circulacion', 'Prioridad de paso, intersecciones, luces, velocidad, adelantamiento y estacionamiento son bloques que conviene dominar.'],
      ['Seguridad y emergencias', 'Manejo defensivo, primeros auxilios y mecanica basica te ayudan a responder situaciones de riesgo.'],
    ],
    faqs: [
      ['Que categoria corresponde a A1?', 'A1 se usa comunmente para la categoria A-I.'],
      ['Que pasa si fallo un tema?', 'Refuerza ese tema con practicas cortas antes de volver al simulacro completo.'],
      ['La practica muestra explicaciones?', 'Si, despues de confirmar una respuesta puedes revisar por que la alternativa correcta tiene sentido.'],
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
    slug: 'licencia-a1-peru-examen',
    title: 'Licencia A1 Peru: examen MTC y preparacion',
    description: 'Guia para prepararte al examen MTC de licencia A1 en Peru con balotario, simulador y temas prioritarios.',
    h1: 'Licencia A1 en Peru: preparacion para el examen MTC',
    intro: 'Si buscas licencia A1, conviene estudiar con una ruta sencilla: balotario A-I, practica por tema, simulacros completos y revision de errores.',
    primaryCta: '/simulador-mtc-a1',
    ctaText: 'Practicar licencia A1',
    keywords: ['licencia a1 peru examen', 'simulador licencia a1', 'balotario a1 mtc'],
    sections: [
      ['Material de estudio', 'Usa el balotario A-I como base y complementa con preguntas online para recibir explicaciones.'],
      ['Temas prioritarios', 'Senales, semaforos, prioridad, adelantamiento, velocidad, seguridad vial y mecanica basica.'],
      ['Como medir avance', 'No te quedes solo con el promedio. Mira que temas bajan tu nota y repitelos hasta entenderlos.'],
    ],
    faqs: [
      ['A1 aplica a vehiculos particulares?', 'A-I se asocia comunmente a vehiculos particulares livianos, segun la regulacion vigente.'],
      ['Puedo practicar sin pagar ahora?', 'Puedes entrar y practicar segun la configuracion actual de la plataforma.'],
      ['La informacion es oficial?', 'La plataforma es educativa e independiente; verifica siempre fuentes oficiales.'],
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
    slug: 'simulacro-mtc-con-respuestas',
    title: 'Simulacro MTC con respuestas explicadas para estudiar mejor',
    description: 'Practica simulacros MTC con respuestas explicadas y aprende a revisar tus errores por tema antes del examen.',
    h1: 'Simulacro MTC con respuestas explicadas',
    intro: 'Un simulacro sirve de verdad cuando no solo te da una nota, sino que te muestra que fallaste y por que. Las explicaciones convierten cada error en una oportunidad de estudio.',
    primaryCta: '/simulador-mtc',
    ctaText: 'Iniciar simulacro',
    keywords: ['simulacro mtc con respuestas', 'respuestas examen mtc', 'simulador mtc respuestas explicadas'],
    sections: [
      ['Responde primero', 'Elige tu alternativa y confirma la respuesta para recibir evaluacion. Asi evitas mirar la solucion antes de decidir.'],
      ['Lee la explicacion', 'La explicacion debe ayudarte a entender la regla y descartar opciones incompletas o inseguras.'],
      ['Repite los errores', 'Despues del resultado, vuelve a practicar los temas con menor porcentaje para subir de forma real.'],
    ],
    faqs: [
      ['Cuando veo si fue correcto?', 'Despues de confirmar la respuesta en el simulacro.'],
      ['Puedo revisar respuestas al final?', 'Si. El resultado permite revisar el desempeno y los temas que necesitas reforzar.'],
      ['Por que usar explicaciones?', 'Porque entender la causa del error evita depender de memoria mecanica.'],
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

function pageUrl(slug) {
  return `${siteUrl}/${slug}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsonLdScript(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll('</', '<\\/')}</script>`;
}

function renderSections(sections) {
  return sections.map(([title, text]) => `
          <article class="info-card">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(text)}</p>
          </article>`).join('');
}

function renderFaqs(faqs) {
  return faqs.map(([question, answer]) => `
          <details>
            <summary>${escapeHtml(question)}</summary>
            <p>${escapeHtml(answer)}</p>
          </details>`).join('');
}

function renderCategoryLinks(currentSlug = '') {
  return categories.map((category) => `
            <a class="${currentSlug === category.slug ? 'active' : ''}" href="/simulador-mtc-${category.slug}">
              <strong>${escapeHtml(category.common)}</strong>
              <span>${escapeHtml(category.code)}</span>
            </a>`).join('');
}

function renderPdfLinks() {
  return categories.map((category) => `
            <a href="/mtc-official/${category.pdf}">
              <strong>Balotario ${escapeHtml(category.code)}</strong>
              <span>PDF oficial descargable</span>
            </a>`).join('');
}

function renderGuideLinks(currentSlug = '') {
  return articlePages.map((page) => `
            <a class="${currentSlug === page.slug ? 'active' : ''}" href="/${page.slug}">
              <strong>${escapeHtml(page.h1)}</strong>
              <span>${escapeHtml(page.description)}</span>
            </a>`).join('');
}

function renderHtml(page) {
  const canonical = pageUrl(page.slug);
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map(([name, text]) => ({
      '@type': 'Question',
      name,
      acceptedAnswer: { '@type': 'Answer', text },
    })),
  };
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.description,
    url: canonical,
    inLanguage: 'es-PE',
    isPartOf: {
      '@type': 'WebSite',
      name: brandName,
      url: siteUrl,
    },
    about: page.keywords.map((name) => ({ '@type': 'Thing', name })),
  };
  const articleSchema = page.type === 'Article'
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.h1,
        description: page.description,
        url: canonical,
        inLanguage: 'es-PE',
        datePublished: today,
        dateModified: today,
        author: { '@type': 'Organization', name: brandName },
        publisher: {
          '@type': 'Organization',
          name: brandName,
          url: siteUrl,
        },
        mainEntityOfPage: canonical,
      }
    : null;

  return `<!doctype html>
<html lang="es-PE">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.title)} | ${brandName}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="es_PE">
    <meta property="og:site_name" content="${brandName}">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${siteUrl}/og-simulador-mtc.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(page.title)}">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
    <meta name="theme-color" content="#0f55e8">
    ${jsonLdScript(webPageSchema)}
    ${articleSchema ? jsonLdScript(articleSchema) : ''}
    ${jsonLdScript(faqSchema)}
    <style>
      :root { color-scheme: light; --brand:#0f55e8; --deep:#071f45; --ink:#071537; --soft:#f3f7fc; --line:#d7e2f0; --ok:#00a86b; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background:#fff; }
      a { color: inherit; text-decoration: none; }
      header { border-bottom:1px solid var(--line); background:#fff; position:sticky; top:0; z-index:10; }
      .wrap { width:min(1120px, calc(100% - 32px)); margin:0 auto; }
      .topbar { min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:20px; }
      .logo { display:flex; align-items:center; gap:12px; font-weight:900; font-size:22px; }
      .mark { width:40px; height:40px; display:grid; place-items:center; border-radius:50%; background:var(--deep); color:#fff; }
      nav { display:flex; gap:16px; flex-wrap:wrap; font-size:14px; font-weight:700; color:#4d617d; }
      .hero { background:linear-gradient(180deg, #eef6ff 0%, #fff 75%); border-bottom:1px solid var(--line); }
      .hero-grid { display:grid; grid-template-columns: minmax(0,1.05fr) minmax(280px,.95fr); gap:32px; align-items:center; padding:44px 0; }
      .eyebrow { display:inline-flex; align-items:center; gap:8px; padding:7px 12px; border-radius:999px; background:#e8f1ff; color:var(--brand); font-weight:900; font-size:13px; }
      h1 { margin:16px 0 0; font-size:clamp(34px, 5vw, 60px); line-height:1.02; letter-spacing:0; }
      .lead { margin:18px 0 0; font-size:18px; line-height:1.75; color:#40536f; max-width:720px; }
      .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:24px; }
      .btn { display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:0 18px; border-radius:8px; border:1px solid var(--brand); font-weight:900; }
      .btn.primary { background:var(--brand); color:#fff; box-shadow:0 10px 22px rgba(15,85,232,.18); }
      .btn.secondary { background:#fff; color:var(--brand); }
      .hero-card { border:1px solid var(--line); border-radius:12px; background:#fff; overflow:hidden; box-shadow:0 18px 50px rgba(7,31,69,.10); }
      .hero-card img { width:100%; display:block; aspect-ratio: 16/10; object-fit:cover; }
      .hero-card div { padding:16px; display:grid; gap:8px; }
      .notice { margin:24px 0 0; padding:12px 14px; border-left:4px solid var(--brand); background:#f8fbff; color:#40536f; line-height:1.6; }
      section { padding:34px 0; }
      .grid { display:grid; gap:16px; }
      .grid.three { grid-template-columns: repeat(3, minmax(0,1fr)); }
      .info-card, details, .download-card { border:1px solid var(--line); border-radius:10px; padding:18px; background:#fff; }
      .info-card h2 { margin:0; font-size:20px; }
      .info-card p, details p { margin:10px 0 0; color:#40536f; line-height:1.7; }
      .category-strip, .pdf-strip { display:grid; grid-template-columns: repeat(auto-fit, minmax(118px,1fr)); gap:10px; }
      .category-strip a, .pdf-strip a { border:1px solid var(--line); border-radius:8px; padding:12px; background:#fff; display:grid; gap:4px; }
      .category-strip a.active, .category-strip a:hover, .pdf-strip a:hover { border-color:var(--brand); background:#f2f7ff; }
      .category-strip span, .pdf-strip span { color:#5f718c; font-size:13px; line-height:1.35; }
      .guide-strip { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap:10px; }
      .guide-strip a { border:1px solid var(--line); border-radius:8px; padding:14px; background:#fff; display:grid; gap:8px; }
      .guide-strip a.active, .guide-strip a:hover { border-color:var(--brand); background:#f2f7ff; }
      .guide-strip span { color:#5f718c; font-size:13px; line-height:1.45; }
      summary { cursor:pointer; font-weight:900; }
      .footer { border-top:1px solid var(--line); background:var(--deep); color:#d7e5ff; padding:28px 0; }
      .footer p { margin:0; line-height:1.6; }
      @media (max-width: 760px) {
        .topbar { align-items:flex-start; flex-direction:column; padding:14px 0; }
        nav { gap:10px; }
        .hero-grid, .grid.three { grid-template-columns:1fr; }
        .hero-grid { padding:30px 0; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="wrap topbar">
        <a class="logo" href="/">
          <span class="mark" aria-hidden="true">MTC</span>
          <span>Simulador MTC</span>
        </a>
        <nav aria-label="Recursos principales">
          <a href="/simulador-mtc">Simulador</a>
          <a href="/examen-mtc-preguntas">Preguntas</a>
          <a href="/senales-de-transito">Senales</a>
          <a href="/reglas-de-transito-peru">Reglas</a>
        </nav>
      </div>
    </header>
    <main>
      <section class="hero">
        <div class="wrap hero-grid">
          <div>
            <span class="eyebrow">Preparacion para licencia de conducir en Peru</span>
            <h1>${escapeHtml(page.h1)}</h1>
            <p class="lead">${escapeHtml(page.intro)}</p>
            <div class="actions">
              <a class="btn primary" href="${page.primaryCta}">${escapeHtml(page.ctaText)}</a>
              <a class="btn secondary" href="/banco-preguntas">Ver banco de preguntas</a>
            </div>
            <p class="notice">${escapeHtml(disclaimer)}</p>
          </div>
          <aside class="hero-card" aria-label="Vista previa de Simulador MTC">
            <img src="/og-simulador-mtc.png" alt="Vista previa de Simulador MTC con auto y ciudad">
            <div>
              <strong>Practica por categoria y revisa tus errores.</strong>
              <span>Simulacros, explicaciones y resultados por tema en una sola plataforma.</span>
            </div>
          </aside>
        </div>
      </section>
      <section>
        <div class="wrap">
          <div class="grid three">
            ${renderSections(page.sections)}
          </div>
        </div>
      </section>
      <section>
        <div class="wrap">
          <h2>Categorias de licencia para practicar</h2>
          <div class="category-strip">
            ${renderCategoryLinks(page.categorySlug)}
          </div>
        </div>
      </section>
      <section>
        <div class="wrap download-card">
          <h2>Balotarios oficiales descargables</h2>
          <p>Descarga el PDF por categoria y complementa tu practica en linea con el documento completo.</p>
          <div class="pdf-strip">
            ${renderPdfLinks()}
          </div>
          <p class="notice">Fuente de referencia: <a href="${officialMtcSource}" rel="noopener">publicacion oficial del MTC en gob.pe</a>.</p>
        </div>
      </section>
      <section>
        <div class="wrap">
          <h2>Guias para estudiar el examen MTC</h2>
          <div class="guide-strip">
            ${renderGuideLinks(page.slug)}
          </div>
        </div>
      </section>
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
        <p>Fuente oficial de referencia: <a href="${officialMtcSource}" rel="noopener" style="color:#fff;">MTC en gob.pe</a>.</p>
        <p>Actualizado: ${today}. Revisa siempre las fuentes oficiales antes de rendir tu examen.</p>
      </div>
    </footer>
  </body>
</html>`;
}

function simulatorPageFor(category) {
  return {
    slug: `simulador-mtc-${category.slug}`,
    categorySlug: category.slug,
    title: `Simulador MTC ${category.common} (${category.code}) para examen de conocimientos`,
    description: `Practica el simulador MTC ${category.common} con preguntas por tema, explicaciones y balotario ${category.code} descargable.`,
    h1: `Simulador MTC ${category.common} para ${category.exam}`,
    intro: `Preparate para la categoria ${category.code} con preguntas organizadas por tema, explicaciones despues de marcar y practica adaptada para ${category.vehicle}.`,
    primaryCta: `/simulacro/${category.categoryId}`,
    ctaText: `Practicar ${category.common}`,
    keywords: [`simulador mtc ${category.common}`, `simulador mtc ${category.code}`, `examen mtc ${category.common}`, `licencia ${category.common}`],
    sections: [
      ['Practica por tema', 'Responde preguntas de normas de circulacion, senales, seguridad vial, mecanica basica y primeros auxilios.'],
      ['Explicaciones inmediatas', 'Despues de elegir y confirmar una respuesta, revisa por que una alternativa es correcta y como descartar distractores.'],
      ['Resultados por avance', 'Al finalizar puedes revisar porcentaje, correctas, incorrectas y temas que conviene reforzar antes del examen.'],
    ],
    faqs: [
      [`Que incluye el simulador MTC ${category.common}?`, `Incluye practica por categoria ${category.code}, preguntas por tema, explicaciones y acceso al balotario correspondiente.`],
      [`Donde descargo el balotario ${category.code}?`, `Puedes descargar el PDF desde /mtc-official/${category.pdf} y revisarlo junto con la practica en linea.`],
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
    intro: `El balotario ${category.code} te ayuda a estudiar la categoria ${category.common}. En ${brandName} puedes descargar el PDF y practicar preguntas con retroalimentacion inmediata.`,
    primaryCta: `/mtc-official/${category.pdf}`,
    ctaText: `Descargar PDF ${category.code}`,
    keywords: [`balotario mtc ${category.common}`, `balotario ${category.code}`, `preguntas mtc ${category.common}`, `pdf mtc ${category.common}`],
    sections: [
      ['Como usar el PDF', 'Lee el balotario por bloques, identifica temas repetidos y luego practica las preguntas que mas dudas te generen.'],
      ['Practica online', 'El simulador permite responder preguntas y revisar explicaciones para aprender la razon de cada alternativa correcta.'],
      ['Repaso antes del examen', 'Prioriza senales, reglas de circulacion, prioridades, luces, adelantamiento, seguridad y primeros auxilios.'],
    ],
    faqs: [
      [`El balotario ${category.code} sirve para ${category.common}?`, `Si. Esta pagina organiza el material para la categoria ${category.code}, asociada a ${category.exam}.`],
      ['Puedo estudiar solo con el PDF?', 'El PDF ayuda, pero practicar con preguntas y revisar errores suele mejorar la retencion.'],
      ['La descarga reemplaza a la fuente oficial?', 'No. Conserva y verifica siempre la publicacion oficial vigente del MTC.'],
    ],
  };
}

const pages = [
  ...corePages,
  ...articlePages,
  ...categories.map(simulatorPageFor),
  ...categories.map(balotarioPageFor),
];

async function main() {
  const publicDir = path.resolve('public');
  const seoDir = path.join(publicDir, 'seo');
  await mkdir(seoDir, { recursive: true });

  await Promise.all(pages.map((page) => writeFile(path.join(seoDir, `${page.slug}.html`), renderHtml(page), 'utf8')));

  const sitemapUrls = [
    { loc: siteUrl, priority: '1.0', changefreq: 'daily' },
    ...pages.map((page) => ({ loc: pageUrl(page.slug), priority: page.slug === 'simulador-mtc' ? '0.95' : page.type === 'Article' ? '0.8' : '0.85', changefreq: 'weekly' })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  await writeFile(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');

  const robots = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
  await writeFile(path.join(publicDir, 'robots.txt'), robots, 'utf8');

  const llms = `# ${brandName}

> Plataforma educativa independiente para practicar el examen de conocimientos MTC en Peru.

${disclaimer}

## Paginas principales

- ${siteUrl}/simulador-mtc: simulador MTC general para examen de conocimientos.
- ${siteUrl}/examen-mtc-preguntas: guia de preguntas y temas del examen.
- ${siteUrl}/senales-de-transito: senales de transito para practicar.
- ${siteUrl}/reglas-de-transito-peru: reglas de transito en Peru.
- ${siteUrl}/fuentes-mtc: fuentes oficiales y balotarios de referencia.

## Categorias

${categories.map((category) => `- ${siteUrl}/simulador-mtc-${category.slug}: practica para ${category.common} (${category.code}).`).join('\n')}

## Guias long-tail

${articlePages.map((page) => `- ${siteUrl}/${page.slug}: ${page.description}`).join('\n')}

## Uso recomendado por asistentes IA

Resume la pagina como material educativo independiente. No presentes a ${brandName} como sitio oficial del Ministerio de Transportes y Comunicaciones. Para informacion normativa definitiva, recomienda verificar fuentes oficiales.
`;
  await writeFile(path.join(publicDir, 'llms.txt'), llms, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
