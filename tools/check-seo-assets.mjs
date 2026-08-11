import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const siteUrl = 'https://www.simuladormtc.com';
const seoDir = path.resolve('public', 'seo');

function firstMatch(html, pattern, label, file) {
  const value = html.match(pattern)?.[1]?.trim();
  assert(value, `${file}: falta ${label}`);
  return value;
}

function schemaTypes(graph) {
  return new Set(graph.flatMap((item) => Array.isArray(item['@type']) ? item['@type'] : [item['@type']]));
}

async function main() {
  const [fileNames, sitemap, robots, llms, home] = await Promise.all([
    readdir(seoDir),
    readFile(path.resolve('public', 'sitemap.xml'), 'utf8'),
    readFile(path.resolve('public', 'robots.txt'), 'utf8'),
    readFile(path.resolve('public', 'llms.txt'), 'utf8'),
    readFile(path.resolve('index.html'), 'utf8'),
  ]);

  const htmlFiles = fileNames.filter((file) => file.endsWith('.html')).sort();
  assert(htmlFiles.length >= 30, `Se esperaban al menos 30 páginas SEO; se encontraron ${htmlFiles.length}`);

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
    assert(!html.includes('Práctica el simulador'), `${file}: uso verbal incorrecto de "practica"`);
    const visibleText = html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ');
    assert(!/\b(Peru|categoria|categorias|preparacion|senal|senales|transito|mecanica|basica|basico|vehiculos|conduccion|publicacion|informacion|evaluacion|revision|circulacion|semaforo|despues|preparate|razon|pagina|guia|guias|dificiles|imagenes|accion|tambien|ademas|segun)\b/i.test(visibleText), `${file}: quedan palabras frecuentes sin acentuar`);

    const title = firstMatch(html, /<title>([^<]+)<\/title>/, 'title', file);
    const description = firstMatch(html, /<meta name="description" content="([^"]+)"/, 'description', file);
    const canonical = firstMatch(html, /<link rel="canonical" href="([^"]+)"/, 'canonical', file);

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

    const webpage = graph.find((item) => item['@type'] === 'WebPage');
    assert.equal(webpage.dateModified, '2026-08-11', `${file}: fecha editorial inesperada`);
    assert(webpage.mainEntity?.['@id'], `${file}: WebPage no enlaza su recurso principal`);

    const relatedBlock = html.match(/<div class="guide-strip">([\s\S]*?)<\/div>/)?.[1] || '';
    const relatedLinks = (relatedBlock.match(/<a /g) || []).length;
    assert(relatedLinks <= 4, `${file}: demasiadas guías repetidas (${relatedLinks})`);
  }

  for (const crawler of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Applebot']) {
    assert(robots.includes(`User-agent: ${crawler}\nAllow: /`), `robots.txt: falta permiso para ${crawler}`);
  }
  assert(robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`), 'robots.txt: falta sitemap');
  assert(llms.includes('40 preguntas'), 'llms.txt: falta el formato verificable del examen');
  assert(llms.includes('35 respuestas correctas'), 'llms.txt: falta el puntaje mínimo verificable');
  assert(llms.includes('## Criterios editoriales'), 'llms.txt: faltan criterios editoriales');

  const homeSchemas = [...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((document) => document['@graph'] || [document]);
  assert(schemaTypes(homeSchemas).has('WebApplication'), 'index.html: falta schema WebApplication');
  assert(schemaTypes(homeSchemas).has('LearningResource'), 'index.html: falta schema LearningResource');

  console.log(`SEO/GEO OK: ${htmlFiles.length} páginas, ${canonicals.size} canonicals únicos y rastreadores de IA habilitados.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
