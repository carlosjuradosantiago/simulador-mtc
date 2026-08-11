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

async function main() {
  const [fileNames, sitemap, robots, llms, home, readme, vercel, categoryBankText, topicBankText] = await Promise.all([
    readdir(seoDir),
    readFile(path.resolve('public', 'sitemap.xml'), 'utf8'),
    readFile(path.resolve('public', 'robots.txt'), 'utf8'),
    readFile(path.resolve('public', 'llms.txt'), 'utf8'),
    readFile(path.resolve('index.html'), 'utf8'),
    readFile(path.resolve('README.md'), 'utf8'),
    readFile(path.resolve('vercel.json'), 'utf8'),
    readFile(path.resolve('tools', 'seo-category-question-bank.json'), 'utf8'),
    readFile(path.resolve('tools', 'seo-topic-question-bank.json'), 'utf8'),
  ]);
  const categoryBank = JSON.parse(categoryBankText);
  const topicBank = JSON.parse(topicBankText);
  assert.equal(categoryBank.meta.sourceQuestionCount, 655, 'El banco por categoría debe provenir de las 655 preguntas deduplicadas');
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
  assert.equal(topicBank.meta.sourceQuestionCount, 655, 'El banco temático debe provenir de las 655 preguntas deduplicadas');
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
  const vercelConfig = JSON.parse(vercel);
  const redirects = vercelConfig.redirects || [];
  assert.equal(vercelConfig.trailingSlash, false, 'vercel.json: las URLs canónicas no deben terminar en /');
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
  const htmlFiles = fileNames.filter((file) => file.endsWith('.html')).sort();
  assert(htmlFiles.length >= 58, `Se esperaban al menos 58 páginas SEO; se encontraron ${htmlFiles.length}`);

  const titles = new Set();
  const descriptions = new Set();
  const canonicals = new Set();

  for (const file of htmlFiles) {
    const html = await readFile(path.join(seoDir, file), 'utf8');
    assert(!/[ÃÂ]/.test(html), `${file}: contiene texto con codificación dañada`);
    assert(html.includes('<html lang="es-PE">'), `${file}: falta lang="es-PE"`);
    assert(html.includes('max-snippet:-1'), `${file}: el contenido no permite fragmentos amplios`);
    assert(html.includes('Respuesta breve'), `${file}: falta una respuesta breve citable`);
    assert(html.includes('Fuentes consultadas'), `${file}: faltan fuentes visibles`);
    assert(html.includes('https://www.gob.pe/institucion/mtc/'), `${file}: falta una fuente primaria del MTC`);
    assert(html.includes(repositoryUrl), `${file}: falta la referencia pública del proyecto`);
    assert(!html.includes('Práctica el simulador'), `${file}: uso verbal incorrecto de "practica"`);
    const editorialHtml = html
      .replace(/<section class="topic-section"[\s\S]*?<\/section>/, ' ')
      .replace(/<section class="sample-section"[\s\S]*?<\/section>/, ' ');
    const visibleText = editorialHtml
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ');
    assert(!/\b(Peru|categoria|categorias|preparacion|senal|senales|transito|mecanica|basica|basico|vehiculos|conduccion|publicacion|informacion|evaluacion|revision|circulacion|semaforo|despues|preparate|razon|pagina|guia|guias|dificiles|imagenes|accion|tambien|ademas|segun)\b/i.test(visibleText), `${file}: quedan palabras frecuentes sin acentuar`);

    const title = firstMatch(html, /<title>([^<]+)<\/title>/, 'title', file);
    const description = firstMatch(html, /<meta name="description" content="([^"]+)"/, 'description', file);
    const canonical = firstMatch(html, /<link rel="canonical" href="([^"]+)"/, 'canonical', file);

    assert(title.length <= 70, `${file}: title demasiado largo (${title.length} caracteres)`);
    assert(description.length <= 160, `${file}: description demasiado larga (${description.length} caracteres)`);
    assert(!titles.has(title), `${file}: title duplicado: ${title}`);
    assert(!descriptions.has(description), `${file}: description duplicada: ${description}`);
    assert(!canonicals.has(canonical), `${file}: canonical duplicado: ${canonical}`);
    assert(canonical.startsWith(`${siteUrl}/`), `${file}: canonical fuera del dominio`);
    assert(sitemap.includes(`<loc>${canonical}</loc>`), `${file}: canonical ausente del sitemap`);

    titles.add(title);
    descriptions.add(description);
    canonicals.add(canonical);

    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert(scripts.length > 0, `${file}: falta JSON-LD`);
    const documents = scripts.map((match) => JSON.parse(match[1]));
    const graph = documents.flatMap((document) => document['@graph'] || [document]);
    const types = schemaTypes(graph);

    for (const requiredType of ['WebPage', 'BreadcrumbList', 'LearningResource']) {
      assert(types.has(requiredType), `${file}: falta schema ${requiredType}`);
    }

    if (questionPages.has(file)) {
      assert(types.has('Quiz'), `${file}: falta schema Quiz`);
      assert(html.includes('Respuesta correcta'), `${file}: falta la respuesta completa visible`);
      assert(html.includes('Opciones'), `${file}: faltan las opciones completas visibles`);
    }

    const category = categoryByFile.get(file);
    if (category) {
      assert(html.includes('auth=register&amp;category='), `${file}: el CTA no conserva la categoría al registrar`);
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

    const webpage = graph.find((item) => item['@type'] === 'WebPage');
    assert.equal(webpage.dateModified, '2026-08-11', `${file}: fecha editorial inesperada`);
    assert(webpage.mainEntity?.['@id'], `${file}: WebPage no enlaza su recurso principal`);

    const relatedBlock = html.match(/<div class="guide-strip">([\s\S]*?)<\/div>/)?.[1] || '';
    const relatedLinks = (relatedBlock.match(/<a /g) || []).length;
    assert(relatedLinks <= 4, `${file}: demasiadas guías repetidas (${relatedLinks})`);
  }

  for (const crawler of ['Google-Extended', 'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'PerplexityBot', 'Applebot']) {
    assert(robots.includes(`User-agent: ${crawler}\nAllow: /`), `robots.txt: falta permiso para ${crawler}`);
  }
  assert(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'robots.txt: falta sitemap');
  assert(llms.includes('40 preguntas'), 'llms.txt: falta el formato verificable del examen');
  assert(llms.includes('35 respuestas correctas'), 'llms.txt: falta el puntaje mínimo verificable');
  assert(llms.includes('## Preguntas oficiales explicadas'), 'llms.txt: faltan las preguntas explicadas');
  assert(llms.includes('## Preguntas completas por tema'), 'llms.txt: faltan las páginas temáticas');
  for (const topic of topicBank.topics) {
    assert(llms.includes(`/${topic.slug}`), `llms.txt: falta ${topic.slug}`);
    assert(home.includes(`href="/${topic.slug}"`), `index.html: falta enlace estático a ${topic.slug}`);
  }
  assert(llms.includes('/metodologia-simulador-mtc'), 'llms.txt: falta la metodología editorial');
  assert(llms.includes('## Criterios editoriales'), 'llms.txt: faltan criterios editoriales');
  for (const category of categoryBank.categories) {
    const categoryPath = `/simulador-mtc-${category.slug}`;
    assert(llms.includes(categoryPath), `llms.txt: falta ${categoryPath}`);
    assert(home.includes(`href="${categoryPath}"`), `index.html: falta enlace estático a ${categoryPath}`);
    assert(readme.includes(`${siteUrl}${categoryPath}`), `README.md: falta enlace público a ${categoryPath}`);
  }
  assert(vercel.includes('"value": "noindex, follow"'), 'vercel.json: los PDF oficiales deben delegar la indexación a las páginas explicativas');
  for (const file of questionPages) {
    assert(vercel.includes(`/${file.replace(/\.html$/, '')}`), `vercel.json: falta rewrite para ${file}`);
  }
  assert(vercel.includes('"source": "/preguntas-:slug-mtc"'), 'vercel.json: falta rewrite para las páginas temáticas');

  const homeSchemas = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((document) => document['@graph'] || [document]);
  assert(schemaTypes(homeSchemas).has('WebApplication'), 'index.html: falta schema WebApplication');
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
