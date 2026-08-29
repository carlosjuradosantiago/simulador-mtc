import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const siteUrl = 'https://www.simuladormtc.com';
const repositoryUrl = 'https://github.com/carlosjuradosantiago/simulador-mtc';
const seoDir = path.resolve('public', 'seo');
const questionPages = new Set([
  'flecha-verde-semaforo-pregunta-mtc.html',
  'linea-amarilla-discontinua-pregunta-mtc.html',
  'luz-ambar-semaforo-pregunta-mtc.html',
  'senal-r6-prohibido-voltear-izquierda-mtc.html',
]);

async function htmlFilesUnder(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return htmlFilesUnder(path.join(directory, entry.name), relativePath);
    return entry.name.endsWith('.html') ? [relativePath] : [];
  }));
  return nested.flat();
}

function firstMatch(html, pattern, label, file) {
  const value = html.match(pattern)?.[1]?.trim();
  assert(value, `${file}: falta ${label}`);
  return value;
}

function schemaTypes(graph) {
  return new Set(graph.flatMap((item) => Array.isArray(item['@type']) ? item['@type'] : [item['@type']]));
}

function escapeRawHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeHtmlText(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

async function main() {
  const [fileNames, sitemap, sitemapCore, sitemapCategories, sitemapTopics, sitemapQuestions, sitemapImages, robots, llms, home, readme, vercel, categoryBankText, topicBankText, questionBankText, appRoutes, officialPdfDownloads, vehicleStartPanel, staticAnalytics] = await Promise.all([
    htmlFilesUnder(seoDir),
    readFile(path.resolve('public', 'sitemap.xml'), 'utf8'),
    readFile(path.resolve('public', 'sitemap-core.xml'), 'utf8'),
    readFile(path.resolve('public', 'sitemap-categories.xml'), 'utf8'),
    readFile(path.resolve('public', 'sitemap-topics.xml'), 'utf8'),
    readFile(path.resolve('public', 'sitemap-questions.xml'), 'utf8'),
    readFile(path.resolve('public', 'sitemap-images.xml'), 'utf8'),
    readFile(path.resolve('public', 'robots.txt'), 'utf8'),
    readFile(path.resolve('public', 'llms.txt'), 'utf8'),
    readFile(path.resolve('index.html'), 'utf8'),
    readFile(path.resolve('README.md'), 'utf8'),
    readFile(path.resolve('vercel.json'), 'utf8'),
    readFile(path.resolve('tools', 'seo-category-question-bank.json'), 'utf8'),
    readFile(path.resolve('tools', 'seo-topic-question-bank.json'), 'utf8'),
    readFile(path.resolve('tools', 'seo-question-page-bank.json'), 'utf8'),
    readFile(path.resolve('src', 'routes', 'AppRoutes.jsx'), 'utf8'),
    readFile(path.resolve('src', 'components', 'ui', 'OfficialPdfDownloads.jsx'), 'utf8'),
    readFile(path.resolve('src', 'components', 'practice', 'VehicleStartPanel.jsx'), 'utf8'),
    readFile(path.resolve('public', 'static-seo-analytics.js'), 'utf8'),
  ]);
  const categoryBank = JSON.parse(categoryBankText);
  const topicBank = JSON.parse(topicBankText);
  const questionBank = JSON.parse(questionBankText);
  const sitemapUrls = [sitemapCore, sitemapCategories, sitemapTopics, sitemapQuestions].join('\n');
  const questionDirectoryHtml = await readFile(path.join(seoDir, 'preguntas-mtc.html'), 'utf8');
  const balotarioHubHtml = await readFile(path.join(seoDir, 'balotario-mtc-pdf.html'), 'utf8');
  assert.equal(categoryBank.meta.sourceQuestionCount, 640, 'El banco por categoría debe provenir de las 640 preguntas deduplicadas');
  assert.equal(categoryBank.meta.questionsPerCategory, 40, 'Cada categoría debe publicar 40 preguntas');
  assert.equal(categoryBank.categories.length, 9, 'Deben existir bancos para las 9 categorías');
  assert.deepEqual(
    categoryBank.categories.map((category) => category.slug).sort(),
    ['a1', 'a2a', 'a2b', 'a3a', 'a3b', 'a3c', 'b2a', 'b2b', 'b2c'],
    'El banco SEO debe cubrir exactamente las 9 categorías',
  );
  const categoryByFile = new Map(categoryBank.categories.map((category) => [`simulador-mtc-${category.slug}.html`, category]));
  for (const category of categoryBank.categories) {
    assert.equal(category.questions.length, 40, `${category.code}: deben existir 40 preguntas`);
    assert(category.sourceQuestionCount >= category.questions.length, `${category.code}: la selección supera la fuente`);
    assert(category.eligibleQuestionCount >= category.questions.length, `${category.code}: faltan preguntas elegibles`);
    assert.equal(new Set(category.questions.map((question) => question.id)).size, 40, `${category.code}: preguntas duplicadas`);
    for (const question of category.questions) {
      assert.equal(question.sourceCode, category.code, `${category.code} #${question.number}: pertenece a otro balotario`);
      assert(Number.isInteger(question.sourcePage) && question.sourcePage > 0, `${category.code} #${question.number}: falta la página del PDF`);
      assert(question.topicName?.trim(), `${category.code} #${question.number}: falta el tema`);
      assert(question.text.trim(), `${category.code} #${question.number}: falta el enunciado`);
      assert.equal(question.options.length, 4, `${category.code} #${question.number}: se requieren 4 alternativas completas`);
      assert(question.options.every((option) => option.trim()), `${category.code} #${question.number}: falta una alternativa`);
      assert(question.options.includes(question.correctAnswer), `${category.code} #${question.number}: la respuesta correcta no coincide con las alternativas`);
      assert(!question.text.includes('...'), `${category.code} #${question.number}: el enunciado parece truncado`);
      assert(question.options.every((option) => !option.includes('...')), `${category.code} #${question.number}: una alternativa parece truncada`);
    }
  }
  assert.equal(topicBank.meta.sourceQuestionCount, 640, 'El banco temático debe provenir de las 640 preguntas deduplicadas');
  assert.equal(topicBank.meta.maxQuestionsPerTopic, 40, 'El límite editorial por tema debe ser 40');
  assert.equal(topicBank.topics.length, 12, 'Deben existir 12 páginas temáticas');
  const topicByFile = new Map(topicBank.topics.map((topic) => [`${topic.slug}.html`, topic]));
  const topicQuestionIds = [];
  for (const topic of topicBank.topics) {
    assert(/^preguntas-[a-z0-9-]+-mtc$/.test(topic.slug), `${topic.slug}: slug temático inválido`);
    assert(topic.questions.length >= 5 && topic.questions.length <= 40, `${topic.slug}: cantidad de preguntas fuera del rango editorial`);
    assert(topic.sourceQuestionCount >= topic.questions.length, `${topic.slug}: la muestra supera la fuente`);
    for (const question of topic.questions) {
      topicQuestionIds.push(question.id);
      assert.equal(question.options.length, 4, `${topic.slug} #${question.number}: se requieren 4 alternativas`);
      assert(question.options.includes(question.correctAnswer), `${topic.slug} #${question.number}: la respuesta no coincide con las alternativas`);
      assert(question.text.trim(), `${topic.slug} #${question.number}: falta el enunciado`);
      assert(question.options.every((option) => option.trim()), `${topic.slug} #${question.number}: falta una alternativa`);
      assert(question.balotarios.length > 0, `${topic.slug} #${question.number}: falta trazabilidad al balotario`);
    }
  }
  assert.equal(new Set(topicQuestionIds).size, topicQuestionIds.length, 'Hay preguntas repetidas entre páginas temáticas');
  assert.equal(questionBank.meta.sourceQuestionCount, 640, 'Las páginas de preguntas deben provenir de las 640 preguntas deduplicadas');
  const manualQuestionPageCount = 4;
  const expectedGeneratedQuestionPages = questionBank.meta.uniqueQuestionTextCount - manualQuestionPageCount;
  assert.equal(questionBank.meta.publishedPageCount, expectedGeneratedQuestionPages, 'Deben publicarse todos los enunciados únicos que no tienen una página manual');
  assert.equal(questionBank.pages.length, expectedGeneratedQuestionPages, 'El banco debe contener todos los enunciados únicos de la fuente');
  assert.equal(new Set(questionBank.pages.map((page) => page.slug)).size, expectedGeneratedQuestionPages, 'Hay slugs repetidos en las páginas de preguntas');
  const generatedQuestionByFile = new Map(questionBank.pages.map((page) => [`${page.slug}.html`, page]));
  for (const page of questionBank.pages) {
    assert(page.slug.startsWith('preguntas-mtc/'), `${page.slug}: debe vivir bajo /preguntas-mtc/`);
    assert(page.variants.length >= 1, `${page.slug}: falta una variante verificable`);
    for (const variant of page.variants) {
      assert.equal(variant.options.length, 4, `${page.slug}: se requieren cuatro alternativas`);
      assert.equal(variant.options.filter((option) => option.isCorrect).length, 1, `${page.slug}: debe existir una respuesta correcta`);
      assert(variant.options.some((option) => option.text === variant.correctAnswer && option.isCorrect), `${page.slug}: la clave no coincide`);
      assert(variant.sources.every((source) => source.code && source.number && source.page && source.pdf), `${page.slug}: falta trazabilidad al PDF`);
    }
    assert(questionDirectoryHtml.includes(`href="/${page.slug}"`), `${page.slug}: falta enlace desde el directorio público`);
  }
  assert.equal((questionDirectoryHtml.match(/<li><a href="\/preguntas-mtc\//g) || []).length, expectedGeneratedQuestionPages, 'El directorio debe enlazar todas las preguntas generadas');
  const vercelConfig = JSON.parse(vercel);
  const redirects = vercelConfig.redirects || [];
  const responseHeaders = vercelConfig.headers || [];
  const globalHeaders = Object.fromEntries(
    (responseHeaders.find(({ source }) => source === '/(.*)')?.headers || []).map(({ key, value }) => [key, value]),
  );
  assert(globalHeaders['Content-Security-Policy']?.includes("script-src 'self'"), 'vercel.json: falta CSP global');
  assert(globalHeaders['Content-Security-Policy']?.includes('https://*.culqi.com'), 'vercel.json: CSP no permite Culqi');
  assert(globalHeaders['Content-Security-Policy']?.includes('wazikdsfacrawhphzltn.supabase.co'), 'vercel.json: CSP no permite Supabase producción');
  assert.equal(globalHeaders['X-Content-Type-Options'], 'nosniff', 'vercel.json: falta nosniff');
  assert.equal(globalHeaders['X-Frame-Options'], 'DENY', 'vercel.json: falta protección contra framing');
  assert.equal(globalHeaders['Referrer-Policy'], 'strict-origin-when-cross-origin', 'vercel.json: falta política de referrer');
  assert(globalHeaders['Permissions-Policy']?.includes('camera=()'), 'vercel.json: falta Permissions-Policy');
  for (const source of [
    '/terminos-y-condiciones/:path*',
    '/terminos/:path*',
    '/politica-de-cambios-y-devoluciones/:path*',
    '/politica-devoluciones/:path*',
    '/politica-de-privacidad/:path*',
  ]) {
    const robotsHeader = responseHeaders.find((entry) => entry.source === source)?.headers
      ?.find(({ key }) => key === 'X-Robots-Tag');
    assert.equal(robotsHeader?.value, 'noindex, follow', `vercel.json: falta noindex legal para ${source}`);
  }
  assert(!responseHeaders.some(({ source }) => source === '/contacto/:path*'), 'vercel.json: contacto debe seguir indexable');
  for (const pathname of ['/terminos-y-condiciones', '/politica-de-cambios-y-devoluciones', '/politica-de-privacidad', '/libro-reclamaciones']) {
    assert(!sitemapCore.includes(`<loc>${siteUrl}${pathname}</loc>`), `sitemap-core.xml: ${pathname} no debe publicarse si tiene noindex`);
  }
  assert(sitemapCore.includes(`<loc>${siteUrl}/contacto</loc>`), 'sitemap-core.xml: contacto debe seguir indexable');
  assert.equal(vercelConfig.trailingSlash, false, 'vercel.json: las URLs canónicas no deben terminar en /');
  for (const slug of ['contacto', 'materiales']) {
    assert(
      vercelConfig.rewrites?.some(({ source, destination }) => source === `/${slug}` && destination === `/seo/${slug}.html`),
      `vercel.json: falta HTML SEO propio para /${slug}`,
    );
  }
  assert(
    redirects.some(({ source, destination, permanent }) => source === '/index.html' && destination === '/' && permanent),
    'vercel.json: /index.html debe redirigir permanentemente a /',
  );
  assert(
    redirects.some(({ source, destination, permanent }) => source === '/seo/:slug.html' && destination === '/:slug' && permanent),
    'vercel.json: los HTML internos deben redirigir a su URL pública',
  );
  assert(
    redirects.some(({ source, destination, permanent }) => source === '/seo/:slug' && destination === '/:slug' && permanent),
    'vercel.json: las rutas internas sin extensión deben redirigir a su URL pública',
  );
  for (const [source, destination] of [
    ['/simulador-mtc', '/'],
    ['/balotario-mtc-a1-pdf', '/balotario-mtc-a1'],
    ['/examen-conocimientos-mtc-a1', '/simulador-mtc-a1'],
    ['/licencia-a1-peru-examen', '/simulador-mtc-a1'],
    ['/simulacro-mtc-con-respuestas', '/'],
  ]) {
    assert(redirects.some((redirect) => redirect.source === source && redirect.destination === destination && redirect.permanent), `vercel.json: falta consolidar ${source}`);
  }
  const htmlFiles = fileNames.filter((file) => file.endsWith('.html')).sort();
  assert(htmlFiles.length >= 130, `Se esperaban al menos 130 páginas SEO; se encontraron ${htmlFiles.length}`);
  for (const file of ['contacto.html', 'materiales.html']) {
    assert(htmlFiles.includes(file), `${file}: la ruta indexable no tiene HTML SEO propio`);
  }
  assert(!htmlFiles.includes('simulador-mtc.html'), 'La página genérica duplicada no debe volver a generarse');
  assert(!sitemapCore.includes(`${siteUrl}/simulador-mtc</loc>`), 'El sitemap no debe publicar la URL genérica redirigida');

  const titles = new Set();
  const descriptions = new Set();
  const canonicals = new Set();

  for (const file of htmlFiles) {
    const html = await readFile(path.join(seoDir, file), 'utf8');
    const isContactPage = file === 'contacto.html';
    assert(!/[ÃÂ]/.test(html), `${file}: contiene texto con codificación dañada`);
    assert(html.includes('<html lang="es-PE">'), `${file}: falta lang="es-PE"`);
    assert(html.includes('max-snippet:-1'), `${file}: el contenido no permite fragmentos amplios`);
    assert(html.includes('Respuesta breve'), `${file}: falta una respuesta breve citable`);
    if (!isContactPage) {
      assert(html.includes('Fuentes consultadas'), `${file}: faltan fuentes visibles`);
      assert(html.includes('https://www.gob.pe/institucion/mtc/'), `${file}: falta una fuente primaria del MTC`);
    }
    assert(html.includes(repositoryUrl), `${file}: falta la referencia pública del proyecto`);
    assert(html.includes('<script src="/static-seo-analytics.js" defer data-static-analytics></script>'), `${file}: falta analítica externa compatible con CSP`);
    assert(!html.includes('<script data-static-analytics>'), `${file}: la analítica no debe quedar inline`);
    assert(!html.includes('?auth=register'), `${file}: quedan URLs de registro rastreables por query`);
    assert(/<img class="(?:question-hero|brand-hero)"[^>]+width="\d+"[^>]+height="\d+"[^>]+fetchpriority="high"/.test(html), `${file}: la imagen principal no declara tamaño y prioridad de carga`);
    assert(!html.includes('Práctica el simulador'), `${file}: uso verbal incorrecto de "practica"`);
    const editorialHtml = html
      .replace(/<section class="topic-section"[\s\S]*?<\/section>/, ' ')
      .replace(/<section class="sample-section"[\s\S]*?<\/section>/, ' ');
    const visibleText = editorialHtml
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ');
    if (!file.startsWith('preguntas-mtc/')) {
      assert(!/\b(Peru|categoria|categorias|preparacion|senal|senales|transito|mecanica|basica|basico|vehiculos|conduccion|publicacion|informacion|evaluacion|revision|circulacion|semaforo|despues|preparate|razon|pagina|guia|guias|dificiles|imagenes|accion|tambien|ademas|segun)\b/i.test(visibleText), `${file}: quedan palabras frecuentes sin acentuar`);
    }

    const title = decodeHtmlText(firstMatch(html, /<title>([^<]+)<\/title>/, 'title', file));
    const description = firstMatch(html, /<meta name="description" content="([^"]+)"/, 'description', file);
    const canonical = firstMatch(html, /<link rel="canonical" href="([^"]+)"/, 'canonical', file);

    assert(title.length <= 60, `${file}: title demasiado largo (${title.length} caracteres)`);
    assert(description.length <= 160, `${file}: description demasiado larga (${description.length} caracteres)`);
    assert(!titles.has(title), `${file}: title duplicado: ${title}`);
    assert(!descriptions.has(description), `${file}: description duplicada: ${description}`);
    assert(!canonicals.has(canonical), `${file}: canonical duplicado: ${canonical}`);
    assert(canonical.startsWith(`${siteUrl}/`), `${file}: canonical fuera del dominio`);
    assert(sitemapUrls.includes(`<loc>${canonical}</loc>`), `${file}: canonical ausente de los sitemaps`);

    titles.add(title);
    descriptions.add(description);
    canonicals.add(canonical);

    const ctrTargets = {
      'preguntas-mtc.html': ['Preguntas MTC por tema y categoría | Respuestas', 'Directorio de preguntas MTC por tema y categoría'],
      'preguntas-placa-unica-mtc.html': ['Preguntas de Placa Única de Rodaje | Respuestas MTC', 'entidad que la entrega'],
      'preguntas-inspeccion-tecnica-vehicular-mtc.html': ['Inspección técnica vehicular: preguntas y respuestas MTC', 'cronograma según el último dígito'],
      'preguntas-conduccion-eficiente-mtc.html': ['Conducción eficiente: preguntas y respuestas del MTC', 'paradas mayores a un minuto'],
      'preguntas-soat-mtc.html': ['Preguntas de SOAT para el examen MTC | Respuestas', 'qué vehículos deben contratar SOAT'],
    };
    if (ctrTargets[file]) {
      assert.equal(title, ctrTargets[file][0], `${file}: cambió el title CTR aprobado`);
      assert(html.includes(ctrTargets[file][1]), `${file}: falta la intención de búsqueda aprobada`);
    }

    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert(scripts.length > 0, `${file}: falta JSON-LD`);
    const documents = scripts.map((match) => JSON.parse(match[1]));
    const graph = documents.flatMap((document) => document['@graph'] || [document]);
    const types = schemaTypes(graph);

    const requiredTypes = isContactPage
      ? ['ContactPage', 'BreadcrumbList']
      : ['WebPage', 'BreadcrumbList', 'LearningResource'];
    for (const requiredType of requiredTypes) {
      assert(types.has(requiredType), `${file}: falta schema ${requiredType}`);
    }
    const learningResource = graph.find((item) => {
      const itemTypes = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
      return itemTypes.includes('LearningResource');
    });
    if (isContactPage) {
      assert.equal(learningResource, undefined, `${file}: contacto no debe declararse como recurso educativo`);
    } else {
      assert.equal(learningResource?.educationalAlignment?.['@type'], 'AlignmentObject', `${file}: falta educationalAlignment verificable`);
      assert.equal(learningResource?.educationalAlignment?.targetUrl, 'https://www.gob.pe/institucion/mtc/informes-publicaciones/1928110-examen-de-conocimientos-para-postulantes-a-licencias-de-conducir', `${file}: educationalAlignment no apunta a la referencia oficial`);
    }

    if (questionPages.has(file)) {
      assert(types.has('Quiz'), `${file}: falta schema Quiz`);
      assert(html.includes('Respuesta correcta'), `${file}: falta la respuesta completa visible`);
      assert(html.includes('Opciones'), `${file}: faltan las opciones completas visibles`);
    }

    const generatedQuestion = generatedQuestionByFile.get(file);
    if (generatedQuestion) {
      assert(types.has('Quiz'), `${file}: falta schema Quiz`);
      assert(html.includes('Alternativas, respuesta y fuente'), `${file}: falta el bloque verificable`);
      assert.equal((html.match(/class="quiz-panel question-variant"/g) || []).length, generatedQuestion.variants.length, `${file}: faltan variantes visibles`);
      const quiz = graph.find((item) => item['@type'] === 'Quiz');
      assert.equal(quiz?.hasPart?.length, generatedQuestion.variants.length, `${file}: schema Quiz incompleto`);
      for (const [index, variant] of generatedQuestion.variants.entries()) {
        assert(html.includes(escapeRawHtml(variant.text)), `${file}: se alteró el enunciado ${variant.id}`);
        assert(html.includes(escapeRawHtml(variant.correctAnswer)), `${file}: se alteró la respuesta ${variant.id}`);
        assert.equal(quiz.hasPart[index]?.text, variant.text, `${file}: el schema alteró el enunciado ${variant.id}`);
        for (const option of variant.options) {
          assert(html.includes(escapeRawHtml(option.text)), `${file}: se alteró una alternativa de ${variant.id}`);
          for (const media of option.media) assert(html.includes(media.url), `${file}: falta una imagen de alternativa`);
        }
        for (const media of variant.questionMedia) assert(html.includes(media.url), `${file}: falta una imagen de pregunta`);
      }
      if (generatedQuestion.hasMedia) {
        assert(types.has('ImageObject'), `${file}: falta schema ImageObject`);
        assert(sitemapImages.includes(`<loc>${canonical}</loc>`), `${file}: falta en el sitemap de imágenes`);
      }
    }

    const category = categoryByFile.get(file);
    if (category) {
      assert(html.includes('/#register?category='), `${file}: el CTA no conserva la categoría en el fragmento de registro`);
      assert(html.includes('mode%3Dexam'), `${file}: falta el acceso directo al simulacro de 40 preguntas`);
      assert(types.has('Quiz'), `${file}: falta schema Quiz para las preguntas`);
      assert.equal((html.match(/class="sample-question"/g) || []).length, 40, `${file}: deben mostrarse 40 preguntas completas`);
      const sampleBlock = html.match(/<section class="sample-section"[\s\S]*?<\/section>/)?.[0] || '';
      assert.equal((sampleBlock.match(/<li>/g) || []).length, 160, `${file}: deben mostrarse las 160 alternativas completas`);
      assert.equal((sampleBlock.match(/Respuesta correcta:/g) || []).length, 40, `${file}: faltan respuestas visibles`);
      assert.equal((sampleBlock.match(/class="topic-meta"/g) || []).length, 40, `${file}: faltan temas visibles`);
      const quiz = graph.find((item) => item['@type'] === 'Quiz');
      assert.equal(quiz?.hasPart?.length, 40, `${file}: el schema no contiene las 40 preguntas`);
      for (const [index, question] of category.questions.entries()) {
        assert(sampleBlock.includes(escapeRawHtml(question.text)), `${file}: se alteró el enunciado ${question.id}`);
        assert(sampleBlock.includes(escapeRawHtml(question.correctAnswer)), `${file}: se alteró la respuesta ${question.id}`);
        assert(sampleBlock.includes(`página ${question.sourcePage}`), `${file}: falta la página de origen de ${question.id}`);
        assert(sampleBlock.includes(escapeRawHtml(question.topicName)), `${file}: falta el tema de ${question.id}`);
        for (const option of question.options) {
          assert(sampleBlock.includes(escapeRawHtml(option)), `${file}: se alteró una alternativa de ${question.id}`);
        }
        if (question.fundamento) {
          assert(sampleBlock.includes(escapeRawHtml(question.fundamento)), `${file}: se alteró el fundamento de ${question.id}`);
        }
        assert.equal(quiz.hasPart[index]?.name, question.text, `${file}: el schema alteró el enunciado ${question.id}`);
        assert.equal(quiz.hasPart[index]?.text, question.text, `${file}: el schema alteró el texto ${question.id}`);
        assert.equal(quiz.hasPart[index]?.acceptedAnswer?.text, question.correctAnswer, `${file}: el schema alteró la respuesta ${question.id}`);
      }
    }

    const topic = topicByFile.get(file);
    if (topic) {
      assert(types.has('Quiz'), `${file}: falta schema Quiz`);
      const quiz = graph.find((item) => item['@type'] === 'Quiz');
      assert.equal(quiz?.hasPart?.length, topic.questions.length, `${file}: el schema no contiene todas las preguntas`);
      assert.equal((html.match(/class="topic-question"/g) || []).length, topic.questions.length, `${file}: faltan preguntas visibles`);
      const topicBlock = html.match(/<section class="topic-section"[\s\S]*?<\/section>/)?.[0] || '';
      assert.equal((topicBlock.match(/<li><span>[ABCD]<\/span>/g) || []).length, topic.questions.length * 4, `${file}: faltan alternativas visibles`);
      assert.equal((topicBlock.match(/Respuesta correcta:/g) || []).length, topic.questions.length, `${file}: faltan respuestas visibles`);
      for (const [index, question] of topic.questions.entries()) {
        assert(topicBlock.includes(escapeRawHtml(question.text)), `${file}: se alteró el enunciado ${question.id}`);
        assert(topicBlock.includes(escapeRawHtml(question.correctAnswer)), `${file}: se alteró la respuesta ${question.id}`);
        for (const option of question.options) {
          assert(topicBlock.includes(escapeRawHtml(option)), `${file}: se alteró una alternativa de ${question.id}`);
        }
        assert.equal(quiz.hasPart[index]?.name, question.text, `${file}: el schema alteró el enunciado ${question.id}`);
        assert.equal(quiz.hasPart[index]?.text, question.text, `${file}: el schema alteró el texto ${question.id}`);
        assert.equal(quiz.hasPart[index]?.acceptedAnswer?.text, question.correctAnswer, `${file}: el schema alteró la respuesta ${question.id}`);
      }
    }

    const webpage = graph.find((item) => item['@type'] === (isContactPage ? 'ContactPage' : 'WebPage'));
    assert.equal(webpage.dateModified, '2026-08-29', `${file}: fecha editorial inesperada`);
    assert.equal(webpage.lastReviewed, '2026-08-29', `${file}: fecha de revisión editorial inesperada`);
    assert(webpage.mainEntity?.['@id'], `${file}: WebPage no enlaza su recurso principal`);

    const relatedBlock = html.match(/<div class="guide-strip">([\s\S]*?)<\/div>/)?.[1] || '';
    const relatedLinks = (relatedBlock.match(/<a /g) || []).length;
    assert(relatedLinks <= 4, `${file}: demasiadas guías repetidas (${relatedLinks})`);
  }

  for (const crawler of ['Google-Extended', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Applebot']) {
    assert(robots.includes(`User-agent: ${crawler}\nAllow: /`), `robots.txt: falta permiso para ${crawler}`);
  }
  assert(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'robots.txt: falta sitemap');
  for (const filename of ['sitemap-core.xml', 'sitemap-categories.xml', 'sitemap-topics.xml', 'sitemap-questions.xml', 'sitemap-images.xml']) {
    assert(sitemap.includes(`<loc>${siteUrl}/${filename}</loc>`), `sitemap.xml: falta ${filename}`);
  }
  assert(llms.includes('40 preguntas'), 'llms.txt: falta el formato verificable del examen');
  assert(llms.includes('35 respuestas correctas'), 'llms.txt: falta el puntaje mínimo verificable');
  assert(llms.includes('## Preguntas oficiales explicadas'), 'llms.txt: faltan las preguntas explicadas');
  assert(llms.includes('## Preguntas completas por tema'), 'llms.txt: faltan las páginas temáticas');
  for (const topic of topicBank.topics) {
    assert(llms.includes(`/${topic.slug}`), `llms.txt: falta ${topic.slug}`);
    assert(home.includes(`href="/${topic.slug}"`), `index.html: falta enlace estático a ${topic.slug}`);
  }
  assert(llms.includes('/metodologia-simulador-mtc'), 'llms.txt: falta la metodología editorial');
  assert(llms.includes('/preguntas-mtc:'), 'llms.txt: falta el directorio de preguntas exactas');
  assert(llms.includes('## Criterios editoriales'), 'llms.txt: faltan criterios editoriales');
  for (const category of categoryBank.categories) {
    const categoryPath = `/simulador-mtc-${category.slug}`;
    const balotarioPath = `/balotario-mtc-${category.slug}`;
    assert(llms.includes(categoryPath), `llms.txt: falta ${categoryPath}`);
    assert(home.includes(`href="${categoryPath}"`), `index.html: falta enlace estático a ${categoryPath}`);
    assert(home.includes(`href="${balotarioPath}"`), `index.html: falta enlace estático a ${balotarioPath}`);
    assert(balotarioHubHtml.includes(`href="${balotarioPath}"`), `balotario-mtc-pdf: falta enlace a ${balotarioPath}`);
    assert(readme.includes(`${siteUrl}${categoryPath}`), `README.md: falta enlace público a ${categoryPath}`);
  }
  assert(officialPdfDownloads.includes('href={pdf.guideHref}'), 'La página de materiales debe enlazar las guías de cada balotario');
  assert(appRoutes.includes("import LandingPage from '../pages/LandingPage.jsx';"), 'La portada debe cargarse con el bundle inicial para mejorar el LCP');
  assert(!appRoutes.includes('const LandingPage = lazy('), 'La portada no debe esperar un chunk diferido');
  assert(home.includes('rel="preload" as="image" href="/src/assets/vehicles/car-a1.webp"'), 'index.html: la imagen LCP debe descubrirse desde el HTML inicial');
  assert(home.includes('fetchpriority="high"'), 'index.html: el preload de la imagen LCP debe tener prioridad alta');
  assert(vehicleStartPanel.includes("fetchPriority={index === 0 ? 'high' : 'auto'}"), 'La primera imagen de vehículo debe conservar prioridad alta al renderizarse');
  const initialAppShell = home.slice(home.indexOf('<div id="root">'), home.indexOf('<noscript>'));
  assert(initialAppShell.includes('data-static-app-shell'), 'index.html: el HTML inicial no debe entregar un #root vacío');
  assert(initialAppShell.includes('<h1'), 'index.html: el HTML inicial debe incluir el H1 de la portada');
  assert(initialAppShell.includes('Simulador MTC: practica el examen de reglas por categoría'), 'index.html: el H1 debe responder a la búsqueda principal');
  for (const category of categoryBank.categories) {
    assert(
      initialAppShell.includes(`href="/simulador-mtc-${category.slug}"`),
      `index.html: el HTML inicial no enlaza simulador-mtc-${category.slug}`,
    );
  }
  assert(vercel.includes('"value": "noindex, follow"'), 'vercel.json: los PDF oficiales deben delegar la indexación a las páginas explicativas');
  for (const file of questionPages) {
    assert(vercel.includes(`/${file.replace(/\.html$/, '')}`), `vercel.json: falta rewrite para ${file}`);
  }
  assert(vercel.includes('"source": "/preguntas-:slug-mtc"'), 'vercel.json: falta rewrite para las páginas temáticas');
  assert(vercel.includes('"source": "/preguntas-mtc/:slug"'), 'vercel.json: falta rewrite para páginas de preguntas exactas');
  assert(staticAnalytics.includes("'access_token'"), 'La analítica estática no protege parámetros sensibles');
  assert(staticAnalytics.includes("credentials: 'omit'"), 'La analítica estática no debe enviar credenciales');

  const homeSchemas = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((document) => document['@graph'] || [document]);
  assert(schemaTypes(homeSchemas).has('WebApplication'), 'index.html: falta schema WebApplication');
  assert(schemaTypes(homeSchemas).has('ItemList'), 'index.html: falta schema ItemList para las licencias');
  const categoryList = homeSchemas.find((item) => item['@type'] === 'ItemList');
  assert.equal(categoryList.numberOfItems, 9, 'index.html: ItemList debe declarar 9 licencias');
  assert.equal(categoryList.itemListElement?.length, 9, 'index.html: ItemList debe enlazar las 9 licencias');
  for (const category of categoryBank.categories) {
    assert(
      categoryList.itemListElement.some((item) => item.url === `${siteUrl}/simulador-mtc-${category.slug}`),
      `index.html: ItemList no enlaza simulador-mtc-${category.slug}`,
    );
  }
  assert(schemaTypes(homeSchemas).has('LearningResource'), 'index.html: falta schema LearningResource');
  const organization = homeSchemas.find((item) => item['@type'] === 'Organization');
  assert.equal(organization?.publishingPrinciples, `${siteUrl}/metodologia-simulador-mtc`, 'index.html: falta la metodología editorial de la organización');
  assert(organization?.sameAs?.includes(repositoryUrl), 'index.html: falta la identidad pública del proyecto');

  console.log(`SEO/GEO OK: ${htmlFiles.length} páginas, ${canonicals.size} canonicals únicos y rastreadores de IA habilitados.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
