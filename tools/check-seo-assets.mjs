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

async function main() {
  const [fileNames, sitemap, robots, llms, home, vercel, categorySamplesText] = await Promise.all([
    readdir(seoDir),
    readFile(path.resolve('public', 'sitemap.xml'), 'utf8'),
    readFile(path.resolve('public', 'robots.txt'), 'utf8'),
    readFile(path.resolve('public', 'llms.txt'), 'utf8'),
    readFile(path.resolve('index.html'), 'utf8'),
    readFile(path.resolve('vercel.json'), 'utf8'),
    readFile(path.resolve('tools', 'seo-category-question-samples.json'), 'utf8'),
  ]);
  const categorySamples = JSON.parse(categorySamplesText);
  assert.deepEqual(
    Object.keys(categorySamples).sort(),
    ['a1', 'a2a', 'a2b', 'a3a', 'a3b', 'a3c', 'b2a', 'b2b', 'b2c'],
    'La muestra SEO debe cubrir exactamente las 9 categorías',
  );
  for (const [slug, questions] of Object.entries(categorySamples)) {
    assert.equal(questions.length, 3, `${slug}: deben existir 3 preguntas de muestra`);
    assert.equal(new Set(questions.map((question) => question.number)).size, 3, `${slug}: números de pregunta duplicados`);
    for (const question of questions) {
      assert.equal(question.options.length, 4, `${slug} #${question.number}: se requieren 4 alternativas completas`);
      assert(question.options.includes(question.correctAnswer), `${slug} #${question.number}: la respuesta correcta no coincide con las alternativas`);
      assert(!question.text.includes('...'), `${slug} #${question.number}: el enunciado parece truncado`);
      assert(question.options.every((option) => !option.includes('...')), `${slug} #${question.number}: una alternativa parece truncada`);
    }
  }

  const htmlFiles = fileNames.filter((file) => file.endsWith('.html')).sort();
  assert(htmlFiles.length >= 46, `Se esperaban al menos 46 páginas SEO; se encontraron ${htmlFiles.length}`);

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
    const visibleText = html
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

    if (/^simulador-mtc-(?!con-respuestas)[a-z0-9]+\.html$/.test(file)) {
      assert(html.includes('auth=register&amp;category='), `${file}: el CTA no conserva la categoría al registrar`);
      assert(html.includes('mode%3Dexam'), `${file}: falta el acceso directo al simulacro de 40 preguntas`);
      assert(types.has('Quiz'), `${file}: falta schema Quiz para las preguntas de muestra`);
      assert.equal((html.match(/class="sample-question"/g) || []).length, 3, `${file}: deben mostrarse 3 preguntas completas`);
      const sampleBlock = html.match(/<section class="sample-section"[\s\S]*?<\/section>/)?.[0] || '';
      assert.equal((sampleBlock.match(/<li>/g) || []).length, 12, `${file}: deben mostrarse las 12 alternativas completas`);
      assert.equal((sampleBlock.match(/Respuesta correcta:/g) || []).length, 3, `${file}: faltan respuestas oficiales visibles`);
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
  assert(llms.includes('/metodologia-simulador-mtc'), 'llms.txt: falta la metodología editorial');
  assert(llms.includes('## Criterios editoriales'), 'llms.txt: faltan criterios editoriales');
  assert(vercel.includes('"value": "noindex, follow"'), 'vercel.json: los PDF oficiales deben delegar la indexación a las páginas explicativas');
  for (const file of questionPages) {
    assert(vercel.includes(`/${file.replace(/\.html$/, '')}`), `vercel.json: falta rewrite para ${file}`);
  }

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
