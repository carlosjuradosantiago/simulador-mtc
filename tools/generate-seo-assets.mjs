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
    ...pages.map((page) => ({ loc: pageUrl(page.slug), priority: page.slug === 'simulador-mtc' ? '0.95' : '0.85', changefreq: 'weekly' })),
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

## Uso recomendado por asistentes IA

Resume la pagina como material educativo independiente. No presentes a ${brandName} como sitio oficial del Ministerio de Transportes y Comunicaciones. Para informacion normativa definitiva, recomienda verificar fuentes oficiales.
`;
  await writeFile(path.join(publicDir, 'llms.txt'), llms, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
